import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import {
  CODIGOS_ERROR_M17,
  type ConfirmarSustitucionCorreoAdminInput,
  type PrimerAccesoAdminInput,
  type SolicitarSustitucionCorreoAdminInput,
} from '../dtos/m17-permisos.dto';
import type { EmpleadosRepositoryPort } from '../interfaces/empleados.interface';
import type {
  GobernanzaAdminRepositoryPort,
  GobernanzaNotificacionesPort,
} from '../interfaces/gobernanza.interface';
import { EmpleadoError } from './empleados.service';

const MINUTOS_VIGENCIA_SUSTITUCION_ADMIN = 24 * 60; // 24 horas (1440 minutos)

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolverRemitenteSmtp(host: string, user: string, fromConfigurado?: string): string {
  const limpio = fromConfigurado?.trim();
  if (!limpio) {
    return `Pintu Clic <${user}>`;
  }
  if (host.toLowerCase().includes('gmail.com') && user.includes('@') && !limpio.includes(user)) {
    const matchNombre = /^"?([^"<]+)"?\s*<[^>]+>$/.exec(limpio);
    const nombreVisible = matchNombre?.[1]?.trim() || 'Pintu Clic';
    return `"${nombreVisible}" <${user}>`;
  }
  return limpio;
}

export class NoOpGobernanzaNotificacionesAdapter implements GobernanzaNotificacionesPort {
  async enviarSolicitudSustitucionCorreoAdmin(): Promise<void> {
    // No-op en pruebas unitarias sin SMTP o entornos sin credenciales
  }
}

export class SmtpGobernanzaNotificacionesAdapter implements GobernanzaNotificacionesPort {
  private readonly transporter: {
    sendMail(opts: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
    }): Promise<unknown>;
  };
  private readonly from: string;
  private readonly frontendBaseUrl: string;

  constructor(
    config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
      frontendBaseUrl: string;
    },
    transporter?: {
      sendMail(opts: {
        from: string;
        to: string;
        subject: string;
        text: string;
        html: string;
      }): Promise<unknown>;
    },
  ) {
    this.from = resolverRemitenteSmtp(config.host, config.user, config.from);
    this.frontendBaseUrl = config.frontendBaseUrl.replace(/\/+$/, '');
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
  }

  async enviarSolicitudSustitucionCorreoAdmin(params: {
    correoActual: string;
    nuevoCorreo: string;
    tokenConfirmacion: string;
    minutosVigencia: number;
  }): Promise<void> {
    const urlPanel = `${this.frontendBaseUrl}/admin/gobernanza`;
    const tokenSeguro = escaparHtml(params.tokenConfirmacion);
    const nuevoSeguro = escaparHtml(params.nuevoCorreo);
    const urlSegura = escaparHtml(urlPanel);
    const horasVigencia = Math.round(params.minutosVigencia / 60);

    await Promise.all([
      this.transporter.sendMail({
        from: this.from,
        to: params.nuevoCorreo,
        subject: 'Confirmación de transferencia de cuenta administradora · Pintu Clic',
        text: [
          'Se ha iniciado el protocolo de sustitución del correo maestro de administración en Pintu Clic.',
          '',
          `Token de confirmación: ${params.tokenConfirmacion}`,
          `Panel de gobernanza: ${urlPanel}`,
          `Vigencia: ${horasVigencia} horas (${params.minutosVigencia} minutos).`,
          '',
          'Ingresa este token en la sección Gobernanza del panel administrativo para consolidar el cambio.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">Confirmación de correo maestro (Gobernanza)</h2>
            <p>Se solicitó designar esta dirección como nuevo correo titular de la cuenta administradora principal de Pintu Clic.</p>
            <p>Copia el siguiente token criptográfico de confirmación e ingrésalo en <a href="${urlSegura}" style="color: #F47B20; font-weight: bold;">${urlSegura}</a>:</p>
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; word-break: break-all; color: #0B2D6B; background: #F3F4F6; padding: 14px; border-radius: 8px; margin: 16px 0;">
              ${tokenSeguro}
            </div>
            <p style="font-size: 13px; color: #4B5563;">Este token expira en <strong>${horasVigencia} horas</strong>.</p>
          </div>
        `.trim(),
      }),
      this.transporter.sendMail({
        from: this.from,
        to: params.correoActual,
        subject: 'Alerta preventiva de seguridad: solicitud de cambio de correo maestro · Pintu Clic',
        text: [
          'Aviso preventivo de seguridad de Pintu Clic.',
          '',
          `Se ha solicitado transferir la titularidad de la cuenta administradora principal hacia el correo: ${params.nuevoCorreo}.`,
          '',
          'Si no reconoces esta solicitud, revoca las sesiones activas de inmediato.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #991B1B; margin-top: 0;">Alerta preventiva: cambio de correo maestro</h2>
            <p>Se ha iniciado una solicitud para transferir la cuenta administradora principal hacia <strong>${nuevoSeguro}</strong>.</p>
            <p style="font-size: 13px; color: #4B5563;">El cambio no se hará efectivo hasta que se valide el token enviado al nuevo buzón. Si no autorizaste esta acción, cambia tu contraseña de inmediato.</p>
          </div>
        `.trim(),
      }),
    ]);
  }
}

