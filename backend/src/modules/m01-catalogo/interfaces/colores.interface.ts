import type { Cielab, Color, ListarColoresRequest } from '../dtos/m01-catalogo-productos.dto';
import type { Pagina, RecursoCatalogoPort } from './catalogo.interface';

/** Datos finales que el repositorio guarda al crear un color (ya normalizados por el servicio). */
export interface CrearColorDatos {
  idMarca: number;
  nombre: string;
  codigo: string | null;
  /** `#RRGGBB` en mayúsculas. */
  hexadecimal: string;
  idBase: number | null;
  idAcabado: number;
  idFamiliaColor: number | null;
  cielab: Cielab | null;
}

/** Cambios sobre un color; solo viajan los campos que cambian. La marca no cambia (C1). */
export interface EditarColorDatos {
  nombre?: string;
  codigo?: string | null;
  hexadecimal?: string;
  idBase?: number | null;
  idAcabado?: number;
  idFamiliaColor?: number | null;
  cielab?: Cielab | null;
}

/** C6: la unicidad de un color es (marca, nombre, acabado). */
export interface ClaveColor {
  idMarca: number;
  nombre: string;
  idAcabado: number;
}

export type OperacionImportacionColor =
  | { tipo: 'crear'; indice: number; datos: CrearColorDatos }
  | { tipo: 'actualizar'; indice: number; idColor: number; datos: EditarColorDatos };

export interface ColoresRepositoryPort
  extends RecursoCatalogoPort<Color, CrearColorDatos, EditarColorDatos, ClaveColor> {
  listar(query: ListarColoresRequest): Promise<Pagina<Color>>;
  /** C6: el código es único por marca cuando existe. */
  existeCodigo(idMarca: number, codigo: string, excluirId?: number): Promise<boolean>;
  buscarPorClave(clave: ClaveColor): Promise<Color | null>;
  buscarPorCodigo(idMarca: number, codigo: string): Promise<Color | null>;
  /** C8: aplica un bloque completo en una sola transacción; devuelve el id resultante por índice de fila. */
  aplicarImportacion(operaciones: readonly OperacionImportacionColor[]): Promise<Map<number, number>>;
}
