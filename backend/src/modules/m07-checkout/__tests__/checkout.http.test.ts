import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AutorizacionService, type ResolutorPermisos } from '../../m20-seguridad/services/autorizacion.service';
import {
  errorCheckoutEnvelopeSchema,
  listarSolicitudesResponseEnvelopeSchema,
  prepararCheckoutResponseEnvelopeSchema,
  solicitudResponseEnvelopeSchema,
} from '../dtos/m07-checkout.dto';
import { construirModuloM07 } from '../m07.routes';
import { CarritoFalso, OrdenesFalsas, PasarelaFalsa, perfilFalso, PreciosFalso, RepoMemoria } from './helpers/dobles';

/**
 * HTTP de M07 con los routers y las guardas de verdad. Solo se simula QUIÉN es el actor (cabecera `x-actor`) y sus
 * permisos, como en las pruebas de M21; sin actor, la ruta responde 401 como `auth.middleware`.
 */
const CLIENTE = 50;
const LECTOR = 2;
const GESTOR = 3;
const PERMISOS: Record<number, readonly string[]> = {
  [CLIENTE]: ['ventas.ver'],
  [LECTOR]: ['ventas.ver'],
  [GESTOR]: ['ventas.ver', 'ventas.gestionar'],
};

let servidor: Server;
let base = '';
const pasarela = new PasarelaFalsa();

