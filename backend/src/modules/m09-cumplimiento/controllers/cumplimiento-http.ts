import type { Request, Response } from 'express';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { responderParametroInvalido } from '../../m08-ordenes/controllers/orden-http';
import { CumplimientoError } from '../services/cumplimiento.service';

export { responderParametroInvalido, validar } from '../../m08-ordenes/controllers/orden-http';

/**
 * Traduce los errores de dominio de M09. Lo que no lo es se relanza para que Express 5 lo entregue al
 * manejador global (500 opaco, HU-SEG-06).
 */
export function manejarCumplimiento(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error: unknown) {
      if (!(error instanceof CumplimientoError)) throw error;
      if (error.codigo === 'RECURSO_NO_DISPONIBLE') {
        responderRecursoNoDisponible(res);
        return;
      }
      if (error.codigo === 'PARAMETRO_INVALIDO') {
        responderParametroInvalido(res, error.message);
        return;
      }
      res
        .status(error.statusCode)
        .json({ success: false, error: { code: error.codigo, message: error.message, details: error.details } });
    }
  };
}
