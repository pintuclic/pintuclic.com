import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import { carritoResponseEnvelopeSchema, errorCarritoEnvelopeSchema } from '../dtos/m05-carrito.dto';
import { construirModuloM05 } from '../m05.routes';
import { CarritoMemoriaRepository, CatalogoEjemplo, ID_USUARIO_PARTICULAR, PreciosEjemplo } from './helpers/dobles';

/**
 * HTTP de M05 con los routers de verdad, la cookie real y el repositorio en memoria. Solo se simula
 * QUIÉN es el actor (cabecera `x-actor`), como en las pruebas de M06; la sesión opcional queda sin sesión.
 */
interface Respuesta {
  status: number;
  cuerpo: { success: boolean; data?: unknown; error?: { code: string; message: string; details: unknown } };
  setCookie: string | null;
  cacheControl: string | null;
}

let servidor: Server;
let base = '';
let repo: CarritoMemoriaRepository;

beforeAll(async () => {
  const catalogo = new CatalogoEjemplo();
  repo = new CarritoMemoriaRepository();
  const sesionesNulas = { validarYRenovar: () => Promise.resolve({ valida: false }) } as unknown as SesionService;
  const modulo = construirModuloM05({
    sesiones: sesionesNulas,
    precios: new PreciosEjemplo(catalogo),
    catalogo,
    repo,
  });
  const app: Express = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/carrito', (req, _res, next) => {
    const id = req.header('x-actor');
    if (id !== undefined) req.actor = { idUsuario: Number(id), idSesion: 'sid', tipoSesion: 'cliente' };
    next();
  });
  app.use('/api/v1/carrito', modulo.publicRouter);
  servidor = await new Promise((r) => {
    const s = app.listen(0, () => r(s));
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/v1/carrito`;
});

afterAll(() => new Promise<void>((r) => servidor.close(() => r())));

beforeEach(() => {
  repo.carritos = [];
  repo.lineas = [];
});

async function pedir(
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  ruta: string,
  opciones: { cuerpo?: unknown; cookie?: string; actor?: number } = {},
): Promise<Respuesta> {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(opciones.cookie === undefined ? {} : { cookie: opciones.cookie }),
      ...(opciones.actor === undefined ? {} : { 'x-actor': String(opciones.actor) }),
    },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  return {
    status: r.status,
    cuerpo: (await r.json()) as Respuesta['cuerpo'],
    setCookie: r.headers.get('set-cookie'),
    cacheControl: r.headers.get('cache-control'),
  };
}

const cookieDe = (setCookie: string | null): string => (setCookie ?? '').split(';')[0] ?? '';

describe('M05 · HTTP /api/v1/carrito', () => {
  it('GET sin carrito: 200 vacío, sin cookie y sin caché', async () => {
    const r = await pedir('GET', '/');
    expect(r.status).toBe(200);
    expect(carritoResponseEnvelopeSchema.parse(r.cuerpo).data.lineas).toEqual([]);
    expect(r.setCookie).toBeNull();
    expect(r.cacheControl).toBe('no-store');
  });

  it('el visitante recibe la cookie pc_cart HttpOnly, Secure y SameSite=Lax, y la reutiliza', async () => {
    const r = await pedir('POST', '/lineas', { cuerpo: { idVariante: 1, idColor: 13, cantidad: 2 } });
    expect(r.status).toBe(200);
    expect(r.setCookie).toMatch(/^pc_cart=[A-Za-z0-9_-]{43};/);
    expect(r.setCookie).toMatch(/HttpOnly/);
    expect(r.setCookie).toMatch(/Secure/);
    expect(r.setCookie).toMatch(/SameSite=Lax/);
    expect(r.setCookie).toMatch(/Max-Age=2592000/);

    const cookie = cookieDe(r.setCookie);
    const otra = await pedir('GET', '/', { cookie });
    expect(carritoResponseEnvelopeSchema.parse(otra.cuerpo).data.lineas).toHaveLength(1);
    expect(otra.setCookie).toBeNull();
  });

  it('al iniciar sesión une el carrito del visitante y borra la cookie', async () => {
    const r = await pedir('POST', '/lineas', { cuerpo: { idVariante: 2, cantidad: 1 } });
    const cookie = cookieDe(r.setCookie);
    const conSesion = await pedir('GET', '/', { cookie, actor: ID_USUARIO_PARTICULAR });
    const datos = carritoResponseEnvelopeSchema.parse(conSesion.cuerpo).data;
    expect(datos.union?.lineasAgregadas).toBe(1);
    expect(conSesion.setCookie).toMatch(/^pc_cart=;/);
    expect(conSesion.setCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('valida body, query y params con 400 PARAMETRO_INVALIDO', async () => {
    for (const r of [
      await pedir('POST', '/lineas', { cuerpo: { idVariante: 1, cantidad: 0 } }),
      await pedir('POST', '/lineas', { cuerpo: { idVariante: 'uno', cantidad: 1 } }),
      await pedir('PATCH', '/lineas/abc', { cuerpo: { cantidad: 1 } }),
      await pedir('GET', '/?codigoCupon=' + 'X'.repeat(200)),
      await pedir('POST', '/revalidar', { cuerpo: { lineas: [], total: -1 } }),
    ]) {
      expect(r.status).toBe(400);
      expect(errorCarritoEnvelopeSchema.parse(r.cuerpo).error.code).toBe('PARAMETRO_INVALIDO');
    }
  });

  it('C8: un cupón corto o mal escrito no es un 400: vuelve como cupón no válido', async () => {
    await pedir('POST', '/lineas', { cuerpo: { idVariante: 2, cantidad: 1 }, actor: ID_USUARIO_PARTICULAR });
    const r = await pedir('GET', '/?codigoCupon=abc', { actor: ID_USUARIO_PARTICULAR });
    expect(r.status).toBe(200);
    expect(carritoResponseEnvelopeSchema.parse(r.cuerpo).data.calculo?.cupon).toMatchObject({
      codigo: 'abc',
      aplicado: false,
      motivoRechazo: 'cupon_no_valido',
    });
  });

  it('los errores de dominio salen con el envelope del contrato', async () => {
    const r = await pedir('POST', '/lineas', { cuerpo: { idVariante: 4, cantidad: 1 }, actor: ID_USUARIO_PARTICULAR });
    expect(r.status).toBe(409);
    expect(errorCarritoEnvelopeSchema.parse(r.cuerpo).error).toMatchObject({
      code: 'PRODUCTO_NO_DISPONIBLE',
      details: { motivo: 'producto_no_disponible' },
    });
  });

  it('C1/C14: una línea de otro dueño responde 404 opaco', async () => {
    const ajeno = await pedir('POST', '/lineas', { cuerpo: { idVariante: 2, cantidad: 1 }, actor: 777 });
    const idLinea = carritoResponseEnvelopeSchema.parse(ajeno.cuerpo).data.lineas[0]?.idLinea ?? 0;
    const visitante = await pedir('DELETE', `/lineas/${idLinea}`);
    const otroCliente = await pedir('PATCH', `/lineas/${idLinea}`, { cuerpo: { cantidad: 5 }, actor: ID_USUARIO_PARTICULAR });
    for (const r of [visitante, otroCliente]) {
      expect(r.status).toBe(404);
      expect(r.cuerpo.error).toEqual({
        code: 'RECURSO_NO_DISPONIBLE',
        message: 'El recurso solicitado no está disponible.',
        details: null,
      });
    }
  });

  it('PATCH, DELETE, resumen y revalidar responden con el carrito del dueño', async () => {
    const a = await pedir('POST', '/lineas', { cuerpo: { idVariante: 2, cantidad: 1 }, actor: ID_USUARIO_PARTICULAR });
    const idLinea = carritoResponseEnvelopeSchema.parse(a.cuerpo).data.lineas[0]?.idLinea ?? 0;
    const p = await pedir('PATCH', `/lineas/${idLinea}`, { cuerpo: { cantidad: 3 }, actor: ID_USUARIO_PARTICULAR });
    expect(carritoResponseEnvelopeSchema.parse(p.cuerpo).data.lineas[0]?.cantidad).toBe(3);
    const resumen = await pedir('GET', '/resumen', { actor: ID_USUARIO_PARTICULAR });
    expect(resumen.cuerpo.data).toEqual({ cantidadItems: 3, total: 135_000 });
    const rev = await pedir('POST', '/revalidar', {
      cuerpo: { lineas: [{ idLinea, subtotal: 135_000 }], total: 135_000 },
      actor: ID_USUARIO_PARTICULAR,
    });
    expect(rev.cuerpo.data).toMatchObject({ cambios: [], puedeContinuar: true });
    const d = await pedir('DELETE', `/lineas/${idLinea}`, { actor: ID_USUARIO_PARTICULAR });
    expect(carritoResponseEnvelopeSchema.parse(d.cuerpo).data.lineas).toEqual([]);
  });
});
