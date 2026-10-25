import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { ConfiguracionAtencionController } from './controllers/configuracion.controller';
import { ContactoController } from './controllers/contacto.controller';
import { PrismaConfiguracionAtencionRepository } from './repositories/configuracion.repository';
import { PrismaContactoRepository } from './repositories/contacto.repository';
import { ConfiguracionAtencionService } from './services/configuracion.service';
import { ContactoService } from './services/contacto.service';

/**
 * M15 — Atención al cliente. Dos routers, como M01 y M16:
 *  · `publicRouter`, montado en /atencion: el horario y el canal son públicos, y
 *    POST /contacto exige sesión (la aplica app.routes.ts con exigirSesionSalvo).
 *  · `adminRouter`, montado en /admin/atencion: todo exige sesión y permiso.
 *
 * Las preguntas frecuentes NO están aquí: son de M16 (HU-CON-02 / HU-CON-04),
 * que las sirve en /contenido/faq y las expone por `ContenidoFaqPort`.
 */
export function construirModuloM15(autorizacion: AutorizacionService): {
  publicRouter: Router;
  adminRouter: Router;
  contactoService: ContactoService;
  configuracionService: ConfiguracionAtencionService;
} {
  const contactoRepo = new PrismaContactoRepository();
  const configuracionRepo = new PrismaConfiguracionAtencionRepository();

  const contactoService = new ContactoService(contactoRepo, configuracionRepo);
  const configuracionService = new ConfiguracionAtencionService(configuracionRepo);

  const contacto = new ContactoController(contactoService);
  const configuracion = new ConfiguracionAtencionController(configuracionService);

  const publicRouter = Router();
  publicRouter.get('/horario', configuracion.obtenerHorario as RequestHandler);
  publicRouter.get('/whatsapp', configuracion.obtenerCanalPublico as RequestHandler);
  publicRouter.post('/contacto', contacto.crear as RequestHandler);

  const adminRouter = Router();
  const puedeVer = requirePermission(autorizacion, 'atencion.ver') as RequestHandler;
  const puedeEditar = requirePermission(autorizacion, 'atencion.editar') as RequestHandler;

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

  return { publicRouter, adminRouter, contactoService, configuracionService };
}
