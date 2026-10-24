import { Router, type RequestHandler } from 'express';
import { construirAuthMiddleware } from './core/middlewares/auth.middleware';
import { construirModuloM04 } from './modules/m04-cuentas/m04.routes';
import { construirModuloM17 } from './modules/m17-permisos/m17.routes';
import { construirModuloM20 } from './modules/m20-seguridad/m20.routes';

interface RutaPublica {
  metodo: string;
  ruta: string;
}

/**
 * Exige sesión salvo en las rutas públicas listadas. `req.path` es relativo al
 * punto de montaje y se compara exacto: cualquier variación cae en la sesión.
 */
function exigirSesionSalvo(auth: RequestHandler, publicas: readonly RutaPublica[]): RequestHandler {
  return (req, res, next) => {
    const esPublica = publicas.some((p) => p.metodo === req.method && p.ruta === req.path);
    if (esPublica) {
      next();
      return;
    }
    Promise.resolve(auth(req, res, next)).catch(next);
  };
}

/** Enrutador raíz. Monta cada módulo bajo /api/v1. */
export function construirAppRoutes(): Router {
  const router = Router();
  const m20 = construirModuloM20();
  const auth = construirAuthMiddleware(m20.sesionService);
  const m17 = construirModuloM17(m20.sesionService, m20.auditoria);
  const m04 = construirModuloM04(m20.sesionService, m17.autorizacionService);

  // M20: El aviso de privacidad es público (RF-SEG-05-03); el resto exige sesión vigente.
  router.use(
    '/seguridad',
    exigirSesionSalvo(auth, [{ metodo: 'GET', ruta: '/privacidad/aviso-vigente' }]),
    m20.router,
  );

  // M04: Cuentas, autenticación, perfil y gestión empresarial
  router.use('/cuentas', m04.cuentasRouter);
  router.use('/admin/empresas', m04.adminEmpresasRouter);

  // M17: la confirmación del cambio de correo del admin llega desde un enlace y es
  // pública (HU-ADM-06); el resto de endpoints administrativos exige sesión.
  router.use(
    '/admin',
    exigirSesionSalvo(auth, [{ metodo: 'POST', ruta: '/gobernanza/confirmar-correo' }]),
    m17.router,
  );

  return router;
}
