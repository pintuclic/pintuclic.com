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

/** M12 · R9: aviso de que el comprobante de venta está listo. Solo número, total y enlace: nada más del pedido. */
export function textoComprobanteVenta(intro: string, nombre: string, numero: string, total: string, enlace: string): string {
  return [`Hola, ${nombre}.`, '', intro, '', `Comprobante: ${numero}`, `Total: ${total}`, '', `Verlo o imprimirlo (requiere iniciar sesión): ${enlace}`].join('\n');
}

export function htmlComprobanteVenta(intro: string, nombre: string, numero: string, total: string, enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Tu comprobante de compra</h2>
      <p>Hola, ${escaparHtml(nombre)}.</p>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Comprobante: <strong>${escaparHtml(numero)}</strong></p>
      <p style="font-size: 13px; color: #4B5563;">Total: <strong>${escaparHtml(total)}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${enlaceSeguro}" style="${BOTON_ESTILO}">Ver comprobante</a>
      </p>
      <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Para verlo debes iniciar sesión. Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
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

/** Etiquetas de los estados de la orden que conoce M18 (HU-NOT-02); un estado nuevo se muestra legible sin cambiar código. */
const ETIQUETA_ESTADO_ORDEN: Readonly<Record<string, string>> = {
  orden_confirmada: 'Confirmado',
  revision_disponibilidad: 'Revisando disponibilidad',
  en_preparacion: 'En alistamiento',
  preparada: 'Alistado',
  despachado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
};

export function etiquetaEstadoOrden(estado: string): string {
  const conocida = ETIQUETA_ESTADO_ORDEN[estado];
  if (conocida) return conocida;
  const legible = estado.replace(/_/g, ' ').trim();
  return legible ? legible.charAt(0).toUpperCase() + legible.slice(1) : 'Actualizado';
}

export function textoEstadoOrden(intro: string, nombre: string, codigoOrden: string, estadoNuevo: string, enlace: string): string {
  return [`Hola, ${nombre}.`, intro, '', `Pedido: ${codigoOrden}`, `Nuevo estado: ${etiquetaEstadoOrden(estadoNuevo)}`, '', `Ver pedido: ${enlace}`].join('\n');
}

export function htmlEstadoOrden(intro: string, nombre: string, codigoOrden: string, estadoNuevo: string, enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Novedades de tu pedido</h2>
      <p>Hola, ${escaparHtml(nombre)}.</p>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Pedido: <strong>${escaparHtml(codigoOrden)}</strong></p>
      <p style="font-size: 13px; color: #4B5563;">Nuevo estado: <strong>${escaparHtml(etiquetaEstadoOrden(estadoNuevo))}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${enlaceSeguro}" style="${BOTON_ESTILO}">Ver mi pedido</a>
      </p>
      <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Para verlo debes iniciar sesión. Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
    </div>
  `.trim();
}

export function textoCotizacionRespondida(intro: string, nombre: string, codigo: string, total: string, vencimiento: string, enlace: string): string {
  return [`Hola, ${nombre}.`, intro, '', `Cotización: ${codigo}`, `Total acordado: ${total}`, `Vigente hasta: ${vencimiento}`, '', `Ver cotización: ${enlace}`].join('\n');
}

export function htmlCotizacionRespondida(intro: string, nombre: string, codigo: string, total: string, vencimiento: string, enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Respondimos tu cotización</h2>
      <p>Hola, ${escaparHtml(nombre)}.</p>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Cotización: <strong>${escaparHtml(codigo)}</strong></p>
      <p style="font-size: 13px; color: #4B5563;">Total acordado: <strong>${escaparHtml(total)}</strong></p>
      <p style="font-size: 13px; color: #4B5563;">Vigente hasta: <strong>${escaparHtml(vencimiento)}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${enlaceSeguro}" style="${BOTON_ESTILO}">Ver cotización</a>
      </p>
      <p style="font-size: 12px; color: #6B7280; word-break: break-all;">Para verla debes iniciar sesión. Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${enlaceSeguro}</p>
    </div>
  `.trim();
}

export function textoCotizacionRechazada(intro: string, nombre: string, codigo: string, motivo: string, enlace: string): string {
  const motivoLimpio = motivo.trim();
  return [`Hola, ${nombre}.`, intro, '', `Cotización: ${codigo}`, ...(motivoLimpio ? [`Motivo: ${motivoLimpio}`] : []), '', `Ver cotización: ${enlace}`].join('\n');
}

export function htmlCotizacionRechazada(intro: string, nombre: string, codigo: string, motivo: string, enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);
  const motivoLimpio = motivo.trim();
  return `
    <div style="${CAJA_ESTILO}">
      <h2 style="color: #0B2D6B; margin-top: 0;">Sobre tu solicitud de cotización</h2>
      <p>Hola, ${escaparHtml(nombre)}.</p>
      ${introAHtml(intro)}
      <p style="font-size: 13px; color: #4B5563;">Cotización: <strong>${escaparHtml(codigo)}</strong></p>
      ${motivoLimpio ? `<p style="font-size: 13px; color: #4B5563;">Motivo: <strong>${escaparHtml(motivoLimpio)}</strong></p>` : ''}
      <p style="margin: 24px 0;">
        <a href="${enlaceSeguro}" style="${BOTON_ESTILO}">Ver cotización</a>
      </p>
    </div>
  `.trim();
}
