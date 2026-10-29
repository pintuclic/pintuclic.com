import { CODIGOS_ERROR_M12 } from '../dtos/m12-facturacion.dto';

type CodigoErrorM12 = (typeof CODIGOS_ERROR_M12)[keyof typeof CODIGOS_ERROR_M12];

export class FacturacionError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: CodigoErrorM12,
    message: string,
  ) {
    super(message);
    this.name = 'FacturacionError';
  }

  /** 404 opaco: no existe, no es del cliente o no se puede emitir (R5, R8). */
  static noDisponible(): FacturacionError {
    return new FacturacionError(404, CODIGOS_ERROR_M12.RECURSO_NO_DISPONIBLE, 'El recurso solicitado no está disponible.');
  }

  static datosVendedorIncompletos(faltantes: ReadonlyArray<string>): FacturacionError {
    return new FacturacionError(
      409,
      CODIGOS_ERROR_M12.DATOS_VENDEDOR_INCOMPLETOS,
      `Complete los datos de facturación antes de emitir comprobantes. Falta: ${faltantes.join(', ')}.`,
    );
  }
}
