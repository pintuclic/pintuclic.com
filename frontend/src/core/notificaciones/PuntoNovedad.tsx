import { textoContador } from './sondeo';

export interface PuntoNovedadProps {
  cantidad: number;
  /** Lo que se lee en voz alta junto al número, en singular y plural: «novedad» / «novedades». El número nunca es el único indicio (R11). */
  singular?: string;
  plural?: string;
  /** Para colocarlo encima de un ícono (esquina superior derecha) en vez de en línea. */
  superpuesto?: boolean;
  className?: string;
}

/** Punto rojo con número (FP-02 · R6). No pinta nada si no hay novedades. Topa en «99+». */
export function PuntoNovedad({ cantidad, singular = 'nuevo', plural = 'nuevos', superpuesto = false, className = '' }: PuntoNovedadProps) {
  if (cantidad <= 0) return null;
  const posicion = superpuesto ? 'absolute -right-2 -top-2' : 'inline-flex';
  return (
    <span
      data-testid="punto-novedad"
      className={`${posicion} h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold leading-none text-neutral-white ring-2 ring-danger/25 ${superpuesto ? 'flex' : ''} ${className}`}
    >
      <span aria-hidden="true">{textoContador(cantidad)}</span>
      <span className="sr-only">{`${String(cantidad)} ${cantidad === 1 ? singular : plural}`}</span>
    </span>
  );
}
