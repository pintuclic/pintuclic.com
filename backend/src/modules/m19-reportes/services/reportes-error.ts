import { CODIGOS_ERROR_M19 } from '../dtos/m19-reportes.dto';

type CodigoErrorM19 = (typeof CODIGOS_ERROR_M19)[keyof typeof CODIGOS_ERROR_M19];

export class ReportesError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: CodigoErrorM19,
    message: string,
  ) {
    super(message);
    this.name = 'ReportesError';
  }

  static rangoInvalido(mensaje: string): ReportesError {
    return new ReportesError(400, CODIGOS_ERROR_M19.RANGO_INVALIDO, mensaje);
  }

  static noDisponible(): ReportesError {
    return new ReportesError(404, CODIGOS_ERROR_M19.RECURSO_NO_DISPONIBLE, 'El recurso solicitado no está disponible.');
  }
}
