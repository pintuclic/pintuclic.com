import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  actualizarParametroInputSchema,
  claveParametroSchema,
} from '../dtos/m17-permisos.dto';
import type { ConfiguracionService } from '../services/configuracion.service';
import { EmpleadoError } from '../services/empleados.service';

export class ConfiguracionController {
  constructor(private readonly configService: ConfiguracionService) {}

  obtenerCatalogo = async (_req: Request, res: Response): Promise<void> => {
    try {
      const catalogo = await this.configService.obtenerCatalogo();
      responderExito(res, catalogo);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  actualizarParametro = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseoClave = claveParametroSchema.safeParse(req.params.clave);
      if (!parseoClave.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: 'La clave de configuración indicada no es válida.',
            details: null,
          },
        });
        return;
      }

      const parseoBody = actualizarParametroInputSchema.safeParse(req.body);
      if (!parseoBody.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseoBody.error.issues[0]?.message ?? 'Valor del parámetro inválido.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.configService.actualizarParametro(
        parseoClave.data,
        parseoBody.data,
      );

      responderExito(res, resultado, 'Parámetro de configuración actualizado exitosamente.');
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  private manejarError(res: Response, err: unknown): void {
    if (err instanceof EmpleadoError) {
      res.status(err.status).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: null,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'ERROR_INTERNO',
        message: 'Ocurrió un error inesperado al gestionar los parámetros de configuración.',
        details: null,
      },
    });
  }
}
