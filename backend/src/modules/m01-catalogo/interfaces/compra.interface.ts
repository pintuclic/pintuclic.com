/** Lo que el catálogo guarda de una variante y necesita saber la compra (P1–P5). */
export interface FilaVarianteCompra {
  idVariante: number;
  idProducto: number;
  esCombo: boolean;
  excluidoDeDescuentos: boolean;
  varianteActiva: boolean;
  /** Producto activo, publicado y con toda su cadena activa (la misma regla de la vitrina). */
  productoVisible: boolean;
  nombreProducto: string;
  marca: string;
  medida: string;
  sku: string;
  precioBase: number;
  existenciaReferencial: number;
  idImagenPrincipal: number | null;
}

export interface FilaColorCompra {
  idColor: number;
  nombre: string;
  codigo: string | null;
  hexadecimal: string;
  /** El producto lo ofrece (carta de un entonable o color de fábrica) y el color está activo (P2). */
  ofrecidoPorElProducto: boolean;
}

export interface CompraRepositoryPort {
  variantes(idsVariante: readonly number[]): Promise<FilaVarianteCompra[]>;
  /** Un resultado por cada par pedido (en el mismo orden); null si el color no existe. */
  colores(pares: ReadonlyArray<{ idProducto: number; idColor: number }>): Promise<Array<FilaColorCompra | null>>;
}
