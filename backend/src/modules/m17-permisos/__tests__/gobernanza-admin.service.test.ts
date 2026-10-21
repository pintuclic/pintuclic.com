import { describe, expect, it, vi } from 'vitest';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type { EmpleadosRepositoryPort, EntidadEmpleado } from '../interfaces/empleados.interface';
import type {
  GobernanzaAdminRepositoryPort,
  SolicitudCambioCorreoAdmin,
} from '../interfaces/gobernanza.interface';
import { EmpleadoError } from '../services/empleados.service';
import { GobernanzaAdminService } from '../services/gobernanza-admin.service';

function crearMockGobernanza(): {
  gobernanzaRepo: GobernanzaAdminRepositoryPort;
  empleadosRepo: EmpleadosRepositoryPort;
  sesionService: SesionService;
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

  return { gobernanzaRepo, empleadosRepo, sesionService };
}

describe('HU-ADM-06 · Gobernanza y Sustitución de la Cuenta Administradora', () => {
  it('RN-ADM-18: Administrador solicita sustitución de correo hacia una dirección no registrada', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    const resultado = await servicio.solicitarSustitucionCorreo(
      { nuevoCorreo: 'nuevo.admin@pintuclic.com' },
      1,
    );

    expect(resultado.mensaje).toContain('nuevo.admin@pintuclic.com');
    expect(resultado.tokenPreview).toBeDefined();
    expect(gobernanzaRepo.guardarSolicitudCambioCorreo).toHaveBeenCalledOnce();
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
    expect(gobernanzaRepo.actualizarCorreoAdmin).toHaveBeenCalledWith(1, 'nuevo.admin@pintuclic.com');
    expect(sesionService.invalidarTodas).toHaveBeenCalledWith(1, 'cambio_contrasena');
  });

  it('RN-ADM-18: Confirmación con token inexistente o inválido arroja error', async () => {
    const { gobernanzaRepo, empleadosRepo, sesionService } = crearMockGobernanza();
    const servicio = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

    await expect(
      servicio.confirmarSustitucionCorreo({ tokenConfirmacion: 'token-invalido-o-expirado' }),
    ).rejects.toThrow(EmpleadoError);
  });
});
