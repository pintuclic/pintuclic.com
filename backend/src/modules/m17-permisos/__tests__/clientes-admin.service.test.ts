import { describe, expect, it, vi } from 'vitest';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type { ClientesAdminRepositoryPort, EntidadClienteAdmin } from '../interfaces/clientes-admin.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import { ClientesAdminService } from '../services/clientes-admin.service';
import { EmpleadoError } from '../services/empleados.service';

function crearMockClientes(): {
  clientesRepo: ClientesAdminRepositoryPort;
  gobernanzaRepo: GobernanzaAdminRepositoryPort;
  sesionService: SesionService;
} {
  const clientesRepo: ClientesAdminRepositoryPort = {
    buscar: vi.fn().mockResolvedValue({
      clientes: [
        {
          idUsuario: 20,
          nombre: 'Juan Pérez',
          correo: 'juan@cliente.com',
          telefono: '3005556677',
          tipo: 'normal',
          estado: 'activo',
          fechaCreacion: new Date('2026-01-01'),
        },
      ],
      total: 1,
    }),
    obtenerPorId: vi.fn().mockImplementation((id: number): Promise<EntidadClienteAdmin | null> => {
      if (id === 20) {
        return Promise.resolve({
          idUsuario: 20,
          nombre: 'Juan Pérez',
          correo: 'juan@cliente.com',
          telefono: '3005556677',
          tipo: 'normal',
          estado: 'activo',
          fechaCreacion: new Date('2026-01-01'),
        });
      }
      return Promise.resolve(null);
    }),
    desactivar: vi.fn().mockResolvedValue(undefined),
    obtenerOrdenesRecientes: vi.fn().mockResolvedValue([
      {
        idOrden: 101,
        codigoVisible: 'ORD-2026-0001',
        fecha: new Date('2026-02-01'),
        estado: 'entregado',
        total: 150000,
      },
    ]),
    obtenerCotizacionesRecientes: vi.fn().mockResolvedValue([]),
  };

  const gobernanzaRepo: GobernanzaAdminRepositoryPort = {
    obtenerAdmin: vi.fn().mockResolvedValue({ idUsuario: 1, correo: 'admin@pintuclic.com', nombre: 'Admin' }),
    guardarSolicitudCambioCorreo: vi.fn().mockResolvedValue(undefined),
    buscarSolicitudPorToken: vi.fn().mockResolvedValue(null),
    eliminarSolicitud: vi.fn().mockResolvedValue(undefined),
    actualizarCorreoAdmin: vi.fn().mockResolvedValue(undefined),
    obtenerHashContrasena: vi.fn().mockResolvedValue(null),
    actualizarContrasena: vi.fn().mockResolvedValue(undefined),
  };

  const sesionService = {
    invalidarTodas: vi.fn().mockResolvedValue(1),
  } as unknown as SesionService;

  return { clientesRepo, gobernanzaRepo, sesionService };
}

describe('HU-ADM-04 · Gestión de Clientes desde Administración', () => {
  it('Búsqueda paginada de clientes por término', async () => {
    const { clientesRepo, gobernanzaRepo, sesionService } = crearMockClientes();
    const servicio = new ClientesAdminService(clientesRepo, gobernanzaRepo, sesionService);

    const resultado = await servicio.buscar({
      termino: 'Juan',
      tipo: 'todos',
      pagina: 1,
      limite: 10,
    });

    expect(resultado.clientes).toHaveLength(1);
    expect(resultado.clientes[0]?.nombre).toBe('Juan Pérez');
    expect(resultado.total).toBe(1);
  });

  it('RN-ADM-13: Ficha de cliente devuelve historial seguro sin exponer contraseñas ni instrumentos de pago', async () => {
    const { clientesRepo, gobernanzaRepo, sesionService } = crearMockClientes();
    const servicio = new ClientesAdminService(clientesRepo, gobernanzaRepo, sesionService);

    const ficha = await servicio.obtenerFicha(20);

    expect(ficha.idUsuario).toBe(20);
    expect(ficha.nombre).toBe('Juan Pérez');
    expect(ficha.ordenesRecientes).toHaveLength(1);
    expect(ficha.ordenesRecientes[0]?.codigoVisible).toBe('ORD-2026-0001');
    // Verificar que no existen contraseñas en el objeto
    expect('contrasena' in ficha).toBe(false);
  });

  it('RN-ADM-14: Desactivar cliente exige motivo justificado', async () => {
    const { clientesRepo, gobernanzaRepo, sesionService } = crearMockClientes();
    const servicio = new ClientesAdminService(clientesRepo, gobernanzaRepo, sesionService);

    await expect(servicio.desactivar(20, { motivo: '   ' })).rejects.toThrow(
      'Debe suministrar un motivo justificado para desactivar la cuenta del cliente (RN-ADM-14).',
    );
  });

  it('RN-ADM-14 y RN-ADM-05: Desactivación exitosa revoca sesiones activas con motivo cuenta_desactivada', async () => {
    const { clientesRepo, gobernanzaRepo, sesionService } = crearMockClientes();
    const servicio = new ClientesAdminService(clientesRepo, gobernanzaRepo, sesionService);

    await servicio.desactivar(20, { motivo: 'Comportamiento sospechoso reiterado' });

    expect(clientesRepo.desactivar).toHaveBeenCalledWith(20, 'Comportamiento sospechoso reiterado');
    expect(sesionService.invalidarTodas).toHaveBeenCalledWith(20, 'cuenta_desactivada');
  });

  it('RN-ADM-17: Rechaza desactivar la cuenta administradora a través del servicio de clientes', async () => {
    const { clientesRepo, gobernanzaRepo, sesionService } = crearMockClientes();
    const servicio = new ClientesAdminService(clientesRepo, gobernanzaRepo, sesionService);

    await expect(
      servicio.desactivar(1, { motivo: 'Intento indebido de desactivar admin' }),
    ).rejects.toThrow(EmpleadoError);
  });
});
