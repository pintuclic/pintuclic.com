import type { CODIGOS_ERROR_PATROCINIOS, ObjetivoPatrocinio } from '../dtos/m14-patrocinios.dto';

export type CodigoErrorPatrocinios = (typeof CODIGOS_ERROR_PATROCINIOS)[number];

/** `details` del envelope: los objetivos que no existen; null en el resto. */
export type DetallesPatrocinios = ObjetivoPatrocinio[] | null;

/**
 * Error de dominio de M14. `code` y `status` salen tal cual en el envelope
 * `{ success: false, error: { code, message, details } }` (contrato, sección 6).
 */
export class PatrociniosError extends Error {
  constructor(
    public readonly code: CodigoErrorPatrocinios,
    message: string,
    public readonly status: number,
    public readonly details: DetallesPatrocinios = null,
  ) {
    super(message);
    this.name = 'PatrociniosError';
  }
}

export const errores = {
  /** 404: recurso inexistente (y, en el middleware, toda denegación). */
  noDisponible: (): PatrociniosError =>
    new PatrociniosError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.', 404),
  parametroInvalido: (mensaje: string): PatrociniosError => new PatrociniosError('PARAMETRO_INVALIDO', mensaje, 400),
  nombreDuplicado: (): PatrociniosError =>
    new PatrociniosError('NOMBRE_CAMPANIA_DUPLICADO', 'Ya existe una campaña con ese nombre.', 409),
  objetivoNoExiste: (inexistentes: ObjetivoPatrocinio[]): PatrociniosError =>
    new PatrociniosError(
      'OBJETIVO_NO_EXISTE',
      'Algunos productos, líneas o marcas de la campaña no existen.',
      409,
      inexistentes,
    ),
};
