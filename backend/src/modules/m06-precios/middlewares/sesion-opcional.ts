import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ATRIBUTOS_COOKIE_SESION, opcionesCookieSesion } from '../../../core/utils/cookieSesion';
import { emitirToken, leerToken } from '../../../core/utils/jwt';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';

/**
 * Sesión OPCIONAL para las rutas públicas de precios (el cálculo lo usan también los visitantes). Hace lo
 * mismo que `auth.middleware` cuando hay una sesión válida —fija `req.actor` y desliza la cookie—, pero sin
 * cookie, con una inválida o vencida sigue como visitante en vez de responder 401. El `actor` solo sale de la
 * sesión verificada en el servidor, nunca del cliente.
 */
export function construirSesionOpcional(sesiones: SesionService): RequestHandler {
  return async function sesionOpcional(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cookies: unknown = req.cookies;
      const bruto =
        typeof cookies === 'object' && cookies !== null
          ? (cookies as Record<string, unknown>)[ATRIBUTOS_COOKIE_SESION.nombre]
          : undefined;
      const contenido = typeof bruto === 'string' ? leerToken(bruto) : null;
      if (contenido !== null) {
        const resultado = await sesiones.validarYRenovar(contenido.sid);
        if (resultado.valida) {
          const vigenciaSegundos = Math.max(
            1,
            Math.floor((resultado.sesion.fechaExpiracion.getTime() - Date.now()) / 1000),
          );
          res.cookie(
            ATRIBUTOS_COOKIE_SESION.nombre,
            emitirToken(resultado.sesion.idSesion, vigenciaSegundos),
            opcionesCookieSesion(vigenciaSegundos),
          );
          req.actor = {
            idUsuario: resultado.sesion.idUsuario,
            idSesion: resultado.sesion.idSesion,
            tipoSesion: resultado.sesion.tipoSesion,
          };
        }
      }
      next();
    } catch (err: unknown) {
      next(err);
    }
  };
}