export function crearGobernanzaNotificacionesDesdeEntorno(
  env: NodeJS.ProcessEnv = process.env,
): GobernanzaNotificacionesPort {
  if (env.NODE_ENV === 'test') {
    return new NoOpGobernanzaNotificacionesAdapter();
  }

  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();

  if (host && user && pass) {
    const port = Number.parseInt(env.SMTP_PORT ?? '587', 10);
    const secure = env.SMTP_SECURE === 'true' || port === 465;
    const frontendBaseUrl =
      env.FRONTEND_URL?.trim() || env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3001';
    const from = env.SMTP_FROM?.trim() || `Pintu Clic <${user}>`;

    return new SmtpGobernanzaNotificacionesAdapter({
      host,
      port: Number.isNaN(port) ? 587 : port,
      secure,
      user,
      pass,
      from,
      frontendBaseUrl,
    });
  }

  return new NoOpGobernanzaNotificacionesAdapter();
}

export class GobernanzaAdminService {
  private readonly notificaciones: GobernanzaNotificacionesPort;

  constructor(
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
    private readonly empleadosRepo: EmpleadosRepositoryPort,
    private readonly sesionService: SesionService,
    notificaciones?: GobernanzaNotificacionesPort,
  ) {
    this.notificaciones = notificaciones ?? crearGobernanzaNotificacionesDesdeEntorno();
  }

  async solicitarSustitucionCorreo(
    input: SolicitarSustitucionCorreoAdminInput,
    idActor: number,
  ): Promise<{
    mensaje: string;
    correoAnterior: string;
    nuevoCorreo: string;
    expiracionMinutos: number;
    tokenPreview?: string;
  }> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (!admin || admin.idUsuario !== idActor) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.ACCESO_DENEGADO,
        'Solo el administrador principal puede iniciar el traspaso de su cuenta (RN-ADM-18).',
        403,
      );
    }

    const usuarioExistente = await this.empleadosRepo.obtenerPorCorreo(input.nuevoCorreo);
    if (usuarioExistente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.CORREO_DUPLICADO,
        'El nuevo correo ya se encuentra asignado a otra cuenta en el sistema.',
        409,
      );
    }

    const tokenConfirmacion = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date(Date.now() + MINUTOS_VIGENCIA_SUSTITUCION_ADMIN * 60 * 1000);

    await this.gobernanzaRepo.guardarSolicitudCambioCorreo({
      idUsuario: admin.idUsuario,
      correoActual: admin.correo,
      nuevoCorreo: input.nuevoCorreo,
      tokenConfirmacion,
      fechaExpiracion,
    });

    await this.notificaciones.enviarSolicitudSustitucionCorreoAdmin({
      correoActual: admin.correo,
      nuevoCorreo: input.nuevoCorreo,
      tokenConfirmacion,
      minutosVigencia: MINUTOS_VIGENCIA_SUSTITUCION_ADMIN,
    });

    const respuesta: {
      mensaje: string;
      correoAnterior: string;
      nuevoCorreo: string;
      expiracionMinutos: number;
      tokenPreview?: string;
    } = {
      mensaje: `Se ha enviado un enlace de confirmación a ${input.nuevoCorreo} y una notificación preventiva a ${admin.correo}.`,
      correoAnterior: admin.correo,
      nuevoCorreo: input.nuevoCorreo,
      expiracionMinutos: MINUTOS_VIGENCIA_SUSTITUCION_ADMIN,
    };
    if (process.env.NODE_ENV !== 'production') {
      respuesta.tokenPreview = tokenConfirmacion;
    }
    return respuesta;
  }

  async confirmarSustitucionCorreo(
    input: ConfirmarSustitucionCorreoAdminInput,
  ): Promise<{
    mensaje: string;
    correoActualizado: string;
    sesionesPreviasInvalidadas: boolean;
  }> {
    const solicitud = await this.gobernanzaRepo.buscarSolicitudPorToken(input.tokenConfirmacion);
    if (!solicitud) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.TOKEN_INVALIDO_O_EXPIRADO,
        'El enlace de confirmación es inválido o ha caducado (RN-ADM-18).',
        400,
      );
    }

    await this.gobernanzaRepo.actualizarCorreoAdmin(solicitud.idUsuario, solicitud.nuevoCorreo);
    await this.gobernanzaRepo.eliminarSolicitud(input.tokenConfirmacion);

    // Invalida todas las sesiones del admin para forzar re-login con nuevo correo
    await this.sesionService.invalidarTodas(solicitud.idUsuario, 'cambio_contrasena');

    return {
      mensaje: 'Correo de la cuenta administradora actualizado con éxito. Las sesiones anteriores han sido revocadas.',
      correoActualizado: solicitud.nuevoCorreo,
      sesionesPreviasInvalidadas: true,
    };
  }

  async primerAcceso(
    idUsuario: number,
    input: PrimerAccesoAdminInput,
  ): Promise<{ mensaje: string }> {
    const empleado = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!empleado) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'Usuario no encontrado.',
        404,
      );
    }

    // Verificar credencial actual
    const hashActual = await this.gobernanzaRepo.obtenerHashContrasena(idUsuario);

    if (hashActual === null) {
      throw new EmpleadoError(CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO, 'Usuario no encontrado.', 404);
    }

    const coincide = await verificarContrasena(input.credencialTemporal, hashActual);
    if (!coincide) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.ACCESO_DENEGADO,
        'La credencial temporal suministrada es incorrecta.',
        401,
      );
    }

    const nuevoHash = await derivarContrasena(input.nuevaContrasena);
    await this.gobernanzaRepo.actualizarContrasena(idUsuario, nuevoHash);

    await this.sesionService.invalidarTodas(idUsuario, 'cambio_contrasena');

    return {
      mensaje: 'Contraseña actualizada exitosamente. Inicie sesión con su nueva credencial.',
    };
  }
}