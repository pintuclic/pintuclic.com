import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { ConfiguracionAtencionController } from './controllers/configuracion.controller';
import { ContactoController } from './controllers/contacto.controller';
import { PrismaConfiguracionAtencionRepository } from './repositories/configuracion.repository';
import { PrismaContactoRepository } from './repositories/contacto.repository';
import { ConfiguracionAtencionService } from './services/configuracion.service';
import { ContactoService } from './services/contacto.service';

/**
 * Permite responder y cambiar el estado de solicitudes a empleados con
 * `atencion.atender_clientes` o con `atencion.editar` (R11 / R12).
 */
function exigirPermisoAtencionSolicitudes(autorizacion: AutorizacionService): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }

    const contexto = {
      operacionIntentada: `${req.method} ${req.path}`,
      ipOrigen: typeof req.ip === 'string' ? req.ip : null,
    };

    const puedeAtender = await autorizacion.exigirPermiso(actor, 'atencion.atender_clientes', contexto);
    if (puedeAtender) {
      next();
      return;
    }

    const puedeEditar = await autorizacion.exigirPermiso(actor, 'atencion.editar', contexto);
    if (puedeEditar) {
      next();
      return;
    }

    responderRecursoNoDisponible(res);
  };
}

/**
 * M15 — Atención al cliente. Dos routers, como M01 y M16:
 *  · `publicRouter`, montado en /atencion: el horario y el canal son públicos, y
 *    POST /contacto + /mis-solicitudes* exigen sesión (la aplica app.routes.ts con exigirSesionSalvo).
 *  · `adminRouter`, montado en /admin/atencion: todo exige sesión y permiso.
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
  publicRouter.get('/mis-solicitudes', contacto.listarMias as RequestHandler);
  publicRouter.get('/mis-solicitudes/:idSolicitud', contacto.obtenerMiaDetalle as RequestHandler);
  publicRouter.post(
    '/mis-solicitudes/:idSolicitud/mensajes',
    contacto.agregarMensajeCliente as RequestHandler,
  );
  publicRouter.patch(
    '/mis-solicitudes/:idSolicitud/calificacion',
    contacto.calificarMia as RequestHandler,
  );

  const adminRouter = Router();
  const puedeVer = requirePermission(autorizacion, 'atencion.ver') as RequestHandler;
  const puedeEditar = requirePermission(autorizacion, 'atencion.editar') as RequestHandler;
  const puedeAtender = exigirPermisoAtencionSolicitudes(autorizacion);

  adminRouter.get('/solicitudes-contacto', puedeVer, contacto.listar as RequestHandler);
  adminRouter.get(
    '/solicitudes-contacto/:idSolicitud',
    puedeVer,
    contacto.obtenerDetalle as RequestHandler,
  );
  adminRouter.post(
    '/solicitudes-contacto/:idSolicitud/mensajes',
    puedeAtender,
    contacto.agregarMensajeEquipo as RequestHandler,
  );
  adminRouter.patch(
    '/solicitudes-contacto/:idSolicitud/estado',
    puedeAtender,
    contacto.cambiarEstado as RequestHandler,
  );
  adminRouter.patch(
    '/solicitudes-contacto/:idSolicitud/atender',
    puedeAtender,
    contacto.marcarAtendida as RequestHandler,
  );

  adminRouter.get('/horario', puedeVer, configuracion.obtenerHorario as RequestHandler);
  adminRouter.put('/horario', puedeEditar, configuracion.actualizarHorario as RequestHandler);
  adminRouter.get('/whatsapp', puedeVer, configuracion.obtenerWhatsapp as RequestHandler);
  adminRouter.put('/whatsapp', puedeEditar, configuracion.actualizarWhatsapp as RequestHandler);

  return { publicRouter, adminRouter, contactoService, configuracionService };
}