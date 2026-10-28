import {
  normalizarSlugPagina,
  type ContactoPublico,
  type FaqPublicaItem,
  type PaginaPublicaDetalle,
  type PaginaPublicaResumen,
} from '../dtos/m16-contenido.dto';
import type { ContenidoFaqPort } from '../interfaces/contenido-faq.port';
import type {
  ContactoRepositoryPort,
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
    private readonly contactoRepo: ContactoRepositoryPort | null = null,
  ) {}

  /** HU-CON-05 · R9: la ficha de contacto del pie de página, sin los datos de quién la editó (R4). */
  async obtenerContactoPublico(): Promise<ContactoPublico> {
    const c = await (this.contactoRepo?.obtener() ?? Promise.resolve(null));
    return {
      direccion: c?.direccion ?? null,
      telefono: c?.telefono ?? null,
      correo: c?.correo ?? null,
      facebook: c?.facebook ?? null,
      instagram: c?.instagram ?? null,
      youtube: c?.youtube ?? null,
      tiktok: c?.tiktok ?? null,
    };
  }

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
