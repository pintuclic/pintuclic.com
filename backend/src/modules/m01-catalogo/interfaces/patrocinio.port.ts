/**
 * Lo que M01 pide a M14 (patrocinios). `PatrocinioService` de M14 cumple esta forma sin que M01 importe nada de M14.
 * Solo se usa para ordenar los complementarios de la ficha (contrato M14 · A7, R12).
 */
export interface PrioridadProductoPort {
  idProducto: number;
  prioridad: number;
  idCampania: number;
}

export interface PatrocinioPort {
  /** Los productos de campañas vigentes en esa ubicación, con su prioridad. */
  prioridadesDeProductos(ubicacion: 'complementarios'): Promise<PrioridadProductoPort[]>;
}
