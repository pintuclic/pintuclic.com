import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { errorHandler } from '../../../../core/middlewares/errorHandler';
import { construirModuloM01 } from '../../../m01-catalogo/m01.routes';
import type { Actor } from '../../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import { construirModuloM14, type ModuloM14 } from '../../m14.routes';
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
  cerrar: () => Promise<void>;
}

export async function levantarServidor(
  auditoria: AuditoriaPort,
  ids: IdsActores,
  tarjetas?: TarjetasPublicasPort,
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
  const m01 = construirModuloM01(autorizacion);
  const modulo = construirModuloM14(autorizacion, { tarjetas: tarjetas ?? m01.consultaPublicaService });

  const app: Express = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1/admin/patrocinios', (req, _res, next) => {
    const nombre = req.header('x-actor');
    if (nombre !== undefined && nombre in actores) req.actor = actores[nombre as NombreActor];
    next();
  }, modulo.adminRouter);
  app.use('/api/v1/patrocinios', modulo.publicRouter);
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
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
