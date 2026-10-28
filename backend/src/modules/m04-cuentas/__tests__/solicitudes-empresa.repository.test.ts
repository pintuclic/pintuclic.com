import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaSolicitudesEmpresaRepository } from '../repositories/solicitudes-empresa.repository';

/**
 * RNF-CUE-09-01 / RN-CUE-16 / ADR-010 — Garantías transaccionales de la decisión.
 *
 * Aquí se verifica la LÓGICA de la transacción (condición `pendiente`, orden de los
 * efectos, reversión ante conflicto de NIT) sustituyendo `prisma` por un doble. La
 * exclusión mutua real entre dos conexiones concurrentes la da PostgreSQL y solo
 * puede demostrarse contra una base real (ATDD §3 escenario 4, Gate 4 del QA).
 */

const fake = vi.hoisted(() => {
  const tx = {
    solicitudEmpresa: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    solicitudActualizacionNit: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    usuario: { update: vi.fn() },
    cuentaEmpresa: { create: vi.fn(), update: vi.fn() },
    usuarioIdentidadExterna: { deleteMany: vi.fn() },
  };
  const transaction = vi.fn();
  return { tx, prisma: { $transaction: transaction } };
});

vi.mock('../../../core/db/client', () => ({ prisma: fake.prisma }));

const solicitud = {
  idSolicitud: 'sol-1',
  idUsuario: 33,
  nombreEmpresa: ' Pinturas del Valle S.A.S. ',
  nombreRepresentante: 'Carlos Mario',
  correoEmpresarial: 'CONTACTO@Valle.com',
  telefono: '3151234567',
  nit: ' 901234567-1 ',
};

const renovacion = {
  idSolicitud: 'ren-1',
  idUsuario: 33,
  nitAnterior: '900111222-3',
  nitNuevo: ' 900999888-7 ',
};

function violacionDeUnicidad(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'prueba',
  });
}

