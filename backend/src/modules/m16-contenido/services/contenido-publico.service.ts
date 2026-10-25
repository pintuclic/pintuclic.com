import {
  normalizarSlugPagina,
  type FaqPublicaItem,
  type PaginaPublicaDetalle,
  type PaginaPublicaResumen,
} from '../dtos/m16-contenido.dto';
import type { ContenidoFaqPort } from '../interfaces/contenido-faq.port';
import type {
  FaqRepositoryPort,
  PaginasRepositoryPort,
} from '../interfaces/contenido.interface';
import { ContenidoError } from './contenido-error';

/**
 * Servicio público de Contenido Institucional y Centro de Ayuda (HU-CON-03, HU-CON-04).
 * Implementa `ContenidoFaqPort` para consumo desacoplado desde M15 (Atención al Cliente).
 */
export class ContenidoPublicoService implements ContenidoFaqPort {
  constructor(
    private readonly paginasRepo: PaginasRepositoryPort,
    private readonly faqRepo: FaqRepositoryPort,
  ) {}

  async listarPaginasPublicas(): Promise<PaginaPublicaResumen[]> {
    return this.paginasRepo.listarPublicadas();
  }

  async obtenerPaginaPublicaPorSlug(slugCrudo: string): Promise<PaginaPublicaDetalle> {
    const slugNormalizado = normalizarSlugPagina(slugCrudo);
    if (!slugNormalizado) {
      throw ContenidoError.noDisponible();
    }

    const pagina = await this.paginasRepo.obtenerPublicadaPorSlug(slugNormalizado);
    if (!pagina) {
      // R2 / ADR-003: página inexistente, en borrador o archivada responde 404 opaco indistinguible.
      throw ContenidoError.noDisponible();
    }
    return pagina;
  }

  async listarFaqPublicas(): Promise<FaqPublicaItem[]> {
    return this.faqRepo.listarActivas();
  }
}
