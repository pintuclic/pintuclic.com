import type { NextFunction, Request, Response } from 'express';
import { ATRIBUTOS_COOKIE_SESION } from '../utils/cookieSesion';
import { construirError } from '../utils/apiResponse';
import { leerToken } from '../utils/jwt';
import type { SesionService } from '../../modules/m20-seguridad/services/sesion.service';

/**
 * HU-SEG-02 — Resuelve la sesión y renueva su vigencia.
 *
 * ADR-005: el identificador viaja en cookie HttpOnly, no en localStorage, para
 * que el código de la página no pueda leerlo (RNF-SEG-02-01).
 */
export function construirAuthMiddleware(sesiones: SesionService) {
  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const cookies: unknown = req.cookies;
    const bruto =
      typeof cookies === 'object' && cookies !== null
        ? (cookies as Record<string, unknown>)[ATRIBUTOS_COOKIE_SESION.nombre]
        : undefined;

    if (typeof bruto !== 'string') {
      res.status(401).json(construirError('SESION_EXPIRADA', 'Debe autenticarse para continuar.'));
      return;
    }

    const contenido = leerToken(bruto);
    if (contenido === null) {
      res.status(401).json(construirError('SESION_EXPIRADA', 'Debe autenticarse para continuar.'));
      return;
    }

    const resultado = await sesiones.validarYRenovar(contenido.sid);
    if (!resultado.valida) {
      // RF-SEG-02-08: se informa de la expiración; el frontend conserva el destino
      // pretendido y vuelve a él tras re-autenticar (CA-SEG-02-06).
      res.clearCookie(ATRIBUTOS_COOKIE_SESION.nombre);
      res.status(401).json(construirError('SESION_EXPIRADA', 'La sesión ha expirado.'));
      return;
    }

    req.actor = {
      idUsuario: resultado.sesion.idUsuario,
      idSesion: resultado.sesion.idSesion,
      tipoSesion: resultado.sesion.tipoSesion,
    };
    next();
  };
}
