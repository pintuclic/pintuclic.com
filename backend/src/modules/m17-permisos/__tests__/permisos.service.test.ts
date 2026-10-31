import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { EmpleadosRepositoryPort, EntidadEmpleado } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';
import { PermisosService } from '../services/permisos.service';

const actorDe = (idUsuario: number): Actor => ({ idUsuario, idSesion: `sesion-${idUsuario}`, tipoSesion: 'admin' });

const ACTOR_ADMIN = actorDe(1);
/** Empleado que gestiona permisos: tiene `seguridad.gestionar_permisos`, `catalogo.ver` y `catalogo.editar`. */
const ACTOR_DELEGADO = actorDe(3);
const ACTOR_EMPLEADO = actorDe(2);

function empleado(idUsuario: number): EntidadEmpleado {
  return {
    idUsuario,
    nombre: `Empleado ${idUsuario}`,
    correo: `emp${idUsuario}@pintuclic.com`,
    telefono: '1234567',
    estado: 'activo',
    idRol: 4,
    fechaCreacion: new Date('2026-01-01T00:00:00Z'),
    fechaUltimoAcceso: null,
    cantidadPermisos: 0,
    primerAccesoPendiente: false,
  };
}

/**
 * Modelo en memoria de las reglas: ids 2, 3 y 4 son empleados; el 1 es el administrador; el 9 es un cliente, así que
 * el repositorio de empleados no lo devuelve (R-ACC-8).
 */
function crearMock(permisosPorUsuario: Record<number, string[]> = {}): {
  permisosRepo: PermisosRepositoryPort;
  empleadosRepo: EmpleadosRepositoryPort;
  gobernanzaRepo: GobernanzaAdminRepositoryPort;
  concedidos: Record<number, string[]>;
} {
  const concedidos: Record<number, string[]> = {
    2: ['catalogo.ver'],
    3: ['seguridad.gestionar_permisos', 'catalogo.ver', 'catalogo.editar'],
    4: [],
    ...permisosPorUsuario,
  };
  const empleados = new Set([2, 3, 4]);

  const permisosRepo: PermisosRepositoryPort = {
    listarCatalogo: vi.fn().mockResolvedValue([
      { idPermiso: 1, nombre: 'catalogo.ver', descripcion: 'Ver catalogo', area: 'catalogo' },
      { idPermiso: 2, nombre: 'catalogo.editar', descripcion: 'Editar catalogo', area: 'catalogo' },
      { idPermiso: 3, nombre: 'ventas.ver', descripcion: 'Ver ventas', area: 'ventas' },
      { idPermiso: 4, nombre: 'ventas.gestionar', descripcion: 'Gestionar ventas', area: 'ventas' },
      { idPermiso: 5, nombre: 'seguridad.gestionar_permisos', descripcion: 'Permisos', area: 'seguridad' },
    ]),
    obtenerPermisosUsuario: vi.fn().mockImplementation((id: number) => Promise.resolve(concedidos[id] ?? [])),
    tienePermiso: vi.fn().mockResolvedValue(true),
    asignarPermisos: vi.fn().mockImplementation((id: number, codigos: string[]) => {
      concedidos[id] = codigos;
      return Promise.resolve();
    }),
  };

  const empleadosRepo: EmpleadosRepositoryPort = {
    listar: vi.fn().mockResolvedValue({ empleados: [], total: 0 }),
    obtenerPorId: vi.fn().mockImplementation((id: number) => Promise.resolve(empleados.has(id) ? empleado(id) : null)),
    obtenerPorCorreo: vi.fn().mockResolvedValue(null),
    crear: vi.fn(),
    actualizarContacto: vi.fn(),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
  };

  const gobernanzaRepo = {
    obtenerAdmin: vi.fn().mockResolvedValue({ idUsuario: 1, correo: 'admin@pintuclic.co', nombre: 'Admin' }),
  } as unknown as GobernanzaAdminRepositoryPort;

  return { permisosRepo, empleadosRepo, gobernanzaRepo, concedidos };
}

