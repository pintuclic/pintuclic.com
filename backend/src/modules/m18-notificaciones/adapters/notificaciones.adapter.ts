import nodemailer from 'nodemailer';
import type { EventoNotificacion, NotificacionesPort } from '../interfaces/notificaciones.port';
import type { ParametrosComunicacionesPort } from '../interfaces/parametros-comunicaciones.port';
import type { PlantillasRepositoryPort } from '../interfaces/plantillas.port';
import type {
  EstadoEnvio,
  RegistroEnviosRepositoryPort,
  TipoComunicacion,
} from '../interfaces/registro-envios.port';
import * as plantillasHtml from './plantillas-html';

export { escaparHtml } from './html-utils';

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

  async notificarComprobanteVenta(
    correo: string,
    datos: { nombre: string; numero: string; total: string; codigoOrden: string },
  ): Promise<void> {
    this.eventos.push({ tipo: 'comprobante_venta', destinatario: correo, timestamp: new Date(), metadatos: { ...datos } });
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

  async notificarComprobanteVenta(): Promise<void> {
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
  /**
   * HU-NOT-03: usa el asunto y la copia introductoria editados por el admin en
   * `plantilla_notificacion` si existe una fila para `tipo`; si no (tabla vacía,
   * repositorio no inyectado, o error de lectura), cae en el respaldo para no dejar
   * de enviar la comunicación. El admin nunca edita HTML ni variables — eso lo pone
   * `plantillas-html.ts` con los datos reales de cada envío.
   */
  private async resolverIntroYAsunto(
    tipo: TipoComunicacion,
    respaldo: { subject: string; intro: string },
  ): Promise<{ subject: string; intro: string }> {
    const plantilla = await this.plantillas?.obtenerPorTipo(tipo).catch(() => null);
    if (!plantilla) return respaldo;
    return { subject: plantilla.asunto, intro: plantilla.contenidoTexto };
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
    const { subject, intro } = await this.resolverIntroYAsunto('registro_otp', {
      subject: 'Código de verificación de tu cuenta · Pintu Clic',
      intro: 'Bienvenido a Pintu Clic. Usa el código de verificación que aparece abajo para activar tu cuenta.',
    });
    await this.enviarConRegistro('registro_otp', correo, {
      subject,
      text: plantillasHtml.textoRegistroOtp(intro, codigoOtp, minutosVigencia),
      html: plantillasHtml.htmlRegistroOtp(intro, codigoOtp, minutosVigencia),
    });
  }

  async enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void> {
    const enlace = `${this.frontendBaseUrl}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    const { subject, intro } = await this.resolverIntroYAsunto('recuperacion_password', {
      subject: 'Restablecimiento de contraseña · Pintu Clic',
      intro:
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta en Pintu Clic. Usa el botón de abajo para crear una nueva.',
    });
    await this.enviarConRegistro('recuperacion_password', correo, {
      subject,
      text: plantillasHtml.textoRecuperacionPassword(intro, enlace, minutosVigencia),
      html: plantillasHtml.htmlRecuperacionPassword(intro, enlace, minutosVigencia),
    });
  }

  async enviarEnlaceActivacion(correo: string, nombre: string, token: string, horasVigencia: number): Promise<void> {
    const enlace = `${this.frontendBaseUrl}/activar-cuenta?token=${encodeURIComponent(token)}`;
    const { subject, intro } = await this.resolverIntroYAsunto('activacion_empleado', {
      subject: 'Activa tu cuenta de colaborador · Pintu Clic',
      intro:
        'Te crearon una cuenta de colaborador en Pintu Clic. Usa el botón de abajo para definir tu contraseña y comenzar.',
    });
    await this.enviarConRegistro('activacion_empleado', correo, {
      subject,
      text: plantillasHtml.textoActivacionEmpleado(intro, nombre, enlace, horasVigencia),
      html: plantillasHtml.htmlActivacionEmpleado(intro, nombre, enlace, horasVigencia),
    });
  }

  async enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    const { subject, intro } = await this.resolverIntroYAsunto('cambio_correo_otp', {
      subject: 'Confirma tu nuevo correo electrónico · Pintu Clic',
      intro:
        'Solicitaste actualizar el correo electrónico de tu cuenta en Pintu Clic. Usa el código de abajo para confirmar el cambio.',
    });
    await this.enviarConRegistro('cambio_correo_otp', correoNuevo, {
      subject,
      text: plantillasHtml.textoCambioCorreoOtp(intro, codigoOtp, minutosVigencia),
      html: plantillasHtml.htmlCambioCorreoOtp(intro, codigoOtp, minutosVigencia),
    });
  }

  async notificarCambioCorreoConfirmado(correoAnterior: string, nuevoCorreo: string): Promise<void> {
    const { subject, intro } = await this.resolverIntroYAsunto('cambio_correo_confirmado', {
      subject: 'Aviso de seguridad: cambio de correo electrónico · Pintu Clic',
      intro:
        'Te informamos que el correo electrónico asociado a tu cuenta de Pintu Clic fue actualizado. Si no reconoces esta operación, contacta de inmediato a nuestro equipo de soporte.',
    });
    await this.enviarConRegistro('cambio_correo_confirmado', correoAnterior, {
      subject,
      text: plantillasHtml.textoCambioCorreoConfirmado(intro, nuevoCorreo),
      html: plantillasHtml.htmlCambioCorreoConfirmado(intro, nuevoCorreo),
    });
  }

  async notificarDictamenEmpresa(
    correo: string,
    resultado: 'aprobada' | 'rechazada',
    motivoRechazo?: string,
  ): Promise<void> {
    const aprobada = resultado === 'aprobada';
    const { subject, intro } = await this.resolverIntroYAsunto('dictamen_empresa', {
      subject: aprobada
        ? 'Tu solicitud de cuenta empresarial fue aprobada · Pintu Clic'
        : 'Resultado de tu solicitud de cuenta empresarial · Pintu Clic',
      intro: 'Gracias por tu solicitud de cuenta empresarial en Pintu Clic. A continuación encontrarás el resultado de la revisión.',
    });
    await this.enviarConRegistro('dictamen_empresa', correo, {
      subject,
      text: plantillasHtml.textoDictamenEmpresa(intro, aprobada, motivoRechazo),
      html: plantillasHtml.htmlDictamenEmpresa(intro, aprobada, motivoRechazo),
    });
  }

  async notificarComprobanteVenta(
    correo: string,
    datos: { nombre: string; numero: string; total: string; codigoOrden: string },
  ): Promise<void> {
    const enlace = `${this.frontendBaseUrl}/perfil/pedidos/${encodeURIComponent(datos.codigoOrden)}/comprobante`;
    const { subject, intro } = await this.resolverIntroYAsunto('comprobante_venta', {
      subject: 'Tu comprobante de compra · Pintu Clic',
      intro: 'Gracias por tu compra en Pintu Clic. Ya está listo el comprobante de tu pedido: puedes verlo, imprimirlo o guardarlo como PDF desde el enlace.',
    });
    await this.enviarConRegistro('comprobante_venta', correo, {
      subject,
      text: plantillasHtml.textoComprobanteVenta(intro, datos.nombre, datos.numero, datos.total, enlace),
      html: plantillasHtml.htmlComprobanteVenta(intro, datos.nombre, datos.numero, datos.total, enlace),
    });
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
