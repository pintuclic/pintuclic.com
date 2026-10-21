import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  confirmarSustitucionCorreoAdminInputSchema,
  primerAccesoAdminInputSchema,
  solicitarSustitucionCorreoAdminInputSchema,
} from '../dtos/m17-permisos.dto';
import { EmpleadoError } from '../services/empleados.service';
import type { GobernanzaAdminService } from '../services/gobernanza-admin.service';

export class GobernanzaAdminController {
  constructor(private readonly gobernanzaService: GobernanzaAdminService) {}

  solicitarSustitucionCorreo = async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = req.actor;
      if (!actor) {
        res.status(401).json({
          success: false,
          error: {
            code: 'SESION_EXPIRADA',
            message: 'Debe autenticarse como administrador para continuar.',
            details: null,
          },
        });
        return;
      }

      const parseo = solicitarSustitucionCorreoAdminInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'El nuevo correo es inválido.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.gobernanzaService.solicitarSustitucionCorreo(
        parseo.data,
        actor.idUsuario,
      );
      responderExito(res, resultado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  confirmarSustitucionCorreo = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseo = confirmarSustitucionCorreoAdminInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Token de confirmación inválido.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.gobernanzaService.confirmarSustitucionCorreo(parseo.data);
      responderExito(res, resultado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  primerAcceso = async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = req.actor;
      if (!actor) {
        res.status(401).json({
          success: false,
          error: {
            code: 'SESION_EXPIRADA',
            message: 'Debe identificarse para actualizar su credencial.',
            details: null,
          },
        });
        return;
      }

      const parseo = primerAccesoAdminInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Datos de contraseña inválidos.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.gobernanzaService.primerAcceso(actor.idUsuario, parseo.data);
      responderExito(res, resultado);
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
        message: 'Ocurrió un error inesperado al procesar la gobernanza.',
        details: null,
      },
    });
  }
}
