import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { EmpleadosRepositoryPort } from '../interfaces/empleados.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';
import { PermisosService } from '../services/permisos.service';

const ACTOR_ADMIN: Actor = {
  idUsuario: 1,
  idSesion: 'sesion-admin-uuid',
  tipoSesion: 'admin',
};

const ACTOR_EMPLEADO: Actor = {
  idUsuario: 2,
  idSesion: 'sesion-empleado-uuid',
  tipoSesion: 'admin',
};

function crearMockPermisos(): {
  permisosRepo: PermisosRepositoryPort;
  empleadosRepo: EmpleadosRepositoryPort;
} {
  const permisosRepo: PermisosRepositoryPort = {
    listarCatalogo: vi.fn().mockResolvedValue([
      { idPermiso: 1, nombre: 'catalogo.ver', descripcion: 'Ver catalogo', area: 'catalogo' },
      { idPermiso: 2, nombre: 'catalogo.editar', descripcion: 'Editar catalogo', area: 'catalogo' },
      { idPermiso: 3, nombre: 'ventas.ver', descripcion: 'Ver ventas', area: 'ventas' },
      { idPermiso: 4, nombre: 'ventas.gestionar', descripcion: 'Gestionar ventas', area: 'ventas' },
    ]),
    obtenerPermisosUsuario: vi.fn().mockResolvedValue(['catalogo.ver']),
    tienePermiso: vi.fn().mockResolvedValue(true),
    asignarPermisos: vi.fn().mockResolvedValue(undefined),
    asegurarRolEmpleado: vi.fn().mockResolvedValue(10),
  };

  const empleadosRepo: EmpleadosRepositoryPort = {
    listar: vi.fn().mockResolvedValue({ empleados: [], total: 0 }),
    obtenerPorId: vi.fn().mockImplementation((id: number) => {
      if (id === 2) {
        return Promise.resolve({
          idUsuario: 2,
          nombre: 'Empleado 2',
          correo: 'emp2@pintuclic.com',
          telefono: '123',
          estado: 'activo' as const,
          idRol: 10,
          fechaCreacion: new Date(),
          fechaUltimoAcceso: null,
          primerAccesoPendiente: false,
        });
      }
      return Promise.resolve(null);
    }),
    obtenerPorCorreo: vi.fn().mockResolvedValue(null),
    crear: vi.fn().mockImplementation((datos) =>
      Promise.resolve({
        idUsuario: 99,
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        estado: 'activo' as const,
        idRol: 10,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: null,
        primerAccesoPendiente: false,
      }),
    ),
    actualizarContacto: vi.fn().mockImplementation((id, datos) =>
      Promise.resolve({
        idUsuario: id,
        nombre: datos.nombre ?? 'Nombre',
        correo: 'correo@test.com',
        telefono: datos.telefono ?? null,
        estado: 'activo' as const,
        idRol: 10,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: null,
        primerAccesoPendiente: false,
      }),
    ),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
    contarPermisos: vi.fn().mockResolvedValue(1),
  };

  return { permisosRepo, empleadosRepo };
}

describe('HU-ADM-02 · Asignación Individual de Permisos y Acoplamiento', () => {
  it('consulta de matriz individual de permisos para empleado existente', async () => {
    const { permisosRepo, empleadosRepo } = crearMockPermisos();
    const servicio = new PermisosService(permisosRepo, empleadosRepo);

    const ficha = await servicio.obtenerMatriz(2);

    expect(ficha.idUsuario).toBe(2);
    expect(ficha.permisos).toHaveLength(4);
    const permisoVer = ficha.permisos.find((p) => p.codigo === 'catalogo.ver');
    expect(permisoVer?.concedido).toBe(true);
  });

  it('RN-ADM-07: Concesión Implicada Consulta-Operación (otorgar editar concede automáticamente ver)', async () => {
    const { permisosRepo, empleadosRepo } = crearMockPermisos();
    const servicio = new PermisosService(permisosRepo, empleadosRepo);

    // Solo solicitamos 'catalogo.editar' sin 'catalogo.ver'
    const resultado = await servicio.actualizarPermisos(2, ['catalogo.editar'], ACTOR_ADMIN);

    expect(resultado.permisosOtorgados).toContain('catalogo.editar');
    expect(resultado.permisosOtorgados).toContain('catalogo.ver');
    expect(resultado.permisosConcedidosAutomaticamente).toContain('catalogo.ver');
    expect(permisosRepo.asignarPermisos).toHaveBeenCalledWith(2, expect.arrayContaining(['catalogo.editar', 'catalogo.ver']));
  });

  it('RN-ADM-08: Retiro en Cascada (retirar consulta revoca automáticamente operaciones asociadas)', async () => {
    const { permisosRepo, empleadosRepo } = crearMockPermisos();
    const servicio = new PermisosService(permisosRepo, empleadosRepo);

    // Solicitamos 'catalogo.editar' pero NO 'catalogo.ver', y simulamos que se remueve ver
    const resultado = await servicio.actualizarPermisos(2, ['ventas.ver'], ACTOR_ADMIN);

    expect(resultado.permisosOtorgados).not.toContain('catalogo.editar');
    expect(resultado.permisosOtorgados).not.toContain('catalogo.ver');
    expect(resultado.permisosOtorgados).toContain('ventas.ver');
  });

  it('RN-ADM-10: Prohibición de Auto-Modificación (un empleado no puede modificar sus propios permisos)', async () => {
    const { permisosRepo, empleadosRepo } = crearMockPermisos();
    const servicio = new PermisosService(permisosRepo, empleadosRepo);

    await expect(
      servicio.actualizarPermisos(2, ['catalogo.ver'], ACTOR_EMPLEADO),
    ).rejects.toThrow('No está permitido modificar sus propios permisos (RN-ADM-10).');
  });
});
