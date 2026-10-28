import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { errorHandler } from '../../../../core/middlewares/errorHandler';
import type { AuditoriaPort } from '../../../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService, type ResolutorPermisos } from '../../../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../../../m20-seguridad/services/sesion.service';
import { construirModuloM01 } from '../../../m01-catalogo/m01.routes';
import { construirModuloM06, type ModuloM06 } from '../../../m06-precios/m06.routes';
import { construirModuloM14 } from '../../../m14-patrocinios/m14.routes';
import type { OfertasListadoPort, PatrocinioListadoPort, PrecioFinalPort } from '../../dtos/m02-busqueda.dto';
import { construirModuloM02 } from '../../m02.routes';
import { PrecioFinalM06Adapter } from '../../services/precio-final-m06.adapter';

/**
 * M02 con M06 de verdad detrás (precio final y ofertas), cableado como en `app.routes.ts`: lo de M06 se pide de forma
 * diferida porque M06 necesita `catalogoParaCompra` de M01. `sustituir` permite cambiar el puerto por un doble que falla.
 */
export interface RespuestaBusqueda {
  status: number;
  cuerpo: {
    success: boolean;
    data?: unknown;
    pagination?: unknown;
    error?: { code: string; message: string; details: unknown };
  };
}

export interface ServidorBusqueda {
  publica: (ruta: string) => Promise<RespuestaBusqueda>;
  cerrar: () => Promise<void>;
}

export interface Sustitutos {
  precioFinal?: PrecioFinalPort;
  ofertas?: OfertasListadoPort;
  patrocinio?: PatrocinioListadoPort;
}

export async function levantarServidorBusqueda(
  auditoria: AuditoriaPort,
  sustitutos: Sustitutos = {},
): Promise<ServidorBusqueda> {
  const resolutor: ResolutorPermisos = { tienePermiso: () => Promise.resolve(true) };
  const autorizacion = new AutorizacionService(resolutor, auditoria);
  const construido: { m06?: ModuloM06 } = {};
  const m06 = (): ModuloM06 => {
    if (construido.m06 === undefined) throw new Error('M06 todavía no está construido');
    return construido.m06;
  };
  const m01 = construirModuloM01(autorizacion);
  construido.m06 = construirModuloM06(autorizacion, {
    sesiones: { validarYRenovar: () => Promise.resolve({ valida: false }) } as unknown as SesionService,
    catalogoCompra: m01.catalogoParaCompra,
    parametros: { obtenerNumero: () => Promise.resolve(null) },
  });
  // M14 de verdad: las campañas salen de la base, como en `app.routes.ts`.
  const m14 = construirModuloM14(autorizacion, { tarjetas: m01.consultaPublicaService });
  const m02 = construirModuloM02(autorizacion, {
    patrocinio: sustitutos.patrocinio ?? { prioridadesDeProductos: (u) => m14.patrocinio.prioridadesDeProductos(u) },
    precioFinal:
      sustitutos.precioFinal ?? new PrecioFinalM06Adapter({ preciosDeVariantes: (c) => m06().precios.preciosDeVariantes(c) }),
    ofertas: sustitutos.ofertas ?? {
      idsProductosEnOferta: () => m06().precios.idsProductosEnOferta(),
      ofertasDeProductos: (ids) => m06().precios.ofertasDeProductos(ids),
    },
  });

  const app: Express = express();
  app.use(express.json());
  app.use('/api/v1/busqueda', m02.publicRouter);
  app.use(errorHandler);
  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api/v1/busqueda`;
  return {
    publica: async (ruta) => {
      const r = await fetch(`${baseUrl}${ruta}`);
      const texto = await r.text();
      try {
        return { status: r.status, cuerpo: JSON.parse(texto) as RespuestaBusqueda['cuerpo'] };
      } catch {
        throw new Error(`Respuesta no JSON (${r.status}): ${texto.slice(0, 600)}`);
      }
    },
    cerrar: () => new Promise<void>((resolver, rechazar) => servidor.close((e) => (e ? rechazar(e) : resolver()))),
  };
}
