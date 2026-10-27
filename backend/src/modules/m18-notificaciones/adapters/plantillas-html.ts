import { escaparHtml } from './html-utils';

/**
 * Maquetado fijo de cada comunicación transaccional (M18 · HU-NOT-03).
 *
 * Decisión de producto: el admin solo edita `asunto` y una copia introductoria en texto
 * plano (`plantilla_notificacion.contenido_texto`). Nunca edita HTML ni variables — así
 * no puede romper el maquetado ni dejar de sustituir un dato por un error de tipeo. Los
 * datos dinámicos (código, enlace, nombre, etc.) los pone este módulo, no el panel.
 */

const CAJA_ESTILO =
  'font-family: Arial, sans-serif; color: #1A1A1A; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px;';
const BOTON_ESTILO =
  'background: #F47B20; color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 12px 20px; border-radius: 6px; display: inline-block;';

/** Convierte la copia introductoria (texto plano, posibles párrafos separados por línea en blanco) en párrafos HTML escapados. */
function introAHtml(intro: string): string {
  return intro
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean)
    .map((parrafo) => `<p>${escaparHtml(parrafo)}</p>`)
    .join('\n  ');
}

export function textoRegistroOtp(intro: string, codigoOtp: string, minutosVigencia: number): string {
  return [intro, '', `Código de verificación: ${codigoOtp}`, `Vigente por ${minutosVigencia} minutos.`].join('\n');
}

export function htmlRegistroOtp(intro: string, codigoOtp: string, minutosVigencia: number): string {
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Verifica tu correo en Pintu Clic</h2>
      ${introAHtml(intro)}
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0B2D6B; background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        ${escaparHtml(codigoOtp)}
      </div>
      <p style="font-size: 13px; color: #4B5563;">Este código tiene una vigencia de <strong>${minutosVigencia} minutos</strong>.</p>
    </div>
  `.trim();
}

export function textoRecuperacionPassword(intro: string, enlace: string, minutosVigencia: number): string {
  return [intro, '', `Enlace para crear tu nueva contraseña (válido por ${minutosVigencia} minutos):`, enlace].join(
    '\n',
  );
}

export function htmlRecuperacionPassword(intro: string, enlace: string, minutosVigencia: number): string {
  const enlaceSeguro = escaparHtml(enlace);
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Restablece tu contraseña</h2>
      ${introAHtml(intro)}
      <p style="margin: 24px 0;">
        <a href="${enlaceSeguro}" style="${BOTON_ESTILO}">Crear nueva contraseña</a>
      </p>
      <p style="font-size: 13px; color: #4B5563;">Este enlace expirará en <strong>${minutosVigencia} minutos</strong>.</p>
      <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
    </div>
  `.trim();
}

export function textoActivacionEmpleado(
  intro: string,
  nombre: string,
  enlace: string,
  horasVigencia: number,
): string {
  return [
    `Hola, ${nombre}.`,
    '',
    intro,
    '',
    `Enlace para definir tu contraseña (válido por ${horasVigencia} horas):`,
    enlace,
  ].join('\n');
}

export function htmlActivacionEmpleado(intro: string, nombre: string, enlace: string, horasVigencia: number): string {
  const enlaceSeguro = escaparHtml(enlace);
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Bienvenido a Pintu Clic, ${escaparHtml(nombre)}</h2>
      ${introAHtml(intro)}
      <p style="margin: 24px 0;">
        <a href="${enlaceSeguro}" style="${BOTON_ESTILO}">Definir mi contraseña</a>
      </p>
      <p style="font-size: 13px; color: #4B5563;">Este enlace expirará en <strong>${horasVigencia} horas</strong> y solo puede usarse una vez.</p>
      <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
    </div>
  `.trim();
}

export function textoCambioCorreoOtp(intro: string, codigoOtp: string, minutosVigencia: number): string {
  return [intro, '', `Código de confirmación: ${codigoOtp}`, `Vigente por ${minutosVigencia} minutos.`].join('\n');
}

export function htmlCambioCorreoOtp(intro: string, codigoOtp: string, minutosVigencia: number): string {
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Confirma tu nuevo correo</h2>
      ${introAHtml(intro)}
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0B2D6B; background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        ${escaparHtml(codigoOtp)}
      </div>
      <p style="font-size: 13px; color: #4B5563;">Este código tiene una vigencia de <strong>${minutosVigencia} minutos</strong>.</p>
    </div>
  `.trim();
}

export function textoCambioCorreoConfirmado(intro: string, nuevoCorreo: string): string {
  return [intro, '', `Nuevo correo registrado: ${nuevoCorreo}`].join('\n');
}

export function htmlCambioCorreoConfirmado(intro: string, nuevoCorreo: string): string {
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Aviso de seguridad: correo actualizado</h2>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Nuevo correo registrado: <strong>${escaparHtml(nuevoCorreo)}</strong></p>
    </div>
  `.trim();
}

/**
 * M03 · I9: aviso interno al administrador cuando el servicio de IA acumula fallos.
 * No lleva datos de ninguna persona ni el contenido de las consultas (M03 · I7).
 */
export function textoAlertaServicioIa(intro: string, servicio: string, fallosConsecutivos: number): string {
  return [
    intro,
    '',
    `Servicio: ${servicio}`,
    `Fallos seguidos: ${fallosConsecutivos}`,
  ].join('\n');
}

export function htmlAlertaServicioIa(intro: string, servicio: string, fallosConsecutivos: number): string {
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">El asistente no está respondiendo</h2>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Servicio: <strong>${escaparHtml(servicio)}</strong></p>
      <p style="font-size: 13px; color: #4B5563;">Fallos seguidos: <strong>${fallosConsecutivos}</strong></p>
    </div>
  `.trim();
}

export function textoDictamenEmpresa(intro: string, aprobada: boolean, motivo?: string): string {
  const motivoLimpio = motivo?.trim();
  return [
    intro,
    '',
    `Resultado: ${aprobada ? 'aprobada' : 'rechazada'}.`,
    ...(motivoLimpio ? ['', `Motivo: ${motivoLimpio}`] : []),
  ].join('\n');
}

export function htmlDictamenEmpresa(intro: string, aprobada: boolean, motivo?: string): string {
  const motivoLimpio = motivo?.trim();
  const motivoHtml = motivoLimpio
    ? `<p style="font-size: 14px; color: #991B1B; background: #FEF2F2; padding: 12px; border-radius: 6px;"><strong>Motivo:</strong> ${escaparHtml(motivoLimpio)}</p>`
    : '';
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">${aprobada ? 'Cuenta empresarial aprobada' : 'Estado de solicitud empresarial'}</h2>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Resultado: <strong>${aprobada ? 'aprobada' : 'rechazada'}</strong></p>
      ${motivoHtml}
    </div>
  `.trim();
}
