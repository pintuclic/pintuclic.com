import { Router, type RequestHandler } from 'express';
import { construirAuthMiddleware } from '../../core/middlewares/auth.middleware';
import type { SesionService } from '../m20-seguridad/services/sesion.service';
import { PrismaCuentasRepository } from './repositories/cuentas.repository';
import { PrismaCodigosVerificacionRepository } from './repositories/codigos-verificacion.repository';
import { PrismaControlIntentosRepository } from './repositories/control-intentos.repository';
import { PrismaDocumentosRepository } from './repositories/documentos.repository';
import { PrismaSolicitudesEmpresaRepository } from './repositories/solicitudes-empresa.repository';
import { PrismaDireccionesRepository } from './repositories/direcciones.repository';
import { SistemaDateProviderAdapter } from './adapters/date-provider.adapter';
import { MemoriaNotificacionesAdapter } from './adapters/notificaciones.adapter';
import { MockGoogleAuthAdapter } from './adapters/google-auth.adapter';
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

export interface ModuloM04Config {
  dateProvider?: DateProviderPort;
  notificaciones?: NotificacionesPort;
  googleAuth?: GoogleAuthPort;
}

export function construirModuloM04(
  sesionService: SesionService,
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
  const notificaciones = config?.notificaciones ?? new MemoriaNotificacionesAdapter();
  const googleAuth = config?.googleAuth ?? new MockGoogleAuthAdapter();

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
  cuentasRouter.post('/oauth/google', authController.oauthGoogle as RequestHandler);
  cuentasRouter.post('/oauth/google/completar', authController.completarRegistroGoogle as RequestHandler);
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

  cuentasRouter.post('/empresas/ascenso', authMiddleware, empresasController.solicitarAscenso as RequestHandler);
  cuentasRouter.post('/empresas/renovacion-nit', authMiddleware, empresasController.solicitarRenovacionNit as RequestHandler);

  // 2. Router de Administración de Empresas (/admin/empresas)
  const adminEmpresasRouter = Router();
  adminEmpresasRouter.get('/solicitudes', authMiddleware, empresasController.listarSolicitudes as RequestHandler);
  adminEmpresasRouter.get('/solicitudes/:idSolicitud', authMiddleware, empresasController.obtenerDetalleSolicitud as RequestHandler);
  adminEmpresasRouter.post('/solicitudes/:idSolicitud/dictamen', authMiddleware, empresasController.dictaminarSolicitud as RequestHandler);
  adminEmpresasRouter.post('/renovaciones/:idSolicitud/dictamen', authMiddleware, empresasController.dictaminarRenovacionNit as RequestHandler);

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
