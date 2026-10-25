import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { CODIGOS_ERROR_CONTENIDO } from '../dtos/m16-contenido.dto';
import { ContenidoError } from '../services/contenido-error';

export function responderErrorContenido(res: Response, err: unknown): void {
  if (err instanceof ContenidoError) {
    if (err.status === 404) {
      responderRecursoNoDisponible(res);
      return;
    }
    res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }
  throw err;
}

export function responderValidacionInvalida(res: Response, mensaje: string): void {
  res.status(400).json({
    success: false,
    error: {
      code: CODIGOS_ERROR_CONTENIDO.VALIDATION_ERROR,
      message: mensaje,
    },
  });
}

export function leerIdParametro(req: Request, nombre: string): number | null {
  const crudo = req.params[nombre];
  if (typeof crudo !== 'string' || !/^\d+$/.test(crudo)) {
    return null;
  }
  const valor = Number(crudo);
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
}

export function validarEsquema<T>(
  res: Response,
  esquema: ZodType<T>,
  entrada: unknown,
): T | null {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    responderValidacionInvalida(
      res,
      resultado.error.issues[0]?.message ?? 'Datos de entrada inválidos.',
    );
    return null;
  }
  return resultado.data;
}

export function manejarContenido(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err: unknown) {
      responderErrorContenido(res, err);
    }
  };
}
