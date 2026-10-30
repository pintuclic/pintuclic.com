import type { CODIGOS_ERROR_M10 } from '../dtos/m10-entrega.dto';

export type CodigoErrorM10 = (typeof CODIGOS_ERROR_M10)[keyof typeof CODIGOS_ERROR_M10];

/** Error de dominio de M10; los controladores lo traducen al envelope del contrato. */
export class EnvioError extends Error {
  constructor(
    message: string,
    public readonly codigo: CodigoErrorM10,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'EnvioError';
  }
}

/** Lo que lanza un adaptador cuando el proveedor falla o no soporta la operación (nunca datos inventados). */
export class ProveedorEnvioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProveedorEnvioError';
  }
}
