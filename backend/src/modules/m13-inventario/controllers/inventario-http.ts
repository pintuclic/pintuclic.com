import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { InventarioError } from '../services/inventario-error';

/** Responde un error de dominio con el envelope global `{ success, error: { code, message, details } }`. */
export function responderError(res: Response, err: unknown): void {
  if (err instanceof InventarioError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  // Cualquier otro error lo resuelve el manejador global (500 opaco, HU-SEG-06).
  throw err;
}

export function responderParametroInvalido(res: Response, mensaje: string): void {
  res.status(400).json({
    success: false,
    error: { code: 'PARAMETRO_INVALIDO', message: mensaje, details: null },
  });
}

/** Lee un identificador de ruta; devuelve null si no es un entero positivo. */
export function leerId(req: Request, nombre: string): number | null {
  const crudo = req.params[nombre];
  if (typeof crudo !== 'string' || !/^\d+$/.test(crudo)) return null;
  const valor = Number(crudo);
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
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

/** Ejecuta un manejador asíncrono traduciendo los errores de dominio; el resto va al manejador global. */
export function manejar(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err: unknown) {
      responderError(res, err);
    }
  };
}
