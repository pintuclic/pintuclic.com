import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { ConfiguracionAtencionController } from './controllers/configuracion.controller';
import { ContactoController } from './controllers/contacto.controller';
import { FaqsController } from './controllers/faqs.controller';
import { PrismaConfiguracionAtencionRepository } from './repositories/configuracion.repository';
import { PrismaContactoRepository } from './repositories/contacto.repository';
import { PrismaFaqsRepository } from './repositories/faqs.repository';
import { ConfiguracionAtencionService } from './services/configuracion.service';
import { ContactoService } from './services/contacto.service';
import { FaqsService } from './services/faqs.service';

/**
 * M15 — Atención al cliente. Dos routers, como M01:
 *  · `publicRouter`, montado en /atencion: FAQ, horario y canal son públicos, y
 *    POST /contacto exige sesión (la aplica app.routes.ts con exigirSesionSalvo).
 *  · `adminRouter`, montado en /admin/atencion: todo exige sesión y permiso.
 */
export function construirModuloM15(autorizacion: AutorizacionService): {
  publicRouter: Router;
  adminRouter: Router;
  faqsService: FaqsService;
  contactoService: ContactoService;
  configuracionService: ConfiguracionAtencionService;
} {
  const faqsRepo = new PrismaFaqsRepository();
  const contactoRepo = new PrismaContactoRepository();
  const configuracionRepo = new PrismaConfiguracionAtencionRepository();

  const faqsService = new FaqsService(faqsRepo);
  const contactoService = new ContactoService(contactoRepo, configuracionRepo);
  const configuracionService = new ConfiguracionAtencionService(configuracionRepo);

  const faqs = new FaqsController(faqsService);
  const contacto = new ContactoController(contactoService);
  const configuracion = new ConfiguracionAtencionController(configuracionService);

  const publicRouter = Router();
  publicRouter.get('/faqs', faqs.listarPublicas as RequestHandler);
  publicRouter.get('/horario', configuracion.obtenerHorario as RequestHandler);
  publicRouter.get('/whatsapp', configuracion.obtenerCanalPublico as RequestHandler);
  publicRouter.post('/contacto', contacto.crear as RequestHandler);

  const adminRouter = Router();
  const puedeVer = requirePermission(autorizacion, 'atencion.ver') as RequestHandler;
  const puedeEditar = requirePermission(autorizacion, 'atencion.editar') as RequestHandler;

  adminRouter.get('/faqs', puedeVer, faqs.listarAdmin as RequestHandler);
  adminRouter.post('/faqs', puedeEditar, faqs.crear as RequestHandler);
  // `/faqs/orden` va ANTES de `/faqs/:idPregunta`: al revés, el parámetro capturaría "orden".
  adminRouter.put('/faqs/orden', puedeEditar, faqs.reordenar as RequestHandler);
  adminRouter.put('/faqs/:idPregunta', puedeEditar, faqs.editar as RequestHandler);
  adminRouter.delete('/faqs/:idPregunta', puedeEditar, faqs.eliminar as RequestHandler);
  adminRouter.patch('/faqs/:idPregunta/activar', puedeEditar, faqs.activar as RequestHandler);
  adminRouter.patch('/faqs/:idPregunta/desactivar', puedeEditar, faqs.desactivar as RequestHandler);

  adminRouter.get('/solicitudes-contacto', puedeVer, contacto.listar as RequestHandler);
  adminRouter.patch(
    '/solicitudes-contacto/:idSolicitud/atender',
    puedeEditar,
    contacto.marcarAtendida as RequestHandler,
  );

  adminRouter.get('/horario', puedeVer, configuracion.obtenerHorario as RequestHandler);
  adminRouter.put('/horario', puedeEditar, configuracion.actualizarHorario as RequestHandler);
  adminRouter.get('/whatsapp', puedeVer, configuracion.obtenerWhatsapp as RequestHandler);
  adminRouter.put('/whatsapp', puedeEditar, configuracion.actualizarWhatsapp as RequestHandler);

  return { publicRouter, adminRouter, faqsService, contactoService, configuracionService };
}
