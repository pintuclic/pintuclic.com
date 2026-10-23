import type { Request, Response } from 'express';
import { ATRIBUTOS_COOKIE_SESION } from '../../../core/utils/cookieSesion';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import {
  actualizarDatosPerfilRequestSchema,
  cambiarContrasenaPerfilRequestSchema,
  confirmarCambioCorreoRequestSchema,
  desactivarCuentaRequestSchema,
  solicitarCambioCorreoRequestSchema,
} from '../dtos/m04-cuentas.dto';
import { PerfilError, type PerfilService } from '../services/perfil.service';

export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  /**
   * HU-CUE-06 / HU-CUE-08: Obtener perfil del usuario autenticado
   * GET /cuentas/perfil
   */
  obtenerPerfil = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    try {
      const perfil = await this.perfilService.obtenerPerfil(actor.idUsuario);
      responderExito(res, perfil);
    } catch (error) {
      if (error instanceof PerfilError) {
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
   * HU-CUE-06: Actualizar datos personales básicos
   * PUT /cuentas/perfil
   */
  actualizarDatos = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = actualizarDatosPerfilRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de perfil inválidos',
        },
      });
      return;
    }

    try {
      const actualizado = await this.perfilService.actualizarDatos(actor.idUsuario, parse.data);
      responderExito(res, actualizado, 'Datos de perfil actualizados exitosamente.');
    } catch (error) {
      if (error instanceof PerfilError) {
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
   * HU-CUE-06: Cambiar contraseña
   * PUT /cuentas/perfil/password
   */
  cambiarPassword = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = cambiarContrasenaPerfilRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de cambio de contraseña inválidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.perfilService.cambiarPassword(actor.idUsuario, parse.data);
      res.clearCookie(ATRIBUTOS_COOKIE_SESION.nombre, { path: ATRIBUTOS_COOKIE_SESION.path });
      responderExito(res, { cambiado: true }, resultado.mensaje);
    } catch (error) {
      if (error instanceof PerfilError) {
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
   * HU-CUE-06: Solicitar cambio de correo electrónico
   * POST /cuentas/perfil/cambio-correo/solicitar
   */
  solicitarCambioCorreo = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = solicitarCambioCorreoRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de solicitud de cambio de correo inválidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.perfilService.solicitarCambioCorreo(actor.idUsuario, parse.data);
      responderExito(
        res,
        {
          idVerificacion: resultado.idVerificacion,
          nuevoCorreo: resultado.nuevoCorreo,
          tiempoExpiracionSegundos: resultado.tiempoExpiracionSegundos,
        },
        'Código de verificación enviado al nuevo correo electrónico.',
      );
    } catch (error) {
      if (error instanceof PerfilError) {
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
   * HU-CUE-06: Confirmar cambio de correo electrónico
   * POST /cuentas/perfil/cambio-correo/confirmar
   */
  confirmarCambioCorreo = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = confirmarCambioCorreoRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Código de confirmación inválido',
        },
      });
      return;
    }

    try {
      const resultado = await this.perfilService.confirmarCambioCorreo(actor.idUsuario, parse.data);
      responderExito(
        res,
        { nuevoCorreo: resultado.nuevoCorreo },
        resultado.mensaje,
      );
    } catch (error) {
      if (error instanceof PerfilError) {
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
   * HU-CUE-10: Desactivar cuenta propia
   * POST /cuentas/perfil/desactivar
   */
  desactivarCuenta = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }

    const parse = desactivarCuentaRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Contraseña requerida para desactivar cuenta',
        },
      });
      return;
    }

    try {
      const resultado = await this.perfilService.desactivarCuenta(actor.idUsuario, parse.data);
      res.clearCookie(ATRIBUTOS_COOKIE_SESION.nombre, { path: ATRIBUTOS_COOKIE_SESION.path });
      responderExito(res, { desactivado: true }, resultado.mensaje);
    } catch (error) {
      if (error instanceof PerfilError) {
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
