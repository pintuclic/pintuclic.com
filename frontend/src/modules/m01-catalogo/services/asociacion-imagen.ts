import type { ImagenProducto } from '../dtos/m01-catalogo-productos.dto';

/**
 * Entrega 3 (I5): una imagen puede ser general del producto o de UNA variante o de UN color. El valor
 * del selector viaja como texto: '' = general, 'v:12' = variante 12, 'c:34' = color 34.
 */
export interface OpcionAsociacion {
  value: string;
  label: string;
}

export interface DestinosAsociacion {
  variantes: ReadonlyArray<{ idVariante: number; medida: string }>;
  /** Colores de fábrica del producto (los de la carta de un entonable no se listan: son miles). */
  colores: ReadonlyArray<{ id: number; nombre: string }>;
}

export function opcionesAsociacion(destinos: DestinosAsociacion): OpcionAsociacion[] {
  return [
    { value: '', label: 'Todo el producto' },
    ...destinos.variantes.map((v) => ({ value: `v:${v.idVariante}`, label: `Medida: ${v.medida}` })),
    ...destinos.colores.map((c) => ({ value: `c:${c.id}`, label: `Color: ${c.nombre}` })),
  ];
}

export function valorDeAsociacion(imagen: Pick<ImagenProducto, 'idVariante' | 'idColor'>): string {
  if (imagen.idVariante !== null) return `v:${imagen.idVariante}`;
  if (imagen.idColor !== null) return `c:${imagen.idColor}`;
  return '';
}

export function aAsociacion(valor: string): { idVariante: number | null; idColor: number | null } {
  const m = /^([vc]):([1-9]\d*)$/.exec(valor);
  if (m === null) return { idVariante: null, idColor: null };
  const id = Number(m[2]);
  return m[1] === 'v' ? { idVariante: id, idColor: null } : { idVariante: null, idColor: id };
}

/** Texto corto para la ficha de la imagen en la galería de administración. */
export function etiquetaDeAsociacion(
  imagen: Pick<ImagenProducto, 'idVariante' | 'idColor'>,
  destinos: DestinosAsociacion,
): string {
  const valor = valorDeAsociacion(imagen);
  return opcionesAsociacion(destinos).find((o) => o.value === valor)?.label ?? 'Asociada a un elemento que ya no está';
}
