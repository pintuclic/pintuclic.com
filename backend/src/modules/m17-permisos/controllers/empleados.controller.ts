import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  crearEmpleadoInputSchema,
  editarEmpleadoInputSchema,
  listarEmpleadosQuerySchema,
} from '../dtos/m17-permisos.dto';
import { EmpleadoError, type EmpleadosService } from '../services/empleados.service';

export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseo = listarEmpleadosQuerySchema.safeParse(req.query);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Parámetros de consulta inválidos.',
            details: null,
          },
        });
        return;
      }

      const resultado = await this.empleadosService.listar(parseo.data);
      responderExito(res, resultado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  obtener = async (req: Request, res: Response): Promise<void> => {
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

      const empleado = await this.empleadosService.obtenerPorId(idUsuario);
      responderExito(res, empleado);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  crear = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseo = crearEmpleadoInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Datos del colaborador inválidos.',
            details: null,
          },
        });
        return;
      }

      const nuevoEmpleado = await this.empleadosService.crear(parseo.data);
      responderExito(res, nuevoEmpleado, 'Colaborador creado exitosamente', 201);
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  editar = async (req: Request, res: Response): Promise<void> => {
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

      const parseo = editarEmpleadoInputSchema.safeParse(req.body);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PARAMETRO_INVALIDO',
            message: parseo.error.issues[0]?.message ?? 'Datos de edición inválidos.',
            details: null,
          },
        });
        return;
      }

      const actualizado = await this.empleadosService.editar(idUsuario, parseo.data);
      responderExito(res, actualizado, 'Colaborador actualizado exitosamente');
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
            message: 'El identificador del colaborador debe ser un entero positivo.',
            details: null,
          },
        });
        return;
      }

      await this.empleadosService.desactivar(idUsuario);
      responderExito(res, { desactivado: true }, 'Colaborador desactivado exitosamente.');
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  reactivar = async (req: Request, res: Response): Promise<void> => {
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

      await this.empleadosService.reactivar(idUsuario);
      responderExito(res, { reactivado: true }, 'Colaborador reactivado exitosamente.');
    } catch (err: unknown) {
      this.manejarError(res, err);
    }
  };

  reenviarActivacion = async (req: Request, res: Response): Promise<void> => {
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

      await this.empleadosService.reenviarActivacion(idUsuario);
      responderExito(res, { enviado: true }, 'Enlace de activación enviado.');
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
        message: 'Ocurrió un error inesperado al procesar la solicitud.',
        details: null,
      },
    });
  }
}
