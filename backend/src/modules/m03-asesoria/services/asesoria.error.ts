import { CODIGOS_ERROR_M03 } from '../dtos/m03-asesoria.dto';

/** Error de dominio de M03. El controlador lo traduce al envelope del contrato. */
export class AsesoriaError extends Error {
  constructor(
    readonly code: (typeof CODIGOS_ERROR_M03)[keyof typeof CODIGOS_ERROR_M03],
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AsesoriaError';
  }
}

/**
 * 404 opaco (ADR-003): idéntico para un producto que no existe, uno que no es visible y uno
 * que no ofrece calculadora. No revela cuál de los tres es (M03 · K1).
 */
export function recursoNoDisponible(): AsesoriaError {
  return new AsesoriaError(
    CODIGOS_ERROR_M03.RECURSO_NO_DISPONIBLE,
    'El recurso solicitado no está disponible.',
    404,
  );
}
