/** Tipos de la capa HTTP de M06. Solo tipos: cero runtime. */

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

/** Consulta de listado con filtros opcionales; las claves sin valor no se envían. */
export type ParametrosConsulta = Record<string, string | number | boolean | undefined>;
