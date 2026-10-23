import { describe, expect, it, vi } from 'vitest';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type { EmpleadosRepositoryPort, EntidadEmpleado } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import { EmpleadoError, EmpleadosService } from '../services/empleados.service';

function crearMockRepos(): {
  empleadosRepo: EmpleadosRepositoryPort;
  gobernanzaRepo: GobernanzaAdminRepositoryPort;
  sesionService: SesionService;
} {
  const empleadosRepo: EmpleadosRepositoryPort = {
    listar: vi.fn().mockResolvedValue({
      empleados: [
        {
          idUsuario: 2,
          nombre: 'Carlos Gómez',
          correo: 'carlos@pintuclic.com',
          telefono: '3001234567',
          estado: 'activo',
          idRol: 2,
          fechaCreacion: new Date('2026-01-01'),
          fechaUltimoAcceso: new Date('2026-01-02'),
        },
      ],
      total: 1,
    }),
    obtenerPorId: vi.fn().mockImplementation((id: number): Promise<EntidadEmpleado | null> => {
      if (id === 2) {
        return Promise.resolve({
          idUsuario: 2,
          nombre: 'Carlos Gómez',
          correo: 'carlos@pintuclic.com',
          telefono: '3001234567',
          estado: 'activo',
          idRol: 2,
          fechaCreacion: new Date('2026-01-01'),
          fechaUltimoAcceso: null,
        });
      }
      return Promise.resolve(null);
    }),
    obtenerPorCorreo: vi.fn().mockImplementation((correo: string): Promise<EntidadEmpleado | null> => {
      if (correo === 'existente@pintuclic.com') {
        return Promise.resolve({
          idUsuario: 5,
          nombre: 'Existe',
          correo: 'existente@pintuclic.com',
          telefono: '1234567',
          estado: 'activo',
          idRol: 5,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
        });
      }
      return Promise.resolve(null);
    }),
    crear: vi.fn().mockImplementation((datos) =>
      Promise.resolve({
        idUsuario: 10,
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        estado: 'activo' as const,
        idRol: 10,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: null,
      }),
    ),
    actualizarContacto: vi.fn().mockImplementation((id, datos) =>
      Promise.resolve({
        idUsuario: id,
        nombre: datos.nombre ?? 'Carlos',
        correo: 'carlos@pintuclic.com',
        telefono: datos.telefono ?? '3001234567',
        estado: 'activo' as const,
        idRol: 2,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: null,
      }),
    ),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
    contarPermisos: vi.fn().mockResolvedValue(4),
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
    invalidarTodas: vi.fn().mockResolvedValue(2),
  } as unknown as SesionService;

  return { empleadosRepo, gobernanzaRepo, sesionService };
}

describe('HU-ADM-01 · Gestión de Cuentas de Empleado y Credenciales', () => {
  it('RN-ADM-01 (Unicidad Universal): rechaza creación si el correo ya existe en el sistema', async () => {
    const { empleadosRepo, gobernanzaRepo, sesionService } = crearMockRepos();
    const servicio = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);

    await expect(
      servicio.crear({
        nombre: 'Nuevo',
        documento: '12345678',
        correo: 'existente@pintuclic.com',
        telefono: '3009999999',
      }),
    ).rejects.toThrow(EmpleadoError);
  });

  it('RN-ADM-02 y RN-ADM-03: genera credencial temporal y crea al empleado con estado activo', async () => {
    const { empleadosRepo, gobernanzaRepo, sesionService } = crearMockRepos();
    const servicio = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);

    const resultado = await servicio.crear({
      nombre: 'Nuevo Empleado',
      documento: '98765432',
      correo: 'nuevo@pintuclic.com',
      telefono: '3110001122',
    });

    expect(resultado.idUsuario).toBe(10);
    expect(resultado.primerAccesoPendiente).toBe(true);
    expect(resultado.credencialTemporal).toBeDefined();
    expect(resultado.credencialTemporal?.length).toBeGreaterThanOrEqual(8);
  });

  it('RN-ADM-04 e Inmutabilidad Histórica: desactiva lógicamente al empleado', async () => {
    const { empleadosRepo, gobernanzaRepo, sesionService } = crearMockRepos();
    const servicio = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);

    await servicio.desactivar(2);

    expect(empleadosRepo.actualizarEstado).toHaveBeenCalledWith(2, 'inactivo');
  });

  it('RN-ADM-05: al desactivar, revoca inmediatamente todas las sesiones activas con cuenta_desactivada', async () => {
    const { empleadosRepo, gobernanzaRepo, sesionService } = crearMockRepos();
    const servicio = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);

    await servicio.desactivar(2);

    expect(sesionService.invalidarTodas).toHaveBeenCalledWith(2, 'cuenta_desactivada');
  });

  it('RN-ADM-06: reactiva cuenta restaurando estado activo', async () => {
    const { empleadosRepo, gobernanzaRepo, sesionService } = crearMockRepos();
    const servicio = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);

    await servicio.reactivar(2);

    expect(empleadosRepo.actualizarEstado).toHaveBeenCalledWith(2, 'activo');
  });

  it('RN-ADM-17: rechaza desactivación de la cuenta de administrador raíz', async () => {
    const { empleadosRepo, gobernanzaRepo, sesionService } = crearMockRepos();
    const servicio = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);

    await expect(servicio.desactivar(1)).rejects.toThrow('La cuenta de administrador principal no puede ser desactivada.');
  });
});
