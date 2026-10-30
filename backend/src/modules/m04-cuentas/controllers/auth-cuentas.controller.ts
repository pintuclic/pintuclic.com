import type { Request, Response } from 'express';
import { ATRIBUTOS_COOKIE_SESION, opcionesCookieSesion } from '../../../core/utils/cookieSesion';
import { emitirToken } from '../../../core/utils/jwt';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  cambioContrasenaPrimerAccesoRequestSchema,
  completarRegistroGoogleRequestSchema,
  loginGoogleRequestSchema,
  loginRequestSchema,
  reenviarCodigoOtpRequestSchema,
  registroClienteRequestSchema,
  verificarCodigoOtpRequestSchema,
  vincularGoogleRequestSchema,
} from '../dtos/m04-cuentas.dto';
import { AuthCuentasError, type AuthCuentasService } from '../services/auth-cuentas.service';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';

export interface GoogleOAuthPublicConfig {
  habilitado: boolean;
  clientId: string | null;
}

export class AuthCuentasController {
  constructor(
    private readonly authService: AuthCuentasService,
    private readonly sesionService: SesionService,
    private readonly googleConfig: GoogleOAuthPublicConfig = { habilitado: false, clientId: null },
  ) {}

  /** RF-SEG-02-02: la cookie vive lo mismo que la ventana de inactividad de la sesión creada. */
  private fijarCookie(res: Response, sesion: { idSesion: string; fechaExpiracion: Date }): void {
    const vigenciaSegundos = Math.max(
      1,
      Math.floor((sesion.fechaExpiracion.getTime() - Date.now()) / 1000),
    );
    const token = emitirToken(sesion.idSesion, vigenciaSegundos);
    res.cookie(ATRIBUTOS_COOKIE_SESION.nombre, token, opcionesCookieSesion(vigenciaSegundos));
  }

  private limpiarCookie(res: Response): void {
    res.clearCookie(ATRIBUTOS_COOKIE_SESION.nombre, { path: ATRIBUTOS_COOKIE_SESION.path });
  }

