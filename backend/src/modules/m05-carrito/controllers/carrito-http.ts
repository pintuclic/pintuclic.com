import type { CookieOptions, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ATRIBUTOS_COOKIE_CARRITO } from '../dtos/m05-carrito.dto';
import type { AccionCookie, Solicitante } from '../interfaces/carrito.interface';
import { CarritoError } from '../services/carrito-error';

function opcionesCookie(): CookieOptions {
  return {
    httpOnly: ATRIBUTOS_COOKIE_CARRITO.httpOnly,
    secure: ATRIBUTOS_COOKIE_CARRITO.secure,
    sameSite: ATRIBUTOS_COOKIE_CARRITO.sameSite,
    path: ATRIBUTOS_COOKIE_CARRITO.path,
  };
}

/** C1: el dueño sale de la sesión verificada (`req.actor`) y de la cookie, nunca del cuerpo ni de la URL. */
export function solicitante(req: Request): Solicitante {
  const cookies: unknown = req.cookies;
  const bruto =
    typeof cookies === 'object' && cookies !== null
      ? (cookies as Record<string, unknown>)[ATRIBUTOS_COOKIE_CARRITO.nombre]
      : undefined;
  return {
    idUsuario: req.actor?.idUsuario ?? null,
    tokenVisitante: typeof bruto === 'string' ? bruto : null,
  };
}

/** C2, C9: fija o borra la cookie `pc_cart` según lo que decidió el servicio. */
export function aplicarCookie(res: Response, accion: AccionCookie): void {
  if (accion.tipo === 'fijar') {
    res.cookie(ATRIBUTOS_COOKIE_CARRITO.nombre, accion.token, {
      ...opcionesCookie(),
      maxAge: ATRIBUTOS_COOKIE_CARRITO.maxAgeSegundos * 1000,
    });
  } else if (accion.tipo === 'borrar') {
    res.clearCookie(ATRIBUTOS_COOKIE_CARRITO.nombre, opcionesCookie());
  }
}

export function responderExito<T>(res: Response, data: T): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data });
}

function responderParametroInvalido(res: Response, mensaje: string): void {
  res.status(400).json({
    success: false,
    error: { code: 'PARAMETRO_INVALIDO', message: mensaje, details: null },
  });
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

/** Ejecuta un manejador asíncrono traduciendo los errores de dominio; el resto va al manejador global (500 opaco). */
export function manejar(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err: unknown) {
      if (err instanceof CarritoError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code, message: err.message, details: err.details },
        });
        return;
      }
      throw err;
    }
  };
}
