import nodemailer from 'nodemailer';
import type { EventoNotificacion, NotificacionesPort } from '../interfaces/notificaciones.port';
import type { ParametrosComunicacionesPort } from '../interfaces/parametros-comunicaciones.port';
import type { PlantillasRepositoryPort } from '../interfaces/plantillas.port';
import type {
  EstadoEnvio,
  RegistroEnviosRepositoryPort,
  TipoComunicacion,
} from '../interfaces/registro-envios.port';

export interface OpcionesEnvioCorreo {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface TransporteCorreoPort {
  sendMail(opciones: OpcionesEnvioCorreo): Promise<unknown>;
}

export interface ConfiguracionSmtp {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  frontendBaseUrl: string;
}

const MAX_INTENTOS_POR_DEFECTO = 3;
const BACKOFF_BASE_MS = 200;

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** RF-NOT-03-02: misma convención de placeholder que plantillas.service.ts ({{variable}}). */
function sustituirPlaceholders(contenido: string, datos: Record<string, string>, escapar: boolean): string {
  return Object.entries(datos).reduce((acc, [clave, valor]) => {
    const valorFinal = escapar ? escaparHtml(valor) : valor;
    return acc.split(`{{${clave}}}`).join(valorFinal);
  }, contenido);
}

export function resolverRemitenteSmtp(host: string, user: string, fromConfigurado?: string): string {
  const limpio = fromConfigurado?.trim();
  if (!limpio) {
    return `Pintu Clic <${user}>`;
  }
  // Si se usa smtp.gmail.com con una cuenta @gmail.com y el remitente tiene otro dominio,
  // conservamos el nombre visible y usamos el buzón autenticado para evitar rechazos DMARC.
  if (host.toLowerCase().includes('gmail.com') && user.includes('@') && !limpio.includes(user)) {
    const matchNombre = /^"?([^"<]+)"?\s*<[^>]+>$/.exec(limpio);
    const nombreVisible = matchNombre?.[1]?.trim() || 'Pintu Clic';
    return `"${nombreVisible}" <${user}>`;
  }
  return limpio;
}

/** Repositorio no-op para construir el adapter SMTP sin M18 persistente (ej. tests de M04). */
export class RegistroEnviosEnMemoria implements RegistroEnviosRepositoryPort {
  public registros: Array<{
    tipo: TipoComunicacion;
    destinatario: string;
    estado: EstadoEnvio;
    intentos: number;
    maxIntentos: number;
    ultimoError?: string;
  }> = [];

  async registrarResultado(datos: {
    tipo: TipoComunicacion;
    destinatario: string;
    estado: EstadoEnvio;
    intentos: number;
    maxIntentos: number;
    ultimoError?: string;
  }): Promise<string> {
    this.registros.push(datos);
    return `memoria-${this.registros.length}`;
  }

  async registrarRebote(): Promise<void> {
    // No-op: sin persistencia real en memoria.
  }

  async listarEnvios(): Promise<{ envios: never[]; total: number }> {
    return { envios: [], total: 0 };
  }

  async listarRebotes(): Promise<{ rebotes: never[]; total: number }> {
    return { rebotes: [], total: 0 };
  }
}

export class MemoriaNotificacionesAdapter implements NotificacionesPort {
  public eventos: EventoNotificacion[] = [];

  async enviarCodigoRegistro(correo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'registro_otp',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: { codigoOtp, minutosVigencia },
    });
  }

  async enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'recuperacion_password',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: { token, minutosVigencia },
    });
  }

  async enviarEnlaceActivacion(correo: string, nombre: string, token: string, horasVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'activacion_empleado',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: { nombre, token, horasVigencia },
    });
  }

  async enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'cambio_correo_otp',
      destinatario: correoNuevo,
      timestamp: new Date(),
      metadatos: { codigoOtp, minutosVigencia },
    });
  }

  async notificarCambioCorreoConfirmado(correoAnterior: string, nuevoCorreo: string): Promise<void> {
    this.eventos.push({
      tipo: 'cambio_correo_confirmado',
      destinatario: correoAnterior,
      timestamp: new Date(),
      metadatos: { correoAnterior, nuevoCorreo },
    });
  }

  async notificarDictamenEmpresa(
    correo: string,
    resultado: 'aprobada' | 'rechazada',
    motivoRechazo?: string,
  ): Promise<void> {
    this.eventos.push({
      tipo: 'dictamen_empresa',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: {
        resultado,
        motivoRechazo: motivoRechazo ?? '',
      },
    });
  }

  obtenerEventos(): EventoNotificacion[] {
    return [...this.eventos];
  }

  obtenerUltimoOtp(destinatario?: string): string | undefined {
    const filtrados = destinatario
      ? this.eventos.filter((e) => e.destinatario.toLowerCase() === destinatario.toLowerCase())
      : this.eventos;
    const ultimo = filtrados[filtrados.length - 1];
    return ultimo?.metadatos?.codigoOtp as string | undefined;
  }

  limpiar(): void {
    this.eventos = [];
  }
}

