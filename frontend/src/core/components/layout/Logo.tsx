import Image from 'next/image';
import Link from 'next/link';

export interface LogoProps {
  src: string;
  /** Nombre accesible del enlace (el logo ES el texto "Pintu Clic"). */
  alt: string;
  width: number;
  height: number;
  href?: string;
  /** Clases de tamaño de la imagen, p. ej. `h-12 w-auto`. */
  className?: string;
  priority?: boolean;
}

/** Logotipo oficial enlazado al inicio. */
export function Logo({
  src,
  alt,
  width,
  height,
  href = '/',
  className = 'h-12 w-auto',
  priority = false,
}: LogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 rounded-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
    >
      <Image src={src} alt={alt} width={width} height={height} priority={priority} className={className} />
    </Link>
  );
}
