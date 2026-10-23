import { Router, type RequestHandler } from 'express';
import { construirAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../m20-seguridad/services/sesion.service';
import { PrismaCuentasRepository } from './repositories/cuentas.repository';
import { PrismaCodigosVerificacionRepository } from './repositories/codigos-verificacion.repository';
import { PrismaControlIntentosRepository } from './repositories/control-intentos.repository';
import { PrismaDocumentosRepository } from './repositories/documentos.repository';
import { PrismaSolicitudesEmpresaRepository } from './repositories/solicitudes-empresa.repository';
import { PrismaDireccionesRepository } from './repositories/direcciones.repository';
import { SistemaDateProviderAdapter } from './adapters/date-provider.adapter';
import { crearNotificacionesAdapterDesdeEntorno } from './adapters/notificaciones.adapter';
import { GoogleAuthDeshabilitadoAdapter } from './adapters/google-auth.adapter';
import { AuthCuentasService } from './services/auth-cuentas.service';
import { RecuperacionPasswordService } from './services/recuperacion-password.service';
import { PerfilService } from './services/perfil.service';
import { DireccionesService } from './services/direcciones.service';
import { EmpresasService } from './services/empresas.service';
import { AuthCuentasController } from './controllers/auth-cuentas.controller';
import { PerfilController } from './controllers/perfil.controller';
import { DireccionesController } from './controllers/direcciones.controller';
import { RecuperacionPasswordController } from './controllers/recuperacion-password.controller';
import { EmpresasController } from './controllers/empresas.controller';
import type { DateProviderPort } from './interfaces/date-provider.port';
import type { NotificacionesPort } from './interfaces/notificaciones.port';
import type { GoogleAuthPort } from './interfaces/google-auth.port';

/**
 * RN-CUE-18 / HU-ADM-03: decidir sobre solicitudes de empresa exige este permiso
 * atómico del catálogo de M17 (seed_pintuclic.sql). Se comprueba en servidor en
 * cada petición; un tipo de sesión `admin` por sí solo no lo concede.
 */
export const PERMISO_VALIDAR_EMPRESAS = 'empresas.validar';

export interface ModuloM04Config {
  dateProvider?: DateProviderPort;
  notificaciones?: NotificacionesPort;
  googleAuth?: GoogleAuthPort;
}

export function construirModuloM04(
  sesionService: SesionService,
  autorizacion: AutorizacionService,
  config?: ModuloM04Config,
): {
  cuentasRouter: Router;
  adminEmpresasRouter: Router;
  authService: AuthCuentasService;
  recuperacionService: RecuperacionPasswordService;
  perfilService: PerfilService;
  direccionesService: DireccionesService;
  empresasService: EmpresasService;
} {
  // Repositorios Prisma
  const cuentasRepo = new PrismaCuentasRepository();
  const codigosRepo = new PrismaCodigosVerificacionRepository();
  const controlIntentosRepo = new PrismaControlIntentosRepository();
  const documentosRepo = new PrismaDocumentosRepository();
  const solicitudesRepo = new PrismaSolicitudesEmpresaRepository();
  const direccionesRepo = new PrismaDireccionesRepository();

  // Adaptadores (inyección configurable para pruebas desacopladas)
  const dateProvider = config?.dateProvider ?? new SistemaDateProviderAdapter();
  const notificaciones = config?.notificaciones ?? crearNotificacionesAdapterDesdeEntorno();
  // HU-CUE-02 aplazada: sin un adaptador real inyectado, Google queda deshabilitado.
  const googleAuth = config?.googleAuth ?? new GoogleAuthDeshabilitadoAdapter();

  // Servicios de dominio
  const authService = new AuthCuentasService(
    cuentasRepo,
    codigosRepo,
    controlIntentosRepo,
    notificaciones,
    googleAuth,
    dateProvider,
    sesionService,
  );

  const recuperacionService = new RecuperacionPasswordService(
    cuentasRepo,
    codigosRepo,
    notificaciones,
    dateProvider,
    sesionService,
  );

  const perfilService = new PerfilService(
    cuentasRepo,
    codigosRepo,
    notificaciones,
    dateProvider,
    sesionService,
  );

  const direccionesService = new DireccionesService(direccionesRepo);

  const empresasService = new EmpresasService(
    cuentasRepo,
    solicitudesRepo,
    documentosRepo,
    notificaciones,
  );

  // Controladores
  const authController = new AuthCuentasController(authService, sesionService);
  const perfilController = new PerfilController(perfilService);
  const direccionesController = new DireccionesController(direccionesService);
  const recuperacionController = new RecuperacionPasswordController(recuperacionService);
  const empresasController = new EmpresasController(empresasService);

  const authMiddleware = construirAuthMiddleware(sesionService);

  // 1. Router de Cuentas (/cuentas)
  const cuentasRouter = Router();

  // Rutas públicas de autenticación y registro
  cuentasRouter.post('/registro', authController.registro as RequestHandler);
  cuentasRouter.post('/registro/verificar-otp', authController.verificarOtp as RequestHandler);
  cuentasRouter.post('/registro/reenviar-otp', authController.reenviarOtp as RequestHandler);
  cuentasRouter.post('/login', authController.login as RequestHandler);
  cuentasRouter.post('/cambio-password-primer-acceso', authController.cambiarPasswordPrimerAcceso as RequestHandler);
  // Las rutas de Google solo existen si se inyecta un adaptador que verifique el token.
  if (config?.googleAuth !== undefined) {
    cuentasRouter.post('/oauth/google', authController.oauthGoogle as RequestHandler);
    cuentasRouter.post('/oauth/google/completar', authController.completarRegistroGoogle as RequestHandler);
  }
  cuentasRouter.post('/recuperar-password/solicitar', recuperacionController.solicitar as RequestHandler);
  cuentasRouter.post('/recuperar-password/confirmar', recuperacionController.confirmar as RequestHandler);
  cuentasRouter.post('/empresas/registro', empresasController.registrarEmpresa as RequestHandler);

  // Rutas protegidas de cliente
  cuentasRouter.post('/logout', authMiddleware, authController.logout as RequestHandler);
  cuentasRouter.get('/perfil', authMiddleware, perfilController.obtenerPerfil as RequestHandler);
  cuentasRouter.put('/perfil', authMiddleware, perfilController.actualizarDatos as RequestHandler);
  cuentasRouter.put('/perfil/password', authMiddleware, perfilController.cambiarPassword as RequestHandler);
  cuentasRouter.post('/perfil/cambio-correo/solicitar', authMiddleware, perfilController.solicitarCambioCorreo as RequestHandler);
  cuentasRouter.post('/perfil/cambio-correo/confirmar', authMiddleware, perfilController.confirmarCambioCorreo as RequestHandler);
  cuentasRouter.post('/perfil/desactivar', authMiddleware, perfilController.desactivarCuenta as RequestHandler);

  cuentasRouter.get('/direcciones', authMiddleware, direccionesController.listar as RequestHandler);
  cuentasRouter.post('/direcciones', authMiddleware, direccionesController.crear as RequestHandler);
  cuentasRouter.put('/direcciones/:idDireccion', authMiddleware, direccionesController.actualizar as RequestHandler);
  cuentasRouter.delete('/direcciones/:idDireccion', authMiddleware, direccionesController.eliminar as RequestHandler);
  cuentasRouter.patch('/direcciones/:idDireccion/predeterminada', authMiddleware, direccionesController.establecerPredeterminada as RequestHandler);

  cuentasRouter.get('/empresas/solicitudes/mias', authMiddleware, empresasController.misSolicitudes as RequestHandler);
  cuentasRouter.post('/empresas/ascenso', authMiddleware, empresasController.solicitarAscenso as RequestHandler);
  cuentasRouter.post('/empresas/renovacion-nit', authMiddleware, empresasController.solicitarRenovacionNit as RequestHandler);

  // 2. Router de Administración de Empresas (/admin/empresas)
  // BUG-M04-01 · RNF-SEG-03-01: la guarda se aplica a nivel de router y no ruta por
  // ruta, de modo que cualquier endpoint administrativo futuro nazca protegido por
  // omisión. Sesión válida primero (401) y después permiso en servidor (404 opaco,
  // idéntico al de un recurso inexistente: RN-SEG-08 / ADR-003).
  const adminEmpresasRouter = Router();
  adminEmpresasRouter.use(
    authMiddleware,
    requirePermission(autorizacion, PERMISO_VALIDAR_EMPRESAS) as RequestHandler,
  );
  adminEmpresasRouter.get('/solicitudes', empresasController.listarSolicitudes as RequestHandler);
  adminEmpresasRouter.get('/solicitudes/:idSolicitud', empresasController.obtenerDetalleSolicitud as RequestHandler);
  adminEmpresasRouter.post('/solicitudes/:idSolicitud/dictamen', empresasController.dictaminarSolicitud as RequestHandler);
  adminEmpresasRouter.get('/renovaciones', empresasController.listarRenovaciones as RequestHandler);
  adminEmpresasRouter.get('/renovaciones/:idSolicitud', empresasController.obtenerDetalleRenovacion as RequestHandler);
  adminEmpresasRouter.post('/renovaciones/:idSolicitud/dictamen', empresasController.dictaminarRenovacionNit as RequestHandler);
  // RN-CUE-20: el RUT solo se entrega a quien tiene empresas.validar (guarda del router).
  adminEmpresasRouter.get('/documentos/:idDocumento', empresasController.descargarDocumento as RequestHandler);

  return {
    cuentasRouter,
    adminEmpresasRouter,
    authService,
    recuperacionService,
    perfilService,
    direccionesService,
    empresasService,
  };
}
