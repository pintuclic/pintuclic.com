import type { Request, Response } from 'express';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { actualizarPermisosEmpleadoInputSchema } from '../dtos/m17-permisos.dto';
import { EmpleadoError } from '../services/empleados.service';
import type { PermisosService } from '../services/permisos.service';

export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  /** R-ACC-9. Un cliente (o cualquier cuenta que no sea de personal) recibe el 404 opaco de siempre. */
  misPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = req.actor;
      if (!actor) {
        responderRecursoNoDisponible(res);
        return;
      }
      const resultado = await this.permisosService.misPermisos(actor.idUsuario);
      if (resultado === null) {
        responderRecursoNoDisponible(res);
        return;
      }
      responderExito(res, resultado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  obtenerMatriz = async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = Number(req.params.id);
      if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: 'El identificador del colaborador debe ser un entero positivo.',
            details: null,
          },
        });
        return;
      }

      const matriz = await this.permisosService.obtenerMatriz(idUsuario);
      responderExito(res, matriz);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  actualizarPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = Number(req.params.id);
      if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: 'El identificador del colaborador debe ser un entero positivo.',
            details: null,
          },
        });
        return;
      }

      const parseo = actualizarPermisosEmpleadoInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Lista de permisos inválida.',
            details: null,
          },
        });
        return;
      }

      const actor = req.actor;
      if (!actor) {
        res.status(401).json({
          success: false,
          error: {
            code: 'SESION_EXPIRADA',
            message: 'Debe autenticarse para continuar.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.permisosService.actualizarPermisos(
        idUsuario,
        parseo.data.permisos,
        actor,
      );

      responderExito(res, resultado, 'Matriz de permisos actualizada exitosamente.');
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
        message: 'Ocurrió un error inesperado al gestionar los permisos.',
        details: null,
      },
    });
  }
}
