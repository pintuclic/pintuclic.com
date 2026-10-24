/** Tipos de la capa HTTP de M01. Solo tipos: cero runtime. */

export interface PaginacionApi {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface PaginaApi<T> {
  items: T[];
  paginacion: PaginacionApi;
}

/** Respuesta de la carta de colores: paginada y con las familias presentes (U4). */
export interface PaginaColoresApi<T, F> extends PaginaApi<T> {
  familias: F[];
}

/** Consulta de listado con filtros opcionales; las claves sin valor no se envían. */
export type ParametrosConsulta = Record<string, string | number | boolean | undefined>;

/** Fila de importación leída de un CSV o de texto pegado, antes de validarla (C8). */
export interface FilaImportacionBorrador {
  nombre: string;
  codigo: string;
  hexadecimal: string;
  base: string;
  acabado: string;
  familia: string;
}
