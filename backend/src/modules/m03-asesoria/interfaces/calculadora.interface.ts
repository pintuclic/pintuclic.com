import type { ProductoCalculable } from '../dtos/m03-asesoria.dto';

/**
 * Contratos de datos de la calculadora (M03 · HU-ASE-02). Solo tipos: cero runtime.
 *
 * Los decimales viajan como TEXTO, no como `number`: la aritmética de la calculadora es
 * exacta (M03 · K5) y convertirlos a coma flotante aquí arruinaría el cálculo antes de
 * empezar. `Decimal.toString()` de Prisma da la representación exacta de lo guardado.
 */

/** Una presentación con volumen, tal como sale de la base. */
export interface PresentacionCruda {
  idVariante: number;
  /** Nombre de la medida: «1 galón», «1/4 de galón», «300 ml»… */
  presentacion: string;
  /** `medida.valor` */
  valorTexto: string;
  /** `tipo_medida.equivalencia_galones`; nunca nulo aquí, el filtro de K1 lo exige. */
  equivalenciaGalonesTexto: string;
}

/** Lo que hace falta para calcular con un producto (M03 · K1). */
export interface ProductoConRendimiento {
  idProducto: number;
  nombre: string;
  marca: string;
  /** m² por galón y por mano (`ficha_recubrimiento.rendimiento_min` / `_max`). */
  rendimientoMinTexto: string;
  rendimientoMaxTexto: string;
  /** `ficha_recubrimiento.manos`: la sugerencia de K9, si el fabricante la declaró. */
  manosFicha: number | null;
  presentaciones: PresentacionCruda[];
}

export interface PaginaProductosCalculables {
  datos: ProductoCalculable[];
  total: number;
}

export interface CalculadoraRepositoryPort {
  /**
   * Productos que OFRECEN calculadora (K1): visibles al público, con rendimiento mínimo y
   * máximo registrados y con al menos una presentación de volumen activa.
   */
  listarCalculables(args: {
    q?: string;
    pagina: number;
    limite: number;
  }): Promise<PaginaProductosCalculables>;

  /** `null` cuando el producto no existe, no es visible o no cumple K1. */
  obtenerConRendimiento(idProducto: number): Promise<ProductoConRendimiento | null>;
}

/** Lo que la calculadora necesita de la configuración de M03 (K9). */
export interface ConfiguracionCalculadoraPort {
  obtenerManosPorDefecto(): Promise<number | null>;
}