describe('PrismaSolicitudesEmpresaRepository · decisiones atómicas', () => {
  let repo: PrismaSolicitudesEmpresaRepository;

  beforeEach(() => {
    // restoreMocks:true limpia las implementaciones entre pruebas.
    fake.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof fake.tx) => Promise<unknown>) => callback(fake.tx),
    );
    fake.tx.solicitudEmpresa.updateMany.mockResolvedValue({ count: 1 });
    fake.tx.solicitudEmpresa.findUniqueOrThrow.mockResolvedValue(solicitud);
    fake.tx.solicitudActualizacionNit.updateMany.mockResolvedValue({ count: 1 });
    fake.tx.solicitudActualizacionNit.findUniqueOrThrow.mockResolvedValue(renovacion);
    fake.tx.usuario.update.mockResolvedValue({});
    fake.tx.cuentaEmpresa.create.mockResolvedValue({});
    fake.tx.cuentaEmpresa.update.mockResolvedValue({});
    fake.tx.usuarioIdentidadExterna.deleteMany.mockResolvedValue({ count: 0 });
    repo = new PrismaSolicitudesEmpresaRepository();
  });

  describe('decidirSolicitud', () => {
    it('la actualización exige que la solicitud siga pendiente (RN-CUE-16)', async () => {
      await repo.decidirSolicitud('sol-1', { estado: 'rechazada', idAdminRevisor: 1, motivoRechazo: 'RUT ilegible' });

      expect(fake.tx.solicitudEmpresa.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idSolicitud: 'sol-1', estado: 'pendiente' } })
      );
    });

    it('aprobar activa la cuenta, la convierte a empresa, crea cuenta_empresa y retira Google, todo en una transacción', async () => {
      const res = await repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 1 });

      expect(res.resultado).toBe('decidida');
      expect(fake.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(fake.tx.usuario.update).toHaveBeenCalledWith({
        where: { idUsuario: 33 },
        data: { estado: 'activo', tipo: 'empresa' },
      });
      expect(fake.tx.cuentaEmpresa.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idUsuario: 33,
          nit: '901234567-1', // normalizado
          nombreEmpresa: 'Pinturas del Valle S.A.S.',
          correoEmpresarial: 'contacto@valle.com',
          idSolicitudOrigen: 'sol-1',
        }),
      });
      expect(fake.tx.usuarioIdentidadExterna.deleteMany).toHaveBeenCalledWith({ where: { idUsuario: 33 } });
    });

    it('aprobar con tipo de cliente crea la cuenta con ese tipo; sin tipo nace sin descuento (M06 · D8)', async () => {
      await repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 1, idSubRolEmpresa: 2 });
      expect(fake.tx.cuentaEmpresa.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ idUsuario: 33, idSubRolEmpresa: 2 }),
      });

      await repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 1 });
      expect(fake.tx.cuentaEmpresa.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ idSubRolEmpresa: null }),
      });
    });

    it('la decisión se registra antes que cualquier efecto sobre la cuenta', async () => {
      await repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 1 });

      const decision = fake.tx.solicitudEmpresa.updateMany.mock.invocationCallOrder[0] ?? 0;
      const conversion = fake.tx.usuario.update.mock.invocationCallOrder[0] ?? 0;
      const cuenta = fake.tx.cuentaEmpresa.create.mock.invocationCallOrder[0] ?? 0;
      expect(decision).toBeGreaterThan(0);
      expect(decision).toBeLessThan(conversion);
      expect(conversion).toBeLessThan(cuenta);
    });

    it('rechazar no concede condiciones de empresa ni toca la cuenta', async () => {
      const res = await repo.decidirSolicitud('sol-1', {
        estado: 'rechazada',
        idAdminRevisor: 1,
        motivoRechazo: 'Documentación incompleta',
      });

      expect(res.resultado).toBe('decidida');
      expect(fake.tx.usuario.update).not.toHaveBeenCalled();
      expect(fake.tx.cuentaEmpresa.create).not.toHaveBeenCalled();
      expect(fake.tx.usuarioIdentidadExterna.deleteMany).not.toHaveBeenCalled();
    });

    it('si otra decisión ya la ganó (0 filas), devuelve ya_decidida y no produce ningún efecto', async () => {
      fake.tx.solicitudEmpresa.updateMany.mockResolvedValue({ count: 0 });

      const res = await repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 2 });

      expect(res).toEqual({ resultado: 'ya_decidida' });
      expect(fake.tx.usuario.update).not.toHaveBeenCalled();
      expect(fake.tx.cuentaEmpresa.create).not.toHaveBeenCalled();
      expect(fake.tx.usuarioIdentidadExterna.deleteMany).not.toHaveBeenCalled();
    });

    it('un conflicto de NIT revierte la transacción y se informa como nit_ocupado', async () => {
      fake.tx.cuentaEmpresa.create.mockRejectedValue(violacionDeUnicidad());

      const res = await repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 1 });

      expect(res).toEqual({ resultado: 'nit_ocupado' });
      // Tras el fallo no se llega a retirar el acceso de Google: la transacción termina.
      expect(fake.tx.usuarioIdentidadExterna.deleteMany).not.toHaveBeenCalled();
    });

    it('cualquier otro error se propaga (no se confunde con un conflicto de NIT)', async () => {
      fake.tx.cuentaEmpresa.create.mockRejectedValue(new Error('conexión perdida'));

      await expect(
        repo.decidirSolicitud('sol-1', { estado: 'aprobada', idAdminRevisor: 1 })
      ).rejects.toThrow('conexión perdida');
    });
  });

  describe('decidirRenovacionNit', () => {
    it('la actualización exige que la renovación siga pendiente', async () => {
      await repo.decidirRenovacionNit('ren-1', { estado: 'rechazada', idAdminRevisor: 1 });

      expect(fake.tx.solicitudActualizacionNit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idSolicitud: 'ren-1', estado: 'pendiente' } })
      );
    });

    it('aprobar cambia el NIT vigente dentro de la transacción', async () => {
      const res = await repo.decidirRenovacionNit('ren-1', { estado: 'aprobada', idAdminRevisor: 1 });

      expect(res.resultado).toBe('decidida');
      expect(fake.tx.cuentaEmpresa.update).toHaveBeenCalledWith({
        where: { idUsuario: 33 },
        data: { nit: '900999888-7', fechaActualizacion: expect.any(Date) },
      });
    });

    it('rechazar deja el NIT vigente intacto (CA-CUE-09-06)', async () => {
      await repo.decidirRenovacionNit('ren-1', { estado: 'rechazada', idAdminRevisor: 1 });

      expect(fake.tx.cuentaEmpresa.update).not.toHaveBeenCalled();
    });

    it('si otra decisión ya la ganó, devuelve ya_decidida sin tocar el NIT', async () => {
      fake.tx.solicitudActualizacionNit.updateMany.mockResolvedValue({ count: 0 });

      const res = await repo.decidirRenovacionNit('ren-1', { estado: 'aprobada', idAdminRevisor: 2 });

      expect(res).toEqual({ resultado: 'ya_decidida' });
      expect(fake.tx.cuentaEmpresa.update).not.toHaveBeenCalled();
    });

    it('si el NIT nuevo ya es de otra cuenta, se revierte y se informa como nit_ocupado', async () => {
      fake.tx.cuentaEmpresa.update.mockRejectedValue(violacionDeUnicidad());

      const res = await repo.decidirRenovacionNit('ren-1', { estado: 'aprobada', idAdminRevisor: 1 });

      expect(res).toEqual({ resultado: 'nit_ocupado' });
    });
  });
});
