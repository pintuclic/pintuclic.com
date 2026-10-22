import type { NextFunction, Request, Response } from 'express';
import { responderRecursoNoDisponible } from '../utils/apiResponse';
import type { AutorizacionService } from '../../modules/m20-seguridad/services/autorizacion.service';

/**
 * HU-SEG-03 — Puerta de entrada al VALIDADOR CENTRAL.
 *
 * ⚠️ RN-SEG-08 / ADR-003: toda denegación responde con
 * `responderRecursoNoDisponible`, idéntica a la de un recurso inexistente. Nunca
 * se devuelve un 403 que confirme la existencia del recurso (CA-SEG-03-06).
 */

function ipDe(req: Request): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}

export function requirePermission(autorizacion: AutorizacionService, codigoPermiso: string) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const autorizado = await autorizacion.exigirPermiso(actor, codigoPermiso, {
      operacionIntentada: `${req.method} ${req.path}`,
      ipOrigen: ipDe(req),
    });
    if (!autorizado) {
      responderRecursoNoDisponible(res);
      return;
    }
    next();
  };
}

/** RF-SEG-03-02. El propietario se obtiene del servidor, jamás del cliente. */
export function requireOwnership(
  autorizacion: AutorizacionService,
  resolverPropietario: (req: Request) => Promise<number | null>,
) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const propietario = await resolverPropietario(req);
    const contexto = {
      operacionIntentada: `${req.method} ${req.path}`,
      ipOrigen: ipDe(req),
    };
    // Recurso inexistente y recurso ajeno comparten exactamente esta salida.
    if (propietario === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    const esTitular = await autorizacion.exigirTitularidad(actor, propietario, contexto);
    if (!esTitular) {
      responderRecursoNoDisponible(res);
      return;
    }
    next();
  };
}
