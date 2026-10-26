/**
 * Ofertas de los eventos de M06 (HU de precios). M01 solo las pide para pintar la etiqueta y el precio tachado
 * (tarjetas, ficha, pestaña Promociones) y para avisar del impacto al desactivar. `PreciosService`,
 * `ImpactoReglasService` de M06 cumplen estas formas sin que M01 importe nada de M06.
 */
export interface OfertaPort {
  nombre: string;
  porcentaje: number;
  precioAntes: number;
  precioConOferta: number;
}

export interface OfertaProductoPort {
  idProducto: number;
  oferta: OfertaPort | null;
}

export interface OfertaVariantePort {
  idVariante: number;
  oferta: OfertaPort | null;
}

export interface OfertasPort {
  /** Ids de los productos que hoy tienen oferta (filtro `enOferta`). */
  idsProductosEnOferta(): Promise<number[]>;
  /** Hasta 100 productos (una página de tarjetas); una respuesta por producto, en el mismo orden. */
  ofertasDeProductos(idsProducto: readonly number[]): Promise<OfertaProductoPort[]>;
  /** Una respuesta por consulta, en el mismo orden. Con `idColor` se aplican también las excepciones por color. */
  preciosDeVariantes(
    consultas: ReadonlyArray<{ idVariante: number; idColor?: number | null }>,
  ): Promise<OfertaVariantePort[]>;
}

export interface ObjetivoReglaPort {
  tipo: 'marca' | 'linea' | 'categoria' | 'subcategoria' | 'producto' | 'variante';
  id: number;
}

/** Cuántos eventos de M06 (en curso o programados) apuntan a esos objetivos (R de impacto, HU-CAT-11). */
export interface ImpactoReglasPort {
  contarEventosVigentes(objetivos: readonly ObjetivoReglaPort[]): Promise<number>;
}
