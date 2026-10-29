import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import type { PostventaServicePort } from '../interfaces/postventa.interface';
import { ErrorPostventa } from '../services/reglas-postventa';
import {
  solicitarCancelacionRequestSchema,
  solicitarDevolucionRequestSchema,
  resolverSolicitudRequestSchema,
  registrarReembolsoRequestSchema,
  listarMisSolicitudesRequestSchema,
  listarGestionPostventaRequestSchema,
  codigoPostventaSchema,
} from '../dtos/m11-postventa.dto';

export function responderParametroInvalido(res: Response, mensaje: string): void {
  res.status(400).json({
    success: false,
    error: { code: 'PARAMETRO_INVALIDO', message: mensaje, details: null },
  });
}

export function validar<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    responderParametroInvalido(res, resultado.error.issues[0]?.message ?? 'Parámetros inválidos.');
    return null;
  }
  return resultado.data;
}

export function manejarPostventa(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error: unknown) {
      if (error instanceof ErrorPostventa) {
        if (error.codigo === 'RECURSO_NO_DISPONIBLE') {
          responderRecursoNoDisponible(res);
          return;
        }
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.codigo,
            message: error.message,
            details: error.details,
          },
        });
        return;
      }
      throw error;
    }
  };
}

export class PostventaController {
  constructor(private readonly service: PostventaServicePort) {}

  solicitarCancelacion = manejarPostventa(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const input = validar(res, solicitarCancelacionRequestSchema, req.body);
    if (!input) return;

    const data = await this.service.solicitarCancelacion(actor.idUsuario, input);
    res.status(201).json({ success: true, data });
  });

  solicitarDevolucion = manejarPostventa(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const input = validar(res, solicitarDevolucionRequestSchema, req.body);
    if (!input) return;

    const data = await this.service.solicitarDevolucion(actor.idUsuario, input);
    res.status(201).json({ success: true, data });
  });

  consultarMisSolicitudes = manejarPostventa(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const query = validar(res, listarMisSolicitudesRequestSchema, req.query);
    if (!query) return;

    const { data, pagination } = await this.service.consultarMisSolicitudes(actor.idUsuario, query);
    res.json({ success: true, data, pagination });
  });

  consultarMiSolicitud = manejarPostventa(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const codigo = validar(res, codigoPostventaSchema, req.params.codigo);
    if (!codigo) return;

    const data = await this.service.consultarMiSolicitud(actor.idUsuario, codigo);
    res.json({ success: true, data });
  });

  listarGestion = manejarPostventa(async (req: Request, res: Response) => {
    const query = validar(res, listarGestionPostventaRequestSchema, req.query);
    if (!query) return;

    const { data, pagination } = await this.service.listarGestion(query);
    res.json({ success: true, data, pagination });
  });

  obtenerResumenGestion = manejarPostventa(async (_req: Request, res: Response) => {
    const data = await this.service.obtenerResumenGestion();
    res.json({ success: true, data });
  });

  consultarGestionPorCodigo = manejarPostventa(async (req: Request, res: Response) => {
    const codigo = validar(res, codigoPostventaSchema, req.params.codigo);
    if (!codigo) return;

    const data = await this.service.consultarGestionPorCodigo(codigo);
    res.json({ success: true, data });
  });

  resolverSolicitud = manejarPostventa(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const codigo = validar(res, codigoPostventaSchema, req.params.codigo);
    if (!codigo) return;

    const input = validar(res, resolverSolicitudRequestSchema, req.body);
    if (!input) return;

    const data = await this.service.resolverSolicitud(actor.idUsuario, codigo, input, req.ip ?? null);
    res.json({ success: true, data });
  });

  registrarReembolso = manejarPostventa(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const codigo = validar(res, codigoPostventaSchema, req.params.codigo);
    if (!codigo) return;

    const input = validar(res, registrarReembolsoRequestSchema, req.body);
    if (!input) return;

    const data = await this.service.registrarReembolso(actor.idUsuario, codigo, input, req.ip ?? null);
    res.json({ success: true, data });
  });
}
