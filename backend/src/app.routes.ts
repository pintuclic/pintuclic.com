import { Router } from 'express';
import { construirAuthMiddleware } from './core/middlewares/auth.middleware';
import { construirModuloM20 } from './modules/m20-seguridad/m20.routes';

/** Enrutador raíz. Monta cada módulo bajo /api/v1. */
export function construirAppRoutes(): Router {
  const router = Router();
  const m20 = construirModuloM20();
  const auth = construirAuthMiddleware(m20.sesionService);

  // El aviso de privacidad es público; el resto exige sesión vigente.
  router.use('/seguridad/privacidad/aviso-vigente', m20.router);
  router.use('/seguridad', auth, m20.router);

  return router;
}
