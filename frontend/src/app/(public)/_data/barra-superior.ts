import type { TopbarItem } from '@/core/components';
import type { CanalWhatsappPublico, HorarioAtencion } from '@/modules/m15-atencion/interfaces/atencion.interface';
import { enlaceDelCanal } from '@/modules/m15-atencion/services/enlace-canal';
import { resumenHorario } from '@/modules/m15-atencion/services/resumen-horario';
import type { ContactoPublico } from '@/modules/m16-contenido/dtos/m16-contenido.dto';
import { enlaceTelefono } from '@/modules/m16-contenido/services/contacto-pie';

/** Lo que la barra siempre dice: son páginas reales de la tienda, no datos de contacto. */
const FIJOS: ReadonlyArray<TopbarItem> = [
  { icon: 'envio', label: 'Políticas de envío', href: '/politicas-de-envio' },
  { icon: 'ayuda', label: 'Centro de ayuda', href: '/centro-de-ayuda' },
];

export interface DatosBarraSuperior {
  contacto: ContactoPublico | null;
  horario: HorarioAtencion | null;
  canal: CanalWhatsappPublico | null;
}

/**
 * Lo que dice la barra superior de la tienda: el horario de atención (M15), el teléfono y el correo que el administrador
 * cargó (M16) y el canal de WhatsApp (M15). Lo que no esté cargado no se muestra ni se inventa; los enlaces a las políticas
 * de envío y al Centro de ayuda siempre van.
 */
export function itemsBarraSuperior({ contacto, horario, canal }: DatosBarraSuperior): TopbarItem[] {
  const items: TopbarItem[] = [];

  const franjas = horario === null ? null : resumenHorario(horario.franjas);
  if (horario !== null && franjas !== null) {
    items.push({ icon: 'horario', label: `${franjas}${horario.abiertoAhora ? ' · Abierto ahora' : ''}`, href: '/centro-de-ayuda#contacto-equipo' });
  }
  if (contacto?.telefono != null) items.push({ icon: 'telefono', label: contacto.telefono, href: enlaceTelefono(contacto.telefono) });
  if (canal !== null) items.push({ icon: 'whatsapp', label: 'WhatsApp', href: enlaceDelCanal(canal) });
  if (contacto?.correo != null) items.push({ icon: 'correo', label: contacto.correo, href: `mailto:${contacto.correo}` });

  return [...items, ...FIJOS];
}
