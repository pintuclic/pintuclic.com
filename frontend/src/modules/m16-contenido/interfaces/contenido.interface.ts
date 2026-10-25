/**
 * Tipos de dominio del módulo M16 Contenido Institucional y Centro de Ayuda (Frontend).
 * Regla de arquitectura: este archivo contiene exclusivamente tipos (0 bytes en runtime).
 */

export type EstadoPaginaContenido = 'borrador' | 'publicado' | 'archivado';

export type EstadoFaq = 'activo' | 'inactivo';

export interface PaginaPublicaResumen {
  slug: string;
  titulo: string;
  resumen: string | null;
  fechaActualizacion: string;
}

export interface PaginaPublicaDetalle {
  slug: string;
  titulo: string;
  resumen: string | null;
  cuerpoMarkdown: string;
  fechaActualizacion: string;
}

export interface FaqPublicaItem {
  idFaq: number;
  pregunta: string;
  respuestaMarkdown: string;
  orden: number;
}

export interface PaginaAdminEntity {
  idPagina: number;
  slug: string;
  titulo: string;
  resumen: string | null;
  cuerpoMarkdown: string;
  estado: EstadoPaginaContenido;
  idAutor: number | null;
  nombreAutor: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface FaqAdminEntity {
  idFaq: number;
  pregunta: string;
  respuestaMarkdown: string;
  orden: number;
  estado: EstadoFaq;
  idAutor: number | null;
  nombreAutor: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface FiltroPaginasAdmin {
  estado?: EstadoPaginaContenido;
  busqueda?: string;
}

export interface FiltroFaqAdmin {
  estado?: EstadoFaq;
  busqueda?: string;
}