export class NoOpNotificacionesAdapter implements NotificacionesPort {
  async enviarCodigoRegistro(): Promise<void> {
    // No-op para entornos sin servidor SMTP
  }

  async enviarEnlaceRecuperacion(): Promise<void> {
    // No-op
  }

  async enviarEnlaceActivacion(): Promise<void> {
    // No-op
  }

  async enviarCodigoCambioCorreo(): Promise<void> {
    // No-op
  }

  async notificarCambioCorreoConfirmado(): Promise<void> {
    // No-op
  }

  async notificarDictamenEmpresa(): Promise<void> {
    // No-op
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SmtpNotificacionesAdapter implements NotificacionesPort {
  private readonly transporter: TransporteCorreoPort;
  private readonly from: string;
  private readonly frontendBaseUrl: string;
  private readonly registroEnvios: RegistroEnviosRepositoryPort;
  private readonly parametros: ParametrosComunicacionesPort | undefined;
  private readonly plantillas: PlantillasRepositoryPort | undefined;

  constructor(
    config: ConfiguracionSmtp,
    transporter?: TransporteCorreoPort,
    registroEnvios?: RegistroEnviosRepositoryPort,
    parametros?: ParametrosComunicacionesPort,
    plantillas?: PlantillasRepositoryPort,
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
    this.registroEnvios = registroEnvios ?? new RegistroEnviosEnMemoria();
    this.parametros = parametros;
    this.plantillas = plantillas;
  }

  /**
   * HU-NOT-03: usa el contenido editado por el admin en `plantilla_notificacion` si existe
   * una fila para `tipo`; si no (tabla vacía, repositorio no inyectado, o error de lectura),
   * cae en el contenido de respaldo para no dejar de enviar la comunicación.
   */
  private async resolverMensaje(
    tipo: TipoComunicacion,
    datos: Record<string, string>,
    respaldo: { subject: string; text: string; html: string },
  ): Promise<{ subject: string; text: string; html: string }> {
    const plantilla = await this.plantillas?.obtenerPorTipo(tipo).catch(() => null);
    if (!plantilla) return respaldo;
    return {
      subject: sustituirPlaceholders(plantilla.asunto, datos, false),
      text: sustituirPlaceholders(plantilla.contenidoTexto, datos, false),
      html: sustituirPlaceholders(plantilla.contenidoHtml, datos, true),
    };
  }

  /**
   * RF-NOT-01-03: reintenta un número limitado de veces antes de dar el envío por
   * fallido. RF-NOT-01-04: registra el resultado final (éxito o fallo), nunca el
   * contenido del correo ni datos sensibles.
   */
  private async enviarConRegistro(
    tipo: TipoComunicacion,
    destinatario: string,
    mensaje: { subject: string; text: string; html: string },
  ): Promise<void> {
    const maxIntentos = await this.resolverMaxIntentos();
    let intentos = 0;
    let ultimoError: string | undefined;

    while (intentos < maxIntentos) {
      intentos += 1;
      try {
        await this.transporter.sendMail({ from: this.from, to: destinatario, ...mensaje });
        await this.registroEnvios.registrarResultado({
          tipo,
          destinatario,
          estado: 'enviado',
          intentos,
          maxIntentos,
        });
        return;
      } catch (err: unknown) {
        ultimoError = err instanceof Error ? err.message : 'Error desconocido al enviar el correo';
        if (intentos < maxIntentos) {
          await esperar(BACKOFF_BASE_MS * intentos);
        }
      }
    }

    await this.registroEnvios.registrarResultado({
      tipo,
      destinatario,
      estado: 'fallido',
      intentos,
      maxIntentos,
      ...(ultimoError !== undefined ? { ultimoError } : {}),
    });
  }

  private async resolverMaxIntentos(): Promise<number> {
    if (!this.parametros) return MAX_INTENTOS_POR_DEFECTO;
    const valor = await this.parametros.obtenerNumero('comms.reintentos_envio_transaccional');
    return valor !== null && valor > 0 ? valor : MAX_INTENTOS_POR_DEFECTO;
  }

  async enviarCodigoRegistro(correo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    const otpSeguro = escaparHtml(codigoOtp);
    const mensaje = await this.resolverMensaje(
      'registro_otp',
      { codigo_otp: codigoOtp, minutos_vigencia: String(minutosVigencia) },
      {
        subject: 'Código de verificación de tu cuenta · Pintu Clic',
        text: [
          'Bienvenido a Pintu Clic.',
          '',
          `Tu código de verificación es: ${codigoOtp}`,
          `Este código expira en ${minutosVigencia} minutos.`,
          '',
          'Si no solicitaste este registro, puedes ignorar este mensaje.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">Verifica tu correo en Pintu Clic</h2>
            <p>Usa el siguiente código de verificación para activar tu cuenta:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0B2D6B; background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
              ${otpSeguro}
            </div>
            <p style="font-size: 13px; color: #4B5563;">Este código tiene una vigencia de <strong>${minutosVigencia} minutos</strong>.</p>
            <p style="font-size: 12px; color: #6B7280; margin-top: 24px;">Si no solicitaste este código, ignora este correo.</p>
          </div>
        `.trim(),
      },
    );
    await this.enviarConRegistro('registro_otp', correo, mensaje);
  }

  async enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void> {
    const enlace = `${this.frontendBaseUrl}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    const enlaceSeguro = escaparHtml(enlace);
    const mensaje = await this.resolverMensaje(
      'recuperacion_password',
      { enlace_recuperacion: enlace, minutos_vigencia: String(minutosVigencia) },
      {
        subject: 'Restablecimiento de contraseña · Pintu Clic',
        text: [
          'Recibimos una solicitud para restablecer tu contraseña en Pintu Clic.',
          '',
          `Abre el siguiente enlace para crear una nueva contraseña (válido por ${minutosVigencia} minutos):`,
          enlace,
          '',
          'Si no solicitaste este cambio, tu cuenta sigue protegida y puedes ignorar este mensaje.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">Restablece tu contraseña</h2>
            <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta en Pintu Clic.</p>
            <p style="margin: 24px 0;">
              <a href="${enlaceSeguro}" style="background: #F47B20; color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 12px 20px; border-radius: 6px; display: inline-block;">
                Crear nueva contraseña
              </a>
            </p>
            <p style="font-size: 13px; color: #4B5563;">Este enlace expirará en <strong>${minutosVigencia} minutos</strong>.</p>
            <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
          </div>
        `.trim(),
      },
    );
    await this.enviarConRegistro('recuperacion_password', correo, mensaje);
  }

  async enviarEnlaceActivacion(correo: string, nombre: string, token: string, horasVigencia: number): Promise<void> {
    const enlace = `${this.frontendBaseUrl}/activar-cuenta?token=${encodeURIComponent(token)}`;
    const enlaceSeguro = escaparHtml(enlace);
    const nombreSeguro = escaparHtml(nombre);
    const mensaje = await this.resolverMensaje(
      'activacion_empleado',
      { nombre, enlace_activacion: enlace, horas_vigencia: String(horasVigencia) },
      {
        subject: 'Activa tu cuenta de colaborador · Pintu Clic',
        text: [
          `Hola, ${nombre}.`,
          '',
          'Te crearon una cuenta de colaborador en Pintu Clic.',
          `Abre el siguiente enlace para definir tu contraseña (válido por ${horasVigencia} horas):`,
          enlace,
          '',
          'Si el enlace vence, pide al administrador que te envíe uno nuevo.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">Bienvenido a Pintu Clic, ${nombreSeguro}</h2>
            <p>Te crearon una cuenta de colaborador. Define tu contraseña para empezar.</p>
            <p style="margin: 24px 0;">
              <a href="${enlaceSeguro}" style="background: #F47B20; color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 12px 20px; border-radius: 6px; display: inline-block;">
                Definir mi contraseña
              </a>
            </p>
            <p style="font-size: 13px; color: #4B5563;">Este enlace expirará en <strong>${horasVigencia} horas</strong> y solo puede usarse una vez.</p>
            <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
          </div>
        `.trim(),
      },
    );
    await this.enviarConRegistro('activacion_empleado', correo, mensaje);
  }

  async enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    const otpSeguro = escaparHtml(codigoOtp);
    const mensaje = await this.resolverMensaje(
      'cambio_correo_otp',
      { codigo_otp: codigoOtp, minutos_vigencia: String(minutosVigencia) },
      {
        subject: 'Confirma tu nuevo correo electrónico · Pintu Clic',
        text: [
          'Solicitaste actualizar el correo electrónico de tu cuenta en Pintu Clic.',
          '',
          `Tu código de confirmación es: ${codigoOtp}`,
          `Este código expira en ${minutosVigencia} minutos.`,
          '',
          'Si no realizaste esta solicitud, ignora este mensaje.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">Confirma tu nuevo correo</h2>
            <p>Ingresa el siguiente código para confirmar el cambio de correo electrónico en tu perfil:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0B2D6B; background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
              ${otpSeguro}
            </div>
            <p style="font-size: 13px; color: #4B5563;">Este código tiene una vigencia de <strong>${minutosVigencia} minutos</strong>.</p>
          </div>
        `.trim(),
      },
    );
    await this.enviarConRegistro('cambio_correo_otp', correoNuevo, mensaje);
  }

  async notificarCambioCorreoConfirmado(correoAnterior: string, nuevoCorreo: string): Promise<void> {
    const nuevoSeguro = escaparHtml(nuevoCorreo);
    const mensaje = await this.resolverMensaje(
      'cambio_correo_confirmado',
      { nuevo_correo: nuevoCorreo },
      {
        subject: 'Aviso de seguridad: cambio de correo electrónico · Pintu Clic',
        text: [
          'Te informamos que el correo electrónico asociado a tu cuenta de Pintu Clic fue actualizado.',
          '',
          `Nuevo correo registrado: ${nuevoCorreo}`,
          '',
          'Si no reconoces esta operación, contacta de inmediato al soporte de Pintu Clic.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">Aviso de seguridad: correo actualizado</h2>
            <p>El correo electrónico titular de tu cuenta en Pintu Clic ha sido modificado a <strong>${nuevoSeguro}</strong>.</p>
            <p style="font-size: 13px; color: #4B5563;">Si no autorizaste este cambio, comunícate de inmediato con nuestro equipo de soporte.</p>
          </div>
        `.trim(),
      },
    );
    await this.enviarConRegistro('cambio_correo_confirmado', correoAnterior, mensaje);
  }

  async notificarDictamenEmpresa(
    correo: string,
    resultado: 'aprobada' | 'rechazada',
    motivoRechazo?: string,
  ): Promise<void> {
    const aprobada = resultado === 'aprobada';
    const motivoLimpio = motivoRechazo?.trim();
    const motivoHtml = motivoLimpio
      ? `<p style="font-size: 14px; color: #991B1B; background: #FEF2F2; padding: 12px; border-radius: 6px;"><strong>Motivo:</strong> ${escaparHtml(motivoLimpio)}</p>`
      : '';

    const mensaje = await this.resolverMensaje(
      'dictamen_empresa',
      { resultado, motivo: motivoLimpio ?? '' },
      {
        subject: aprobada
          ? 'Tu solicitud de cuenta empresarial fue aprobada · Pintu Clic'
          : 'Resultado de tu solicitud de cuenta empresarial · Pintu Clic',
        text: [
          aprobada
            ? '¡Buenas noticias! Tu solicitud de cuenta empresarial en Pintu Clic ha sido aprobada.'
            : 'Te informamos que tu solicitud de cuenta empresarial en Pintu Clic no fue aprobada.',
          ...(motivoLimpio ? ['', `Motivo: ${motivoLimpio}`] : []),
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;">
            <h2 style="color: #0B2D6B; margin-top: 0;">
              ${aprobada ? 'Cuenta empresarial aprobada' : 'Estado de solicitud empresarial'}
            </h2>
            <p>
              ${
                aprobada
                  ? 'Tu solicitud corporativa ha sido validada y aprobada. Ya puedes iniciar sesión y operar con beneficios empresariales en Pintu Clic.'
                  : 'Tu solicitud corporativa fue revisada y rechazada por nuestro equipo de validación.'
              }
            </p>
            ${motivoHtml}
          </div>
        `.trim(),
      },
    );
    await this.enviarConRegistro('dictamen_empresa', correo, mensaje);
  }
}

export function crearNotificacionesAdapterDesdeEntorno(
  env: NodeJS.ProcessEnv = process.env,
  transporter?: TransporteCorreoPort,
  registroEnvios?: RegistroEnviosRepositoryPort,
  parametros?: ParametrosComunicacionesPort,
  plantillas?: PlantillasRepositoryPort,
): NotificacionesPort {
  if (env.NODE_ENV === 'test') {
    return new MemoriaNotificacionesAdapter();
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

    return new SmtpNotificacionesAdapter(
      {
        host,
        port: Number.isNaN(port) ? 587 : port,
        secure,
        user,
        pass,
        from,
        frontendBaseUrl,
      },
      transporter,
      registroEnvios,
      parametros,
      plantillas,
    );
  }

  return new NoOpNotificacionesAdapter();
}
