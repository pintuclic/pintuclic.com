import { Router, type RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { PostventaServicePort } from './interfaces/postventa.interface';
import { PrismaPostventaRepository } from './repositories/postventa.repository';
import { PrismaOrdenesAdapterM11 } from './adapters/ordenes.adapter';
import { PostventaService } from './services/postventa.service';
import { PostventaController } from './controllers/postventa.controller';

export const PERMISOS_POSTVENTA = {
  ver: 'ventas.ver',
  gestionar: 'ventas.gestionar',
} as const;

function ipDe(req: { ip?: string | undefined }): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}

function exigirSesionDePersonal(auditoria?: AuditoriaPort): RequestHandler {
  return async (req, res, next) => {
    const actor = req.actor;
    if (actor?.tipoSesion === 'admin') {
      next();
      return;
    }
    if (actor !== undefined) {
      await auditoria?.registrarAccesoDenegado({
        idUsuario: actor.idUsuario,
        operacionIntentada: `${req.method} ${req.originalUrl.split('?')[0] ?? req.path}`,
        permisoRequerido: null,
        fecha: new Date(),
        ipOrigen: ipDe(req),
      });
    }
    responderRecursoNoDisponible(res);
  };
}

export interface DependenciasModuloM11 {
  prisma?: PrismaClient | undefined;
  auditoria?: AuditoriaPort | undefined;
  service?: PostventaServicePort | undefined;
}

export function construirModuloM11(
  autorizacion: AutorizacionService,
  deps: DependenciasModuloM11 = {}
): {
  router: Router;
  service: PostventaServicePort;
  repo: PrismaPostventaRepository;
} {
  const prisma = deps.prisma ?? new PrismaClient();
  const repo = new PrismaPostventaRepository(prisma);
  const ordenesPort = new PrismaOrdenesAdapterM11(prisma);
  const service = deps.service ?? new PostventaService(repo, ordenesPort);
  const controller = new PostventaController(service);

  const router = Router();

  // Rutas de cliente (exigen sesión de cliente/usuario autenticado)
  router.get('/mis-solicitudes', controller.consultarMisSolicitudes);
  router.get('/mis-solicitudes/:codigo', controller.consultarMiSolicitud);
  router.post('/cancelar', controller.solicitarCancelacion);
  router.post('/devolver', controller.solicitarDevolucion);

  // Rutas administrativas (exigen sesión de empleado/admin y permiso de ventas)
  router.use('/gestion', exigirSesionDePersonal(deps.auditoria));

  const ver = requirePermission(autorizacion, PERMISOS_POSTVENTA.ver) as RequestHandler;
  const gestionar = requirePermission(autorizacion, PERMISOS_POSTVENTA.gestionar) as RequestHandler;

  router.get('/gestion', ver, controller.listarGestion);
  router.get('/gestion/resumen', ver, controller.obtenerResumenGestion);
  router.get('/gestion/:codigo', ver, controller.consultarGestionPorCodigo);
  router.patch('/gestion/:codigo/resolver', gestionar, controller.resolverSolicitud);
  router.post('/gestion/:codigo/reembolsar', gestionar, controller.registrarReembolso);

  return { router, service, repo };
}
