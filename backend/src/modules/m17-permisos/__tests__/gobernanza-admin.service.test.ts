import { describe, expect, it, vi } from 'vitest';
import { derivarContrasena } from '../../../core/utils/crypto';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type { EmpleadosRepositoryPort, EntidadEmpleado } from '../interfaces/empleados.interface';
import type {
  GobernanzaAdminRepositoryPort,
  GobernanzaNotificacionesPort,
  SolicitudCambioCorreoAdmin,
} from '../interfaces/gobernanza.interface';
import { EmpleadoError } from '../services/empleados.service';
import {
  GobernanzaAdminService,
  SmtpGobernanzaNotificacionesAdapter,
} from '../services/gobernanza-admin.service';

function crearMockGobernanza(): {
  gobernanzaRepo: GobernanzaAdminRepositoryPort;
  empleadosRepo: EmpleadosRepositoryPort;
  sesionService: SesionService;
  notificaciones: GobernanzaNotificacionesPort;
} {
  const storeTokens = new Map<string, SolicitudCambioCorreoAdmin>();

  const gobernanzaRepo: GobernanzaAdminRepositoryPort = {
    obtenerAdmin: vi.fn().mockResolvedValue({
      idUsuario: 1,
      correo: 'admin@pintuclic.com',
      nombre: 'Administrador Principal',
    }),
    guardarSolicitudCambioCorreo: vi.fn().mockImplementation((sol: SolicitudCambioCorreoAdmin) => {
      storeTokens.set(sol.tokenConfirmacion, sol);
      return Promise.resolve();
    }),
    buscarSolicitudPorToken: vi.fn().mockImplementation((token: string) => {
      return Promise.resolve(storeTokens.get(token) ?? null);
    }),
    eliminarSolicitud: vi.fn().mockImplementation((token: string) => {
      storeTokens.delete(token);
      return Promise.resolve();
    }),
    actualizarCorreoAdmin: vi.fn().mockResolvedValue(undefined),
    obtenerHashContrasena: vi.fn().mockImplementation(() => derivarContrasena('Temporal#2026!')),
    actualizarContrasena: vi.fn().mockResolvedValue(undefined),
  };

  const empleadosRepo: EmpleadosRepositoryPort = {
    listar: vi.fn().mockResolvedValue({ empleados: [], total: 0 }),
    obtenerPorId: vi.fn().mockImplementation((id: number): Promise<EntidadEmpleado | null> => {
      if (id === 1) {
        return Promise.resolve({
          idUsuario: 1,
          nombre: 'Admin',
          correo: 'admin@pintuclic.com',
          telefono: null,
          estado: 'activo',
          idRol: 1,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
        });
      }
      return Promise.resolve(null);
    }),
    obtenerPorCorreo: vi.fn().mockImplementation((correo: string): Promise<EntidadEmpleado | null> => {
      if (correo === 'ocupado@pintuclic.com') {
        return Promise.resolve({
          idUsuario: 50,
          nombre: 'Ocupado',
          correo: 'ocupado@pintuclic.com',
          telefono: null,
          estado: 'activo',
          idRol: 5,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
        });
      }
      return Promise.resolve(null);
    }),
    crear: vi.fn().mockResolvedValue({} as unknown as EntidadEmpleado),
    actualizarContacto: vi.fn().mockResolvedValue({} as unknown as EntidadEmpleado),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
    contarPermisos: vi.fn().mockResolvedValue(0),
  };

  const sesionService = {
    invalidarTodas: vi.fn().mockResolvedValue(3),
  } as unknown as SesionService;

  const notificaciones: GobernanzaNotificacionesPort = {
    enviarSolicitudSustitucionCorreoAdmin: vi.fn().mockResolvedValue(undefined),
  };

  return { gobernanzaRepo, empleadosRepo, sesionService, notificaciones };
}

