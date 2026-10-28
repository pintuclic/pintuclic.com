import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { actualizarHorarioRequestSchema, actualizarWhatsappRequestSchema } from '../dtos/m15-atencion.dto';
import type { ConfiguracionAtencionService } from '../services/configuracion.service';
import { manejar, validar } from './atencion-http';

export class ConfiguracionAtencionController {
  constructor(private readonly servicio: ConfiguracionAtencionService) {}

  /** GET /atencion/horario (público) y GET /admin/atencion/horario. */
  obtenerHorario = manejar(async (_req: Request, res: Response): Promise<void> => {
    const horario = await this.servicio.obtenerHorario();
    responderExito(res, horario);
  });

  /** PUT /admin/atencion/horario */
  actualizarHorario = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, actualizarHorarioRequestSchema, req.body);
    if (datos === null) return;

    const horario = await this.servicio.actualizarHorario(datos, req.actor?.idUsuario);
    responderExito(res, horario, 'Horario de atención actualizado.');
  });

  /** GET /atencion/whatsapp — público, solo lo que necesita el botón (R7). */
  obtenerCanalPublico = manejar(async (_req: Request, res: Response): Promise<void> => {
    const canal = await this.servicio.obtenerCanalPublico();
    responderExito(res, canal);
  });

  /** GET /admin/atencion/whatsapp */
  obtenerWhatsapp = manejar(async (_req: Request, res: Response): Promise<void> => {
    const configuracion = await this.servicio.obtenerWhatsapp();
    responderExito(res, configuracion);
  });

  /** PUT /admin/atencion/whatsapp */
  actualizarWhatsapp = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, actualizarWhatsappRequestSchema, req.body);
    if (datos === null) return;

    const configuracion = await this.servicio.guardarWhatsapp(
      datos.destino,
      datos.mensajeBase,
      req.actor?.idUsuario,
    );
    responderExito(res, configuracion, 'Canal de atención actualizado.');
  });
}
