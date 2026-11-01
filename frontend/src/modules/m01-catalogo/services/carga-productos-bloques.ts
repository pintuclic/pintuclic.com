import {
  MAXIMO_FILAS_BLOQUE_PRODUCTOS,
  type BalanceCargaProductos,
  type FilaProductoCarga,
  type ProductoCarga,
} from '../dtos/m01-catalogo-carga-masiva.dto';

const normal = (t: string): string => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** C2: marca + producto, sin tildes ni mayúsculas. */
export const claveDeProducto = (f: Pick<FilaProductoCarga, 'marca' | 'producto'>): string => `${normal(f.marca)}|${normal(f.producto)}`;

export interface Bloques {
  bloques: FilaProductoCarga[][];
  /** C8: un producto con más filas que el bloque no se envía; se rechaza aquí mismo. */
  demasiadoGrandes: ProductoCarga[];
}

/**
 * C8: bloques de hasta 500 filas que NUNCA parten un producto. Se conserva el orden en que aparecen los productos.
 */
export function dividirEnBloquesDeProductos(
  filas: readonly FilaProductoCarga[],
  maximo: number = MAXIMO_FILAS_BLOQUE_PRODUCTOS,
): Bloques {
  const grupos = new Map<string, FilaProductoCarga[]>();
  for (const fila of filas) {
    const clave = claveDeProducto(fila);
    grupos.set(clave, [...(grupos.get(clave) ?? []), fila]);
  }
  const bloques: FilaProductoCarga[][] = [];
  const demasiadoGrandes: ProductoCarga[] = [];
  let actual: FilaProductoCarga[] = [];
  for (const grupo of grupos.values()) {
    const [primera] = grupo;
    if (primera === undefined) continue;
    if (grupo.length > maximo) {
      demasiadoGrandes.push({
        marca: primera.marca,
        producto: primera.producto,
        categoria: primera.categoria,
        subcategoria: primera.subcategoria,
        linea: primera.linea,
        resultado: 'rechazado',
        motivo: 'producto_demasiado_grande',
        detalle: `El producto tiene ${grupo.length} filas y el máximo es ${maximo}.`,
        idProducto: null,
        variantes: grupo.map((f) => ({
          fila: f.fila,
          medida: f.medida,
          sku: f.sku,
          precio: f.precio,
          resultado: 'rechazada',
          motivo: 'producto_demasiado_grande',
          detalle: null,
        })),
      });
      continue;
    }
    if (actual.length + grupo.length > maximo) {
      bloques.push(actual);
      actual = [];
    }
    actual = [...actual, ...grupo];
  }
  if (actual.length > 0) bloques.push(actual);
  return { bloques, demasiadoGrandes };
}

/** El balance de toda la carga, recalculado a partir de los productos de todos los bloques. */
export function calcularBalance(productos: readonly ProductoCarga[]): BalanceCargaProductos {
  const variantes = productos.flatMap((p) => p.variantes);
  const nuevo = (p: ProductoCarga): boolean => p.resultado === 'por_crear' || p.resultado === 'creado';
  return {
    productos: productos.length,
    productosNuevos: productos.filter(nuevo).length,
    productosYaExisten: productos.filter((p) => p.resultado === 'ya_existe').length,
    productosRechazados: productos.filter((p) => p.resultado === 'rechazado').length,
    variantes: variantes.length,
    variantesNuevas: variantes.filter((v) => v.resultado !== 'rechazada').length,
    variantesRechazadas: variantes.filter((v) => v.resultado === 'rechazada').length,
  };
}

/** Un producto con algo que revisar: rechazado o que ya existía. */
export const conAlgoQueRevisar = (p: ProductoCarga): boolean => p.resultado === 'rechazado' || p.resultado === 'ya_existe';

/* ── Informe de errores ──────────────────────────────────────────────────── */

export const ENCABEZADOS_INFORME = ['Fila', 'Marca', 'Producto', 'Medida', 'Resultado', 'Motivo', 'Detalle'] as const;

/** C10: una celda que empieza así sería una fórmula para la hoja de cálculo. */
const neutralizar = (texto: string): string => (/^[=+\-@]/.test(texto) ? `'${texto}` : texto);

const ETIQUETA_RESULTADO: Record<ProductoCarga['resultado'], string> = {
  por_crear: 'Por crear',
  creado: 'Creado',
  ya_existe: 'Ya existe',
  rechazado: 'Rechazado',
};

/** Una fila por variante de cada producto rechazado o ya existente, lista para escribir en el Excel del informe. */
export function filasDelInforme(productos: readonly ProductoCarga[]): string[][] {
  return productos.filter(conAlgoQueRevisar).flatMap((p) =>
    p.variantes.map((v) =>
      [
        String(v.fila),
        p.marca,
        p.producto,
        v.medida,
        ETIQUETA_RESULTADO[p.resultado],
        v.motivo ?? p.motivo ?? '',
        v.detalle ?? p.detalle ?? '',
      ].map(neutralizar),
    ),
  );
}
