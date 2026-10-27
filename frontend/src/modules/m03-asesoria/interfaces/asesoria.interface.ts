/**
 * Tipos de M03 — Asesoría y asistencia (lo que entrega la API).
 * Espejo de `contracts/m03-asesoria.contract.ts`. Solo tipos: cero runtime.
 */

export interface ProductoCalculable {
  idProducto: number;
  nombre: string;
  marca: string;
}

export interface PresentacionCalculable {
  idVariante: number;
  presentacion: string;
  volumenGalones: number;
  /** m² que cubre una unidad de esta presentación, por mano. */
  rendimientoMin: number;
  rendimientoMax: number;
}

export interface CalculadoraProducto {
  idProducto: number;
  nombre: string;
  /** m² por galón y por mano, tal como lo registró el catálogo. */
  rendimientoMin: number;
  rendimientoMax: number;
  /** Sugerencia que la persona aplica con un clic; nunca se rellena sola (K9). */
  manosSugeridas: number | null;
  presentaciones: PresentacionCalculable[];
  advertencia: string;
}

export interface ResultadoPresentacion {
  idVariante: number;
  presentacion: string;
  minimo: number;
  maximo: number;
}

export type SentidoCalculo = 'cantidad' | 'cobertura';

export interface ResultadoCalculo {
  sentido: SentidoCalculo;
  seleccionada: ResultadoPresentacion;
  /** Solo en `cantidad`: el equivalente en las demás presentaciones. */
  equivalencias: ResultadoPresentacion[];
  advertencia: string;
}

export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginaProductosCalculables {
  datos: ProductoCalculable[];
  paginacion: Paginacion;
}
