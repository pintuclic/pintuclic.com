import type { Request, Response } from 'express';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import {
  codigoOrdenParamsSchema,
  listarRetenidasRequestSchema,
  verificarLineasRequestSchema,
} from '../dtos/m09-cumplimiento.dto';
import type { CumplimientoService } from '../services/cumplimiento.service';
import { manejarCumplimiento, validar } from './cumplimiento-http';

/**
 * Rutas de M09 bajo `/cumplimiento`. La sesión de personal y el permiso `ventas.gestionar` los exige el router,
 * antes de llegar aquí (R11).
 */
export class CumplimientoController {
  constructor(private readonly servicio: CumplimientoService) {}

  retenidas = manejarCumplimiento(async (req: Request, res: Response): Promise<void> => {
    const consulta = validar(res, listarRetenidasRequestSchema, req.query);
    if (consulta === null) return;

    const { filas, paginacion } = await this.servicio.retenidas(consulta.pagina, consulta.limite);
    res.json({ success: true, data: filas, pagination: paginacion });
  });

  verificacion = manejarCumplimiento(async (req: Request, res: Response): Promise<void> => {
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    if (parametros === null) return;

    res.json({ success: true, data: await this.servicio.verificacion(parametros.codigo) });
  });

  marcar = manejarCumplimiento(async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    // En cascada: `validar` responde 400 al fallar, y una segunda respuesta lanzaría ERR_HTTP_HEADERS_SENT.
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    if (parametros === null) return;
    const peticion = validar(res, verificarLineasRequestSchema, req.body);
    if (peticion === null) return;

    res.json({ success: true, data: await this.servicio.marcar(parametros.codigo, peticion, actor) });
  });

  hoja = manejarCumplimiento(async (req: Request, res: Response): Promise<void> => {
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    if (parametros === null) return;

    res.json({ success: true, data: await this.servicio.hoja(parametros.codigo) });
  });
}
