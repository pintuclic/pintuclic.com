import { DESTINO_ES_URL } from '../dtos/m15-atencion.dto';
import type { CanalWhatsappPublico } from '../interfaces/atencion.interface';

/** Deja solo los dígitos: wa.me no acepta espacios, guiones ni el signo "+". */
function soloDigitos(destino: string): string {
  return destino.replace(/\D/g, '');
}

/**
 * Dirección final del botón de contacto directo (HU-ATC-03, regla R7 del contrato).
 *
 * Si el destino ya es una URL HTTP/HTTPS —hoy el canal de difusión de la empresa—
 * se abre tal cual: un canal no admite texto prellenado, de modo que el mensaje base
 * y la referencia del producto no se le anexan. Cuando el destino sea un número de
 * WhatsApp Business, el enlace lleva ambos y el asesor sabe de qué le hablan
 * (RF-ATC-03-03).
 *
 * Vive fuera del componente para poder probarlo sin DOM.
 */
export function enlaceDelCanal(canal: CanalWhatsappPublico, referencia?: string): string {
  if (canal.destinoEsUrl && DESTINO_ES_URL.test(canal.destino)) {
    return canal.destino;
  }

  const numero = soloDigitos(canal.destino);
  const partes = [canal.mensajeBase, referencia].filter(
    (parte): parte is string => typeof parte === 'string' && parte.trim() !== '',
  );

  if (partes.length === 0) {
    return `https://wa.me/${numero}`;
  }

  return `https://wa.me/${numero}?text=${encodeURIComponent(partes.join(' '))}`;
}