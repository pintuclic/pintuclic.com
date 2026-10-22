import type { Request, Response } from 'express';
import { ATRIBUTOS_COOKIE_SESION } from '../../../core/utils/cookieSesion';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { cerrarSesionSchema } from '../dtos/sesion.dto';
import type { SesionService } from '../services/sesion.service';

export class SesionController {
  constructor(private readonly sesiones: SesionService) {}

  /** RF-SEG-02-04 — Cierre explícito de la sesión en curso. */
  cerrar = async (req: Request, res: Response): Promise<void> => {
    const parseo = cerrarSesionSchema.safeParse(req.body ?? {});
    if (!parseo.success) {
      responderRecursoNoDisponible(res);
      return;
    }
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const sesion = await this.sesiones.cerrarManualmente(actor.idSesion);
    res.clearCookie(ATRIBUTOS_COOKIE_SESION.nombre, { path: ATRIBUTOS_COOKIE_SESION.path });
    responderExito(
      res,
      {
        idSesion: sesion.idSesion,
        estado: sesion.estado,
        motivoCierre: sesion.motivoCierre,
      },
      'Sesión cerrada.',
    );
  };
}
