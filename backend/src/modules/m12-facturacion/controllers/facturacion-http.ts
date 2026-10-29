import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { CODIGOS_ERROR_M12 } from '../dtos/m12-facturacion.dto';
import { FacturacionError } from '../services/facturacion-error';

export function validar<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const r = esquema.safeParse(entrada);
  if (r.success) return r.data;
  res.status(400).json({ success: false, error: { code: CODIGOS_ERROR_M12.VALIDATION_ERROR, message: r.error.issues[0]?.message ?? 'Datos de entrada inválidos.' } });
  return null;
}

export function manejarFacturacion(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof FacturacionError) {
        if (error.status === 404) {
          responderRecursoNoDisponible(res);
          return;
        }
        res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      throw error;
    }
  };
}
