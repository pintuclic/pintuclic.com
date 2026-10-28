import type { Request, Response } from 'express';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import {
  cambiarTipoClienteRequestSchema,
  dictamenCuentaEmpresaRequestSchema,
  dictamenRenovacionNitRequestSchema,
  listarCuentasEmpresaQuerySchema,
  listarSolicitudesEmpresaQuerySchema,
  registroEmpresaRequestSchema,
  solicitarAscensoEmpresaRequestSchema,
  solicitarRenovacionNitRequestSchema,
} from '../dtos/m04-cuentas.dto';
import { EmpresasError, type EmpresasService } from '../services/empresas.service';
import { leerParamUuid } from './parametros';

/** Extensión del adjunto según el tipo MIME permitido para el RUT (RN-CUE-20). */
const EXTENSION_POR_MIME: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

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

    const idSolicitud = leerParamUuid(req, 'idSolicitud');
    if (idSolicitud === null) {
      responderRecursoNoDisponible(res);
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

    const idSolicitud = leerParamUuid(req, 'idSolicitud');
    if (idSolicitud === null) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = dictamenCuentaEmpresaRequestSchema.safeParse(req.body);
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
   * M06 · D8: tipos de cliente empresa activos, para el selector al aprobar una cuenta.
   * GET /admin/empresas/tipos
   */
  listarTiposCliente = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, await this.empresasService.listarTiposCliente());
  };

  /**
   * M06 · D8: cuentas empresa aprobadas con su tipo de cliente.
   * GET /admin/empresas/cuentas
   */
  listarCuentas = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parse = listarCuentasEmpresaQuerySchema.safeParse(req.query);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: { code: 'DATOS_INVALIDOS', message: parse.error.issues[0]?.message ?? 'Parámetros de consulta inválidos' },
      });
      return;
    }
    responderExito(res, await this.empresasService.listarCuentas(parse.data));
  };

  /**
   * M06 · D8: cambia el tipo de cliente de una cuenta empresa.
   * PATCH /admin/empresas/cuentas/:idUsuario/tipo
   */
  cambiarTipoCuenta = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      responderRecursoNoDisponible(res);
      return;
    }
    const crudo = req.params.idUsuario;
    const idUsuario = typeof crudo === 'string' && /^\d+$/.test(crudo) ? Number(crudo) : null;
    if (idUsuario === null || !Number.isSafeInteger(idUsuario) || idUsuario < 1) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parse = cambiarTipoClienteRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: { code: 'DATOS_INVALIDOS', message: parse.error.issues[0]?.message ?? 'Tipo de cliente inválido' },
      });
      return;
    }
    try {
      responderExito(res, await this.empresasService.cambiarTipoCuenta(idUsuario, parse.data.idSubRolEmpresa), 'Tipo de cliente actualizado.');
    } catch (error) {
      if (error instanceof EmpresasError) {
        res.status(error.statusCode).json({ success: false, error: { code: error.codigo, message: error.message } });
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

    const idSolicitud = leerParamUuid(req, 'idSolicitud');
    if (idSolicitud === null) {
      responderRecursoNoDisponible(res);
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

  /**
   * HU-CUE-03 E6 / HU-CUE-10 E3: el cliente consulta el estado de SUS solicitudes
   * GET /cuentas/empresas/solicitudes/mias
   * La titularidad sale de la sesión del servidor, nunca de un parámetro del cliente.
   */
  misSolicitudes = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const mias = await this.empresasService.consultarMisSolicitudes(actor.idUsuario);
    responderExito(res, mias);
  };

  /**
   * HU-CUE-09 (RF-CUE-09-08): vista independiente de renovaciones de NIT
   * GET /admin/empresas/renovaciones
   */
  listarRenovaciones = async (req: Request, res: Response): Promise<void> => {
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

    const renovaciones = await this.empresasService.listarRenovaciones(parse.data);
    responderExito(res, renovaciones);
  };

  /**
   * HU-CUE-09: Detalle de una renovación de NIT (solo metadatos del RUT, nunca su contenido)
   * GET /admin/empresas/renovaciones/:idSolicitud
   */
  obtenerDetalleRenovacion = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const idSolicitud = leerParamUuid(req, 'idSolicitud');
    if (idSolicitud === null) {
      responderRecursoNoDisponible(res);
      return;
    }

    try {
      const renovacion = await this.empresasService.obtenerDetalleRenovacion(idSolicitud);
      responderExito(res, renovacion);
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
   * HU-CUE-09 E14 / RN-CUE-20: descarga del RUT por personal con `empresas.validar`
   * GET /admin/empresas/documentos/:idDocumento
   *
   * El nombre del archivo NO proviene del cliente: se construye con el id y una
   * extensión de lista cerrada, para impedir inyección en la cabecera. El
   * documento se entrega como adjunto, sin sniffing y sin caché.
   */
  descargarDocumento = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const idDocumento = leerParamUuid(req, 'idDocumento');
    if (idDocumento === null) {
      responderRecursoNoDisponible(res);
      return;
    }

    try {
      const documento = await this.empresasService.obtenerDocumentoRut(idDocumento);
      const extension = EXTENSION_POR_MIME[documento.tipoMime] ?? 'bin';

      res.status(200);
      res.setHeader('Content-Type', documento.tipoMime);
      res.setHeader('Content-Length', String(documento.contenido.length));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="rut-${documento.idDocumento}.${extension}"`,
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.send(documento.contenido);
    } catch (error) {
      if (error instanceof EmpresasError) {
        if (error.statusCode === 404) {
          responderRecursoNoDisponible(res);
          return;
        }
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
