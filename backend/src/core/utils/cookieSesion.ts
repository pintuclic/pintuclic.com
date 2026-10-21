import type { CookieOptions } from 'express';

/**
 * ADR-005 — Atributos de la cookie de sesión, fijados aquí y no en cada llamada.
 *
 * `httpOnly` es lo que hace estructural el cumplimiento de RNF-SEG-02-01: el
 * código de la página no puede leer el identificador de sesión aunque quiera.
 */
export const ATRIBUTOS_COOKIE_SESION = {
  nombre: 'pc_sid',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
} as const;

export function opcionesCookieSesion(vigenciaSegundos: number): CookieOptions {
  return {
    httpOnly: ATRIBUTOS_COOKIE_SESION.httpOnly,
    secure: ATRIBUTOS_COOKIE_SESION.secure,
    sameSite: ATRIBUTOS_COOKIE_SESION.sameSite,
    path: ATRIBUTOS_COOKIE_SESION.path,
    maxAge: vigenciaSegundos * 1000,
  };
}
