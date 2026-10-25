/** Tipos de la capa HTTP de M13. Solo tipos: cero runtime. */

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

/** Marca tal como la devuelve el catálogo (M01); aquí solo sirve para filtrar y para la plantilla. */
export interface MarcaFiltro {
  idMarca: number;
  nombre: string;
}
