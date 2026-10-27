import type { Request, Response } from 'express';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { resumenPanelRequestSchema } from '../dtos/m17-panel-resumen.dto';
import type { PanelService } from '../services/panel.service';

export class PanelController {
  constructor(private readonly panelService: PanelService) {}

  /** GET /admin/resumen (contrato M17 · resumen). Sin permiso para ningún bloque responde el 404 opaco (R1). */
  resumen = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parseo = resumenPanelRequestSchema.safeParse(req.query);
    if (!parseo.success) {
      res.status(400).json({
        success: false,
        error: { code: 'PARAMETRO_INVALIDO', message: 'El periodo debe ser de 7, 30 o 90 días.', details: null },
      });
      return;
    }
    const resumen = await this.panelService.resumen(actor.idUsuario, parseo.data.dias);
    if (resumen === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, resumen);
  };
}
