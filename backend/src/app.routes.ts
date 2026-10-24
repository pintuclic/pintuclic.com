import { Router } from 'express';
import { construirAuthMiddleware } from './core/middlewares/auth.middleware';
import { construirModuloM04 } from './modules/m04-cuentas/m04.routes';
import { construirModuloM17 } from './modules/m17-permisos/m17.routes';
import { construirModuloM20 } from './modules/m20-seguridad/m20.routes';

/** Enrutador raíz. Monta cada módulo bajo /api/v1. */
export function construirAppRoutes(): Router {
  const router = Router();
  const m20 = construirModuloM20();
  const auth = construirAuthMiddleware(m20.sesionService);
  const m17 = construirModuloM17(m20.sesionService, m20.auditoria, {
    // HU-ADM-01: M04 envía el enlace de activación de los empleados que crea M17.
    // M04 se construye después (usa la autorización de M17); la llamada ocurre por
    // petición, cuando `m04` ya existe.
    activacionEmpleado: {
      enviarEnlaceActivacion: (idUsuario) => m04.recuperacionService.emitirEnlaceActivacion(idUsuario),
    },
  });
  const m04 = construirModuloM04(m20.sesionService, m17.autorizacionService, {
    // HU-ADM-07: M04 lee los parámetros de autenticación que el admin edita en M17
    // (caché corta de 30 s en el repositorio de configuración).
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
  });

  // M20: El aviso de privacidad es público; el resto exige sesión vigente.
  router.use('/seguridad/privacidad/aviso-vigente', m20.router);
  router.use('/seguridad', auth, m20.router);

  // M04: Cuentas, autenticación, perfil y gestión empresarial
  router.use('/cuentas', m04.cuentasRouter);
  router.use('/admin/empresas', m04.adminEmpresasRouter);

  // M17: Endpoint público de confirmación de sustitución de correo de admin
  router.use('/admin/gobernanza/confirmar-correo', m17.router);
  // M17: Endpoints administrativos protegidos por sesión
  router.use('/admin', auth, m17.router);

  return router;
}
