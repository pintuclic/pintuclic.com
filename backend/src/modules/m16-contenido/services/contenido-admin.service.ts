import {
  normalizarSlugPagina,
  SLUG_PAGINA_REGEX,
  type CambiarEstadoFaqRequest,
  type CambiarEstadoPaginaRequest,
  type CambiarOrdenFaqRequest,
  type ContactoAdminEntity,
  type CrearFaqRequest,
  type CrearPaginaRequest,
  type EditarContactoRequest,
  type EditarFaqRequest,
  type EditarPaginaRequest,
  type FaqAdminEntity,
  type FiltroFaqAdminQuery,
  type FiltroPaginasAdminQuery,
  type PaginaAdminEntity,
} from '../dtos/m16-contenido.dto';
import type {
  ContactoRepositoryPort,
  FaqRepositoryPort,
  PaginasRepositoryPort,
} from '../interfaces/contenido.interface';
import { ContenidoError } from './contenido-error';

/**
 * Servicio administrativo de Contenido Institucional y FAQ (HU-CON-01, HU-CON-02).
 */
export class ContenidoAdminService {
  constructor(
    private readonly paginasRepo: PaginasRepositoryPort,
    private readonly faqRepo: FaqRepositoryPort,
    private readonly contactoRepo: ContactoRepositoryPort,
  ) {}

  /* ─── Contacto del sitio (HU-CON-05) ─────────────────────────────────────── */

  async obtenerContacto(): Promise<ContactoAdminEntity> {
    return this.contactoRepo.obtener();
  }

  async editarContacto(datos: EditarContactoRequest, idAutor: number | null): Promise<ContactoAdminEntity> {
    return this.contactoRepo.guardar(datos, idAutor);
  }

  /* ─── Páginas Institucionales (HU-CON-01) ────────────────────────────────── */

  async listarPaginas(filtro: FiltroPaginasAdminQuery): Promise<PaginaAdminEntity[]> {
    return this.paginasRepo.listarAdmin(filtro);
  }

  async obtenerPagina(idPagina: number): Promise<PaginaAdminEntity> {
    const pagina = await this.paginasRepo.obtenerPorId(idPagina);
    if (!pagina) {
      throw ContenidoError.noDisponible();
    }
    return pagina;
  }

  async crearPagina(
    entrada: CrearPaginaRequest,
    idAutor: number | null,
  ): Promise<PaginaAdminEntity> {
    const slugNormalizado = normalizarSlugPagina(entrada.slug);
    if (slugNormalizado.length < 2 || !SLUG_PAGINA_REGEX.test(slugNormalizado)) {
      throw ContenidoError.validacion(
        'El slug normalizado no es válido. Use letras minúsculas, números y guiones.',
      );
    }

    if (await this.paginasRepo.existeSlug(slugNormalizado)) {
      throw ContenidoError.slugDuplicado(slugNormalizado);
    }

    return this.paginasRepo.crear({
      slug: slugNormalizado,
      titulo: entrada.titulo.trim(),
      resumen:
        entrada.resumen !== undefined && entrada.resumen !== null && entrada.resumen.trim().length > 0
          ? entrada.resumen.trim()
          : null,
      cuerpoMarkdown: entrada.cuerpoMarkdown.trim(),
      estado: entrada.estado,
      idAutor,
    });
  }

  async editarPagina(
    idPagina: number,
    entrada: EditarPaginaRequest,
    idAutor: number | null,
  ): Promise<PaginaAdminEntity> {
    const actual = await this.paginasRepo.obtenerPorId(idPagina);
    if (!actual) {
      throw ContenidoError.noDisponible();
    }

    let slugActualizado: string | undefined;
    if (entrada.slug !== undefined) {
      slugActualizado = normalizarSlugPagina(entrada.slug);
      if (slugActualizado.length < 2 || !SLUG_PAGINA_REGEX.test(slugActualizado)) {
        throw ContenidoError.validacion(
          'El slug normalizado no es válido. Use letras minúsculas, números y guiones.',
        );
      }
      if (await this.paginasRepo.existeSlug(slugActualizado, idPagina)) {
        throw ContenidoError.slugDuplicado(slugActualizado);
      }
    }

    return this.paginasRepo.editar(idPagina, {
      ...(slugActualizado !== undefined ? { slug: slugActualizado } : {}),
      ...(entrada.titulo !== undefined ? { titulo: entrada.titulo.trim() } : {}),
      ...(entrada.resumen !== undefined
        ? {
            resumen:
              entrada.resumen !== null && entrada.resumen.trim().length > 0
                ? entrada.resumen.trim()
                : null,
          }
        : {}),
      ...(entrada.cuerpoMarkdown !== undefined
        ? { cuerpoMarkdown: entrada.cuerpoMarkdown.trim() }
        : {}),
      idAutor,
    });
  }

  async cambiarEstadoPagina(
    idPagina: number,
    entrada: CambiarEstadoPaginaRequest,
    idAutor: number | null,
  ): Promise<PaginaAdminEntity> {
    const actual = await this.paginasRepo.obtenerPorId(idPagina);
    if (!actual) {
      throw ContenidoError.noDisponible();
    }

    return this.paginasRepo.cambiarEstado(idPagina, entrada.estado, idAutor);
  }

  /* ─── Preguntas Frecuentes / FAQ (HU-CON-02) ─────────────────────────────── */

  async listarFaq(filtro: FiltroFaqAdminQuery): Promise<FaqAdminEntity[]> {
    return this.faqRepo.listarAdmin(filtro);
  }

  async obtenerFaq(idFaq: number): Promise<FaqAdminEntity> {
    const faq = await this.faqRepo.obtenerPorId(idFaq);
    if (!faq) {
      throw ContenidoError.noDisponible();
    }
    return faq;
  }

  async crearFaq(
    entrada: CrearFaqRequest,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    return this.faqRepo.crear({
      pregunta: entrada.pregunta.trim(),
      respuestaMarkdown: entrada.respuestaMarkdown.trim(),
      orden: entrada.orden,
      estado: entrada.estado,
      idAutor,
    });
  }

  async editarFaq(
    idFaq: number,
    entrada: EditarFaqRequest,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const actual = await this.faqRepo.obtenerPorId(idFaq);
    if (!actual) {
      throw ContenidoError.noDisponible();
    }

    return this.faqRepo.editar(idFaq, {
      ...(entrada.pregunta !== undefined ? { pregunta: entrada.pregunta.trim() } : {}),
      ...(entrada.respuestaMarkdown !== undefined
        ? { respuestaMarkdown: entrada.respuestaMarkdown.trim() }
        : {}),
      ...(entrada.orden !== undefined ? { orden: entrada.orden } : {}),
      idAutor,
    });
  }

  async cambiarEstadoFaq(
    idFaq: number,
    entrada: CambiarEstadoFaqRequest,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const actual = await this.faqRepo.obtenerPorId(idFaq);
    if (!actual) {
      throw ContenidoError.noDisponible();
    }

    return this.faqRepo.cambiarEstado(idFaq, entrada.estado, idAutor);
  }

  async cambiarOrdenFaq(
    idFaq: number,
    entrada: CambiarOrdenFaqRequest,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const actual = await this.faqRepo.obtenerPorId(idFaq);
    if (!actual) {
      throw ContenidoError.noDisponible();
    }

    return this.faqRepo.cambiarOrden(idFaq, entrada.orden, idAutor);
  }
}
