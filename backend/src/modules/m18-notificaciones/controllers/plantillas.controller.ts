import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  actualizarPlantillaInputSchema,
  previsualizarPlantillaInputSchema,
  tipoComunicacionSchema,
} from '../dtos/m18-notificaciones.dto';
import type { PlantillasService } from '../services/plantillas.service';
import { NotificacionError } from '../services/notificacion.error';

export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const plantillas = await this.plantillasService.listar();
      responderExito(res, { plantillas });
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  obtener = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseoTipo = tipoComunicacionSchema.safeParse(req.params.tipo);
      if (!parseoTipo.success) {
        res.status(400).json({
          success: false,
          error: { code: 'PARAMETRO_INVALIDO', message: 'Tipo de plantilla no válido.', details: null },
        });
        return;
      }

      const plantilla = await this.plantillasService.obtener(parseoTipo.data);
      responderExito(res, plantilla);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  actualizar = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseoTipo = tipoComunicacionSchema.safeParse(req.params.tipo);
      if (!parseoTipo.success) {
        res.status(400).json({
          success: false,
          error: { code: 'PARAMETRO_INVALIDO', message: 'Tipo de plantilla no válido.', details: null },
        });
        return;
      }

      const parseoBody = actualizarPlantillaInputSchema.safeParse(req.body);
      if (!parseoBody.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseoBody.error.issues[0]?.message ?? 'Datos de plantilla inválidos.',
            details: null,
          },
        });
        return;
      }

      const idAdmin = req.actor?.idUsuario;
      const resultado = await this.plantillasService.actualizar(parseoTipo.data, parseoBody.data, idAdmin);
      responderExito(res, resultado, 'Plantilla actualizada exitosamente.');
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  previsualizar = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseoTipo = tipoComunicacionSchema.safeParse(req.params.tipo);
      if (!parseoTipo.success) {
        res.status(400).json({
          success: false,
          error: { code: 'PARAMETRO_INVALIDO', message: 'Tipo de plantilla no válido.', details: null },
        });
        return;
      }

      const parseoBody = previsualizarPlantillaInputSchema.safeParse(req.body ?? {});
      if (!parseoBody.success) {
        res.status(400).json({
          success: false,
          error: { code: 'PARAMETRO_INVALIDO', message: 'Datos de ejemplo inválidos.', details: null },
        });
        return;
      }

      const resultado = await this.plantillasService.previsualizar(parseoTipo.data, parseoBody.data);
      responderExito(res, resultado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  private manejarError(res: Response, err: unknown): void {
    if (err instanceof NotificacionError) {
      res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message, details: null },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'ERROR_INTERNO',
        message: 'Ocurrió un error inesperado al gestionar las plantillas de notificación.',
        details: null,
      },
    });
  }
}
