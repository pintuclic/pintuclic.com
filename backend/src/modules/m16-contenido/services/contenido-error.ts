import {
  CODIGOS_ERROR_CONTENIDO,
  MENSAJE_RECURSO_NO_DISPONIBLE,
  type CodigoErrorContenido,
} from '../dtos/m16-contenido.dto';

/**
 * Error de dominio controlado para el módulo M16 Contenido Institucional.
 */
export class ContenidoError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: CodigoErrorContenido,
    message: string,
  ) {
    super(message);
    this.name = 'ContenidoError';
  }

  static noDisponible(): ContenidoError {
    return new ContenidoError(
      404,
      CODIGOS_ERROR_CONTENIDO.RECURSO_NO_DISPONIBLE,
      MENSAJE_RECURSO_NO_DISPONIBLE,
    );
  }

  static slugDuplicado(slug: string): ContenidoError {
    return new ContenidoError(
      409,
      CODIGOS_ERROR_CONTENIDO.SLUG_DUPLICADO,
      `Ya existe una página institucional con el slug '${slug}'.`,
    );
  }

  static validacion(mensaje: string): ContenidoError {
    return new ContenidoError(400, CODIGOS_ERROR_CONTENIDO.VALIDATION_ERROR, mensaje);
  }
}
