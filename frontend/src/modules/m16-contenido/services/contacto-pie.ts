import type { FooterProps } from '@/core/components';
import type { ContactoPublico } from '../dtos/m16-contenido.dto';

type DatoContacto = FooterProps['contact'][number];
type RedSocial = FooterProps['socials'][number];

/** Un teléfono para `tel:`: solo dígitos y el `+` inicial. */
export const enlaceTelefono = (telefono: string): string => `tel:${telefono.replace(/[^\d+]/g, '')}`;

/**
 * Lo que el pie de página muestra de la ficha de contacto (HU-CON-05): solo lo que el administrador cargó. Lo vacío no
 * se inventa ni se deja como hueco. Sin ficha (todavía cargando, o la consulta falló) no hay contacto ni redes.
 */
export function contactoParaPie(contacto: ContactoPublico | null): Pick<FooterProps, 'contact' | 'socials'> {
  if (contacto === null) return { contact: [], socials: [] };

  const contact: DatoContacto[] = [];
  if (contacto.direccion !== null) contact.push({ icon: 'ubicacion', label: contacto.direccion });
  if (contacto.telefono !== null) contact.push({ icon: 'telefono', label: contacto.telefono, href: enlaceTelefono(contacto.telefono) });
  if (contacto.correo !== null) contact.push({ icon: 'correo', label: contacto.correo, href: `mailto:${contacto.correo}` });

  const socials: RedSocial[] = [];
  if (contacto.facebook !== null) socials.push({ label: 'Facebook', href: contacto.facebook, icon: 'facebook' });
  if (contacto.instagram !== null) socials.push({ label: 'Instagram', href: contacto.instagram, icon: 'instagram' });
  if (contacto.youtube !== null) socials.push({ label: 'YouTube', href: contacto.youtube, icon: 'youtube' });
  if (contacto.tiktok !== null) socials.push({ label: 'TikTok', href: contacto.tiktok, icon: 'tiktok' });

  return { contact, socials };
}
