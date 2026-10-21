import type { NextFunction, Request, Response } from 'express';
import { construirError } from '../utils/apiResponse';

/**
 * HU-SEG-06 — Manejador global de errores.
 *
 * RF-SEG-06-04: el mensaje al cliente no revela rutas, consultas ni versiones.
 * RF-SEG-06-07: el detalle técnico sí se registra internamente, para diagnosticar.
 */

function describirParaRegistroInterno(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? '(sin traza)'}`;
  }
  return `Valor no-Error lanzado: ${String(error)}`;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // CA-SEG-06-06: traza completa al registro técnico, nunca al navegador.
  // CA-SEG-01-03: el cuerpo de la petición NO se registra; podría contener la contraseña.
  console.error(
    `[ERROR] ${req.method} ${req.path} :: ${describirParaRegistroInterno(error)}`,
  );

  if (res.headersSent) {
    return;
  }

  res
    .status(500)
    .json(construirError('ERROR_INTERNO', 'No fue posible completar la operación.'));
}

/** Ruta inexistente: misma respuesta que un recurso ajeno (RN-SEG-08). */
export function rutaNoEncontrada(_req: Request, res: Response): void {
  res
    .status(404)
    .json(construirError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.'));
}
