import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutorizacionService, type ResolutorPermisos } from '../../m20-seguridad/services/autorizacion.service';
import {
  cotizacionResponseEnvelopeSchema,
  errorCotizacionesEnvelopeSchema,
  listarCotizacionesResponseEnvelopeSchema,
} from '../dtos/m21-cotizaciones.dto';
import { construirModuloM21 } from '../m21.routes';
import { CarritoEjemplo, CotizacionesMemoriaRepository } from './helpers/dobles';

/**
 * HTTP de M21 con los routers y la guarda de permisos de verdad. Solo se simula QUIÉN es el actor (cabecera
 * `x-actor`) y sus permisos, como en las pruebas de M06; sin actor, la ruta responde 401 como `auth.middleware`.
 */
const ANA = 50;
const LECTOR = 2;
const GESTOR = 3;
const PERMISOS: Record<number, readonly string[]> = {
  [LECTOR]: ['ventas.ver'],
  [GESTOR]: ['ventas.ver', 'ventas.gestionar'],
};

interface Respuesta {
  status: number;
  cuerpo: unknown;
}

let servidor: Server;
let base = '';
let repo: CotizacionesMemoriaRepository;
const carrito = new CarritoEjemplo();

beforeAll(async () => {
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) => Promise.resolve(PERMISOS[idUsuario]?.includes(codigo) === true),
  };
  repo = new CotizacionesMemoriaRepository(() => new Date('2026-10-26T15:00:00.000Z'));
  const modulo = construirModuloM21(new AutorizacionService(resolutor, { registrarAccesoDenegado: vi.fn() }), {
    carrito,
    repo,
    reloj: () => new Date('2026-10-26T15:00:00.000Z'),
  });
  const app: Express = express();
  app.use(express.json());
  const sesion: express.RequestHandler = (req, res, next) => {
    const id = req.header('x-actor');
    if (id === undefined) {
      res.status(401).json({ success: false, error: { code: 'NO_AUTENTICADO', message: 'Inicie sesión.', details: null } });
      return;
    }
    req.actor = { idUsuario: Number(id), idSesion: 'sid', tipoSesion: Number(id) === ANA ? 'cliente' : 'admin' };
    next();
  };
  app.use('/api/v1/cotizaciones', sesion, modulo.clienteRouter);
  app.use('/api/v1/admin/cotizaciones', sesion, modulo.adminRouter);
  servidor = await new Promise((r) => {
    const s = app.listen(0, () => r(s));
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/v1`;
});

afterAll(() => new Promise<void>((r) => servidor.close(() => r())));

beforeEach(() => {
  repo.filas = [];
  carrito.lineas = [{ idVariante: 1, idColor: 13, cantidad: 2, precio: 100_000 }];
});

async function pedir(metodo: 'GET' | 'POST' | 'PUT', ruta: string, actor: number | null, cuerpo?: unknown): Promise<Respuesta> {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(actor === null ? {} : { 'x-actor': String(actor) }) },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
  return { status: r.status, cuerpo: (await r.json()) as unknown };
}

describe('M21 · HTTP', () => {
  it('sin sesión no se puede pedir ni ver (R1)', async () => {
    expect((await pedir('POST', '/cotizaciones', null, {})).status).toBe(401);
    expect((await pedir('GET', '/cotizaciones', null)).status).toBe(401);
  });

  it('el cliente pide, ve su lista y su detalle con el envelope del contrato', async () => {
    const creada = await pedir('POST', '/cotizaciones', ANA, { comentario: 'Obra' });
    expect(creada.status).toBe(200);
    const c = cotizacionResponseEnvelopeSchema.parse(creada.cuerpo).data;
    const lista = listarCotizacionesResponseEnvelopeSchema.parse((await pedir('GET', '/cotizaciones', ANA)).cuerpo);
    expect(lista.pagination).toEqual({ pagina: 1, limite: 20, total: 1, totalPaginas: 1 });
    expect(cotizacionResponseEnvelopeSchema.parse((await pedir('GET', `/cotizaciones/${c.idCotizacion}`, ANA)).cuerpo).data.codigo).toBe(
      c.codigo,
    );
  });

  it('el panel exige ventas.ver para ver y ventas.gestionar para responder; si no, 404 opaco (R12)', async () => {
    const c = cotizacionResponseEnvelopeSchema.parse((await pedir('POST', '/cotizaciones', ANA, {})).cuerpo).data;
    const ajuste = {
      lineas: c.lineas.map((l) => ({ idLinea: l.idLinea, cantidad: l.cantidad, precioAcordado: 90_000 })),
      notaParaCliente: null,
      fechaVencimiento: null,
    };
    for (const r of [
      await pedir('GET', '/admin/cotizaciones', ANA),
      await pedir('GET', `/admin/cotizaciones/${c.idCotizacion}`, ANA),
      await pedir('PUT', `/admin/cotizaciones/${c.idCotizacion}`, LECTOR, ajuste),
      await pedir('POST', `/admin/cotizaciones/${c.idCotizacion}/enviar`, LECTOR),
    ]) {
      expect(r.status).toBe(404);
      expect(errorCotizacionesEnvelopeSchema.parse(r.cuerpo).error.code).toBe('RECURSO_NO_DISPONIBLE');
    }
    expect((await pedir('GET', '/admin/cotizaciones?estado=solicitada', LECTOR)).status).toBe(200);
    expect((await pedir('PUT', `/admin/cotizaciones/${c.idCotizacion}`, GESTOR, ajuste)).status).toBe(200);
    const enviada = await pedir('POST', `/admin/cotizaciones/${c.idCotizacion}/enviar`, GESTOR);
    expect(cotizacionResponseEnvelopeSchema.parse(enviada.cuerpo).data).toMatchObject({ estado: 'enviada', totalAcordado: 180_000 });
    const aceptada = await pedir('POST', `/cotizaciones/${c.idCotizacion}/aceptar`, ANA);
    expect(cotizacionResponseEnvelopeSchema.parse(aceptada.cuerpo).data.estado).toBe('aprobada');
  });

  it('valida params, query y body con 400 PARAMETRO_INVALIDO', async () => {
    for (const r of [
      await pedir('GET', '/cotizaciones/abc', ANA),
      await pedir('GET', '/cotizaciones?estado=inventado', ANA),
      await pedir('POST', '/cotizaciones', ANA, { comentario: 'x'.repeat(501) }),
      await pedir('PUT', '/admin/cotizaciones/1', GESTOR, { lineas: [], notaParaCliente: null, fechaVencimiento: null }),
      await pedir('POST', '/admin/cotizaciones/1/rechazar', GESTOR, { motivo: '  ' }),
    ]) {
      expect(r.status).toBe(400);
      expect(errorCotizacionesEnvelopeSchema.parse(r.cuerpo).error.code).toBe('PARAMETRO_INVALIDO');
    }
  });

  it('los errores de dominio salen con su código', async () => {
    carrito.lineas = [];
    const r = await pedir('POST', '/cotizaciones', ANA, {});
    expect(r.status).toBe(400);
    expect(errorCotizacionesEnvelopeSchema.parse(r.cuerpo).error.code).toBe('CARRITO_VACIO');
  });
});
