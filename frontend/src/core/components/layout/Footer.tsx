import Link from 'next/link';
import type { ComponentType } from 'react';
import { Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { IconoFacebook, IconoInstagram, IconoYoutube, type IconoMarcaProps } from './IconosMarca';
import { Container } from './Container';
import { Logo, type LogoProps } from './Logo';

/**
 * Clave de un enlace del pie. Dos enlaces pueden llevar a la misma página (por ejemplo, dos herramientas de la asesoría),
 * así que la dirección sola se repite: el texto junto con la dirección sí es único en cada lista.
 */
export function claveDeEnlace(enlace: { label: string; href: string }): string {
  return `${enlace.label}|${enlace.href}`;
}

export type FooterSocialIcon = 'facebook' | 'instagram' | 'youtube';
export type FooterContactIcon = 'ubicacion' | 'telefono' | 'correo';

// lucide-react 1.x ya no trae logotipos de marca (ver IconosMarca.tsx).
const ICONOS_SOCIALES: Record<FooterSocialIcon, ComponentType<IconoMarcaProps>> = {
  facebook: IconoFacebook,
  instagram: IconoInstagram,
  youtube: IconoYoutube,
};

const ICONOS_CONTACTO: Record<FooterContactIcon, LucideIcon> = {
  ubicacion: MapPin,
  telefono: Phone,
  correo: Mail,
};

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: ReadonlyArray<FooterLink>;
}

export interface FooterProps {
  logo: LogoProps;
  description: string;
  socials: ReadonlyArray<{ label: string; href: string; icon: FooterSocialIcon }>;
  columns: ReadonlyArray<FooterColumn>;
  contactTitle: string;
  contact: ReadonlyArray<{ icon: FooterContactIcon; label: string; href?: string }>;
  legalLinks: ReadonlyArray<FooterLink>;
  brandName: string;
}

const ENLACE =
  'rounded-btn text-neutral-white/80 transition-colors hover:text-neutral-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-white/80';

/**
 * Pie institucional (UI Spec §3.3 / mockup de inicio): fondo corporativo, marca,
 * dos columnas de enlaces, contacto y banda legal. El año se calcula, no se fija.
 */
export function Footer({
  logo,
  description,
  socials,
  columns,
  contactTitle,
  contact,
  legalLinks,
  brandName,
}: FooterProps) {
  const anio = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-corporate text-neutral-white">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo {...logo} />
          <p className="max-w-xs font-sans text-sm text-neutral-white/80">{description}</p>
          <ul className="flex items-center gap-1">
            {socials.map((red) => {
              const Icono = ICONOS_SOCIALES[red.icon];
              return (
                <li key={red.href}>
                  <a
                    href={red.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${red.label} (se abre en una pestaña nueva)`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-white/80 transition-colors hover:bg-neutral-white/10 hover:text-neutral-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-white/80"
                  >
                    <Icono className="h-5 w-5" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {columns.map((columna) => (
          <nav key={columna.title} aria-label={columna.title}>
            <h2 className="mb-4 font-title text-lg font-semibold">{columna.title}</h2>
            <ul className="flex flex-col gap-1 font-sans text-sm">
              {columna.links.map((enlace) => (
                <li key={claveDeEnlace(enlace)}>
                  <Link href={enlace.href} className={`inline-flex min-h-11 items-center md:min-h-8 ${ENLACE}`}>
                    {enlace.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="mb-4 font-title text-lg font-semibold">{contactTitle}</h2>
          <ul className="flex flex-col gap-3 font-sans text-sm">
            {contact.map((dato) => {
              const Icono = ICONOS_CONTACTO[dato.icon];
              const contenido = (
                <>
                  <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{dato.label}</span>
                </>
              );
              return (
                <li key={dato.label}>
                  {dato.href ? (
                    <a href={dato.href} className={`inline-flex min-h-11 items-center gap-2 md:min-h-0 ${ENLACE}`}>
                      {contenido}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-neutral-white/80">{contenido}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Container>

      <div className="border-t border-neutral-white/15">
        <Container className="flex flex-col items-center justify-between gap-3 py-5 font-sans text-xs text-neutral-white/70 md:flex-row">
          <p>
            © {anio} {brandName}. Todos los derechos reservados.
          </p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              {legalLinks.map((enlace) => (
                <li key={claveDeEnlace(enlace)}>
                  <Link href={enlace.href} className={`inline-flex min-h-11 items-center md:min-h-8 ${ENLACE}`}>
                    {enlace.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
