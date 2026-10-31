import { describe, expect, it, vi } from 'vitest';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';
import { ResolutorPermisosDatabaseAdapter } from '../services/resolutor-permisos.adapter';

function crearMockResolutor(permisosConcedidos: string[] = ['catalogo.ver']): {
  resolutor: ResolutorPermisosDatabaseAdapter;
  permisosRepo: PermisosRepositoryPort;
} {
  const permisosRepo: PermisosRepositoryPort = {
    listarCatalogo: vi.fn().mockResolvedValue([]),
    obtenerPermisosUsuario: vi.fn().mockResolvedValue(permisosConcedidos),
    tienePermiso: vi.fn().mockImplementation((_id: number, codigo: string) => {
      return Promise.resolve(permisosConcedidos.includes(codigo));
    }),
    asignarPermisos: vi.fn().mockResolvedValue(undefined),
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

  return { resolutor: new ResolutorPermisosDatabaseAdapter(permisosRepo, gobernanzaRepo), permisosRepo };
}

/**
 * Que un empleado inactivo, un cliente con una fila suelta o un usuario inexistente NO tengan permiso lo decide la
 * consulta del repositorio (R-ACC-5); eso se prueba contra PostgreSQL real en `permisos.integracion.test.ts`.
 */
describe('HU-ADM-03 · Adaptador ResolutorPermisos (ADR-008, ADR-013)', () => {
  it('Admin Bypass (RF-ADM-02-10): el administrador supremo tiene permiso incondicional', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor([]);

    const autorizado = await resolutor.tienePermiso(1, 'cualquier.permiso.inexistente');

    expect(autorizado).toBe(true);
    expect(permisosRepo.tienePermiso).not.toHaveBeenCalled();
  });

  it('Empleado con permiso concedido: retorna true tras consultar el repositorio', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor(['catalogo.ver']);

    expect(await resolutor.tienePermiso(2, 'catalogo.ver')).toBe(true);
    expect(permisosRepo.tienePermiso).toHaveBeenCalledWith(2, 'catalogo.ver');
  });

  it('Empleado sin el permiso requerido: retorna false', async () => {
    const { resolutor, permisosRepo } = crearMockResolutor(['catalogo.ver']);

    expect(await resolutor.tienePermiso(2, 'ventas.gestionar')).toBe(false);
    expect(permisosRepo.tienePermiso).toHaveBeenCalledWith(2, 'ventas.gestionar');
  });
});
