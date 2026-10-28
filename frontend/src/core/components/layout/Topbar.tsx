import { BadgeCheck, CircleHelp, Clock, Headset, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { Container } from './Container';

/** Claves serializables: el contenido no importa componentes de íconos. */
export type TopbarIcon = 'envio' | 'calidad' | 'asesoria' | 'ayuda' | 'telefono' | 'horario' | 'whatsapp' | 'correo';

const ICONOS: Record<TopbarIcon, LucideIcon> = {
  envio: MapPin,
  calidad: BadgeCheck,
  asesoria: Headset,
  ayuda: CircleHelp,
  telefono: Phone,
  horario: Clock,
  whatsapp: MessageCircle,
  correo: Mail,
};

export interface TopbarItem {
  icon: TopbarIcon;
  label: string;
  /** Si existe, el elemento es un enlace (p. ej. `tel:`). */
  href?: string;
}

export interface TopbarProps {
  items: ReadonlyArray<TopbarItem>;
}

/**
 * Franja superior (UI Spec §3.1): fondo corporativo, texto pequeño blanco.
 * En móvil solo se conserva el primer mensaje y el teléfono; si no hay teléfono, solo el primer mensaje.
 */
export function Topbar({ items }: TopbarProps) {
  return (
    <div className="bg-corporate text-neutral-white">
      <Container className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2 text-xs">
        {items.map((item, indice) => {
          const Icono = ICONOS[item.icon];
          const visibleEnMovil = indice === 0 || item.icon === 'telefono';
          const contenido = (
            <>
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </>
          );
          const clases = `items-center gap-1.5 ${visibleEnMovil ? 'inline-flex' : 'hidden md:inline-flex'}`;

          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              className={`${clases} min-h-11 rounded-btn hover:underline md:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-white/80`}
            >
              {contenido}
            </a>
          ) : (
            <span key={item.label} className={clases}>
              {contenido}
            </span>
          );
        })}
      </Container>
    </div>
  );
}
