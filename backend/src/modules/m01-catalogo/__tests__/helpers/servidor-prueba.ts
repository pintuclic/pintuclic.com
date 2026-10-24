import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Actor } from '../../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import { construirModuloM01 } from '../../m01.routes';

/**
 * Arnés de pruebas HTTP de M01: servidor Express REAL con el router de verdad, la cadena de
 * guardas verdadera (sesión → permiso atómico) y la base de datos configurada en
 * `DATABASE_URL`. Solo se simula QUIÉN es el actor (cabecera `x-actor`) y sus permisos.
 */
export const ACTORES = {
  /** Administrador del catálogo con todos los permisos. */
  admin: { idUsuario: 1, idSesion: 'sid-admin', tipoSesion: 'admin' } satisfies Actor,
  /** Solo puede consultar. */
  lector: { idUsuario: 2, idSesion: 'sid-lector', tipoSesion: 'admin' } satisfies Actor,
  /** Puede crear y editar (y reactivar) pero no desactivar. */
  editor: { idUsuario: 3, idSesion: 'sid-editor', tipoSesion: 'admin' } satisfies Actor,
  /** Un cliente: ningún permiso del catálogo. */
  cliente: { idUsuario: 99, idSesion: 'sid-cliente', tipoSesion: 'cliente' } satisfies Actor,
};
export type NombreActor = keyof typeof ACTORES;

const PERMISOS_POR_USUARIO: Record<number, readonly string[]> = {
  1: ['catalogo.ver', 'catalogo.crear', 'catalogo.editar', 'catalogo.eliminar'],
  2: ['catalogo.ver'],
  3: ['catalogo.ver', 'catalogo.crear', 'catalogo.editar'],
  99: [],
};

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
    metodo: 'GET' | 'POST' | 'PUT' | 'PATCH',
    ruta: string,
    cuerpo?: unknown,
  ) => Promise<RespuestaHttp>;
  cerrar: () => Promise<void>;
}

export async function levantarServidor(
  auditoria: AuditoriaPort & ServidorPrueba['auditoria'],
): Promise<ServidorPrueba> {
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) => Promise.resolve(PERMISOS_POR_USUARIO[idUsuario]?.includes(codigo) === true),
  };
  const autorizacion = new AutorizacionService(resolutor, auditoria);
  const m01 = construirModuloM01(autorizacion);

  const app: Express = express();
  app.use(express.json({ limit: '7mb' }));
  // Simula `auth.middleware`: el actor sale de una cabecera de prueba, nunca del cuerpo.
  app.use('/api/v1/admin/catalogo', (req, _res, next) => {
    const nombre = req.header('x-actor');
    if (nombre !== undefined && nombre in ACTORES) {
      req.actor = ACTORES[nombre as NombreActor];
    }
    next();
  });
  app.use('/api/v1/admin/catalogo', m01.adminRouter);

  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

  return {
    baseUrl,
    auditoria,
    peticion: async (actor, metodo, ruta, cuerpo) => {
      const respuesta = await fetch(`${baseUrl}/api/v1/admin/catalogo${ruta}`, {
        method: metodo,
        headers: {
          'content-type': 'application/json',
          ...(actor !== null ? { 'x-actor': actor } : {}),
        },
        ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
      });
      return { status: respuesta.status, cuerpo: (await respuesta.json()) as RespuestaHttp['cuerpo'] };
    },
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
