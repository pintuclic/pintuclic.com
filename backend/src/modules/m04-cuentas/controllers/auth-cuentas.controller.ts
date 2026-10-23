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
} from '../dtos/m04-cuentas.dto';
import { AuthCuentasError, type AuthCuentasService } from '../services/auth-cuentas.service';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';

const VIGENCIA_COOKIE_SEGUNDOS = 60 * 60; // 1 hora deslizante

export class AuthCuentasController {
  constructor(
    private readonly authService: AuthCuentasService,
    private readonly sesionService: SesionService,
  ) {}

  private fijarCookie(res: Response, idSesion: string): void {
    const token = emitirToken(idSesion, VIGENCIA_COOKIE_SEGUNDOS);
    res.cookie(ATRIBUTOS_COOKIE_SESION.nombre, token, opcionesCookieSesion(VIGENCIA_COOKIE_SEGUNDOS));
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

    const idVerificacion = (req.body as { idVerificacion?: string }).idVerificacion;
    if (!idVerificacion || typeof idVerificacion !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: 'El identificador de verificación es requerido.',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.verificarCodigoRegistro(idVerificacion, parse.data.codigo);
      this.fijarCookie(res, resultado.sesion.idSesion);

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
          message: parse.error.issues[0]?.message ?? 'Correo no válido',
        },
      });
      return;
    }

    const idVerificacion = (req.body as { idVerificacion?: string }).idVerificacion;
    if (!idVerificacion || typeof idVerificacion !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'DATOS_INVALIDOS',
          message: 'El identificador de verificación es requerido.',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.reenviarCodigoRegistro(idVerificacion);
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

      this.fijarCookie(res, resultado.sesion.idSesion);

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

    const tokenCambio =
      (req.headers['x-token-cambio'] as string | undefined) ??
      (req.body as { tokenCambio?: string }).tokenCambio;

    if (!tokenCambio) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALIDO_O_EXPIRADO',
          message: 'Token de primer acceso requerido para cambiar la contraseña.',
        },
      });
      return;
    }

    try {
      const resultado = await this.authService.cambiarContrasenaPrimerAcceso(
        tokenCambio,
        parse.data.nuevaContrasena,
      );
      this.fijarCookie(res, resultado.sesion.idSesion);

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
      if (resultado.cuentaNueva) {
        responderExito(
          res,
          {
            registrado: false,
            tokenRegistroTemporal: resultado.tokenRegistroTemporal,
            email: resultado.email,
            nombre: resultado.nombre,
          },
          'Identidad verificada. Complete los datos requeridos para activar su cuenta.',
        );
        return;
      }

      this.fijarCookie(res, resultado.sesion.idSesion);

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
      this.fijarCookie(res, resultado.sesion.idSesion);

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
