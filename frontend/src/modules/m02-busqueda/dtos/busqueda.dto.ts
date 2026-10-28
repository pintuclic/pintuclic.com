export type OrdenResultados = 'relevancia' | 'precio_asc' | 'precio_desc' | 'novedad' | 'mas_vendidos';
export type PeriodoEstadistica = 'diario' | 'semanal' | 'mensual' | 'anual';

export interface OpcionFiltro {
  id: number;
  nombre: string;
  total: number;
}

export interface OpcionSubcategoria extends OpcionFiltro {
  idCategoria: number;
}

export interface OpcionLinea extends OpcionFiltro {
  idMarca: number;
}

export interface OpcionFamiliaColor extends OpcionFiltro {
  hexadecimal: string;
}

export interface OpcionesFiltro {
  totalResultados: number;
  categorias: OpcionFiltro[];
  subcategorias: OpcionSubcategoria[];
  marcas: OpcionFiltro[];
  lineas: OpcionLinea[];
  tiposResina: OpcionFiltro[];
  familiasColor: OpcionFamiliaColor[];
  presentaciones: OpcionFiltro[];
  superficies: OpcionFiltro[];
  precio: { minimo: number; maximo: number } | null;
}

/** Oferta de un evento de M06 en curso (etiqueta y precio tachado). Nunca incluye el descuento de empresa. */
export interface OfertaListado {
  nombre: string;
  porcentaje: number;
  precioAntes: number;
  precioConOferta: number;
}

/** Color con el que se pinta el fondo de la imagen de la tarjeta (T1, T2). */
export interface ColorMuestra {
  idColor: number;
  nombre: string;
  hexadecimal: string;
}

export interface ResultadoBusqueda {
  idProducto: number;
  nombre: string;
  marca: string;
  linea: string | null;
  categoria: string;
  subcategoria: string;
  precioDesde: number | null;
  tieneColor: boolean;
  disponibilidad: 'disponible' | 'agotado';
  idImagenPrincipal: number | null;
  esCombo: boolean;
  compraBloqueada: boolean;
  oferta: OfertaListado | null;
  /** true si el patrocinio de una campaña de M14 lo adelantó (se pinta la etiqueta «Patrocinado»). */
  patrocinado: boolean;
  /** La campaña que lo adelantó, para medir; null si `patrocinado` es false. */
  idCampania: number | null;
  /** Fondo de la imagen; null si el producto no se vende con color. */
  colorMuestra: ColorMuestra | null;
  /** Cuántos colores ofrece; 0 si no se vende con color. */
  totalColores: number;
  coincidenciaColor: string | null;
}

export interface ColorBuscado {
  idColor: number;
  nombre: string;
  codigo: string | null;
  hexadecimal: string;
  marca: string;
  familia: string | null;
}

export interface BusquedaSinResultado {
  termino: string;
  repeticiones: number;
  ultimoIntento: string;
}

export interface PaginacionBusqueda {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface PaginaBusqueda<T> {
  items: T[];
  paginacion: PaginacionBusqueda;
}
