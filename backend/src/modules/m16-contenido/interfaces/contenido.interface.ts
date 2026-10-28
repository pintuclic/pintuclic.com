import type {
  ContactoAdminEntity,
  EditarContactoRequest,
  CrearFaqRequest,
  CrearPaginaRequest,
  EditarFaqRequest,
  EditarPaginaRequest,
  EstadoFaq,
  EstadoPaginaContenido,
  FaqAdminEntity,
  FaqPublicaItem,
  FiltroFaqAdminQuery,
  FiltroPaginasAdminQuery,
  PaginaAdminEntity,
  PaginaPublicaDetalle,
  PaginaPublicaResumen,
} from '../dtos/m16-contenido.dto';

/**
 * Contratos de persistencia internos del módulo M16.
 * Regla de arquitectura: este archivo contiene exclusivamente tipos (0 bytes en runtime).
 */

export interface CrearPaginaDatos extends CrearPaginaRequest {
  idAutor: number | null;
}

export interface EditarPaginaDatos extends EditarPaginaRequest {
  idAutor: number | null;
}

export interface CrearFaqDatos extends CrearFaqRequest {
  idAutor: number | null;
}

export interface EditarFaqDatos extends EditarFaqRequest {
  idAutor: number | null;
}

export interface PaginasRepositoryPort {
  listarPublicadas(): Promise<PaginaPublicaResumen[]>;
  obtenerPublicadaPorSlug(slug: string): Promise<PaginaPublicaDetalle | null>;
  listarAdmin(filtro: FiltroPaginasAdminQuery): Promise<PaginaAdminEntity[]>;
  obtenerPorId(idPagina: number): Promise<PaginaAdminEntity | null>;
  existeSlug(slug: string, excluirIdPagina?: number): Promise<boolean>;
  crear(datos: CrearPaginaDatos): Promise<PaginaAdminEntity>;
  editar(idPagina: number, datos: EditarPaginaDatos): Promise<PaginaAdminEntity>;
  cambiarEstado(
    idPagina: number,
    estado: EstadoPaginaContenido,
    idAutor: number | null,
  ): Promise<PaginaAdminEntity>;
}

export interface FaqRepositoryPort {
  listarActivas(): Promise<FaqPublicaItem[]>;
  listarAdmin(filtro: FiltroFaqAdminQuery): Promise<FaqAdminEntity[]>;
  obtenerPorId(idFaq: number): Promise<FaqAdminEntity | null>;
  crear(datos: CrearFaqDatos): Promise<FaqAdminEntity>;
  editar(idFaq: number, datos: EditarFaqDatos): Promise<FaqAdminEntity>;
  cambiarEstado(
    idFaq: number,
    estado: EstadoFaq,
    idAutor: number | null,
  ): Promise<FaqAdminEntity>;
  cambiarOrden(
    idFaq: number,
    orden: number,
    idAutor: number | null,
  ): Promise<FaqAdminEntity>;
}

export interface ContactoRepositoryPort {
  /** La ficha única de contacto; si nunca se editó, todos sus campos vienen en `null`. */
  obtener(): Promise<ContactoAdminEntity>;
  guardar(datos: EditarContactoRequest, idAutor: number | null): Promise<ContactoAdminEntity>;
}