describe('HU-ADM-06 · Gobernanza y Sustitución de la Cuenta Administradora', () => {
  it('RN-ADM-18: Administrador solicita sustitución de correo hacia una dirección no registrada y emite notificación SMTP', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService, notificaciones } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(
      gobernanzaRepo,
      empleadosRepo,
      sesionService,
      notificaciones,
    );

    const resultado = await servicio.solicitarSustitucionCorreo(
      { nuevoCorreo: 'nuevo.admin@pintuclic.com' },
      1,
    );

    expect(resultado.mensaje).toContain('nuevo.admin@pintuclic.com');
    expect(resultado.correoAnterior).toBe('admin@pintuclic.com');
    expect(resultado.nuevoCorreo).toBe('nuevo.admin@pintuclic.com');
    expect(resultado.expiracionMinutos).toBe(1440);
    expect(resultado.tokenPreview).toHaveLength(64);
    expect(gobernanzaRepo.guardarSolicitudCambioCorreo).toHaveBeenCalledOnce();
    expect(notificaciones.enviarSolicitudSustitucionCorreoAdmin).toHaveBeenCalledWith({
      correoActual: 'admin@pintuclic.com',
      nuevoCorreo: 'nuevo.admin@pintuclic.com',
      tokenConfirmacion: resultado.tokenPreview,
      minutosVigencia: 1440,
    });
  });

  it('RN-ADM-18: SmtpGobernanzaNotificacionesAdapter envía el token al nuevo correo y alerta preventiva al correo actual', async () => {
    const sendMailMock = vi.fn().mockResolvedValue({ messageId: '<gov-1@gmail.com>' });
    const adapter = new SmtpGobernanzaNotificacionesAdapter(
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'notificaciones@gmail.com',
        pass: 'clave',
        from: 'Pintu Clic <notificaciones@pintuclic.com>',
        frontendBaseUrl: 'https://pintuclic-dev.adsoproject.dev',
      },
      { sendMail: sendMailMock },
    );

    await adapter.enviarSolicitudSustitucionCorreoAdmin({
      correoActual: 'admin.actual@gmail.com',
      nuevoCorreo: 'admin.nuevo@gmail.com',
      tokenConfirmacion: 'a'.repeat(64),
      minutosVigencia: 1440,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(2);
    expect(sendMailMock.mock.calls[0]?.[0]?.to).toBe('admin.nuevo@gmail.com');
    expect(sendMailMock.mock.calls[0]?.[0]?.text).toContain('a'.repeat(64));
    expect(sendMailMock.mock.calls[1]?.[0]?.to).toBe('admin.actual@gmail.com');
    expect(sendMailMock.mock.calls[1]?.[0]?.text).toContain('admin.nuevo@gmail.com');
  });

  it('RN-ADM-18: Rechaza solicitud si la nueva dirección ya pertenece a otro usuario', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    await expect(
      servicio.solicitarSustitucionCorreo({ nuevoCorreo: 'ocupado@pintuclic.com' }, 1),
    ).rejects.toThrow('El nuevo correo ya se encuentra asignado a otra cuenta en el sistema.');
  });

  it('RN-ADM-18: Rechaza solicitud si el actor no es el administrador titular', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    await expect(
      servicio.solicitarSustitucionCorreo({ nuevoCorreo: 'otro@pintuclic.com' }, 99),
    ).rejects.toThrow('Solo el administrador principal puede iniciar el traspaso');
  });

  it('RN-ADM-18: Confirmación exitosa con token actualiza correo y revoca sesiones para forzar re-login', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    const { tokenPreview } = await servicio.solicitarSustitucionCorreo(
      { nuevoCorreo: 'nuevo.admin@pintuclic.com' },
      1,
    );

    const confirmacion = await servicio.confirmarSustitucionCorreo({
      tokenConfirmacion: tokenPreview as string,
    });

    expect(confirmacion.mensaje).toContain('actualizado con éxito');
    expect(confirmacion.correoActualizado).toBe('nuevo.admin@pintuclic.com');
    expect(confirmacion.sesionesPreviasInvalidadas).toBe(true);
    expect(gobernanzaRepo.actualizarCorreoAdmin).toHaveBeenCalledWith(1, 'nuevo.admin@pintuclic.com');
    expect(sesionService.invalidarTodas).toHaveBeenCalledWith(1, 'cambio_contrasena');
  });

  it('CA-ADM-01-03: el primer acceso fija la clave por el repositorio y revoca las sesiones', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    await servicio.primerAcceso(1, {
      credencialTemporal: 'Temporal#2026!',
      nuevaContrasena: 'MiClaveDefinitiva2026!',
    });

    expect(gobernanzaRepo.actualizarContrasena).toHaveBeenCalledWith(1, expect.stringMatching(/^\$2[aby]\$12\$/));
    expect(sesionService.invalidarTodas).toHaveBeenCalledWith(1, 'cambio_contrasena');
  });

  it('CA-ADM-01-03: el primer acceso con credencial temporal errónea no cambia nada', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    await expect(
      servicio.primerAcceso(1, { credencialTemporal: 'Erronea#2026!', nuevaContrasena: 'MiClaveDefinitiva2026!' }),
    ).rejects.toThrow(EmpleadoError);
    expect(gobernanzaRepo.actualizarContrasena).not.toHaveBeenCalled();
  });

  it('RN-ADM-18: Confirmación con token inexistente o inválido arroja error', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    await expect(
      servicio.confirmarSustitucionCorreo({ tokenConfirmacion: 'token-invalido-o-expirado' }),
    ).rejects.toThrow(EmpleadoError);
  });
});