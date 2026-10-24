import type { VariantePublica } from '../dtos/m01-catalogo-productos.dto';

const aTexto = (n: number): string => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });

/** "Rinde aprox. 5 a 7,5 m² a 2 manos": el rendimiento de la presentación, siempre como aproximado. */
export function textoRendimiento(rendimiento: VariantePublica['rendimiento'], manos: number | null): string | null {
  if (rendimiento === null) return null;
  const base = `Rinde aprox. ${aTexto(rendimiento.min)} a ${aTexto(rendimiento.max)} m²`;
  if (manos === null) return base;
  return `${base} a ${manos} ${manos === 1 ? 'mano' : 'manos'}`;
}
