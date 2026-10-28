import {
  responderExito,
  responderRecursoNoDisponible,
} from '../../../core/utils/apiResponse';
import {
  cambiarEstadoFaqRequestSchema,
  cambiarEstadoPaginaRequestSchema,
  cambiarOrdenFaqRequestSchema,
  crearFaqRequestSchema,
  editarContactoRequestSchema,
  crearPaginaRequestSchema,
  editarFaqRequestSchema,
  editarPaginaRequestSchema,
  filtroFaqAdminQuerySchema,
  filtroPaginasAdminQuerySchema,
} from '../dtos/m16-contenido.dto';
import type { ContenidoAdminService } from '../services/contenido-admin.service';
import {
  leerIdParametro,
  manejarContenido,
  validarEsquema,
} from './contenido-http';

/**
 * Controlador administrativo de Contenido Institucional y FAQ (HU-CON-01, HU-CON-02).
 * Protegido detrás de sesión vigente y permisos de M17 (`configuracion.ver` / `configuracion.editar`).
 */
export class ContenidoAdminController {
  constructor(private readonly servicio: ContenidoAdminService) {}

  /* ─── Contacto del sitio (HU-CON-05) ─────────────────────────────────────── */

  obtenerContacto = manejarContenido(async (_req, res) => {
    responderExito(res, await this.servicio.obtenerContacto());
  });

  editarContacto = manejarContenido(async (req, res) => {
    const cuerpo = validarEsquema(res, editarContactoRequestSchema, req.body);
    if (cuerpo === null) return;
    responderExito(res, await this.servicio.editarContacto(cuerpo, req.actor?.idUsuario ?? null));
  });

  /* ─── Páginas Institucionales (HU-CON-01) ────────────────────────────────── */

  listarPaginas = manejarContenido(async (req, res) => {
    const filtro = validarEsquema(res, filtroPaginasAdminQuerySchema, req.query);
    if (filtro === null) return;
    responderExito(res, await this.servicio.listarPaginas(filtro));
  });

  obtenerPagina = manejarContenido(async (req, res) => {
    const idPagina = leerIdParametro(req, 'idPagina');
    if (idPagina === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, await this.servicio.obtenerPagina(idPagina));
  });

  crearPagina = manejarContenido(async (req, res) => {
    const cuerpo = validarEsquema(res, crearPaginaRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const creada = await this.servicio.crearPagina(cuerpo, idAutor);
    responderExito(res, creada, undefined, 201);
  });

  editarPagina = manejarContenido(async (req, res) => {
    const idPagina = leerIdParametro(req, 'idPagina');
    if (idPagina === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    const cuerpo = validarEsquema(res, editarPaginaRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const actualizada = await this.servicio.editarPagina(idPagina, cuerpo, idAutor);
    responderExito(res, actualizada);
  });

  cambiarEstadoPagina = manejarContenido(async (req, res) => {
    const idPagina = leerIdParametro(req, 'idPagina');
    if (idPagina === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    const cuerpo = validarEsquema(res, cambiarEstadoPaginaRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const actualizada = await this.servicio.cambiarEstadoPagina(
      idPagina,
      cuerpo,
      idAutor,
    );
    responderExito(res, actualizada);
  });

  /* ─── Preguntas Frecuentes / FAQ (HU-CON-02) ─────────────────────────────── */

  listarFaq = manejarContenido(async (req, res) => {
    const filtro = validarEsquema(res, filtroFaqAdminQuerySchema, req.query);
    if (filtro === null) return;
    responderExito(res, await this.servicio.listarFaq(filtro));
  });

  obtenerFaq = manejarContenido(async (req, res) => {
    const idFaq = leerIdParametro(req, 'idFaq');
    if (idFaq === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, await this.servicio.obtenerFaq(idFaq));
  });

  crearFaq = manejarContenido(async (req, res) => {
    const cuerpo = validarEsquema(res, crearFaqRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const creada = await this.servicio.crearFaq(cuerpo, idAutor);
    responderExito(res, creada, undefined, 201);
  });

  editarFaq = manejarContenido(async (req, res) => {
    const idFaq = leerIdParametro(req, 'idFaq');
    if (idFaq === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    const cuerpo = validarEsquema(res, editarFaqRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const actualizada = await this.servicio.editarFaq(idFaq, cuerpo, idAutor);
    responderExito(res, actualizada);
  });

  cambiarEstadoFaq = manejarContenido(async (req, res) => {
    const idFaq = leerIdParametro(req, 'idFaq');
    if (idFaq === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    const cuerpo = validarEsquema(res, cambiarEstadoFaqRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const actualizada = await this.servicio.cambiarEstadoFaq(idFaq, cuerpo, idAutor);
    responderExito(res, actualizada);
  });

  cambiarOrdenFaq = manejarContenido(async (req, res) => {
    const idFaq = leerIdParametro(req, 'idFaq');
    if (idFaq === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    const cuerpo = validarEsquema(res, cambiarOrdenFaqRequestSchema, req.body);
    if (cuerpo === null) return;
    const idAutor = req.actor?.idUsuario ?? null;
    const actualizada = await this.servicio.cambiarOrdenFaq(idFaq, cuerpo, idAutor);
    responderExito(res, actualizada);
  });
}