function servicio(m = crearMock()): { servicio: PermisosService; m: ReturnType<typeof crearMock> } {
  return { servicio: new PermisosService(m.permisosRepo, m.empleadosRepo, m.gobernanzaRepo), m };
}

describe('HU-ADM-02 · Asignación Individual de Permisos y Acoplamiento', () => {
  it('consulta de matriz individual de permisos para empleado existente', async () => {
    const { servicio: s } = servicio();

    const ficha = await s.obtenerMatriz(2);

    expect(ficha.idUsuario).toBe(2);
    expect(ficha.permisos).toHaveLength(5);
    expect(ficha.permisos.find((p) => p.codigo === 'catalogo.ver')?.concedido).toBe(true);
    expect(ficha.permisos.find((p) => p.codigo === 'ventas.ver')?.concedido).toBe(false);
  });

  it('RN-ADM-07: Concesión Implicada Consulta-Operación (otorgar editar concede automáticamente ver)', async () => {
    const { servicio: s, m } = servicio();

    const resultado = await s.actualizarPermisos(4, ['catalogo.editar'], ACTOR_ADMIN);

    expect(resultado.permisosOtorgados).toContain('catalogo.editar');
    expect(resultado.permisosOtorgados).toContain('catalogo.ver');
    expect(resultado.permisosConcedidosAutomaticamente).toContain('catalogo.ver');
    expect(m.permisosRepo.asignarPermisos).toHaveBeenCalledWith(4, expect.arrayContaining(['catalogo.editar', 'catalogo.ver']));
  });

  it('RN-ADM-08: Retiro en Cascada (retirar consulta revoca automáticamente operaciones asociadas)', async () => {
    const { servicio: s } = servicio();

    const resultado = await s.actualizarPermisos(2, ['ventas.ver'], ACTOR_ADMIN);

    expect(resultado.permisosOtorgados).not.toContain('catalogo.editar');
    expect(resultado.permisosOtorgados).not.toContain('catalogo.ver');
    expect(resultado.permisosOtorgados).toContain('ventas.ver');
  });

  it('RN-ADM-10: Prohibición de Auto-Modificación (un empleado no puede modificar sus propios permisos)', async () => {
    const { servicio: s } = servicio();

    await expect(s.actualizarPermisos(2, ['catalogo.ver'], ACTOR_EMPLEADO)).rejects.toThrow(
      'No está permitido modificar sus propios permisos (RN-ADM-10).',
    );
  });
});

describe('M17 R-ACC-6 · A quién se le pueden asignar permisos', () => {
  it('no se asignan permisos a una cuenta que no es empleado (un cliente se trata como inexistente)', async () => {
    const { servicio: s, m } = servicio();

    await expect(s.actualizarPermisos(9, ['catalogo.ver'], ACTOR_ADMIN)).rejects.toMatchObject({
      code: 'EMPLEADO_NO_ENCONTRADO',
      status: 404,
    });
    expect(m.permisosRepo.asignarPermisos).not.toHaveBeenCalled();
  });

  it('no se modifican los permisos de la cuenta administradora', async () => {
    const { servicio: s, m } = servicio();

    await expect(s.actualizarPermisos(1, ['catalogo.ver'], ACTOR_DELEGADO)).rejects.toMatchObject({
      code: 'OPERACION_BLOQUEADA_ADMIN',
      status: 403,
    });
    expect(m.permisosRepo.asignarPermisos).not.toHaveBeenCalled();
  });

  it('la matriz de una cuenta que no es empleado tampoco se consulta', async () => {
    const { servicio: s } = servicio();

    await expect(s.obtenerMatriz(9)).rejects.toMatchObject({ code: 'EMPLEADO_NO_ENCONTRADO' });
  });
});

