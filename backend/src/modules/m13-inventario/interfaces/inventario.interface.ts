import type {
  AjusteInventario,
  ItemInventario,
  ListarHistorialRequest,
  ListarInventarioRequest,
  MotivoAjuste,
  OrigenAjuste,
  ResumenInventario,
} from '../dtos/m13-inventario.dto';

export interface Pagina<T> {
  items: T[];
  total: number;
}

/** Variante tal como la necesita la carga masiva para identificarla (R5). */
export interface VarianteBuscable {
  idVariante: number;
  sku: string;
  marca: string;
  producto: string;
  medida: string;
  existenciaReferencial: number;
}

export interface DatosAjuste {
  existencia: number;
  /** R4: si viene y no coincide con la existencia vigente, no se escribe nada. */
  existenciaEsperada?: number;
  motivo: MotivoAjuste;
  nota?: string;
  origen: OrigenAjuste;
  idUsuario: number;
}

/** Resultado de ajustar una variante; la transacción ya terminó cuando se devuelve. */
export type ResultadoAjuste =
  | { tipo: 'no_existe' }
  | { tipo: 'conflicto'; existenciaActual: number }
  | { tipo: 'sin_cambios' }
  | { tipo: 'modificada'; idAjuste: number };

export interface CambioCarga {
  idVariante: number;
  existencia: number;
  nota?: string;
}

/** Existencia que había realmente al bloquear la fila dentro de la transacción de la carga. */
export interface CambioAplicado {
  idVariante: number;
  existenciaAnterior: number;
  modificada: boolean;
}

export interface FiltroPlantilla {
  idMarca?: number;
  incluirInactivas: boolean;
}

export interface FilaPlantilla {
  marca: string;
  producto: string;
  medida: string;
  sku: string;
  existenciaReferencial: number;
}

/** Acceso a datos de M13: solo lee variantes y escribe `existencia_referencial` + su historial. */
export interface InventarioRepositoryPort {
  resumen(): Promise<ResumenInventario>;
  listar(filtro: ListarInventarioRequest): Promise<Pagina<ItemInventario>>;
  obtener(idVariante: number): Promise<ItemInventario | null>;
  historial(filtro: ListarHistorialRequest): Promise<Pagina<AjusteInventario>>;
  obtenerAjuste(idAjuste: number): Promise<AjusteInventario | null>;
  ajustar(idVariante: number, datos: DatosAjuste): Promise<ResultadoAjuste>;
  /** Todas las variantes (también inactivas, R11), para identificar las filas de una carga. */
  variantesBuscables(): Promise<VarianteBuscable[]>;
  /** R7: aplica el bloque completo en una transacción o no aplica nada. */
  aplicarCarga(cambios: readonly CambioCarga[], idCarga: string, idUsuario: number): Promise<CambioAplicado[]>;
  contarParaPlantilla(filtro: FiltroPlantilla): Promise<number>;
  filasParaPlantilla(filtro: FiltroPlantilla): Promise<FilaPlantilla[]>;
}
