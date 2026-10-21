import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { buscarClientesQuerySchema, desactivarClienteInputSchema } from '../dtos/m17-permisos.dto';
import type { ClientesAdminService } from '../services/clientes-admin.service';
import { EmpleadoError } from '../services/empleados.service';

export class ClientesAdminController {
  constructor(private readonly clientesService: ClientesAdminService) {}

  buscar = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseo = buscarClientesQuerySchema.safeParse(req.query);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Criterios de búsqueda inválidos.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.clientesService.buscar(parseo.data);
      responderExito(res, resultado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  obtenerFicha = async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = Number(req.params.id);
      if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: 'El identificador del cliente debe ser un entero positivo.',
            details: null,
          },
        });
        return;
      }

      const ficha = await this.clientesService.obtenerFicha(idUsuario);
      responderExito(res, ficha);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  desactivar = async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = Number(req.params.id);
      if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: 'El identificador del cliente debe ser un entero positivo.',
            details: null,
          },
        });
        return;
      }

      const parseo = desactivarClienteInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'El motivo de desactivación es inválido.',
            details: null,
          },
        });
        return;
      }

      await this.clientesService.desactivar(idUsuario, parseo.data);
      responderExito(res, { desactivado: true }, 'Cliente desactivado exitosamente.');
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
        message: 'Ocurrió un error inesperado al gestionar el cliente.',
        details: null,
      },
    });
  }
}
