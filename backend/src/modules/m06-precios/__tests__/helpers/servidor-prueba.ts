import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CatalogoParaCompraService } from '../../../m01-catalogo/services/catalogo-para-compra.service';
import { CompraRepository } from '../../../m01-catalogo/repositories/compra.repository';
import type { Actor } from '../../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../../../m20-seguridad/services/sesion.service';
import { construirModuloM06, type ModuloM06 } from '../../m06.routes';

/**
 * Arnés de pruebas HTTP de M06: servidor Express REAL con los routers de verdad, la cadena de guardas
 * verdadera (permiso atómico) y la base de datos de `DATABASE_URL`. Solo se simula QUIÉN es el actor
 * (cabecera `x-actor`) y sus permisos, y los parámetros de M17.
 */
export type NombreActor = 'admin' | 'lector' | 'editor' | 'cliente' | 'particular' | 'empresa' | 'empresaMinimo';
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

export interface ParametrosPrueba {
  iva: number | null;
  umbralSugerirEmpresa: number | null;
}

export interface ServidorPrueba {
  modulo: ModuloM06;
  parametros: ParametrosPrueba;
  admin: (
    actor: NombreActor | null,
    metodo: 'GET' | 'POST' | 'PUT' | 'PATCH',
    ruta: string,
    cuerpo?: unknown,
  ) => Promise<RespuestaHttp>;
  publico: (
    actor: NombreActor | null,
    metodo: 'GET' | 'POST',
    ruta: string,
    cuerpo?: unknown,
  ) => Promise<RespuestaHttp>;
  cerrar: () => Promise<void>;
}

export async function levantarServidor(auditoria: AuditoriaPort, ids: IdsActores): Promise<ServidorPrueba> {
  const actores = Object.fromEntries(
    (Object.keys(ids) as NombreActor[]).map((n) => [
      n,
      {
        idUsuario: ids[n],
        idSesion: `sid-${n}`,
        tipoSesion: n === 'admin' || n === 'lector' || n === 'editor' ? 'admin' : 'cliente',
      } satisfies Actor,
    ]),
  ) as Record<NombreActor, Actor>;
  const permisos: Record<number, readonly string[]> = {
    [ids.admin]: ['catalogo.ver', 'catalogo.crear', 'catalogo.editar', 'catalogo.eliminar'],
    [ids.lector]: ['catalogo.ver'],
    [ids.editor]: ['catalogo.ver', 'catalogo.editar'],
  };
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) => Promise.resolve(permisos[idUsuario]?.includes(codigo) === true),
  };
  const autorizacion = new AutorizacionService(resolutor, auditoria);

  const parametros: ParametrosPrueba = { iva: 19, umbralSugerirEmpresa: 500000 };
  // La sesión opcional no se ejercita aquí: el actor sale de la cabecera, como en M13.
  const sesionesNulas = { validarYRenovar: () => Promise.resolve({ valida: false }) } as unknown as SesionService;
  const modulo = construirModuloM06(autorizacion, {
    sesiones: sesionesNulas,
    catalogoCompra: new CatalogoParaCompraService(new CompraRepository()),
    parametros: {
      obtenerNumero: (clave) =>
        Promise.resolve(clave === 'comercial.iva_porcentaje' ? parametros.iva : parametros.umbralSugerirEmpresa),
    },
  });

  const app: Express = express();
  app.use(express.json({ limit: '1mb' }));
  const simularSesion: express.RequestHandler = (req, _res, next) => {
    const nombre = req.header('x-actor');
    if (nombre !== undefined && nombre in actores) req.actor = actores[nombre as NombreActor];
    next();
  };
  app.use('/api/v1/admin/precios', simularSesion, modulo.adminRouter);
  app.use('/api/v1/precios', simularSesion, modulo.publicRouter);

  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

  const pedir =
    (prefijo: string): ServidorPrueba['admin'] =>
    async (actor, metodo, ruta, cuerpo) => {
      const respuesta = await fetch(`${baseUrl}${prefijo}${ruta}`, {
        method: metodo,
        headers: { 'content-type': 'application/json', ...(actor !== null ? { 'x-actor': actor } : {}) },
        ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
      });
      const texto = await respuesta.text();
      try {
        return { status: respuesta.status, cuerpo: JSON.parse(texto) as RespuestaHttp['cuerpo'] };
      } catch {
        throw new Error(`Respuesta no JSON (${respuesta.status}): ${texto.slice(0, 600)}`);
      }
    };

  return {
    modulo,
    parametros,
    admin: pedir('/api/v1/admin/precios'),
    publico: pedir('/api/v1/precios') as ServidorPrueba['publico'],
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
