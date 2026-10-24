/** Secciones del panel de administración del catálogo, tal como viajan en la URL. */
export const SECCIONES_ADMIN = ['productos', 'colores', 'marcas', 'clasificacion', 'medidas', 'atributos'] as const;
export type SeccionAdmin = (typeof SECCIONES_ADMIN)[number];

export const RUTA_ADMIN_CATALOGO = '/admin/catalogo';

export function leerSeccion(valor: string | null): SeccionAdmin {
  return SECCIONES_ADMIN.find((s) => s === valor) ?? 'productos';
}

const entero = (valor: string | null): string =>
  valor !== null && /^\d+$/.test(valor) && Number(valor) > 0 ? valor : '';

/** Filtros con los que se abre la lista de productos desde otra pantalla ("Ver productos"). */
export interface FiltrosProductosEnlace {
  marca?: number;
  linea?: number;
  subcategoria?: number;
}

/** Enlace a la lista de productos ya filtrada; cada pantalla con elementos relacionados debe ofrecer uno. */
export function enlaceProductos(filtros: FiltrosProductosEnlace): string {
  const params = new URLSearchParams({ seccion: 'productos' });
  if (filtros.marca !== undefined) params.set('marca', String(filtros.marca));
  if (filtros.linea !== undefined) params.set('linea', String(filtros.linea));
  if (filtros.subcategoria !== undefined) params.set('subcategoria', String(filtros.subcategoria));
  return `${RUTA_ADMIN_CATALOGO}?${params.toString()}`;
}

export function filtrosProductosDesdeUrl(params: URLSearchParams): {
  marca: string;
  linea: string;
  subcategoria: string;
} {
  return {
    marca: entero(params.get('marca')),
    linea: entero(params.get('linea')),
    subcategoria: entero(params.get('subcategoria')),
  };
}
