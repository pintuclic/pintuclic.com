import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { construirParserJson } from '../../../../core/middlewares/cuerpoJson.middleware';
import { errorHandler } from '../../../../core/middlewares/errorHandler';
import { construirModuloM01 } from '../../../m01-catalogo/m01.routes';
import type { Actor } from '../../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import { construirModuloM14, type ModuloM14 } from '../../m14.routes';
import type { LimitadorPorMinuto } from '../../services/limitador';
import type { TarjetasPublicasPort } from '../../interfaces/patrocinios.interface';

/**
 * Arnés de pruebas HTTP de M14: servidor Express REAL con los routers de verdad, la cadena de guardas verdadera (permiso
 * atómico), las tarjetas de M01 de verdad y la base de datos de `DATABASE_URL`. Solo se simula QUIÉN es el actor
 * (cabecera `x-actor`) y sus permisos.
 */
export type NombreActor = 'admin' | 'lector' | 'catalogo';
export type IdsActores = Record<NombreActor, number>;

export interface RespuestaHttp {
  status: number;
  cuerpo: {
    success: boolean;
    data?: unknown;
    pagination?: unknown;
    error?: { code: string; message: string; details: unknown };
  };
}

export interface ServidorPrueba {
  modulo: ModuloM14;
  admin: (actor: NombreActor | null, metodo: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown) => Promise<RespuestaHttp>;
  publico: (ruta: string) => Promise<RespuestaHttp>;
  /** POST público (la medición): devuelve el estado y el cuerpo en texto, sin exigir JSON. */
  publicoPost: (ruta: string, cuerpo: unknown, cabeceras?: Record<string, string>) => Promise<{ status: number; texto: string }>;
  /** Respuesta sin interpretar (imágenes, CSV, redirecciones: no sigue los 302). */
  crudo: (ruta: string, init?: RequestInit) => Promise<Response>;
  /** Igual que `crudo`, bajo la administración y con el actor indicado. */
  adminCrudo: (actor: NombreActor | null, ruta: string) => Promise<Response>;
  /** El catálogo público de M01 (para ver los complementarios de la ficha, A7). */
  catalogo: (ruta: string) => Promise<RespuestaHttp>;
  cerrar: () => Promise<void>;
}

export async function levantarServidor(
  auditoria: AuditoriaPort,
  ids: IdsActores,
  tarjetas?: TarjetasPublicasPort,
  limitador?: LimitadorPorMinuto,
): Promise<ServidorPrueba> {
  const actores = Object.fromEntries(
    (Object.keys(ids) as NombreActor[]).map((n) => [
      n,
      { idUsuario: ids[n], idSesion: `sid-${n}`, tipoSesion: 'admin' } satisfies Actor,
    ]),
  ) as Record<NombreActor, Actor>;
  const permisos: Record<number, readonly string[]> = {
    [ids.admin]: ['patrocinios.ver', 'patrocinios.editar'],
    [ids.lector]: ['patrocinios.ver'],
    // Todos los del catálogo, pero ninguno de patrocinios: no deben servir (contrato C1).
    [ids.catalogo]: ['catalogo.ver', 'catalogo.crear', 'catalogo.editar', 'catalogo.eliminar'],
  };
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) => Promise.resolve(permisos[idUsuario]?.includes(codigo) === true),
  };
  const autorizacion = new AutorizacionService(resolutor, auditoria);
  // M01 pide a M14 de forma diferida (M14 pide a M01 las tarjetas), como en `app.routes.ts`.
  const construido: { m14?: ModuloM14 } = {};
  const m01 = construirModuloM01(autorizacion, {
    patrocinio: {
      prioridadesDeProductos: (ubicacion) => {
        if (construido.m14 === undefined) throw new Error('M14 todavía no está construido');
        return construido.m14.patrocinio.prioridadesDeProductos(ubicacion);
      },
    },
  });
  const modulo = construirModuloM14(autorizacion, { tarjetas: tarjetas ?? m01.consultaPublicaService, ...(limitador === undefined ? {} : { limitador }) });
  construido.m14 = modulo;

  const app: Express = express();
  // El mismo parser que la aplicación: así se prueba también el límite de las rutas con imágenes.
  app.use(construirParserJson());
  app.use('/api/v1/admin/patrocinios', (req, _res, next) => {
    const nombre = req.header('x-actor');
    if (nombre !== undefined && nombre in actores) req.actor = actores[nombre as NombreActor];
    next();
  }, modulo.adminRouter);
  app.use('/api/v1/patrocinios', modulo.publicRouter);
  app.use('/api/v1/catalogo', m01.publicRouter);
  app.use(errorHandler);

  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

  const leer = async (url: string, init: RequestInit): Promise<RespuestaHttp> => {
    const respuesta = await fetch(url, init);
    const texto = await respuesta.text();
    try {
      return { status: respuesta.status, cuerpo: JSON.parse(texto) as RespuestaHttp['cuerpo'] };
    } catch {
      throw new Error(`Respuesta no JSON (${respuesta.status}): ${texto.slice(0, 600)}`);
    }
  };

  return {
    modulo,
    admin: (actor, metodo, ruta, cuerpo) =>
      leer(`${baseUrl}/api/v1/admin/patrocinios${ruta}`, {
        method: metodo,
        headers: { 'content-type': 'application/json', ...(actor !== null ? { 'x-actor': actor } : {}) },
        ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
      }),
    publico: (ruta) => leer(`${baseUrl}/api/v1/patrocinios${ruta}`, { method: 'GET' }),
    publicoPost: async (ruta, cuerpo, cabeceras = {}) => {
      const r = await fetch(`${baseUrl}/api/v1/patrocinios${ruta}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...cabeceras },
        body: JSON.stringify(cuerpo),
      });
      return { status: r.status, texto: await r.text() };
    },
    crudo: (ruta, init = {}) => fetch(`${baseUrl}/api/v1/patrocinios${ruta}`, { redirect: 'manual', ...init }),
    adminCrudo: (actor, ruta) =>
      fetch(`${baseUrl}/api/v1/admin/patrocinios${ruta}`, {
        redirect: 'manual',
        headers: actor !== null ? { 'x-actor': actor } : {},
      }),
    catalogo: (ruta) => leer(`${baseUrl}/api/v1/catalogo${ruta}`, { method: 'GET' }),
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
