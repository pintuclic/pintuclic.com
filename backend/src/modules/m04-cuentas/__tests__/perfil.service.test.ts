import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CodigoVerificacion, CuentaEmpresa, Usuario } from '@prisma/client';
import { derivarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import { SimuladoDateProviderAdapter } from '../adapters/date-provider.adapter';
import { PerfilError, PerfilService } from '../services/perfil.service';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';

describe('PerfilService (HU-CUE-06, HU-CUE-10)', () => {
  let dateProvider: SimuladoDateProviderAdapter;
  let cuentasRepo: CuentasRepository;
  let codigosRepo: CodigosVerificacionRepository;
  let notificaciones: NotificacionesPort;
  let sesionService: SesionService;
  let service: PerfilService;

  const fechaBase = new Date('2026-10-21T12:00:00Z');

  beforeEach(() => {
    dateProvider = new SimuladoDateProviderAdapter(fechaBase);

    cuentasRepo = {
      buscarPorCorreo: vi.fn().mockResolvedValue(null),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarConEmpresaPorId: vi.fn().mockResolvedValue(null),
      crearUsuarioCliente: vi.fn(),
      actualizarDatosPerfil: vi.fn().mockImplementation((idUsuario, datos) =>
        Promise.resolve({
          idUsuario,
          nombre: datos.nombre ?? 'Usuario Modificado',
          correo: 'perfil@pintuclic.com',
          telefono: datos.telefono ?? null,
        } as Usuario)
      ),
      actualizarContrasena: vi.fn().mockResolvedValue({} as Usuario),
      actualizarCorreo: vi.fn().mockImplementation((idUsuario, nuevoCorreo) =>
        Promise.resolve({
          idUsuario,
          correo: nuevoCorreo,
        } as Usuario)
      ),
      actualizarEstado: vi.fn(),
      desactivarCuenta: vi.fn().mockResolvedValue({} as Usuario),
      buscarIdentidadExterna: vi.fn(),
      vincularIdentidadExterna: vi.fn(),
      buscarCuentaEmpresaPorNit: vi.fn(),
      buscarCuentaEmpresaPorIdUsuario: vi.fn(),
    };

    codigosRepo = {
      guardarCodigo: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idCodigo: 'codigo-correo-123',
          correo: datos.correo,
          codigoHash: datos.codigoHash,
          tipo: datos.tipo,
          intentos: 0,
          maxIntentos: 3,
          expiracion: datos.expiracion,
          datosTemporales: datos.datosTemporales ?? null,
          fechaCreacion: fechaBase,
        } as CodigoVerificacion)
      ),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarUltimoActivoPorCorreo: vi.fn().mockResolvedValue(null),
      incrementarIntentos: vi.fn().mockImplementation((idCodigo) =>
        Promise.resolve({
          idCodigo,
          intentos: 1,
          maxIntentos: 3,
        } as CodigoVerificacion)
      ),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };

    notificaciones = {
      enviarCodigoRegistro: vi.fn(),
      enviarCodigoCambioCorreo: vi.fn().mockResolvedValue(undefined),
      enviarEnlaceRecuperacion: vi.fn(),
      notificarDictamenEmpresa: vi.fn(),
    };

    sesionService = {
      invalidarTodas: vi.fn().mockResolvedValue(1),
    } as unknown as SesionService;

    service = new PerfilService(
      cuentasRepo,
      codigosRepo,
      notificaciones,
      dateProvider,
      sesionService,
    );
  });

  describe('HU-CUE-06: Gestión de Perfil', () => {
    it('obtiene perfil con detalle de cuenta empresa cuando aplica', async () => {
      vi.mocked(cuentasRepo.buscarConEmpresaPorId).mockResolvedValueOnce({
        idUsuario: 15,
        nombre: 'Ferretería Central',
        correo: 'admin@ferreteriacentral.com',
        telefono: '3112223344',
        tipo: 'empresa',
        estado: 'activo',
        cuentaEmpresa: {
          nit: '900123456-7',
          nombreEmpresa: 'Ferretería Central S.A.S.',
          nombreRepresentante: 'Carlos Gomez',
          correoEmpresarial: 'admin@ferreteriacentral.com',
          telefono: '3112223344',
          fechaAprobacion: fechaBase,
        } as CuentaEmpresa,
      } as Usuario & { cuentaEmpresa: CuentaEmpresa | null });

      const res = await service.obtenerPerfil(15);

      expect(res.nombre).toBe('Ferretería Central');
      expect(res.tipoUsuario).toBe('empresa');
      expect(res.cuentaEmpresa?.nit).toBe('900123456-7');
    });

    it('actualiza datos personales básicos', async () => {
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 15,
      } as Usuario);

      const res = await service.actualizarDatos(15, {
        nombre: 'Nuevo Nombre',
        telefono: '3209998877',
      });

      expect(res.nombre).toBe('Nuevo Nombre');
      expect(cuentasRepo.actualizarDatosPerfil).toHaveBeenCalledWith(15, {
        nombre: 'Nuevo Nombre',
        telefono: '3209998877',
      });
    });

    it('cambia contraseña validando clave actual y revocando sesiones', async () => {
      const hashActual = await derivarContrasena('ClaveActual123!');
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 15,
        contrasena: hashActual,
      } as Usuario);

      const res = await service.cambiarPassword(15, {
        contrasenaActual: 'ClaveActual123!',
        nuevaContrasena: 'NuevaClaveSegura123!',
      });

      expect(res.mensaje).toContain('Contraseña actualizada exitosamente');
      expect(cuentasRepo.actualizarContrasena).toHaveBeenCalledWith(15, expect.any(String), false);
      expect(sesionService.invalidarTodas).toHaveBeenCalledWith(15, 'cambio_contrasena');
    });

    it('rechaza cambio de contraseña si la clave actual es errónea', async () => {
      const hashActual = await derivarContrasena('ClaveActual123!');
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 15,
        contrasena: hashActual,
      } as Usuario);

      await expect(
        service.cambiarPassword(15, {
          contrasenaActual: 'ClaveEquivocada123!',
          nuevaContrasena: 'NuevaClaveSegura123!',
        })
      ).rejects.toThrow(PerfilError);
    });

    it('solicita cambio de correo validando contraseña y emitiendo OTP de 15m', async () => {
      const hashActual = await derivarContrasena('MiClave123456!');
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 15,
        correo: 'antiguo@pintuclic.com',
        contrasena: hashActual,
      } as Usuario);

      const res = await service.solicitarCambioCorreo(15, {
        nuevoCorreo: 'nuevo@pintuclic.com',
        contrasena: 'MiClave123456!',
      });

      expect(res.nuevoCorreo).toBe('nuevo@pintuclic.com');
      expect(res.tiempoExpiracionSegundos).toBe(900);
      expect(notificaciones.enviarCodigoCambioCorreo).toHaveBeenCalledWith(
        'nuevo@pintuclic.com',
        expect.stringMatching(/^\d{6}$/),
        15,
      );
    });

    it('confirma cambio de correo consumiendo OTP', async () => {
      const codigoHash = await derivarContrasena('654321');

      vi.mocked(codigosRepo.buscarUltimoActivoPorCorreo).mockResolvedValueOnce({
        idCodigo: 'codigo-correo-123',
        correo: 'nuevo@pintuclic.com',
        codigoHash,
        tipo: 'cambio_correo',
        intentos: 0,
        maxIntentos: 3,
        expiracion: new Date(fechaBase.getTime() + 15 * 60 * 1000),
        datosTemporales: { idUsuario: 15, nuevoCorreo: 'nuevo@pintuclic.com' },
        fechaCreacion: fechaBase,
      } as CodigoVerificacion);

      const res = await service.confirmarCambioCorreo(15, {
        nuevoCorreo: 'nuevo@pintuclic.com',
        codigo: '654321',
      });

      expect(res.nuevoCorreo).toBe('nuevo@pintuclic.com');
      expect(cuentasRepo.actualizarCorreo).toHaveBeenCalledWith(15, 'nuevo@pintuclic.com');
      expect(codigosRepo.eliminar).toHaveBeenCalledWith('codigo-correo-123');
    });
  });

  describe('HU-CUE-10: Desactivación de cuenta', () => {
    it('desactiva cuenta confirmando contraseña y revoca sesiones', async () => {
      const hashActual = await derivarContrasena('ClaveDesactivar123!');
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 15,
        contrasena: hashActual,
      } as Usuario);

      const res = await service.desactivarCuenta(15, {
        contrasena: 'ClaveDesactivar123!',
      });

      expect(res.mensaje).toContain('desactivada exitosamente');
      expect(cuentasRepo.desactivarCuenta).toHaveBeenCalledWith(15);
      expect(sesionService.invalidarTodas).toHaveBeenCalledWith(15, 'cuenta_desactivada');
    });

    it('rechaza desactivación si la contraseña es errónea', async () => {
      const hashActual = await derivarContrasena('ClaveDesactivar123!');
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 15,
        contrasena: hashActual,
      } as Usuario);

      await expect(
        service.desactivarCuenta(15, {
          contrasena: 'ClaveMala12345!',
        })
      ).rejects.toThrow(PerfilError);

      expect(cuentasRepo.desactivarCuenta).not.toHaveBeenCalled();
    });
  });
});
