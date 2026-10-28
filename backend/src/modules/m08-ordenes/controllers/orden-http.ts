import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { EstadoOrdenError } from '../services/estados.service';
import { ConsultaOrdenError } from '../services/consulta-cliente.service';

/** 400 por parámetros inválidos, con el envelope del contrato (PARAMETRO_INVALIDO). */
export function responderParametroInvalido(res: Response, mensaje: string): void {
  res.status(400).json({ success: false, error: { code: 'PARAMETRO_INVALIDO', message: mensaje, details: null } });
}

/** Valida con Zod; si falla responde 400 y devuelve null. */
export function validar<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    responderParametroInvalido(res, resultado.error.issues[0]?.message ?? 'Parámetros inválidos.');
    return null;
  }
  return resultado.data;
}

/**
 * Traduce los errores de dominio de M08. Lo que no lo es se relanza para que Express 5 lo
 * entregue al manejador global (500 opaco, HU-SEG-06).
 */
export function manejarOrden(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error: unknown) {
      if (error instanceof ConsultaOrdenError) {
        responderRecursoNoDisponible(res);
        return;
      }
      if (error instanceof EstadoOrdenError) {
        if (error.codigo === 'RECURSO_NO_DISPONIBLE') {
          responderRecursoNoDisponible(res);
          return;
        }
        res
          .status(error.statusCode)
          .json({ success: false, error: { code: error.codigo, message: error.message, details: null } });
        return;
      }
      throw error;
    }
  };
}

export function ipDe(req: Request): string | null {
  return req.ip ?? null;
}
