import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { webhookRebotesInputSchema } from '../dtos/m18-notificaciones.dto';
import type { RebotesService } from '../services/rebotes.service';

const resumen = (valor: string): Buffer => createHash('sha256').update(valor).digest();

function error(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message, details: null } });
}

/** Recibe los rebotes del proveedor. No hay sesión: la identidad es el token compartido en `Authorization: Bearer`. */
export class RebotesWebhookController {
  constructor(
    private readonly rebotes: RebotesService,
    private readonly token: string | undefined,
  ) {}

  recibir = async (req: Request, res: Response): Promise<void> => {
    if (!this.token) {
      error(res, 503, 'WEBHOOK_NO_CONFIGURADO', 'El registro de rebotes no está configurado.');
      return;
    }
    const recibido = /^Bearer (.+)$/.exec(req.header('authorization') ?? '')?.[1] ?? '';
    if (!timingSafeEqual(resumen(recibido), resumen(this.token))) {
      error(res, 401, 'NO_AUTORIZADO', 'Credenciales inválidas.');
      return;
    }

    const parseo = webhookRebotesInputSchema.safeParse(req.body);
    if (!parseo.success) {
      error(res, 400, 'PARAMETRO_INVALIDO', 'Evento inválido.');
      return;
    }

    try {
      const eventos = Array.isArray(parseo.data) ? parseo.data : [parseo.data];
      responderExito(res, await this.rebotes.registrarEventos(eventos));
    } catch {
      error(res, 500, 'ERROR_INTERNO', 'No se pudo registrar el rebote.');
    }
  };
}
