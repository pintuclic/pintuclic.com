import type { Request, Response } from 'express';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { codigoOrdenParamsSchema, listarMisPedidosRequestSchema } from '../dtos/m08-ordenes.dto';
import type { ConsultaClienteService } from '../services/consulta-cliente.service';
import { ipDe, manejarOrden, validar } from './orden-http';

/** Rutas del cliente titular: GET /ordenes/mis-pedidos y /ordenes/mis-pedidos/:codigo. */
export class MisPedidosController {
  constructor(private readonly servicio: ConsultaClienteService) {}

  listar = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const consulta = validar(res, listarMisPedidosRequestSchema, req.query);
    if (consulta === null) return;

    const { enCurso, finalizados, paginacion } = await this.servicio.listar(actor, consulta);
    res.json({ success: true, data: { enCurso, finalizados }, pagination: paginacion });
  });

  detalle = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    if (parametros === null) return;

    const orden = await this.servicio.detalle(actor, parametros.codigo, {
      operacionIntentada: `${req.method} ${req.originalUrl.split('?')[0] ?? req.path}`,
      ipOrigen: ipDe(req),
    });
    res.json({ success: true, data: orden });
  });
}
