import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type NextFunction, type Request, type Response } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';

/**
 * M19 contra PostgreSQL real (se activa con `M01_TEST_DATABASE_URL`). Los datos viven en marzo de 2017, un mes que ninguna
 * otra prueba toca, con un nombre propio por producto y por cliente, y se borran al terminar.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8).toUpperCase();
const MARZO = '?desde=2017-03-01&hasta=2017-03-31';

/** Cada «usuario» de prueba trae sus permisos: 1 todo; 2 solo ver; 3 ver + clientes; 4 sin ninguno. */
const PERMISOS: Record<number, string[]> = {
  1: ['ventas.ver', 'ventas.exportar', 'personal.ver'],
  2: ['ventas.ver'],
  3: ['ventas.ver', 'personal.ver'],
  4: [],
};

describe.skipIf(URL_BD === undefined)('M19 · reportes (HTTP + PostgreSQL)', () => {
  let servidor: Server;
  let base = '';
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const ids: number[] = [];
  const registrarAccion = vi.fn(async () => undefined);

  const get = (ruta: string, usuario: number | null, tipo: 'admin' | 'cliente' = 'admin') =>
    fetch(`${base}${ruta}`, { headers: usuario === null ? {} : { 'x-test-user': String(usuario), 'x-test-tipo': tipo } });

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { construirModuloM19 } = await import('../m19.routes.js');

    const rol = await prisma.rol.findFirstOrThrow({ where: { nombre: 'cliente' } });
    const usuario = async (nombre: string): Promise<number> => {
      const u = await prisma.usuario.create({ data: { nombre: `${nombre} ${ALEATORIO}`, correo: `${nombre.toLowerCase()}.${ALEATORIO}@test.co`, contrasena: 'x', idRol: rol.idRol } });
      ids.push(u.idUsuario);
      return u.idUsuario;
    };
    const idA = await usuario('Ana');
    const idB = await usuario('Beto');
    const idC = await usuario('Empresa');
    await prisma.cuentaEmpresa.create({ data: { idUsuario: idC, nit: `9${ALEATORIO}-1`, nombreEmpresa: `ZZ Empresa ${ALEATORIO}`, nombreRepresentante: 'Rep', correoEmpresarial: `e.${ALEATORIO}@test.co`, telefono: '3000000000' } });

    let n = 0;
    const orden = async (idUsuario: number, fecha: string, estado: 'entregado' | 'despachado' | 'cancelado', sub: number, descuento: number, lineas: Array<[string, number, number]>, extra: { modo?: 'domicilio' | 'recogida'; cupon?: number } = {}) => {
      n += 1;
      const total = sub - descuento;
      const o = await prisma.orden.create({
        data: {
          codigoVisible: `RPT-${ALEATORIO}-${String(n)}`, idUsuario, estado, fecha: new Date(`${fecha}T00:00:00.000Z`), modoEntrega: extra.modo ?? 'recogida', direccion: extra.modo === 'domicilio' ? 'Calle 1 # 2-3' : null,
          subTotal: sub, descuento, total, baseSinImpuesto: Math.round((total / 1.19) * 100) / 100, importeIva: total - Math.round((total / 1.19) * 100) / 100, tasaIva: 19,
          lineas: { create: lineas.map(([nombre, cantidad, precio]) => ({ nombreProducto: `${ALEATORIO} ${nombre}`, varianteCopia: 'x', precioAplicado: precio, cantidad })) },
        },
        include: { lineas: true },
      });
      if (extra.cupon !== undefined && o.lineas[0] !== undefined) {
        await prisma.lineaOrdenDescuento.create({ data: { idLineaOrden: o.lineas[0].idLineaOrden, ordenAplicacion: 1, origen: `Cupón ${ALEATORIO}`, importe: extra.cupon } });
      }
    };
    await orden(idA, '2017-02-10', 'entregado', 40000, 0, [['Lija', 4, 10000]]); // mes anterior: Ana NO es nueva en marzo
    await orden(idA, '2017-03-02', 'entregado', 200000, 20000, [['Pintura', 2, 90000], ['Brocha', 1, 20000]], { cupon: 20000 });
    await orden(idB, '2017-03-02', 'entregado', 50000, 0, [['Brocha', 5, 10000]], { modo: 'domicilio' });
    await orden(idC, '2017-03-15', 'despachado', 300000, 0, [['Pintura', 3, 100000]]);
    await orden(idA, '2017-03-20', 'cancelado', 99999, 0, [['Pintura', 1, 99999]]); // no cuenta como venta
    await orden(idA, '2017-03-25', 'entregado', 10000, 0, [['Lija', 1, 10000]]);

    const autorizacion = {
      exigirPermiso: async (actor: { idUsuario: number }, permiso: string) => (PERMISOS[actor.idUsuario] ?? []).includes(permiso),
    } as unknown as AutorizacionService;
    const modulo = construirModuloM19(autorizacion, { auditoria: { registrarAccesoDenegado: async () => undefined, registrarAccion } });
    const app = express();
    const autenticar = (req: Request, res: Response, next: NextFunction): void => {
      const u = req.header('x-test-user');
      if (u === undefined) {
        res.status(404).json({ success: false, error: { code: 'RECURSO_NO_DISPONIBLE', message: 'El recurso solicitado no está disponible.' } });
        return;
      }
      req.actor = { idUsuario: Number(u), idSesion: 's', tipoSesion: req.header('x-test-tipo') === 'cliente' ? 'cliente' : 'admin' };
      next();
    };
    app.use('/api/v1/admin/reportes', autenticar, modulo.router);
    await new Promise<void>((r) => {
      servidor = app.listen(0, () => {
        base = `http://127.0.0.1:${String((servidor.address() as AddressInfo).port)}/api/v1/admin/reportes`;
        r();
      });
    });
  });

  afterAll(async () => {
    await prisma.lineaOrdenDescuento.deleteMany({ where: { origen: { contains: ALEATORIO } } });
    await prisma.lineaOrden.deleteMany({ where: { nombreProducto: { startsWith: ALEATORIO } } });
    await prisma.orden.deleteMany({ where: { codigoVisible: { startsWith: `RPT-${ALEATORIO}-` } } });
    await prisma.cuentaEmpresa.deleteMany({ where: { idUsuario: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: ids } } });
    await new Promise<void>((r) => servidor.close(() => r()));
    await prisma.$disconnect();
  });

  it('R2, R3, R4: el resumen cuenta solo ventas, copia los importes y compara con el mes anterior', async () => {
    const { data } = await (await get(`/resumen${MARZO}`, 1)).json();
    expect(data.actual).toMatchObject({ ordenes: 4, unidades: 2 + 1 + 5 + 3 + 1, ventasBrutas: 560000, descuentos: 20000, totalCobrado: 540000, ticketPromedio: 135000 });
    expect(data.anterior).toMatchObject({ ordenes: 1, totalCobrado: 40000 });
    expect(data.variacion).toMatchObject({ ordenes: 300, totalCobrado: 1250 });
    expect(data.porEstado).toHaveLength(8);
    expect(data.porEstado.find((e: { estado: string }) => e.estado === 'cancelado')).toMatchObject({ ordenes: 1, total: 99999 });
    expect(data.porEstado.find((e: { estado: string }) => e.estado === 'entregado').ordenes).toBe(3);
  });

  it('R5: serie por mes, semana y año, sin huecos', async () => {
    const mes = (await (await get('/serie?desde=2017-01-01&hasta=2017-04-30&agrupar=mes', 1)).json()).data;
    expect(mes.puntos.map((p: { periodo: string; ordenes: number }) => [p.periodo, p.ordenes])).toEqual([['2017-01-01', 0], ['2017-02-01', 1], ['2017-03-01', 4], ['2017-04-01', 0]]);
    const semana = (await (await get(`/serie${MARZO}&agrupar=semana`, 1)).json()).data;
    expect(semana.puntos[0].periodo).toBe('2017-02-27'); // el lunes que contiene el 1 de marzo
    expect(semana.puntos.reduce((s: number, p: { totalCobrado: number }) => s + p.totalCobrado, 0)).toBe(540000);
    const anio = (await (await get('/serie?desde=2016-06-01&hasta=2018-02-01&agrupar=anio', 1)).json()).data;
    expect(anio.puntos.map((p: { periodo: string; ordenes: number }) => [p.periodo, p.ordenes])).toEqual([['2016-01-01', 0], ['2017-01-01', 5], ['2018-01-01', 0]]);
  });

  it('R6: ventas por producto, por tipo de cliente y por modo de entrega, con su participación', async () => {
    const prod = (await (await get(`/ventas-por/producto${MARZO}`, 1)).json()).data;
    expect(prod.filas.map((f: { etiqueta: string; importe: number }) => [f.etiqueta.replace(`${ALEATORIO} `, ''), f.importe])).toEqual([['Pintura', 480000], ['Brocha', 70000], ['Lija', 10000]]);
    expect(prod.total.importe).toBe(560000);
    const tipo = (await (await get(`/ventas-por/tipo_cliente${MARZO}`, 1)).json()).data;
    expect(tipo.filas.map((f: { clave: string; importe: number; participacion: number }) => [f.clave, f.importe, f.participacion])).toEqual([['empresa', 300000, 53.6], ['persona', 260000, 46.4]]);
    const entrega = (await (await get(`/ventas-por/modo_entrega${MARZO}`, 1)).json()).data;
    expect(entrega.filas.map((f: { clave: string }) => f.clave).sort()).toEqual(['domicilio', 'recogida']);
    const cat = (await (await get(`/ventas-por/categoria${MARZO}`, 1)).json()).data;
    expect(cat.filas[0].etiqueta).toBe('Sin clasificar'); // las líneas de la prueba no apuntan a una variante
    expect((await get(`/ventas-por/color${MARZO}`, 1)).status).toBe(400);
    const limite = (await (await get(`/ventas-por/producto${MARZO}&limite=1&orden=unidades`, 1)).json()).data;
    expect(limite.filas).toHaveLength(1);
    expect(limite.filas[0].etiqueta).toContain('Brocha'); // 6 unidades: más que Pintura (5)
  });

  it('R7: descuentos por origen', async () => {
    const { data } = await (await get(`/descuentos${MARZO}`, 1)).json();
    expect(data.totalDescuentos).toBe(20000);
    expect(data.filas[0]).toMatchObject({ origen: `Cupón ${ALEATORIO}`, lineasAfectadas: 1, ordenes: 1, importe: 20000 });
  });

  it('R9: el top de clientes lleva nombres y la razón social de la empresa, y exige ventas.ver + personal.ver', async () => {
    const { data } = await (await get(`/clientes${MARZO}`, 1)).json();
    expect(data.filas.map((f: { nombre: string; tipo: string; totalCobrado: number }) => [f.nombre, f.tipo, f.totalCobrado])).toEqual([
      [`ZZ Empresa ${ALEATORIO}`, 'empresa', 300000], [`Ana ${ALEATORIO}`, 'persona', 190000], [`Beto ${ALEATORIO}`, 'persona', 50000],
    ]);
    expect(JSON.stringify(data)).not.toContain('@');
    expect((await get(`/clientes${MARZO}`, 2)).status).toBe(404);
    expect((await get(`/clientes${MARZO}`, 3)).status).toBe(200);
  });

  it('R14: compradores nuevos y recurrentes (solo cifras)', async () => {
    const { data } = await (await get(`/compradores${MARZO}`, 1)).json();
    expect(data).toMatchObject({ compradores: 3, nuevos: 2, recurrentes: 1, compraronMasDeUnaVez: 1, ordenesPorComprador: 1.3 });
  });

  it('R8, R10: postventa y facturación responden con su forma', async () => {
    const f = (await (await get(`/facturacion${MARZO}`, 1)).json()).data;
    expect(f).toMatchObject({ ventas: 4, conComprobante: 0, sinComprobante: 4 });
    const p = (await (await get(`/postventa${MARZO}`, 1)).json()).data;
    expect(p).toMatchObject({ solicitudes: 0, reembolsos: { cantidad: 0, totalReembolsado: 0 } });
  });

  it('R1: un rango inválido es 400 RANGO_INVALIDO y las fechas mal escritas, 400 de validación', async () => {
    const r = await get('/resumen?desde=2017-03-10&hasta=2017-03-01', 1);
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe('RANGO_INVALIDO');
    const v = await get('/resumen?desde=ayer', 1);
    expect(v.status).toBe(400);
    expect((await v.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('R12: sin sesión, con sesión de cliente o sin permiso: el mismo 404 opaco', async () => {
    const sinSesion = await get(`/resumen${MARZO}`, null);
    const cliente = await get(`/resumen${MARZO}`, 1, 'cliente');
    const sinPermiso = await get(`/resumen${MARZO}`, 4);
    for (const r of [sinSesion, cliente, sinPermiso]) expect(r.status).toBe(404);
    expect(await cliente.json()).toEqual(await sinPermiso.json());
  });

  it('R11: el CSV exige ventas.exportar, trae BOM, ; y coma decimal, y queda auditado', async () => {
    expect((await get(`/resumen${MARZO}&formato=csv`, 2)).status).toBe(404); // puede ver, no exportar
    registrarAccion.mockClear();
    const r = await get(`/ventas-por/producto${MARZO}&formato=csv`, 1);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/csv');
    expect(r.headers.get('content-disposition')).toContain('reporte-ventas-por-producto-2017-03-01_2017-03-31.csv');
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM de UTF-8 (fetch().text() lo quitaría)
    const texto = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/, '');
    expect(texto).toContain('Nombre;Órdenes;Unidades;Importe;Participación (%)');
    expect(texto).toContain(`${ALEATORIO} Pintura;2;5;480000;85,7`);
    expect(registrarAccion).toHaveBeenCalledWith(expect.objectContaining({ idUsuario: 1, accion: 'reportes.ventas-por-producto.exportar', valorNuevo: '2017-03-01..2017-03-31', resultado: 'exito' }));
    // El JSON no pide ventas.exportar ni audita.
    registrarAccion.mockClear();
    expect((await get(`/resumen${MARZO}`, 2)).status).toBe(200);
    expect(registrarAccion).not.toHaveBeenCalled();
  });
});
