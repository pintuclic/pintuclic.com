import type { CODIGOS_ERROR_PRECIOS, Exclusion } from '../dtos/m06-precios.dto';

export type CodigoErrorPrecios = (typeof CODIGOS_ERROR_PRECIOS)[number];

/** `details` del envelope: los objetivos que no existen (R19); null en el resto. */
export type DetallesPrecios = Exclusion[] | null;

/**
 * Error de dominio de M06. `code` y `status` salen tal cual en el envelope
 * `{ success: false, error: { code, message, details } }` (contrato, sección 9).
 */
export class PreciosError extends Error {
  constructor(
    public readonly code: CodigoErrorPrecios,
    message: string,
    public readonly status: number,
    public readonly details: DetallesPrecios = null,
  ) {
    super(message);
    this.name = 'PreciosError';
  }
}

export const errores = {
  /** 404: recurso inexistente (y, en el middleware, toda denegación). */
  noDisponible: (): PreciosError =>
    new PreciosError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.', 404),
  parametroInvalido: (mensaje: string): PreciosError => new PreciosError('PARAMETRO_INVALIDO', mensaje, 400),
  objetivoNoExiste: (inexistentes: Exclusion[]): PreciosError =>
    new PreciosError(
      'OBJETIVO_NO_EXISTE',
      'Algunas marcas, líneas, productos, colores u otras referencias del evento no existen.',
      400,
      inexistentes,
    ),
  codigoCuponDuplicado: (): PreciosError =>
    new PreciosError('CODIGO_CUPON_DUPLICADO', 'Ya existe un cupón con ese código.', 409),
  nombreTipoClienteDuplicado: (): PreciosError =>
    new PreciosError('NOMBRE_TIPO_CLIENTE_DUPLICADO', 'Ya existe un tipo de cliente empresa con ese nombre.', 409),
};