describe('M17 R-ACC-7 · Nadie concede lo que no tiene', () => {
  it('el administrador concede cualquier permiso, incluido seguridad.gestionar_permisos', async () => {
    const { servicio: s, m } = servicio();

    await s.actualizarPermisos(4, ['seguridad.gestionar_permisos', 'ventas.gestionar'], ACTOR_ADMIN);

    expect(m.concedidos[4]).toEqual(expect.arrayContaining(['seguridad.gestionar_permisos', 'ventas.gestionar', 'ventas.ver']));
  });

  it('un empleado delegado concede los permisos que él mismo posee', async () => {
    const { servicio: s, m } = servicio();

    await s.actualizarPermisos(4, ['catalogo.editar'], ACTOR_DELEGADO);

    expect(m.concedidos[4]).toEqual(expect.arrayContaining(['catalogo.editar', 'catalogo.ver']));
  });

  it('un empleado delegado no puede conceder un permiso que no tiene y no se guarda nada', async () => {
    const { servicio: s, m } = servicio();

    await expect(s.actualizarPermisos(4, ['ventas.gestionar'], ACTOR_DELEGADO)).rejects.toMatchObject({
      code: 'PERMISO_NO_CONCEDIBLE',
      status: 403,
    });
    expect(m.permisosRepo.asignarPermisos).not.toHaveBeenCalled();
  });

  it('un empleado delegado no puede dar seguridad.gestionar_permisos aunque lo tenga', async () => {
    const { servicio: s, m } = servicio();

    await expect(s.actualizarPermisos(4, ['seguridad.gestionar_permisos'], ACTOR_DELEGADO)).rejects.toMatchObject({
      code: 'PERMISO_NO_CONCEDIBLE',
    });
    expect(m.permisosRepo.asignarPermisos).not.toHaveBeenCalled();
  });

  it('un empleado delegado tampoco puede retirar un permiso que no tiene', async () => {
    const m = crearMock({ 4: ['ventas.ver', 'ventas.gestionar'] });
    const { servicio: s } = servicio(m);

    // Reenvía la lista del destino sin ventas.gestionar: sería retirarlo.
    await expect(s.actualizarPermisos(4, ['ventas.ver'], ACTOR_DELEGADO)).rejects.toMatchObject({
      code: 'PERMISO_NO_CONCEDIBLE',
    });
    expect(m.permisosRepo.asignarPermisos).not.toHaveBeenCalled();
  });

  it('lo que el delegado no puede tocar queda tal cual cuando reenvía la lista completa', async () => {
    const m = crearMock({ 4: ['ventas.ver', 'ventas.gestionar'] });
    const { servicio: s } = servicio(m);

    await s.actualizarPermisos(4, ['ventas.ver', 'ventas.gestionar', 'catalogo.ver'], ACTOR_DELEGADO);

    expect(m.concedidos[4]).toEqual(expect.arrayContaining(['ventas.ver', 'ventas.gestionar', 'catalogo.ver']));
  });
});

describe('M17 R-ACC-9 · GET /admin/mis-permisos', () => {
  it('el administrador recibe esAdministrador y todo el catálogo activo', async () => {
    const { servicio: s } = servicio();

    const r = await s.misPermisos(1);

    expect(r).toMatchObject({ idUsuario: 1, esAdministrador: true });
    expect(r?.permisos).toHaveLength(5);
  });

  it('un empleado recibe solo los permisos que tiene', async () => {
    const { servicio: s } = servicio();

    const r = await s.misPermisos(2);

    expect(r).toMatchObject({ idUsuario: 2, esAdministrador: false, permisos: ['catalogo.ver'] });
  });

  it('un empleado sin permisos recibe una lista vacía, no un error', async () => {
    const { servicio: s } = servicio();

    const r = await s.misPermisos(4);

    expect(r).toMatchObject({ esAdministrador: false, permisos: [] });
  });

  it('una cuenta que no es de personal (cliente) no recibe nada', async () => {
    const { servicio: s } = servicio();

    expect(await s.misPermisos(9)).toBeNull();
  });
});
