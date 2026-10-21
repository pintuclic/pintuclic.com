import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../m20-seguridad/services/sesion.service';
import { ClientesAdminController } from './controllers/clientes-admin.controller';
import { ConfiguracionController } from './controllers/configuracion.controller';
import { EmpleadosController } from './controllers/empleados.controller';
import { GobernanzaAdminController } from './controllers/gobernanza-admin.controller';
import { PermisosController } from './controllers/permisos.controller';
import type { GobernanzaAdminRepositoryPort } from './interfaces/gobernanza.interface';
import { ClientesAdminRepository } from './repositories/clientes-admin.repository';
import { PrismaConfiguracionRepository } from './repositories/configuracion.repository';
import { EmpleadosRepository } from './repositories/empleados.repository';
import { GobernanzaAdminRepository } from './repositories/gobernanza-admin.repository';
import { PermisosRepository } from './repositories/permisos.repository';
import { ClientesAdminService } from './services/clientes-admin.service';
import { ConfiguracionService } from './services/configuracion.service';
import { EmpleadosService } from './services/empleados.service';
import { GobernanzaAdminService } from './services/gobernanza-admin.service';
import { PermisosService } from './services/permisos.service';
import { ResolutorPermisosDatabaseAdapter } from './services/resolutor-permisos.adapter';

/** Middleware para endpoints de uso exclusivo de la cuenta administradora */
function requireAdmin(gobernanzaRepo: GobernanzaAdminRepositoryPort) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    const actor = req.actor;
    if (!actor) {
      responderRecursoNoDisponible(res);
      return;
    }
    const admin = await gobernanzaRepo.obtenerAdmin();
    if (!admin || admin.idUsuario !== actor.idUsuario) {
      responderRecursoNoDisponible(res);
      return;
    }
    next();
  };
}

export function construirModuloM17(
  sesionService: SesionService,
  auditoria: AuditoriaPort,
): {
  router: Router;
  resolutorPermisos: ResolutorPermisosDatabaseAdapter;
  autorizacionService: AutorizacionService;
  empleadosService: EmpleadosService;
  permisosService: PermisosService;
  clientesService: ClientesAdminService;
  configService: ConfiguracionService;
  gobernanzaService: GobernanzaAdminService;
} {
  // 1. Repositorios
  const permisosRepo = new PermisosRepository();
  const empleadosRepo = new EmpleadosRepository();
  const clientesRepo = new ClientesAdminRepository();
  const configRepo = new PrismaConfiguracionRepository();
  const gobernanzaRepo = new GobernanzaAdminRepository();

  // 2. Servicios
  const resolutorPermisos = new ResolutorPermisosDatabaseAdapter(
    permisosRepo,
    empleadosRepo,
    gobernanzaRepo,
  );
  const autorizacionService = new AutorizacionService(resolutorPermisos, auditoria);
  const empleadosService = new EmpleadosService(empleadosRepo, gobernanzaRepo, sesionService);
  const permisosService = new PermisosService(permisosRepo, empleadosRepo);
  const clientesService = new ClientesAdminService(clientesRepo, gobernanzaRepo, sesionService);
  const configService = new ConfiguracionService(configRepo);
  const gobernanzaService = new GobernanzaAdminService(gobernanzaRepo, empleadosRepo, sesionService);

  // 3. Controladores
  const empleadosController = new EmpleadosController(empleadosService);
  const permisosController = new PermisosController(permisosService);
  const clientesController = new ClientesAdminController(clientesService);
  const configController = new ConfiguracionController(configService);
  const gobernanzaController = new GobernanzaAdminController(gobernanzaService);

  // 4. Router
  const router = Router();
  const soloAdmin = requireAdmin(gobernanzaRepo) as RequestHandler;

  // HU-ADM-01: Gestión de Colaboradores / Empleados
  router.get(
    '/empleados',
    requirePermission(autorizacionService, 'personal.ver') as RequestHandler,
    empleadosController.listar as RequestHandler,
  );
  router.post(
    '/empleados',
    requirePermission(autorizacionService, 'personal.editar') as RequestHandler,
    empleadosController.crear as RequestHandler,
  );
  router.get(
    '/empleados/:id',
    requirePermission(autorizacionService, 'personal.ver') as RequestHandler,
    empleadosController.obtener as RequestHandler,
  );
  router.patch(
    '/empleados/:id',
    requirePermission(autorizacionService, 'personal.editar') as RequestHandler,
    empleadosController.editar as RequestHandler,
  );
  router.post(
    '/empleados/:id/desactivar',
    requirePermission(autorizacionService, 'personal.desactivar') as RequestHandler,
    empleadosController.desactivar as RequestHandler,
  );
  router.post(
    '/empleados/:id/reactivar',
    requirePermission(autorizacionService, 'personal.desactivar') as RequestHandler,
    empleadosController.reactivar as RequestHandler,
  );

  // HU-ADM-02: Asignación Individual de Permisos
  router.get(
    '/empleados/:id/permisos',
    requirePermission(autorizacionService, 'seguridad.gestionar_permisos') as RequestHandler,
    permisosController.obtenerMatriz as RequestHandler,
  );
  router.put(
    '/empleados/:id/permisos',
    requirePermission(autorizacionService, 'seguridad.gestionar_permisos') as RequestHandler,
    permisosController.actualizarPermisos as RequestHandler,
  );

  // HU-ADM-04: Gestión de Clientes desde Administración
  router.get(
    '/clientes',
    requirePermission(autorizacionService, 'personal.ver') as RequestHandler,
    clientesController.buscar as RequestHandler,
  );
  router.get(
    '/clientes/:id',
    requirePermission(autorizacionService, 'personal.ver') as RequestHandler,
    clientesController.obtenerFicha as RequestHandler,
  );
  router.post(
    '/clientes/:id/desactivar',
    soloAdmin,
    clientesController.desactivar as RequestHandler,
  );

  // HU-ADM-05 y HU-ADM-07: Configuración General y Parámetros
  router.get(
    '/configuracion',
    soloAdmin,
    configController.obtenerCatalogo as RequestHandler,
  );
  router.put(
    '/configuracion/:clave',
    soloAdmin,
    configController.actualizarParametro as RequestHandler,
  );

  // HU-ADM-06: Gobernanza de la Cuenta Administradora
  router.post(
    '/gobernanza/sustituir-correo',
    soloAdmin,
    gobernanzaController.solicitarSustitucionCorreo as RequestHandler,
  );
  router.post(
    '/gobernanza/confirmar-correo',
    gobernanzaController.confirmarSustitucionCorreo as RequestHandler,
  );
  router.post(
    '/primer-acceso',
    gobernanzaController.primerAcceso as RequestHandler,
  );

  return {
    router,
    resolutorPermisos,
    autorizacionService,
    empleadosService,
    permisosService,
    clientesService,
    configService,
    gobernanzaService,
  };
}
