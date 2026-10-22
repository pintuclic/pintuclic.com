import type { Request, Response } from 'express';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import {
  dictamenRenovacionNitRequestSchema,
  dictamenSolicitudEmpresaRequestSchema,
  listarSolicitudesEmpresaQuerySchema,
  registroEmpresaRequestSchema,
  solicitarAscensoEmpresaRequestSchema,
  solicitarRenovacionNitRequestSchema,
} from '../dtos/m04-cuentas.dto';
import { EmpresasError, type EmpresasService } from '../services/empresas.service';

interface RequestConArchivo extends Request {
  file?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  };
}

export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  /**
   * HU-CUE-03: Registro de cuenta Empresa B2B inicial
   * POST /cuentas/empresas/registro
   */
  registrarEmpresa = async (req: Request, res: Response): Promise<void> => {
    const parse = registroEmpresaRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de registro de empresa inválidos',
        },
      });
      return;
    }

    const reqArchivo = req as RequestConArchivo;
    const archivoRut = reqArchivo.file
      ? {
          buffer: reqArchivo.file.buffer,
          mimeType: reqArchivo.file.mimetype,
          originalname: reqArchivo.file.originalname,
        }
      : undefined;

    try {
      const resultado = await this.empresasService.registrarEmpresa(parse.data, archivoRut);
      responderExito(
        res,
        {
          idSolicitud: resultado.idSolicitud,
          estado: 'pendiente',
        },
        resultado.mensaje,
        201,
      );
    } catch (error) {
      if (error instanceof EmpresasError) {
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
   * HU-CUE-06: Solicitar ascenso de cliente particular a empresa
   * POST /cuentas/empresas/ascenso
   */
  solicitarAscenso = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = solicitarAscensoEmpresaRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de ascenso a empresa inválidos',
        },
      });
      return;
    }

    const reqArchivo = req as RequestConArchivo;
    const archivoRut = reqArchivo.file
      ? {
          buffer: reqArchivo.file.buffer,
          mimeType: reqArchivo.file.mimetype,
          originalname: reqArchivo.file.originalname,
        }
      : undefined;

    try {
      const resultado = await this.empresasService.solicitarAscensoEmpresa(
        actor.idUsuario,
        parse.data,
        archivoRut,
      );
      responderExito(
        res,
        { idSolicitud: resultado.idSolicitud },
        resultado.mensaje,
        201,
      );
    } catch (error) {
      if (error instanceof EmpresasError) {
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
   * HU-CUE-10: Solicitar renovación de NIT corporativo con RUT soporte
   * POST /cuentas/empresas/renovacion-nit
   */
  solicitarRenovacionNit = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = solicitarRenovacionNitRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de renovación de NIT inválidos',
        },
      });
      return;
    }

    const reqArchivo = req as RequestConArchivo;
    const archivoRut = reqArchivo.file
      ? {
          buffer: reqArchivo.file.buffer,
          mimeType: reqArchivo.file.mimetype,
          originalname: reqArchivo.file.originalname,
        }
      : undefined;

    try {
      const resultado = await this.empresasService.solicitarRenovacionNit(
        actor.idUsuario,
        parse.data,
        archivoRut,
      );
      responderExito(
        res,
        { idSolicitud: resultado.idSolicitud },
        resultado.mensaje,
        201,
      );
    } catch (error) {
      if (error instanceof EmpresasError) {
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
   * HU-CUE-09: Listar solicitudes de empresa para administración
   * GET /admin/empresas/solicitudes
   */
  listarSolicitudes = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = listarSolicitudesEmpresaQuerySchema.safeParse(req.query);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Parámetros de consulta inválidos',
        },
      });
      return;
    }

    const solicitudes = await this.empresasService.listarSolicitudes(parse.data);
    responderExito(res, solicitudes);
  };

  /**
   * HU-CUE-09: Detalle de solicitud de empresa
   * GET /admin/empresas/solicitudes/:idSolicitud
   */
  obtenerDetalleSolicitud = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const paramId = req.params.idSolicitud;
    const idSolicitud = Array.isArray(paramId) ? paramId[0] : paramId;
    if (!idSolicitud) {
      res.status(400).json({
        success: false,
        error: { code: 'DATOS_INVALIDOS', message: 'Identificador de solicitud requerido.' },
      });
      return;
    }

    try {
      const solicitud = await this.empresasService.obtenerDetalleSolicitud(idSolicitud);
      responderExito(res, solicitud);
    } catch (error) {
      if (error instanceof EmpresasError) {
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
   * HU-CUE-09: Dictaminar solicitud de empresa (aprobar o rechazar)
   * POST /admin/empresas/solicitudes/:idSolicitud/dictamen
   */
  dictaminarSolicitud = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const paramId = req.params.idSolicitud;
    const idSolicitud = Array.isArray(paramId) ? paramId[0] : paramId;
    if (!idSolicitud) {
      res.status(400).json({
        success: false,
        error: { code: 'DATOS_INVALIDOS', message: 'Identificador de solicitud requerido.' },
      });
      return;
    }

    const parse = dictamenSolicitudEmpresaRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Dictamen inválido',
        },
      });
      return;
    }

    try {
      const resultado = await this.empresasService.dictaminarSolicitud(
        idSolicitud,
        actor.idUsuario,
        parse.data,
      );
      responderExito(res, resultado.solicitud, resultado.mensaje);
    } catch (error) {
      if (error instanceof EmpresasError) {
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
   * HU-CUE-10: Dictaminar renovación de NIT
   * POST /admin/empresas/renovaciones/:idSolicitud/dictamen
   */
  dictaminarRenovacionNit = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const paramId = req.params.idSolicitud;
    const idSolicitud = Array.isArray(paramId) ? paramId[0] : paramId;
    if (!idSolicitud) {
      res.status(400).json({
        success: false,
        error: { code: 'DATOS_INVALIDOS', message: 'Identificador de solicitud requerido.' },
      });
      return;
    }

    const parse = dictamenRenovacionNitRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Dictamen inválido',
        },
      });
      return;
    }

    try {
      const resultado = await this.empresasService.dictaminarRenovacionNit(
        idSolicitud,
        actor.idUsuario,
        parse.data,
      );
      responderExito(res, resultado.solicitud, resultado.mensaje);
    } catch (error) {
      if (error instanceof EmpresasError) {
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
