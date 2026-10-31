import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';

/**
 * M17 contra PostgreSQL REAL (ADR-013): el listado de colaboradores, quién cuenta como personal, los permisos
 * individuales y el 404 de quien no es empleado. Se activa con `M17_TEST_DATABASE_URL`, que debe apuntar a una base
 * DESECHABLE con el esquema y el seed cargados; sin ella se omite (CI sin base de datos). Crea y borra sus propias filas.
 */
const URL_BD = process.env.M17_TEST_DATABASE_URL;
const SUFIJO = Math.random().toString(36).slice(2, 8);

describe.skipIf(URL_BD === undefined)('M17 · permisos individuales (PostgreSQL real)', () => {
  let prisma: PrismaClient;
  let empleados: import('../repositories/empleados.repository').EmpleadosRepository;
  let permisos: import('../repositories/permisos.repository').PermisosRepository;
  let idEmpleado = 0;
  let idCliente = 0;
  let idRolCliente = 0;
  let idRolEmpleado = 0;
  let idPermisoVentas = 0;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { EmpleadosRepository } = await import('../repositories/empleados.repository.js');
    const { PermisosRepository } = await import('../repositories/permisos.repository.js');
    empleados = new EmpleadosRepository();
    permisos = new PermisosRepository();

    idRolCliente = (await prisma.rol.findUniqueOrThrow({ where: { nombre: 'cliente' } })).idRol;
    idRolEmpleado = (await prisma.rol.findUniqueOrThrow({ where: { nombre: 'empleado' } })).idRol;
    idPermisoVentas = (await prisma.permiso.findUniqueOrThrow({ where: { nombre: 'ventas.ver' } })).idPermiso;

    const cliente = await prisma.usuario.create({
      data: { nombre: `Cliente ${SUFIJO}`, correo: `cliente-${SUFIJO}@prueba.co`, contrasena: 'x', idRol: idRolCliente },
    });
    idCliente = cliente.idUsuario;

    const creado = await empleados.crear({
      nombre: `Empleado ${SUFIJO}`,
      correo: `empleado-${SUFIJO}@prueba.co`,
      telefono: '3000000000',
      contrasenaHash: 'x',
    });
    idEmpleado = creado.idUsuario;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: [idEmpleado, idCliente] } } });
    await prisma.$disconnect();
  });

  it('un empleado nuevo nace con el rol empleado, sin permisos y con fecha de alta real', async () => {
    const fila = await prisma.usuario.findUniqueOrThrow({ where: { idUsuario: idEmpleado } });
    expect(fila.idRol).toBe(idRolEmpleado);
    expect(await prisma.usuarioRol.count({ where: { idUsuario: idEmpleado } })).toBe(0);
    expect(await prisma.rol.count({ where: { nombre: { startsWith: 'Perfil Empleado' } } })).toBe(0);

    const ficha = await empleados.obtenerPorId(idEmpleado);
    expect(ficha?.cantidadPermisos).toBe(0);
    expect(Math.abs(Date.now() - (ficha?.fechaCreacion.getTime() ?? 0))).toBeLessThan(60_000);
  });

  it('el listado de colaboradores contiene empleados y nunca clientes ni al administrador (R-ACC-8)', async () => {
    const { empleados: lista } = await empleados.listar({ pagina: 1, limite: 100 });
    const ids = lista.map((e) => e.idUsuario);
    expect(ids).toContain(idEmpleado);
    expect(ids).not.toContain(idCliente);
    expect(lista.every((e) => e.correo !== 'admin@pintuclic.co')).toBe(true);
  });

  it('un cliente se comporta como inexistente para el repositorio de empleados', async () => {
    expect(await empleados.obtenerPorId(idCliente)).toBeNull();
    await expect(empleados.actualizarContacto(idCliente, { nombre: 'Intruso' })).rejects.toThrow();
    await empleados.actualizarEstado(idCliente, 'inactivo');
    expect((await prisma.usuario.findUniqueOrThrow({ where: { idUsuario: idCliente } })).estado).toBe('activo');
  });

  it('asignar permisos a un empleado los guarda en usuario_permiso y no toca ningún rol', async () => {
    const asignacionesAntes = await prisma.asignacionPermiso.count();

    await permisos.asignarPermisos(idEmpleado, ['ventas.ver', 'catalogo.ver']);

    expect((await permisos.obtenerPermisosUsuario(idEmpleado)).sort()).toEqual(['catalogo.ver', 'ventas.ver']);
    expect(await permisos.tienePermiso(idEmpleado, 'ventas.ver')).toBe(true);
    expect(await permisos.tienePermiso(idEmpleado, 'ventas.gestionar')).toBe(false);
    expect((await empleados.obtenerPorId(idEmpleado))?.cantidadPermisos).toBe(2);
    expect(await prisma.asignacionPermiso.count()).toBe(asignacionesAntes);
  });

  it('asignar de nuevo reemplaza, no acumula', async () => {
    await permisos.asignarPermisos(idEmpleado, ['ventas.ver']);
    expect(await permisos.obtenerPermisosUsuario(idEmpleado)).toEqual(['ventas.ver']);
  });

  it('no se asignan permisos a un cliente: el repositorio lo rechaza y el rol cliente queda intacto', async () => {
    const permisosDelRolAntes = await prisma.asignacionPermiso.count({ where: { idRol: idRolCliente } });

    await expect(permisos.asignarPermisos(idCliente, ['ventas.ver'])).rejects.toThrow();

    expect(await prisma.usuarioPermiso.count({ where: { idUsuario: idCliente } })).toBe(0);
    expect(await prisma.asignacionPermiso.count({ where: { idRol: idRolCliente } })).toBe(permisosDelRolAntes);
  });

  it('R-ACC-5: una fila suelta de un cliente no concede nada', async () => {
    await prisma.usuarioPermiso.create({ data: { idUsuario: idCliente, idPermiso: idPermisoVentas } });

    expect(await permisos.tienePermiso(idCliente, 'ventas.ver')).toBe(false);
    expect(await permisos.obtenerPermisosUsuario(idCliente)).toEqual([]);

    await prisma.usuarioPermiso.deleteMany({ where: { idUsuario: idCliente } });
  });

  it('R-ACC-5: un empleado desactivado pierde sus permisos al instante y los recupera al reactivarlo', async () => {
    await empleados.actualizarEstado(idEmpleado, 'inactivo');
    expect(await permisos.tienePermiso(idEmpleado, 'ventas.ver')).toBe(false);
    expect(await permisos.obtenerPermisosUsuario(idEmpleado)).toEqual([]);

    await empleados.actualizarEstado(idEmpleado, 'activo');
    expect(await permisos.tienePermiso(idEmpleado, 'ventas.ver')).toBe(true);
  });

  it('un permiso desactivado en el catálogo deja de contar', async () => {
    await prisma.permiso.update({ where: { idPermiso: idPermisoVentas }, data: { estado: 'inactivo' } });
    try {
      expect(await permisos.tienePermiso(idEmpleado, 'ventas.ver')).toBe(false);
      expect((await empleados.obtenerPorId(idEmpleado))?.cantidadPermisos).toBe(0);
    } finally {
      await prisma.permiso.update({ where: { idPermiso: idPermisoVentas }, data: { estado: 'activo' } });
    }
  });

  it('el empleado de demostración del seed tiene solo catalogo.ver y ventas.ver', async () => {
    const demo = await prisma.usuario.findUnique({ where: { correo: 'empleado@pintuclic.co' } });
    expect(demo).not.toBeNull();
    expect((await permisos.obtenerPermisosUsuario(demo?.idUsuario ?? 0)).sort()).toEqual(['catalogo.ver', 'ventas.ver']);
  });

  it('el rol de los clientes del seed sigue sin permisos (la escalada por rol compartido ya no existe)', async () => {
    expect(await prisma.asignacionPermiso.count({ where: { idRol: idRolCliente } })).toBe(0);
  });
});
