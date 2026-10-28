import {
  responderExito,
  responderRecursoNoDisponible,
} from '../../../core/utils/apiResponse';
import type { ContenidoPublicoService } from '../services/contenido-publico.service';
import { manejarContenido } from './contenido-http';

/**
 * Controlador público de Contenido Institucional y Centro de Ayuda (HU-CON-03, HU-CON-04).
 * Sin sesión requerida; solo devuelve contenido publicado/activo.
 */
export class ContenidoPublicoController {
  constructor(private readonly servicio: ContenidoPublicoService) {}

  listarPaginas = manejarContenido(async (_req, res) => {
    const paginas = await this.servicio.listarPaginasPublicas();
    responderExito(res, paginas);
  });

  obtenerPaginaPorSlug = manejarContenido(async (req, res) => {
    const slugCrudo = req.params['slug'];
    if (typeof slugCrudo !== 'string' || slugCrudo.trim().length === 0) {
      responderRecursoNoDisponible(res);
      return;
    }

    const pagina = await this.servicio.obtenerPaginaPublicaPorSlug(slugCrudo);
    responderExito(res, pagina);
  });

  listarFaq = manejarContenido(async (_req, res) => {
    const items = await this.servicio.listarFaqPublicas();
    responderExito(res, items);
  });
}
