import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { crearNotificacionesAdapterDesdeEntorno } from './adapters/notificaciones.adapter';
import { PlantillasController } from './controllers/plantillas.controller';
import { RegistroEnviosController } from './controllers/registro-envios.controller';
import type { NotificacionesPort } from './interfaces/notificaciones.port';
import type { ParametrosComunicacionesPort } from './interfaces/parametros-comunicaciones.port';
import { PrismaPlantillasRepository } from './repositories/plantillas.repository';
import { PrismaRegistroEnviosRepository } from './repositories/registro-envios.repository';
import { PlantillasService } from './services/plantillas.service';
import { RegistroEnviosService } from './services/registro-envios.service';

export interface ModuloM18Config {
  notificaciones?: NotificacionesPort;
  /** HU-ADM-07: parámetros de comunicaciones de M17, inyectados desde app.routes.ts. */
  parametros?: ParametrosComunicacionesPort;
}

export function construirModuloM18(
  autorizacion: AutorizacionService,
  config?: ModuloM18Config,
): {
  router: Router;
  notificaciones: NotificacionesPort;
  plantillasService: PlantillasService;
  registroEnviosService: RegistroEnviosService;
} {
  // Repositorios Prisma
  const plantillasRepo = new PrismaPlantillasRepository();
  const registroEnviosRepo = new PrismaRegistroEnviosRepository();

  // Adaptador de envío (inyección configurable para pruebas desacopladas)
  const notificaciones =
    config?.notificaciones ??
    crearNotificacionesAdapterDesdeEntorno(process.env, undefined, registroEnviosRepo, config?.parametros);

  // Servicios de dominio
  const plantillasService = new PlantillasService(plantillasRepo);
  const registroEnviosService = new RegistroEnviosService(registroEnviosRepo);

  // Controladores
  const plantillasController = new PlantillasController(plantillasService);
  const registroEnviosController = new RegistroEnviosController(registroEnviosService);

  // Router — montado por app.routes.ts bajo /admin/notificaciones (exige sesión).
  const router = Router();

  router.get(
    '/plantillas',
    requirePermission(autorizacion, 'notificaciones.ver') as RequestHandler,
    plantillasController.listar as RequestHandler,
  );
  router.get(
    '/plantillas/:tipo',
    requirePermission(autorizacion, 'notificaciones.ver') as RequestHandler,
    plantillasController.obtener as RequestHandler,
  );
  router.put(
    '/plantillas/:tipo',
    requirePermission(autorizacion, 'notificaciones.editar') as RequestHandler,
    plantillasController.actualizar as RequestHandler,
  );
  router.post(
    '/plantillas/:tipo/preview',
    requirePermission(autorizacion, 'notificaciones.ver') as RequestHandler,
    plantillasController.previsualizar as RequestHandler,
  );
  router.get(
    '/envios',
    requirePermission(autorizacion, 'notificaciones.ver') as RequestHandler,
    registroEnviosController.listarEnvios as RequestHandler,
  );
  router.get(
    '/rebotes',
    requirePermission(autorizacion, 'notificaciones.ver') as RequestHandler,
    registroEnviosController.listarRebotes as RequestHandler,
  );

  return { router, notificaciones, plantillasService, registroEnviosService };
}