beforeAll(async () => {
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) => Promise.resolve(PERMISOS[idUsuario]?.includes(codigo) === true),
  };
  const modulo = construirModuloM07(new AutorizacionService(resolutor, { registrarAccesoDenegado: vi.fn() }), {
    carrito: new CarritoFalso(),
    precios: new PreciosFalso(),
    ordenes: new OrdenesFalsas(),
    pasarela,
    perfil: perfilFalso,
    repo: new RepoMemoria(),
    tareaPeriodica: false,
    reloj: () => new Date('2026-10-27T15:00:00.000Z'),
  });
  const app: Express = express();
  app.use(express.json());
  const sesion: express.RequestHandler = (req, res, next) => {
    const id = req.header('x-actor');
    if (id === undefined) {
      res.status(401).json({ success: false, error: { code: 'NO_AUTENTICADO', message: 'Inicie sesión.', details: null } });
      return;
    }
    req.actor = { idUsuario: Number(id), idSesion: 'sid', tipoSesion: Number(id) === CLIENTE ? 'cliente' : 'admin' };
    next();
  };
  app.use('/api/v1/checkout/wompi', modulo.wompiRouter);
  app.use('/api/v1/checkout', sesion, modulo.clienteRouter);
  app.use('/api/v1/admin/pagos', sesion, modulo.adminRouter);
  servidor = await new Promise((r) => {
    const s = app.listen(0, () => r(s));
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/v1`;
});

afterAll(() => new Promise<void>((r) => servidor.close(() => r())));

async function pedir(metodo: 'GET' | 'POST', ruta: string, actor: number | null, cuerpo?: unknown): Promise<{ status: number; cuerpo: unknown }> {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(actor === null ? {} : { 'x-actor': String(actor) }) },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
  const texto = await r.text();
  return { status: r.status, cuerpo: texto === '' ? null : (JSON.parse(texto) as unknown) };
}

const solicitud = {
  pantalla: { lineas: [{ idLinea: 1, subtotal: 100_000 }], total: 100_000 },
  modoEntrega: 'recogida',
  direccion: null,
  celularNequi: '3991111111',
  aceptaciones: { tokenAceptacion: 'acc', tokenDatosPersonales: 'pd', aceptaTerminos: true },
};

describe('M07 · HTTP', () => {
  it('R1: sin sesión 401; una sesión de personal no compra (404)', async () => {
    expect((await pedir('GET', '/checkout/preparar', null)).status).toBe(401);
    expect((await pedir('GET', '/checkout/preparar', GESTOR)).status).toBe(404);
    const r = await pedir('GET', '/checkout/preparar', CLIENTE);
    expect(r.status).toBe(200);
    expect(prepararCheckoutResponseEnvelopeSchema.safeParse(r.cuerpo).success).toBe(true);
  });

  it('R2: crea la solicitud (201) y valida el cuerpo (400)', async () => {
    const r = await pedir('POST', '/checkout/solicitudes', CLIENTE, solicitud);
    expect(r.status).toBe(201);
    expect(solicitudResponseEnvelopeSchema.safeParse(r.cuerpo).success).toBe(true);
    const mal = await pedir('POST', '/checkout/solicitudes', CLIENTE, { ...solicitud, celularNequi: '123' });
    expect(mal.status).toBe(400);
    expect(errorCheckoutEnvelopeSchema.safeParse(mal.cuerpo).success).toBe(true);
    expect((await pedir('GET', '/checkout/solicitudes/SOL-2026-00001', CLIENTE)).status).toBe(200);
    expect((await pedir('GET', '/checkout/solicitudes/no-es-codigo', CLIENTE)).status).toBe(400);
  });

  it('R19: la página de Wompi no pide celular ni casillas; Nequi sí', async () => {
    const { celularNequi: _c, aceptaciones: _a, ...sinNequi } = solicitud;
    expect((await pedir('POST', '/checkout/solicitudes', CLIENTE, { ...sinNequi, medio: 'nequi' })).status).toBe(400);
    expect((await pedir('POST', '/checkout/solicitudes', CLIENTE, sinNequi)).status).toBe(400);
    expect((await pedir('POST', '/checkout/solicitudes', CLIENTE, { ...sinNequi, medio: 'tarjeta' })).status).toBe(400);
  });

  it('R5: el aviso de Wompi no pide sesión; sin firma válida responde 401', async () => {
    pasarela.firmaOk = false;
    const r = await pedir('POST', '/checkout/wompi/eventos', null, { event: 'transaction.updated' });
    expect(r.status).toBe(401);
    pasarela.firmaOk = true;
    expect((await pedir('POST', '/checkout/wompi/eventos', null, { event: 'otro' })).status).toBe(200);
  });

  it('R16: el panel exige personal y permiso; un cliente con el permiso por su rol recibe 404', async () => {
    expect((await pedir('GET', '/admin/pagos', CLIENTE)).status).toBe(404);
    const lista = await pedir('GET', '/admin/pagos', LECTOR);
    expect(lista.status).toBe(200);
    expect(listarSolicitudesResponseEnvelopeSchema.safeParse(lista.cuerpo).success).toBe(true);
    expect((await pedir('POST', '/admin/pagos/SOL-2026-00001/consultar-wompi', LECTOR)).status).toBe(404);
    expect((await pedir('POST', '/admin/pagos/SOL-2026-00001/consultar-wompi', GESTOR)).status).toBe(200);
  });

  it('R18: filtra por periodo de Colombia y por cliente, y el resumen cuenta todo lo filtrado', async () => {
    const leer = async (q: string) => {
      const r = await pedir('GET', `/admin/pagos${q}`, LECTOR);
      expect(r.status).toBe(200);
      const sobre = listarSolicitudesResponseEnvelopeSchema.parse(r.cuerpo);
      expect(sobre.resumen.cantidad).toBe(sobre.pagination.total);
      return sobre;
    };
    const todas = await leer('');
    expect(todas.pagination.total).toBeGreaterThan(0);
    // La compra se creó el 27 de octubre a las 10:00 en Colombia.
    expect((await leer('?desde=2026-10-27&hasta=2026-10-27')).pagination.total).toBe(todas.pagination.total);
    expect((await leer('?desde=2026-10-28')).pagination.total).toBe(0);
    expect((await leer('?hasta=2026-10-26')).resumen).toEqual({ cantidad: 0, pagadas: 0, totalPagado: 0 });
    expect((await leer(`?idCliente=${CLIENTE}`)).pagination.total).toBe(todas.pagination.total);
    expect((await leer('?idCliente=999')).pagination.total).toBe(0);
    expect((await pedir('GET', '/admin/pagos?desde=2026-10-28&hasta=2026-10-27', LECTOR)).status).toBe(400);
    expect((await pedir('GET', '/admin/pagos?desde=2026-02-30', LECTOR)).status).toBe(400);
  });
});
