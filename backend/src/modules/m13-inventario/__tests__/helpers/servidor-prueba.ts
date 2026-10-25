import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Actor } from '../../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import { construirModuloM13 } from '../../m13.routes';

/**
 * Arnés de pruebas HTTP de M13: servidor Express REAL con el router de verdad, la cadena de
 * guardas verdadera (sesión → permiso atómico) y la base de datos de `DATABASE_URL`. Solo se
 * simula QUIÉN es el actor (cabecera `x-actor`) y sus permisos. Los ids de usuario de quienes
 * ajustan son reales (el historial tiene FK a `usuario`).
 */
export type NombreActor = 'admin' | 'lector' | 'editor' | 'cliente';

export interface IdsActores {
  admin: number;
  lector: number;
  editor: number;
  /** Sin permisos; no necesita existir en la BD porque nunca escribe. */
  cliente: number;
}

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
  baseUrl: string;
  auditoria: { registrarAccesoDenegado: ReturnType<typeof import('vitest').vi.fn> };
  peticion: (
    actor: NombreActor | null,
    metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    ruta: string,
    cuerpo?: unknown,
  ) => Promise<RespuestaHttp>;
  /** GET que devuelve el cuerpo como texto, conservando el BOM (plantilla CSV). */
  texto: (actor: NombreActor | null, ruta: string) => Promise<{ status: number; cabeceras: Headers; texto: string }>;
  /** Petición sin pasar por la guarda de JSON: para comprobar que una ruta NO existe. */
  estado: (metodo: 'PUT' | 'POST' | 'DELETE' | 'PATCH', ruta: string, actor: NombreActor) => Promise<number>;
  cerrar: () => Promise<void>;
}

export async function levantarServidor(
  auditoria: AuditoriaPort & ServidorPrueba['auditoria'],
  ids: IdsActores,
): Promise<ServidorPrueba> {
  const actores: Record<NombreActor, Actor> = {
    admin: { idUsuario: ids.admin, idSesion: 'sid-admin', tipoSesion: 'admin' },
    lector: { idUsuario: ids.lector, idSesion: 'sid-lector', tipoSesion: 'admin' },
    editor: { idUsuario: ids.editor, idSesion: 'sid-editor', tipoSesion: 'admin' },
    cliente: { idUsuario: ids.cliente, idSesion: 'sid-cliente', tipoSesion: 'cliente' },
  };
  const permisos: Record<number, readonly string[]> = {
    [ids.admin]: ['catalogo.ver', 'catalogo.crear', 'catalogo.editar', 'catalogo.eliminar'],
    [ids.lector]: ['catalogo.ver'],
    [ids.editor]: ['catalogo.ver', 'catalogo.editar'],
    [ids.cliente]: [],
  };
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) => Promise.resolve(permisos[idUsuario]?.includes(codigo) === true),
  };
  const autorizacion = new AutorizacionService(resolutor, auditoria);
  const m13 = construirModuloM13(autorizacion);

  const app: Express = express();
  app.use(express.json({ limit: '1mb' }));
  // Simula `auth.middleware`: el actor sale de una cabecera de prueba, nunca del cuerpo.
  app.use('/api/v1/admin/inventario', (req, _res, next) => {
    const nombre = req.header('x-actor');
    if (nombre !== undefined && nombre in actores) req.actor = actores[nombre as NombreActor];
    next();
  });
  app.use('/api/v1/admin/inventario', m13.router);

  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  const url = (ruta: string): string => `${baseUrl}/api/v1/admin/inventario${ruta}`;

  return {
    baseUrl,
    auditoria,
    peticion: async (actor, metodo, ruta, cuerpo) => {
      const respuesta = await fetch(url(ruta), {
        method: metodo,
        headers: { 'content-type': 'application/json', ...(actor !== null ? { 'x-actor': actor } : {}) },
        ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
      });
      const texto = await respuesta.text();
      try {
        return { status: respuesta.status, cuerpo: JSON.parse(texto) as RespuestaHttp['cuerpo'] };
      } catch {
        // Un 500 del manejador por defecto de Express llega como HTML: se muestra tal cual para depurar.
        throw new Error(`Respuesta no JSON (${respuesta.status}): ${texto.slice(0, 600)}`);
      }
    },
    texto: async (actor, ruta) => {
      const respuesta = await fetch(url(ruta), { headers: actor !== null ? { 'x-actor': actor } : {} });
      // `Response.text()` descarta el BOM: se decodifica a mano para poder comprobarlo.
      const texto = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await respuesta.arrayBuffer());
      return { status: respuesta.status, cabeceras: respuesta.headers, texto };
    },
    estado: async (metodo, ruta, actor) =>
      (await fetch(url(ruta), { method: metodo, headers: { 'x-actor': actor } })).status,
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