  /**
   * HU-CUE-01: Registro B2C inicial
   * POST /cuentas/registro
   */
  registro = async (req: Request, res: Response): Promise<void> => {
    const parse = registroClienteRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de registro inválidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.solicitarRegistroB2C(parse.data);
      responderExito(
        res,
        {
          idVerificacion: resultado.idVerificacion,
          correo: resultado.correo,
          requiereVerificacion: true,
          tiempoExpiracionSegundos: resultado.tiempoExpiracionSegundos,
        },
        'Código de verificación enviado al correo electrónico.',
        201,
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-01: Verificación de código OTP de registro
   * POST /cuentas/registro/verificar-otp
   */
  verificarOtp = async (req: Request, res: Response): Promise<void> => {
    const parse = verificarCodigoOtpRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Código o correo inválido',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.verificarCodigoRegistro(
        parse.data.idVerificacion,
        parse.data.codigo,
      );
      this.fijarCookie(res, resultado.sesion);

      responderExito(
        res,
        {
          activado: true,
          usuario: {
            idUsuario: resultado.usuario.idUsuario,
            nombre: resultado.usuario.nombre,
            correo: resultado.usuario.correo,
            tipo: resultado.usuario.tipo,
          },
        },
        'Cuenta activada y sesión iniciada exitosamente.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-01: Reenviar código OTP de registro
   * POST /cuentas/registro/reenviar-otp
   */
  reenviarOtp = async (req: Request, res: Response): Promise<void> => {
    const parse = reenviarCodigoOtpRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Identificador de verificación inválido',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.reenviarCodigoRegistro(parse.data.idVerificacion);
      responderExito(
        res,
        {
          idVerificacion: resultado.idVerificacion,
          correo: resultado.correo,
          tiempoExpiracionSegundos: resultado.tiempoExpiracionSegundos,
        },
        'Nuevo código de verificación enviado al correo.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-04: Autenticación por correo y contraseña
   * POST /cuentas/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    const parse = loginRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Credenciales con formato incorrecto',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.login(parse.data);
      if (resultado.requiereCambioContrasena) {
        responderExito(
          res,
          {
            usuario: {
              idUsuario: resultado.idUsuario,
            },
            cambioContrasenaPendiente: true,
            tokenCambio: resultado.tokenCambio,
          },
          'Primer acceso detectado: es obligatorio actualizar su contraseña.',
        );
        return;
      }

      this.fijarCookie(res, resultado.sesion);

      responderExito(
        res,
        {
          usuario: {
            idUsuario: resultado.usuario.idUsuario,
            nombre: resultado.usuario.nombre,
            correo: resultado.usuario.correo,
            tipo: resultado.usuario.tipo,
            esAdmin: resultado.esAdmin,
          },
          cambioContrasenaPendiente: false,
        },
        'Inicio de sesión exitoso.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-04: Cambio de contraseña en primer acceso
   * POST /cuentas/cambio-password-primer-acceso
   */
  cambiarPasswordPrimerAcceso = async (req: Request, res: Response): Promise<void> => {
    const parse = cambioContrasenaPrimerAccesoRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de cambio inválidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.cambiarContrasenaPrimerAcceso(
        parse.data.tokenCambio,
        parse.data.contrasenaActual,
        parse.data.nuevaContrasena,
      );
      this.fijarCookie(res, resultado.sesion);

      responderExito(
        res,
        {
          usuario: {
            idUsuario: resultado.usuario.idUsuario,
            nombre: resultado.usuario.nombre,
            correo: resultado.usuario.correo,
            tipo: resultado.usuario.tipo,
            esAdmin: resultado.esAdmin,
          },
        },
        'Contraseña actualizada exitosamente. Sesión iniciada.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-02: Configuración pública OAuth de Google en tiempo de ejecución
   * GET /cuentas/oauth/google/config
   */
  configGoogle = (_req: Request, res: Response): void => {
    responderExito(
      res,
      {
        habilitado: this.googleConfig.habilitado,
        clientId: this.googleConfig.habilitado ? this.googleConfig.clientId : null,
      },
      'Configuración OAuth de Google obtenida.',
    );
  };

  /**
   * HU-CUE-02: Autenticación federada Google
   * POST /cuentas/oauth/google
   */
  oauthGoogle = async (req: Request, res: Response): Promise<void> => {
    const parse = loginGoogleRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Token de Google requerido',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.autenticarGoogle(parse.data);
      if (resultado.etapa === 'requiere_registro') {
        responderExito(
          res,
          {
            registrado: false,
            requiereVinculacion: false,
            tokenRegistroTemporal: resultado.tokenRegistroTemporal,
            email: resultado.email,
            nombre: resultado.nombre,
          },
          'Identidad verificada. Completa tus datos para activar tu cuenta.',
        );
        return;
      }

      if (resultado.etapa === 'requiere_vinculacion') {
        responderExito(
          res,
          {
            registrado: false,
            requiereVinculacion: true,
            tokenVinculacion: resultado.tokenVinculacion,
            email: resultado.email,
            nombre: resultado.nombre,
          },
          'Ya existe una cuenta con este correo. Confirma tu contraseña para vincular Google.',
        );
        return;
      }

      this.fijarCookie(res, resultado.sesion);

      responderExito(
        res,
        {
          registrado: true,
          usuario: {
            idUsuario: resultado.usuario.idUsuario,
            nombre: resultado.usuario.nombre,
            correo: resultado.usuario.correo,
            tipo: resultado.usuario.tipo,
          },
        },
        'Inicio de sesión federado exitoso.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-02: Completar registro Google con contraseña y teléfono
   * POST /cuentas/oauth/google/completar
   */
  completarRegistroGoogle = async (req: Request, res: Response): Promise<void> => {
    const parse = completarRegistroGoogleRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos complementarios inválidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.completarRegistroGoogle(parse.data);
      this.fijarCookie(res, resultado.sesion);

      responderExito(
        res,
        {
          usuario: {
            idUsuario: resultado.usuario.idUsuario,
            nombre: resultado.usuario.nombre,
            correo: resultado.usuario.correo,
            tipo: resultado.usuario.tipo,
          },
        },
        'Registro completado y sesión iniciada exitosamente.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-02 (RF-CUE-02-03): Confirmar contraseña y vincular cuenta existente con Google
   * POST /cuentas/oauth/google/vincular
   */
  vincularGoogle = async (req: Request, res: Response): Promise<void> => {
    const parse = vincularGoogleRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: parse.error.issues[0]?.message ?? 'Datos de vinculación inválidos',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.vincularCuentaGoogle(parse.data);
      this.fijarCookie(res, resultado.sesion);

      responderExito(
        res,
        {
          usuario: {
            idUsuario: resultado.usuario.idUsuario,
            nombre: resultado.usuario.nombre,
            correo: resultado.usuario.correo,
            tipo: resultado.usuario.tipo,
          },
        },
        'Cuenta vinculada con Google y sesión iniciada exitosamente.',
      );
    } catch (error) {
      if (error instanceof AuthCuentasError) {
        res.status(error.statusCode).json({
          success: false,
          error: { code: error.codigo, message: error.message, details: error.detalles ?? null },
        });
        return;
      }
      throw error;
    }
  };

  /**
   * HU-CUE-04: Cierre de sesión explícito
   * POST /cuentas/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor) {
      try {
        await this.sesionService.cerrarManualmente(actor.idSesion);
      } catch {
        // Silencioso si la sesión ya no existe
      }
    }
    this.limpiarCookie(res);
    responderExito(res, { cerrado: true }, 'Sesión cerrada exitosamente.');
  };
}
