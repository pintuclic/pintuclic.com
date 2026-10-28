import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Actor } from '../../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../../../m20-seguridad/services/sesion.service';
import { construirModuloM06, type ModuloM06 } from '../../../m06-precios/m06.routes';
import { construirModuloM01 } from '../../m01.routes';

/**
 * M01 con M06 de verdad detrás (ofertas y conteo de eventos), cableados como en `app.routes.ts`: M01 pide a M06
 * de forma diferida porque M06 necesita `catalogoParaCompra` de M01. Solo se simula QUIÉN es el actor.
 */
const ADMIN: Actor = { idUsuario: 1, idSesion: 'sid-admin', tipoSesion: 'admin' };

export interface RespuestaOfertas {
  status: number;
  cuerpo: {
    success: boolean;
    data?: unknown;
    pagination?: unknown;
    error?: { code: string; message: string; details: unknown };
  };
}

export interface ServidorOfertas {
  m06: ModuloM06;
  admin: (metodo: 'GET' | 'PATCH', ruta: string, cuerpo?: unknown) => Promise<RespuestaOfertas>;
  publica: (ruta: string) => Promise<RespuestaOfertas>;
  cerrar: () => Promise<void>;
}

export async function levantarServidorOfertas(auditoria: AuditoriaPort): Promise<ServidorOfertas> {
  const resolutor: ResolutorPermisos = {
    tienePermiso: (_idUsuario, codigo) => Promise.resolve(codigo.startsWith('catalogo.')),
  };
  const autorizacion = new AutorizacionService(resolutor, auditoria);
  const construido: { m06?: ModuloM06 } = {};
  const modulo = (): ModuloM06 => {
    if (construido.m06 === undefined) throw new Error('M06 todavía no está construido');
    return construido.m06;
  };
  const m01 = construirModuloM01(autorizacion, {
    ofertas: {
      idsProductosEnOferta: () => modulo().precios.idsProductosEnOferta(),
      ofertasDeProductos: (ids) => modulo().precios.ofertasDeProductos(ids),
      preciosDeVariantes: (consultas) => modulo().precios.preciosDeVariantes(consultas),
    },
    impactoReglas: { contarEventosVigentes: (objetivos) => modulo().impacto.contarEventosVigentes(objetivos) },
  });
  construido.m06 = construirModuloM06(autorizacion, {
    sesiones: { validarYRenovar: () => Promise.resolve({ valida: false }) } as unknown as SesionService,
    catalogoCompra: m01.catalogoParaCompra,
    parametros: { obtenerNumero: () => Promise.resolve(null) },
  });

  const app: Express = express();
  app.use(express.json());
  app.use('/api/v1/admin/catalogo', (req, _res, next) => {
    req.actor = ADMIN;
    next();
  });
  app.use('/api/v1/admin/catalogo', m01.adminRouter);
  app.use('/api/v1/catalogo', m01.publicRouter);

  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/v1`;
  const leer = async (url: string, init?: RequestInit): Promise<RespuestaOfertas> => {
    const r = await fetch(url, init);
    const texto = await r.text();
    try {
      return { status: r.status, cuerpo: JSON.parse(texto) as RespuestaOfertas['cuerpo'] };
    } catch {
      throw new Error(`Respuesta no JSON (${r.status}): ${texto.slice(0, 600)}`);
    }
  };

  return {
    m06: modulo(),
    admin: (metodo, ruta, cuerpo) =>
      leer(`${baseUrl}/admin/catalogo${ruta}`, {
        method: metodo,
        headers: { 'content-type': 'application/json' },
        ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
      }),
    publica: (ruta) => leer(`${baseUrl}/catalogo${ruta}`),
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
