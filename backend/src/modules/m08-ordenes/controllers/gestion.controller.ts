import type { Request, Response } from 'express';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import {
  cambiarEstadoRequestSchema,
  codigoOrdenParamsSchema,
  listarGestionRequestSchema,
  paginacionQuerySchema,
} from '../dtos/m08-ordenes.dto';
import type { GestionService } from '../services/gestion.service';
import { manejarOrden, validar } from './orden-http';

/**
 * Rutas del personal bajo `/ordenes/gestion`. El permiso (`ventas.ver` / `ventas.gestionar`) lo
 * exige `requirePermission` en el router, antes de llegar aquí.
 */
export class GestionController {
  constructor(private readonly servicio: GestionService) {}

  listar = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const consulta = validar(res, listarGestionRequestSchema, req.query);
    if (consulta === null) return;

    if (consulta.agruparPorEstado) {
      res.json({ success: true, data: await this.servicio.bandejaAgrupada(consulta) });
      return;
    }
    const { filas, paginacion } = await this.servicio.bandejaPaginada(consulta);
    res.json({ success: true, data: filas, pagination: paginacion });
  });

  resumen = manejarOrden(async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: await this.servicio.resumen() });
  });

  detalle = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    if (parametros === null) return;

    res.json({ success: true, data: await this.servicio.detalle(parametros.codigo) });
  });

  historialCliente = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    const paginacion = validar(res, paginacionQuerySchema, req.query);
    if (parametros === null || paginacion === null) return;

    const { filas, paginacion: meta } = await this.servicio.historialCliente(
      parametros.codigo,
      paginacion.pagina,
      paginacion.limite,
    );
    res.json({ success: true, data: filas, pagination: meta });
  });

  cambiarEstado = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    const cambio = validar(res, cambiarEstadoRequestSchema, req.body);
    if (parametros === null || cambio === null) return;

    res.json({ success: true, data: await this.servicio.cambiarEstado(parametros.codigo, cambio, actor) });
  });
}
