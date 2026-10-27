import type { TipoIncidenteIa } from '../dtos/incidentes.dto';

/**
 * Fallos del proveedor de IA (contrato · I1-I4).
 *
 * El tipo decide dos cosas: si el intento se reintenta y qué queda en el registro de
 * incidentes. Un 4xx o una respuesta que no cumple el esquema NO se reintentan, porque
 * repetir la misma petición daría el mismo resultado.
 */
export class ErrorIa extends Error {
  constructor(
    readonly tipo: TipoIncidenteIa,
    /** Si tiene sentido volver a intentarlo (I1). */
    readonly reintentable: boolean,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorIa';
  }
}

export const tiempoAgotado = (): ErrorIa =>
  new ErrorIa('tiempo_agotado', true, 'El servicio de IA no respondió a tiempo');

export const noDisponible = (detalle: string): ErrorIa =>
  new ErrorIa('no_disponible', true, `El servicio de IA no está disponible: ${detalle}`);

/** El 429 / RESOURCE_EXHAUSTED de Gemini: no se reintenta, se suspende (I3). */
export const cuotaAgotada = (): ErrorIa =>
  new ErrorIa('cuota_agotada', false, 'Se agotó la cuota contratada del servicio de IA');

export const respuestaNoProcesable = (detalle: string): ErrorIa =>
  new ErrorIa('respuesta_no_procesable', false, `La respuesta del modelo no se pudo usar: ${detalle}`);

export const errorConfiguracion = (detalle: string): ErrorIa =>
  new ErrorIa('error_configuracion', false, `El servicio de IA está mal configurado: ${detalle}`);

/** Un 4xx que no es de cuota: la petición está mal y repetirla no la arregla. */
export const peticionRechazada = (estado: number): ErrorIa =>
  new ErrorIa('no_disponible', false, `El servicio de IA rechazó la petición (${estado})`);
