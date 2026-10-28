import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { ContenidoAdminController } from './controllers/contenido-admin.controller';
import { ContenidoPublicoController } from './controllers/contenido-publico.controller';
import { PERMISOS_CONTENIDO } from './dtos/m16-contenido.dto';
import type { ContenidoFaqPort } from './interfaces/contenido-faq.port';
import type {
  ContactoRepositoryPort,
  FaqRepositoryPort,
  PaginasRepositoryPort,
} from './interfaces/contenido.interface';
import { ContactoRepository } from './repositories/contacto.repository';
import { FaqRepository } from './repositories/faq.repository';
import { PaginasRepository } from './repositories/paginas.repository';
import { ContenidoAdminService } from './services/contenido-admin.service';
import { ContenidoPublicoService } from './services/contenido-publico.service';

export interface DependenciasM16 {
  paginasRepo?: PaginasRepositoryPort;
  faqRepo?: FaqRepositoryPort;
  contactoRepo?: ContactoRepositoryPort;
}

export interface ModuloM16 {
  /** Montar en `/api/v1/admin/contenido` detrás de sesión vigente. */
  adminRouter: Router;
  /** Montar en `/api/v1/contenido` (consulta pública sin sesión). */
  publicRouter: Router;
  /** Servicio público y puerto `ContenidoFaqPort` hacia M15 (Atención al Cliente). */
  contenidoPublicoService: ContenidoPublicoService;
  faqPort: ContenidoFaqPort;
  contenidoAdminService: ContenidoAdminService;
}

export function construirModuloM16(
  autorizacion: AutorizacionService,
  deps: DependenciasM16 = {},
): ModuloM16 {
  const puedeVer = requirePermission(
    autorizacion,
    PERMISOS_CONTENIDO.ver,
  ) as RequestHandler;
  const puedeEditar = requirePermission(
    autorizacion,
    PERMISOS_CONTENIDO.editar,
  ) as RequestHandler;

  const paginasRepo = deps.paginasRepo ?? new PaginasRepository();
  const faqRepo = deps.faqRepo ?? new FaqRepository();
  const contactoRepo = deps.contactoRepo ?? new ContactoRepository();

  const contenidoPublicoService = new ContenidoPublicoService(paginasRepo, faqRepo, contactoRepo);
  const contenidoAdminService = new ContenidoAdminService(paginasRepo, faqRepo, contactoRepo);

  const publicoController = new ContenidoPublicoController(contenidoPublicoService);
  const adminController = new ContenidoAdminController(contenidoAdminService);

  /* ─── Router Administrativo (`/api/v1/admin/contenido`) ──────────────────── */
  const adminRouter = Router();

  adminRouter.get('/contacto', puedeVer, adminController.obtenerContacto);
  adminRouter.put('/contacto', puedeEditar, adminController.editarContacto);

  adminRouter.get('/paginas', puedeVer, adminController.listarPaginas);
  adminRouter.get('/paginas/:idPagina', puedeVer, adminController.obtenerPagina);
  adminRouter.post('/paginas', puedeEditar, adminController.crearPagina);
  adminRouter.put('/paginas/:idPagina', puedeEditar, adminController.editarPagina);
  adminRouter.patch(
    '/paginas/:idPagina/estado',
    puedeEditar,
    adminController.cambiarEstadoPagina,
  );

  adminRouter.get('/faq', puedeVer, adminController.listarFaq);
  adminRouter.get('/faq/:idFaq', puedeVer, adminController.obtenerFaq);
  adminRouter.post('/faq', puedeEditar, adminController.crearFaq);
  adminRouter.put('/faq/:idFaq', puedeEditar, adminController.editarFaq);
  adminRouter.patch(
    '/faq/:idFaq/estado',
    puedeEditar,
    adminController.cambiarEstadoFaq,
  );
  adminRouter.patch(
    '/faq/:idFaq/orden',
    puedeEditar,
    adminController.cambiarOrdenFaq,
  );

  /* ─── Router Público (`/api/v1/contenido`) ───────────────────────────────── */
  const publicRouter = Router();

  publicRouter.get('/contacto', publicoController.obtenerContacto);
  publicRouter.get('/paginas', publicoController.listarPaginas);
  publicRouter.get('/paginas/:slug', publicoController.obtenerPaginaPorSlug);
  publicRouter.get('/faq', publicoController.listarFaq);

  return {
    adminRouter,
    publicRouter,
    contenidoPublicoService,
    faqPort: contenidoPublicoService,
    contenidoAdminService,
  };
}
