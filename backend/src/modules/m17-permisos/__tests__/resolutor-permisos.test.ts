import { describe, expect, it, vi } from 'vitest';
import type { EmpleadosRepositoryPort, EntidadEmpleado } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';
import { ResolutorPermisosDatabaseAdapter } from '../services/resolutor-permisos.adapter';

function crearMockResolutor(permisosConcedidos: string[] = ['catalogo.ver']): {
  resolutor: ResolutorPermisosDatabaseAdapter;
  permisosRepo: PermisosRepositoryPort;
  empleadosRepo: EmpleadosRepositoryPort;
  gobernanzaRepo: GobernanzaAdminRepositoryPort;
} {
  const permisosRepo: PermisosRepositoryPort = {
    listarCatalogo: vi.fn().mockResolvedValue([]),
    obtenerPermisosUsuario: vi.fn().mockResolvedValue(permisosConcedidos),
    tienePermiso: vi.fn().mockImplementation((_id: number, codigo: string) => {
      return Promise.resolve(permisosConcedidos.includes(codigo));
    }),
    asignarPermisos: vi.fn().mockResolvedValue(undefined),
    asegurarRolEmpleado: vi.fn().mockResolvedValue(1),
  };

  const empleadosRepo: EmpleadosRepositoryPort = {
    listar: vi.fn().mockResolvedValue({ empleados: [], total: 0 }),
    obtenerPorId: vi.fn().mockImplementation((id: number): Promise<EntidadEmpleado | null> => {
      if (id === 1) {
        return Promise.resolve({
          idUsuario: 1,
          nombre: 'Admin Principal',
          correo: 'admin@pintuclic.com',
          telefono: null,
          estado: 'activo',
          idRol: 1,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
        });
      }
      if (id === 2) {
        return Promise.resolve({
          idUsuario: 2,
          nombre: 'Empleado Activo',
          correo: 'empleado@pintuclic.com',
          telefono: null,
          estado: 'activo',
          idRol: 2,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
        });
      }
      if (id === 3) {
        return Promise.resolve({
          idUsuario: 3,
          nombre: 'Empleado Inactivo',
          correo: 'inactivo@pintuclic.com',
          telefono: null,
          estado: 'inactivo',
          idRol: 3,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
        });
      }
      return Promise.resolve(null);
    }),
    obtenerPorCorreo: vi.fn().mockResolvedValue(null),
    crear: vi.fn().mockResolvedValue({} as unknown as EntidadEmpleado),
    actualizarContacto: vi.fn().mockResolvedValue({} as unknown as EntidadEmpleado),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
    contarPermisos: vi.fn().mockResolvedValue(1),
  };

  const gobernanzaRepo: GobernanzaAdminRepositoryPort = {
    obtenerAdmin: vi.fn().mockResolvedValue({ idUsuario: 1, correo: 'admin@pintuclic.com', nombre: 'Admin' }),
    guardarSolicitudCambioCorreo: vi.fn().mockResolvedValue(undefined),
    buscarSolicitudPorToken: vi.fn().mockResolvedValue(null),
    eliminarSolicitud: vi.fn().mockResolvedValue(undefined),
    actualizarCorreoAdmin: vi.fn().mockResolvedValue(undefined),
  };

  const resolutor = new ResolutorPermisosDatabaseAdapter(permisosRepo, empleadosRepo, gobernanzaRepo);

  return { resolutor, permisosRepo, empleadosRepo, gobernanzaRepo };
}

describe('HU-ADM-03 · Adaptador ResolutorPermisos (ADR-008)', () => {
  it('Admin Bypass (RF-ADM-02-10): el administrador supremo tiene permiso incondicional', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor([]);

    const autorizado = await resolutor.tienePermiso(1, 'cualquier.permiso.inexistente');

    expect(autorizado).toBe(true);
    // El bypass no consulta permisosRepo
    expect(permisosRepo.tienePermiso).not.toHaveBeenCalled();
  });

  it('Empleado activo con permiso concedido: retorna true tras consultar repositorio', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor(['catalogo.ver']);

    const autorizado = await resolutor.tienePermiso(2, 'catalogo.ver');

    expect(autorizado).toBe(true);
    expect(permisosRepo.tienePermiso).toHaveBeenCalledWith(2, 'catalogo.ver');
  });

  it('Empleado activo sin el permiso requerido: retorna false', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor(['catalogo.ver']);

    const autorizado = await resolutor.tienePermiso(2, 'ventas.gestionar');

    expect(autorizado).toBe(false);
    expect(permisosRepo.tienePermiso).toHaveBeenCalledWith(2, 'ventas.gestionar');
  });

  it('RN-ADM-04 y RN-ADM-05: Empleado inactivo o dado de baja es rechazado inmediatamente', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor(['catalogo.ver']);

    const autorizado = await resolutor.tienePermiso(3, 'catalogo.ver');

    expect(autorizado).toBe(false);
    expect(permisosRepo.tienePermiso).not.toHaveBeenCalled();
  });

  it('Usuario inexistente es rechazado con false', async () => {
    const { resolutor } = crearMockResolutor(['catalogo.ver']);

    const autorizado = await resolutor.tienePermiso(999, 'catalogo.ver');

    expect(autorizado).toBe(false);
  });
});
