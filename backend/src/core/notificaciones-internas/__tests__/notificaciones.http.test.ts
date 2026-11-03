import { get as httpGet, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type NextFunction, type Request, type Response } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * FP-02 contra PostgreSQL real (se activa con `M01_TEST_DATABASE_URL`): agrupación atómica, destinatarios por permiso,
 * visto/leído, 404 opaco, ETag y limpieza. Los datos llevan un prefijo propio y se borran al terminar.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8).toUpperCase();

interface Cuerpo<T = unknown> {
  success: boolean;
  data: T;
  error?: { code: string };
}
interface ResumenHttp {
  campana: { sinVer: number; sinLeer: number };
  secciones: Array<{ seccion: string; cantidad: number }>;
}
interface ListaHttp {
  items: Array<{ idNotificacion: string; tipo: string; texto: string; enlace: string; cantidad: number; vista: boolean; leida: boolean; nivel: string }>;
  total: number;
  hayMas: boolean;
}

describe.skipIf(URL_BD === undefined)('FP-02 · notificaciones internas (HTTP + PostgreSQL)', () => {
  let servidor: Server;
  let base = '';
  let prisma: (typeof import('../../db/client'))['prisma'];
  let modulo: ReturnType<(typeof import('../notificaciones.routes'))['construirModuloNotificacionesInternas']>;
  let idConPermiso = 0;
  let idOtroConPermiso = 0;
  let idSinPermiso = 0;
  let idCliente = 0;
  let idAdmin = 0;
  const inicio = new Date();
  const creados: number[] = [];

  const llamar = (ruta: string, usuario: number | null, init: RequestInit = {}) =>
    fetch(`${base}${ruta}`, { ...init, headers: { ...(usuario === null ? {} : { 'x-test-user': String(usuario) }), ...(init.headers ?? {}) } });
  const json = async <T>(r: globalThis.Response): Promise<Cuerpo<T>> => (await r.json()) as Cuerpo<T>;
  const resumenDe = async (u: number): Promise<ResumenHttp> => (await json<ResumenHttp>(await llamar('/notificaciones/resumen', u))).data;
  const listaDe = async (u: number): Promise<ListaHttp> => (await json<ListaHttp>(await llamar('/notificaciones', u))).data;
  const pedidoNuevo = (n: number) => modulo.publicador.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: `PC-${ALEATORIO}-${String(n)}` });
  const vaciar = async (): Promise<void> => {
    await prisma.notificacionInterna.deleteMany({ where: { idUsuario: { in: [idConPermiso, idOtroConPermiso, idSinPermiso, idCliente, idAdmin] }, fechaCreacion: { gte: inicio } } });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../db/client.js'));
    const { construirModuloNotificacionesInternas } = await import('../notificaciones.routes.js');

    const rolEmpleado = await prisma.rol.findFirstOrThrow({ where: { nombre: 'empleado' } });
    const rolCliente = await prisma.rol.findFirstOrThrow({ where: { nombre: 'cliente' } });
    const permiso = await prisma.permiso.findFirstOrThrow({ where: { nombre: 'ventas.ver' } });
    const crear = async (nombre: string, idRol: number): Promise<number> => {
      const u = await prisma.usuario.create({ data: { nombre: `${nombre} ${ALEATORIO}`, correo: `${nombre.toLowerCase()}.${ALEATORIO}@test.co`, contrasena: 'x', idRol } });
      creados.push(u.idUsuario);
      return u.idUsuario;
    };
    idConPermiso = await crear('Ana', rolEmpleado.idRol);
    idOtroConPermiso = await crear('Beto', rolEmpleado.idRol);
    idSinPermiso = await crear('Carla', rolEmpleado.idRol);
    idCliente = await crear('Dora', rolCliente.idRol);
    await prisma.usuarioPermiso.createMany({
      data: [
        { idUsuario: idConPermiso, idPermiso: permiso.idPermiso },
        { idUsuario: idOtroConPermiso, idPermiso: permiso.idPermiso },
        // Un cliente con la fila suelta no debe recibir avisos de personal (R3).
        { idUsuario: idCliente, idPermiso: permiso.idPermiso },
      ],
    });
    idAdmin = (await prisma.usuario.findFirstOrThrow({ where: { estado: 'activo', rolDirecto: { nombre: 'administrador' } }, select: { idUsuario: true } })).idUsuario;

    modulo = construirModuloNotificacionesInternas({ intervaloLimpiezaMs: 10 ** 9 });
    const app = express();
    app.use(express.json());
    const autenticar = (req: Request, res: Response, next: NextFunction): void => {
      const usuario = req.header('x-test-user');
      if (usuario === undefined) {
        res.status(401).json({ success: false, error: { code: 'SESION_EXPIRADA', message: 'Debe autenticarse para continuar.' } });
        return;
      }
      req.actor = { idUsuario: Number(usuario), idSesion: 's', tipoSesion: 'cliente' };
      next();
    };
    app.use('/api/v1/notificaciones', autenticar, modulo.router);
    await new Promise<void>((r) => {
      servidor = app.listen(0, () => {
        base = `http://127.0.0.1:${String((servidor.address() as AddressInfo).port)}/api/v1`;
        r();
      });
    });
  });

  afterAll(async () => {
    await vaciar();
    await prisma.usuarioPermiso.deleteMany({ where: { idUsuario: { in: creados } } });
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: creados } } });
    await new Promise<void>((r) => servidor.close(() => r()));
    await prisma.$disconnect();
  });

  it('R1: sin sesión no hay nada que ver', async () => {
    expect((await llamar('/notificaciones/resumen', null)).status).toBe(401);
  });

  it('R3: llega al personal con el permiso y al administrador; no a quien no lo tiene ni al cliente', async () => {
    await pedidoNuevo(1);
    for (const id of [idConPermiso, idOtroConPermiso, idAdmin]) expect((await resumenDe(id)).campana.sinLeer).toBeGreaterThanOrEqual(1);
    expect((await resumenDe(idSinPermiso)).campana).toEqual({ sinVer: 0, sinLeer: 0 });
    expect((await resumenDe(idCliente)).campana).toEqual({ sinVer: 0, sinLeer: 0 });
    await vaciar();
  });

  it('R4/R6: 15 pedidos son UN aviso «Han llegado 15 pedidos nuevos»; punto 15 en el menú, 1 en la campanita', async () => {
    for (let n = 1; n <= 15; n++) await pedidoNuevo(n);
    const r = await resumenDe(idConPermiso);
    expect(r.campana).toEqual({ sinVer: 1, sinLeer: 1 });
    expect(r.secciones).toEqual([{ seccion: 'pedidos', cantidad: 15 }]);
    const l = await listaDe(idConPermiso);
    expect(l.total).toBe(1);
    expect(l.items[0]).toMatchObject({ texto: 'Han llegado 15 pedidos nuevos', enlace: '/admin/pedidos', cantidad: 15, nivel: 'novedad', vista: false, leida: false });
    await vaciar();
  });

  it('R4: veinte hechos a la vez no crean veinte avisos (índice único parcial)', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => pedidoNuevo(i + 1)));
    const l = await listaDe(idConPermiso);
    expect(l.total).toBe(1);
    expect(l.items[0]?.cantidad).toBe(20);
    const filas = await prisma.notificacionInterna.findMany({ where: { idUsuario: idConPermiso, fechaCreacion: { gte: inicio } } });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.referencias.length).toBeLessThanOrEqual(5);
    await vaciar();
  });

  it('R7: «visto» apaga el número de la campanita y deja el aviso sin leer; un hecho nuevo lo vuelve a poner sin ver', async () => {
    await pedidoNuevo(1);
    await pedidoNuevo(2);
    const vista = await json<{ cantidad: number }>(await llamar('/notificaciones/campana/vista', idConPermiso, { method: 'POST' }));
    expect(vista.data.cantidad).toBe(1);
    expect((await resumenDe(idConPermiso)).campana).toEqual({ sinVer: 0, sinLeer: 1 });
    expect((await listaDe(idConPermiso)).items[0]).toMatchObject({ vista: true, leida: false });
    expect((await resumenDe(idOtroConPermiso)).campana.sinVer).toBe(1);
    await pedidoNuevo(3);
    expect((await resumenDe(idConPermiso)).campana).toEqual({ sinVer: 1, sinLeer: 1 });
    await vaciar();
  });

  it('R7: entrar a la sección apaga el punto; el siguiente hecho nace como aviso nuevo', async () => {
    await pedidoNuevo(1);
    await pedidoNuevo(2);
    const r = await json<{ cantidad: number }>(await llamar('/notificaciones/secciones/pedidos/leer', idConPermiso, { method: 'POST' }));
    expect(r.data.cantidad).toBe(1);
    expect((await resumenDe(idConPermiso)).secciones).toEqual([]);
    expect((await resumenDe(idOtroConPermiso)).secciones).toEqual([{ seccion: 'pedidos', cantidad: 2 }]);
    await pedidoNuevo(3);
    const l = await listaDe(idConPermiso);
    expect(l.total).toBe(2);
    expect(l.items[0]).toMatchObject({ cantidad: 1, texto: `Llegó un pedido nuevo: PC-${ALEATORIO}-3`, leida: false });
    expect(l.items[1]).toMatchObject({ cantidad: 2, leida: true });
    expect((await llamar('/notificaciones/secciones/no_existe/leer', idConPermiso, { method: 'POST' })).status).toBe(400);
    await vaciar();
  });

  it('R7: un importante no se apaga al entrar a la sección, solo con clic o «marcar todo»', async () => {
    await modulo.publicador.publicar({ tipo: 'pedido_anulado', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: `PC-${ALEATORIO}-X` });
    await llamar('/notificaciones/secciones/pedidos/leer', idConPermiso, { method: 'POST' });
    expect((await resumenDe(idConPermiso)).campana.sinLeer).toBe(1);
    const lista = await listaDe(idConPermiso);
    const leida = await json<{ leida: boolean }>(await llamar(`/notificaciones/${lista.items[0]?.idNotificacion ?? ''}/leer`, idConPermiso, { method: 'POST' }));
    expect(leida.data.leida).toBe(true);
    expect((await resumenDe(idConPermiso)).campana).toEqual({ sinVer: 0, sinLeer: 0 });
    await vaciar();
  });

  it('R1: el aviso de otra persona o un id inexistente o mal formado es el mismo 404 opaco', async () => {
    await pedidoNuevo(1);
    const ajeno = (await listaDe(idOtroConPermiso)).items[0]?.idNotificacion ?? '';
    const respuestas = await Promise.all([
      llamar(`/notificaciones/${ajeno}/leer`, idSinPermiso, { method: 'POST' }),
      llamar('/notificaciones/00000000-0000-4000-8000-000000000000/leer', idConPermiso, { method: 'POST' }),
      llamar('/notificaciones/no-es-uuid/leer', idConPermiso, { method: 'POST' }),
    ]);
    const cuerpos = await Promise.all(respuestas.map(async (r) => ({ status: r.status, cuerpo: await r.json() })));
    expect(cuerpos.map((c) => c.status)).toEqual([404, 404, 404]);
    expect(cuerpos[1]).toEqual(cuerpos[0]);
    expect(cuerpos[2]).toEqual(cuerpos[0]);
    expect((await resumenDe(idOtroConPermiso)).campana.sinLeer).toBe(1);
    await vaciar();
  });

  it('R4: pasada la ventana de 24 h el hecho nuevo es un aviso aparte y el viejo sigue contando', async () => {
    await pedidoNuevo(1);
    await prisma.notificacionInterna.updateMany({ where: { idUsuario: idConPermiso, fechaCreacion: { gte: inicio } }, data: { fechaCreacion: new Date(Date.now() - 25 * 3600_000) } });
    await pedidoNuevo(2);
    const l = await listaDe(idConPermiso);
    expect(l.total).toBe(2);
    expect((await resumenDe(idConPermiso)).secciones).toEqual([{ seccion: 'pedidos', cantidad: 2 }]);
    await prisma.notificacionInterna.deleteMany({ where: { idUsuario: idConPermiso, tipo: 'pedido_nuevo', fechaCreacion: { lt: new Date() } , claveGrupo: { startsWith: 'pedido_nuevo' } } });
    await vaciar();
  });

  it('R4: los cambios de estado de UNA orden se juntan; los de otra orden no', async () => {
    const cambio = (orden: string) => modulo.publicador.publicar({ tipo: 'pedido_estado', destino: { tipo: 'usuario', idUsuario: idCliente }, referencia: `PC-${ALEATORIO}-${orden}` });
    await cambio('A');
    await cambio('A');
    await cambio('A');
    await cambio('B');
    const l = await listaDe(idCliente);
    expect(l.total).toBe(2);
    expect(l.items.map((i) => i.cantidad).sort()).toEqual([1, 3]);
    expect(l.items.find((i) => i.cantidad === 3)?.texto).toBe(`Tu pedido PC-${ALEATORIO}-A tuvo 3 cambios de estado`);
    expect((await resumenDe(idCliente)).secciones).toEqual([]);
    expect((await resumenDe(idCliente)).campana.sinVer).toBe(2);
    await vaciar();
  });

  it('R7: «marcar todo como leído» deja todo en cero', async () => {
    await pedidoNuevo(1);
    await modulo.publicador.publicar({ tipo: 'pedido_anulado', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: `PC-${ALEATORIO}-Z` });
    const r = await json<{ cantidad: number }>(await llamar('/notificaciones/leer-todas', idConPermiso, { method: 'POST' }));
    expect(r.data.cantidad).toBe(2);
    const despues = await resumenDe(idConPermiso);
    expect(despues.campana).toEqual({ sinVer: 0, sinLeer: 0 });
    expect(despues.secciones).toEqual([]);
    expect((await listaDe(idConPermiso)).items.every((i) => i.leida)).toBe(true);
    await vaciar();
  });

  it('R13b: el resumen responde con ETag y, si nada cambió, 304 sin cuerpo', async () => {
    await pedidoNuevo(1);
    const primera = await llamar('/notificaciones/resumen', idConPermiso);
    const etag = primera.headers.get('etag');
    expect(etag).toBeTruthy();
    // `fetch` de Node maneja los condicionales por su cuenta: se usa http directo para ver el 304 de verdad.
    const condicional = (): Promise<{ status: number; cuerpo: string }> =>
      new Promise((resolver, rechazar) => {
        httpGet(`${base}/notificaciones/resumen`, { headers: { 'x-test-user': String(idConPermiso), 'if-none-match': etag ?? '' } }, (r) => {
          let cuerpo = '';
          r.on('data', (d: Buffer) => (cuerpo += d.toString()));
          r.on('end', () => resolver({ status: r.statusCode ?? 0, cuerpo }));
        }).on('error', rechazar);
      });
    const segunda = await condicional();
    expect(segunda).toEqual({ status: 304, cuerpo: '' });
    await pedidoNuevo(2);
    expect((await condicional()).status).toBe(200);
    await vaciar();
  });

  it('R8: se borran los leídos de más de 30 días y se recortan los que pasan de 200 por persona; lo sin leer se queda', async () => {
    const viejo = new Date(Date.now() - 31 * 86_400_000);
    await prisma.notificacionInterna.create({ data: { idUsuario: idSinPermiso, tipo: 'pedido_nuevo', nivel: 'novedad', seccion: 'pedidos', claveGrupo: 'pedido_nuevo', referencias: [], fechaLectura: viejo, fechaUltima: viejo, fechaCreacion: new Date() } });
    await prisma.$executeRaw`
      INSERT INTO notificacion_interna (id_usuario, tipo, nivel, seccion, clave_grupo, referencias, fecha_creacion, fecha_ultima, fecha_lectura)
      SELECT ${idCliente}, 'cotizacion_respondida', 'importante', 'mis_cotizaciones', 'cotizacion_respondida#' || g, '{}', now(), now() - (g || ' minutes')::interval, now()
        FROM generate_series(1, 205) g`;
    await modulo.publicador.publicar({ tipo: 'cotizacion_rechazada', destino: { tipo: 'usuario', idUsuario: idCliente } });
    const r = await modulo.service.limpiar();
    expect(r.vencidos).toBeGreaterThanOrEqual(1);
    expect(await prisma.notificacionInterna.count({ where: { idUsuario: idSinPermiso, fechaCreacion: { gte: inicio } } })).toBe(0);
    expect(await prisma.notificacionInterna.count({ where: { idUsuario: idCliente } })).toBe(200);
    expect((await resumenDe(idCliente)).campana.sinLeer).toBe(1);
    await vaciar();
  });

  it('un cliente solo ve lo suyo aunque otra persona tenga avisos', async () => {
    await pedidoNuevo(1);
    expect((await listaDe(idCliente)).total).toBe(0);
    await vaciar();
  });

  it('paginación: «ver anteriores» entrega el resto', async () => {
    await prisma.$executeRaw`
      INSERT INTO notificacion_interna (id_usuario, tipo, nivel, seccion, clave_grupo, referencias, fecha_creacion, fecha_ultima, fecha_lectura)
      SELECT ${idSinPermiso}, 'cotizacion_respondida', 'importante', 'mis_cotizaciones', 'cotizacion_respondida#' || g, '{}', now(), now() - (g || ' minutes')::interval, now()
        FROM generate_series(1, 12) g`;
    const p1 = await json<ListaHttp>(await llamar('/notificaciones?pagina=1&limite=10', idSinPermiso));
    const p2 = await json<ListaHttp>(await llamar('/notificaciones?pagina=2&limite=10', idSinPermiso));
    expect([p1.data.items.length, p1.data.hayMas, p2.data.items.length, p2.data.hayMas]).toEqual([10, true, 2, false]);
    expect((await llamar('/notificaciones?limite=999', idSinPermiso)).status).toBe(400);
    await vaciar();
  });
});
