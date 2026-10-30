import {
  PROVEEDOR_ENVIO_PROPIO,
  type EventoProveedorEnvio,
  type OpcionEnvio,
  type ResultadoCrearEnvio,
  type SeguimientoEnvio,
  type ServicioEnviosPort,
  type SolicitudCotizacion,
  type SolicitudCrearEnvio,
} from '../dtos/m10-entrega.dto';
import type { ParametrosEnvioPort } from '../interfaces/entrega.interface';

/** Mismos parámetros y valores por defecto que M07 · R10 (también son los del seed). */
const CLAVE_COSTO_ENVIO_BASE = 'comercial.costo_envio_base';
const CLAVE_UMBRAL_ENVIO_GRATIS = 'comercial.umbral_envio_gratis';
const COSTO_ENVIO_BASE = 15_000;
const UMBRAL_ENVIO_GRATIS = 200_000;

/**
 * R2: la tienda entrega por su cuenta. Cotiza con la tarifa plana de hoy, no genera guía ni seguimiento externo.
 * Es el adaptador mientras el cliente no elija un servicio de envíos; sustituirlo es cambiar este objeto.
 */
export class EnvioPropioAdapter implements ServicioEnviosPort {
  readonly proveedor = PROVEEDOR_ENVIO_PROPIO;

  constructor(private readonly parametros: ParametrosEnvioPort) {}

  async cotizar(solicitud: SolicitudCotizacion): Promise<OpcionEnvio[]> {
    const base = (await this.parametros.obtenerNumero(CLAVE_COSTO_ENVIO_BASE)) ?? COSTO_ENVIO_BASE;
    const umbral = (await this.parametros.obtenerNumero(CLAVE_UMBRAL_ENVIO_GRATIS)) ?? UMBRAL_ENVIO_GRATIS;
    const costo = solicitud.totalMercancia >= umbral ? 0 : base;
    return [{ proveedor: this.proveedor, servicio: 'Entrega propia', costo, diasEstimados: null }];
  }

  async crearEnvio(_solicitud: SolicitudCrearEnvio): Promise<ResultadoCrearEnvio> {
    return { proveedor: this.proveedor, idExterno: null, numeroGuia: null, urlSeguimiento: null, urlEtiqueta: null };
  }

  async consultarSeguimiento(_idExterno: string): Promise<SeguimientoEnvio | null> {
    return null;
  }

  interpretarWebhook(_cuerpo: unknown): EventoProveedorEnvio | null {
    return null;
  }
}
