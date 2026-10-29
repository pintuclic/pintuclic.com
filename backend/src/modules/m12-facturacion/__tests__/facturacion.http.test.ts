import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type NextFunction, type Request, type Response } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';

/**
 * M12 contra PostgreSQL real (se activa con `M01_TEST_DATABASE_URL`): numeración sin saltos ni repetidos, un comprobante por
 * orden, inmutabilidad de lo emitido y acceso por titular. Los pedidos llevan un prefijo propio.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8).toUpperCase();
/** Un usuario del seed: la ficha guarda quién la editó (clave foránea). */
const PERSONAL = 1;

describe.skipIf(URL_BD === undefined)('M12 · comprobantes (HTTP + PostgreSQL)', () => {
  let servidor: Server;
  let base = '';
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let idLaura = 0;
  let idOtro = 0;
  const avisar = vi.fn(async () => undefined);
  const codigos: string[] = [];

  const llamar = (ruta: string, usuario: number | null, tipo: 'cliente' | 'admin' = 'cliente', init: RequestInit = {}) =>
    fetch(`${base}${ruta}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(usuario === null ? {} : { 'x-test-user': String(usuario), 'x-test-tipo': tipo }), ...(init.headers ?? {}) },
    });

  const crearOrden = async (cod: string, idUsuario: number, extra: Record<string, unknown> = {}): Promise<string> => {
    const codigo = `PC-${ALEATORIO}-${cod}`;
    await prisma.orden.create({
      data: {
        codigoVisible: codigo, idUsuario, estado: 'orden_confirmada', modoEntrega: 'recogida', subTotal: 120000, descuento: 0, total: 120000,
        baseSinImpuesto: 100840.34, importeIva: 19159.66, tasaIva: 19,
        lineas: { create: [{ nombreProducto: `${ALEATORIO} Pintura`, varianteCopia: '1 galón', precioAplicado: 60000, precioInicial: 60000, cantidad: 2, colorSolicitado: 'Azul' }] },
        ...extra,
      },
    });
    codigos.push(codigo);
    return codigo;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { construirModuloM12 } = await import('../m12.routes.js');

    const rol = await prisma.rol.findFirstOrThrow({ where: { nombre: 'cliente' } });
    idLaura = (await prisma.usuario.create({ data: { nombre: `Laura ${ALEATORIO}`, correo: `laura.${ALEATORIO}@test.co`, contrasena: 'x', idRol: rol.idRol } })).idUsuario;
    idOtro = (await prisma.usuario.create({ data: { nombre: `Otro ${ALEATORIO}`, correo: `otro.${ALEATORIO}@test.co`, contrasena: 'x', idRol: rol.idRol } })).idUsuario;

    await prisma.datosFacturacion.deleteMany();
    const autorizacion = { exigirPermiso: async (actor: { idUsuario: number }) => actor.idUsuario === PERSONAL } as unknown as AutorizacionService;
    const modulo = construirModuloM12(autorizacion, { aviso: { avisar } });
    const app = express();
    app.use(express.json());
    const autenticar = (req: Request, res: Response, next: NextFunction): void => {
      const usuario = req.header('x-test-user');
      if (usuario === undefined) {
        res.status(404).json({ success: false, error: { code: 'RECURSO_NO_DISPONIBLE', message: 'El recurso solicitado no está disponible.' } });
        return;
      }
      req.actor = { idUsuario: Number(usuario), idSesion: 's', tipoSesion: req.header('x-test-tipo') === 'admin' ? 'admin' : 'cliente' };
      next();
    };
    app.use('/api/v1/facturacion', autenticar, modulo.router);
    app.use('/api/v1/admin/facturacion', autenticar, modulo.adminRouter);
    await new Promise<void>((r) => {
      servidor = app.listen(0, () => {
        base = `http://127.0.0.1:${String((servidor.address() as AddressInfo).port)}/api/v1`;
        r();
      });
    });
  });

  afterAll(async () => {
    // Los comprobantes son inmutables (disparador): para limpiar se desactivan los disparadores solo en esta transacción.
    await prisma
      .$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL session_replication_role = replica`;
        await tx.$executeRaw`DELETE FROM linea_comprobante_venta WHERE id_comprobante IN (SELECT id_comprobante FROM comprobante_venta WHERE id_orden IN (SELECT id_orden FROM orden WHERE codigo_visible LIKE ${`PC-${ALEATORIO}-%`}))`;
        await tx.$executeRaw`DELETE FROM comprobante_venta WHERE id_orden IN (SELECT id_orden FROM orden WHERE codigo_visible LIKE ${`PC-${ALEATORIO}-%`})`;
      })
      .catch(() => undefined);
    await prisma.lineaOrden.deleteMany({ where: { nombreProducto: { startsWith: ALEATORIO } } });
    await prisma.orden.deleteMany({ where: { codigoVisible: { startsWith: `PC-${ALEATORIO}-` } } });
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: [idLaura, idOtro] } } });
    await new Promise<void>((r) => servidor.close(() => r()));
    await prisma.$disconnect();
  });

  it('R6: sin datos del vendedor el personal ve qué falta y el cliente un 404', async () => {
    const codigo = await crearOrden('A1', idLaura);
    const personal = await llamar(`/facturacion/gestion/${codigo}`, PERSONAL, 'admin');
    expect(personal.status).toBe(409);
    expect((await personal.json()).error.code).toBe('DATOS_VENDEDOR_INCOMPLETOS');
    expect((await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).status).toBe(404);
  });

  it('R6: el personal con permiso guarda la ficha; otro usuario no (404 opaco)', async () => {
    const cuerpo = JSON.stringify({ razonSocial: 'Pintu Clic S.A.S.', nit: '900.123.456-7', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá', pieLegal: 'Documento sin validez fiscal ante la DIAN.' });
    expect((await llamar('/admin/facturacion/datos', idLaura, 'cliente', { method: 'PUT', body: cuerpo })).status).toBe(404);
    const ok = await llamar('/admin/facturacion/datos', PERSONAL, 'admin', { method: 'PUT', body: cuerpo });
    expect(ok.status).toBe(200);
    expect((await ok.json()).data.faltantes).toEqual([]);
    expect((await llamar('/admin/facturacion/datos', PERSONAL, 'admin', { method: 'PUT', body: JSON.stringify({ correo: 'no-es-correo' }) })).status).toBe(400);
  });

  it('R2, R4: se emite al primer GET con número CV-NNNNNN y la misma orden no gasta otro', async () => {
    const codigo = await crearOrden('B1', idLaura);
    const a = await (await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).json();
    const b = await (await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).json();
    expect(a.data.numero).toMatch(/^CV-\d{6}$/);
    expect(b.data.numero).toBe(a.data.numero);
    expect(a.data).toMatchObject({ codigoOrden: codigo, total: 120000, iva: 19159.66, vendedor: { razonSocial: 'Pintu Clic S.A.S.' }, comprador: { direccion: 'Recogida en almacén' } });
    expect(a.data.lineas).toHaveLength(1);
  });

  it('R4: ocho órdenes pedidas a la vez reciben números distintos y seguidos, sin saltos', async () => {
    const todos = await Promise.all(Array.from({ length: 8 }, (_, i) => crearOrden(`C${i}`, idLaura)));
    const antes = await prisma.consecutivo.findUnique({ where: { nombre: 'comprobante' } });
    const respuestas = await Promise.all(todos.map(async (c) => (await llamar(`/facturacion/mis-comprobantes/${c}`, idLaura)).json()));
    const numeros = respuestas.map((r) => Number((r.data.numero as string).slice(3))).sort((x, y) => x - y);
    expect(new Set(numeros).size).toBe(8);
    expect(numeros[7]! - numeros[0]!).toBe(7);
    expect(numeros[0]).toBe(Number(antes?.ultimoValor ?? 0) + 1);
  });

  it('R1: la misma orden pedida a la vez tiene un solo comprobante y no se salta ningún número', async () => {
    const codigo = await crearOrden('D1', idLaura);
    const antes = Number((await prisma.consecutivo.findUnique({ where: { nombre: 'comprobante' } }))?.ultimoValor ?? 0);
    const r = await Promise.all(Array.from({ length: 6 }, async () => (await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).json()));
    expect(new Set(r.map((x) => x.data.numero)).size).toBe(1);
    expect(await prisma.comprobanteVenta.count({ where: { orden: { codigoVisible: codigo } } })).toBe(1);
    expect(Number((await prisma.consecutivo.findUnique({ where: { nombre: 'comprobante' } }))?.ultimoValor)).toBe(antes + 1);
  });

  it('R8: otro cliente recibe el mismo 404 que un comprobante inexistente; el personal lo ve', async () => {
    const codigo = await crearOrden('E1', idLaura);
    await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura);
    const ajeno = await llamar(`/facturacion/mis-comprobantes/${codigo}`, idOtro);
    const inexistente = await llamar(`/facturacion/mis-comprobantes/PC-NO-EXISTE`, idOtro);
    expect(ajeno.status).toBe(404);
    expect(await ajeno.json()).toEqual(await inexistente.json());
    expect((await llamar(`/facturacion/gestion/${codigo}`, PERSONAL, 'admin')).status).toBe(200);
    // Una sesión de cliente nunca entra a /gestion, aunque tuviera el permiso.
    expect((await llamar(`/facturacion/gestion/${codigo}`, PERSONAL, 'cliente')).status).toBe(404);
  });

  it('R3: lo emitido es inmutable: la base rechaza UPDATE y DELETE; y un cambio posterior de datos no lo altera', async () => {
    const codigo = await crearOrden('F1', idLaura);
    const emitido = await (await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).json();
    await expect(prisma.comprobanteVenta.updateMany({ where: { numero: emitido.data.numero }, data: { total: 1 } })).rejects.toThrow();
    await expect(prisma.comprobanteVenta.deleteMany({ where: { numero: emitido.data.numero } })).rejects.toThrow();
    await llamar('/admin/facturacion/datos', PERSONAL, 'admin', { method: 'PUT', body: JSON.stringify({ razonSocial: 'Otra Razón', nit: '1', direccion: 'Otra' }) });
    const despues = await (await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).json();
    expect(despues.data.vendedor.razonSocial).toBe('Pintu Clic S.A.S.');
  });

  it('R5: una orden sin desglose de IVA no tiene comprobante', async () => {
    const codigo = await crearOrden('G1', idLaura, { baseSinImpuesto: null, importeIva: null, tasaIva: null });
    expect((await llamar(`/facturacion/mis-comprobantes/${codigo}`, idLaura)).status).toBe(404);
  });

  it('R9: reenviar exige ventas.gestionar y avisa al correo del comprador', async () => {
    const codigo = await crearOrden('H1', idLaura);
    avisar.mockClear();
    expect((await llamar(`/facturacion/gestion/${codigo}/reenviar`, idLaura, 'admin', { method: 'POST' })).status).toBe(404);
    const ok = await llamar(`/facturacion/gestion/${codigo}/reenviar`, PERSONAL, 'admin', { method: 'POST' });
    expect(ok.status).toBe(200);
    expect(avisar).toHaveBeenCalledWith(`laura.${ALEATORIO}@test.co`, expect.objectContaining({ codigoOrden: codigo, numero: expect.stringMatching(/^CV-\d{6}$/) }));
  });
});
