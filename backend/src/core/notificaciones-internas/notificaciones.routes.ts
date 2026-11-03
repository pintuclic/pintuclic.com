import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { ZodType } from 'zod';
import { responderExito, responderRecursoNoDisponible } from '../utils/apiResponse';
import {
  CODIGOS_ERROR_FP02,
  consultaListaSchema,
  idNotificacionParamSchema,
  seccionParamSchema,
} from './fp02-notificaciones.dto';
import { NotificacionesRepository } from './notificaciones.repository';
import type { NotificacionesRepositoryPort, PublicadorNotificacionesPort } from './notificaciones.interface';
import { NotificacionNoDisponibleError, NotificacionesInternasService, type OpcionesNotificaciones } from './notificaciones.service';

export interface ModuloNotificacionesInternas {
  /** Montar en `/api/v1/notificaciones` detrás de sesión vigente (cualquier rol). */
  router: Router;
  service: NotificacionesInternasService;
  /** Lo que se le pasa a cualquier módulo que quiera avisar (R12). */
  publicador: PublicadorNotificacionesPort;
}

function validar<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const r = esquema.safeParse(entrada);
  if (r.success) return r.data;
  res.status(400).json({
    success: false,
    error: { code: CODIGOS_ERROR_FP02.VALIDATION_ERROR, message: r.error.issues[0]?.message ?? 'Datos de entrada inválidos.' },
  });
  return null;
}

/** Cada ruta es de quien la llama (R1): sin sesión no hay a quién responder. */
function conPersona(fn: (idUsuario: number, req: Request, res: Response) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    try {
      await fn(actor.idUsuario, req, res);
    } catch (error) {
      if (error instanceof NotificacionNoDisponibleError) {
        responderRecursoNoDisponible(res);
        return;
      }
      throw error;
    }
  };
}

export function construirModuloNotificacionesInternas(
  deps: { repo?: NotificacionesRepositoryPort } & OpcionesNotificaciones = {},
): ModuloNotificacionesInternas {
  const { repo, ...opciones } = deps;
  const service = new NotificacionesInternasService(repo ?? new NotificacionesRepository(), opciones);

  const router = Router();

  // La que se consulta cada pocos segundos (R10, R13): una sola consulta agregada y, si nada cambió, 304 por ETag.
  router.get(
    '/resumen',
    conPersona(async (idUsuario, _req, res) => {
      res.setHeader('Cache-Control', 'private, no-cache');
      responderExito(res, await service.resumen(idUsuario));
    }),
  );

  router.get(
    '/',
    conPersona(async (idUsuario, req, res) => {
      const consulta = validar(res, consultaListaSchema, req.query);
      if (consulta === null) return;
      res.setHeader('Cache-Control', 'private, no-store');
      responderExito(res, await service.listar(idUsuario, consulta.pagina, consulta.limite));
    }),
  );

  router.post(
    '/campana/vista',
    conPersona(async (idUsuario, _req, res) => {
      responderExito(res, { cantidad: await service.marcarVistas(idUsuario) });
    }),
  );

  router.post(
    '/leer-todas',
    conPersona(async (idUsuario, _req, res) => {
      responderExito(res, { cantidad: await service.marcarTodasLeidas(idUsuario) });
    }),
  );

  router.post(
    '/secciones/:seccion/leer',
    conPersona(async (idUsuario, req, res) => {
      const p = validar(res, seccionParamSchema, req.params);
      if (p === null) return;
      responderExito(res, { cantidad: await service.marcarSeccionLeida(idUsuario, p.seccion) });
    }),
  );

  router.post(
    '/:idNotificacion/leer',
    conPersona(async (idUsuario, req, res) => {
      // Un id mal formado no se distingue de uno ajeno o inexistente (R1).
      const p = idNotificacionParamSchema.safeParse(req.params);
      if (!p.success) {
        responderRecursoNoDisponible(res);
        return;
      }
      responderExito(res, await service.marcarLeida(idUsuario, p.data.idNotificacion));
    }),
  );

  return { router, service, publicador: service };
}
