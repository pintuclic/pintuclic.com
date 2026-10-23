import type { Request, Response } from 'express';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import {
  actualizarDireccionRequestSchema,
  crearDireccionRequestSchema,
} from '../dtos/m04-cuentas.dto';
import { DireccionesError, type DireccionesService } from '../services/direcciones.service';
import { leerParamUuid } from './parametros';

export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  /**
   * HU-CUE-07: Listar libreta de direcciones
   * GET /cuentas/direcciones
   */
  listar = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const direcciones = await this.direccionesService.listar(actor.idUsuario);
    responderExito(res, direcciones);
  };

  /**
   * HU-CUE-07: Registrar nueva dirección
   * POST /cuentas/direcciones
   */
  crear = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = crearDireccionRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de dirección inválidos',
        },
      });
      return;
    }

    try {
      const nueva = await this.direccionesService.crear(actor.idUsuario, parse.data);
      responderExito(res, nueva, 'Dirección agregada exitosamente.', 201);
    } catch (error) {
      if (error instanceof DireccionesError) {
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
   * HU-CUE-07: Actualizar dirección existente
   * PUT /cuentas/direcciones/:idDireccion
   */
  actualizar = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const idDireccion = leerParamUuid(req, 'idDireccion');
    if (idDireccion === null) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = actualizarDireccionRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de dirección inválidos',
        },
      });
      return;
    }

    try {
      const actualizada = await this.direccionesService.actualizar(idDireccion, actor.idUsuario, parse.data);
      responderExito(res, actualizada, 'Dirección actualizada exitosamente.');
    } catch (error) {
      if (error instanceof DireccionesError) {
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
   * HU-CUE-07: Eliminar dirección
   * DELETE /cuentas/direcciones/:idDireccion
   */
  eliminar = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const idDireccion = leerParamUuid(req, 'idDireccion');
    if (idDireccion === null) {
      responderRecursoNoDisponible(res);
      return;
    }

    try {
      const resultado = await this.direccionesService.eliminar(idDireccion, actor.idUsuario);
      responderExito(res, { eliminado: true }, resultado.mensaje);
    } catch (error) {
      if (error instanceof DireccionesError) {
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
   * HU-CUE-07: Establecer como dirección predeterminada
   * PATCH /cuentas/direcciones/:idDireccion/predeterminada
   */
  establecerPredeterminada = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const idDireccion = leerParamUuid(req, 'idDireccion');
    if (idDireccion === null) {
      responderRecursoNoDisponible(res);
      return;
    }

    try {
      const predeterminada = await this.direccionesService.establecerPredeterminada(idDireccion, actor.idUsuario);
      responderExito(res, predeterminada, 'Dirección establecida como predeterminada.');
    } catch (error) {
      if (error instanceof DireccionesError) {
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
