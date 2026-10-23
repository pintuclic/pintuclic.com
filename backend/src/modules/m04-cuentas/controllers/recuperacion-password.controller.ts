import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  restablecerPasswordRequestSchema,
  solicitarRecuperacionPasswordRequestSchema,
} from '../dtos/m04-cuentas.dto';
import {
  RecuperacionPasswordError,
  type RecuperacionPasswordService,
} from '../services/recuperacion-password.service';

export class RecuperacionPasswordController {
  constructor(private readonly recuperacionService: RecuperacionPasswordService) {}

  /**
   * HU-CUE-05: Solicitar recuperación de contraseña (anti-enumeración)
   * POST /cuentas/recuperar-password/solicitar
   */
  solicitar = async (req: Request, res: Response): Promise<void> => {
    const parse = solicitarRecuperacionPasswordRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Correo no válido',
        },
      });
      return;
    }

    try {
      const resultado = await this.recuperacionService.solicitarRecuperacion(parse.data.correo);
      responderExito(res, { solicitado: true }, resultado.mensaje);
    } catch (error) {
      if (error instanceof RecuperacionPasswordError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-05: Restablecer contraseña consumiendo token válido
   * POST /cuentas/recuperar-password/confirmar
   */
  confirmar = async (req: Request, res: Response): Promise<void> => {
    const parse = restablecerPasswordRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Token o nueva contraseña no válidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.recuperacionService.restablecerPassword(parse.data);
      responderExito(res, { restablecido: true }, resultado.mensaje);
    } catch (error) {
      if (error instanceof RecuperacionPasswordError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message },
        });
        return;
      }
      throw error;
    }
  };
}
