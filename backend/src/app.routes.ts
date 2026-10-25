import { Router, type RequestHandler } from 'express';
import { construirAuthMiddleware } from './core/middlewares/auth.middleware';
import { construirModuloM01 } from './modules/m01-catalogo/m01.routes';
import { construirModuloM04 } from './modules/m04-cuentas/m04.routes';
import { construirModuloM08 } from './modules/m08-ordenes/m08.routes';
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

  // M20: El aviso de privacidad es público (RF-SEG-05-03); el resto exige sesión vigente.
  router.use(
    '/seguridad',
    exigirSesionSalvo(auth, [{ metodo: 'GET', ruta: '/privacidad/aviso-vigente' }]),
    m20.router,
  );

  // M04: Cuentas, autenticación, perfil y gestión empresarial
  router.use('/cuentas', m04.cuentasRouter);
  router.use('/admin/empresas', m04.adminEmpresasRouter);

  // M01: administración del catálogo (exige sesión y permisos `catalogo.*`, resueltos en servidor)
  // y consulta pública de lo publicado (sin sesión, solo lectura). Va antes de `/admin` para que
  // el router de M17 no atienda las rutas `/admin/catalogo`.
  const m01 = construirModuloM01(m17.autorizacionService);
  router.use('/admin/catalogo', exigirSesionSalvo(auth, []), m01.adminRouter);
  router.use('/catalogo', m01.publicRouter);

  // M08: órdenes de venta. Cliente (`/ordenes/mis-pedidos`) y personal (`/ordenes/gestion`)
  // exigen sesión; el permiso `ventas.*` se resuelve en servidor dentro del módulo.
  const m08 = construirModuloM08(m17.autorizacionService);
  router.use('/ordenes', exigirSesionSalvo(auth, []), m08.router);

  // M17: la confirmación del cambio de correo del admin llega desde un enlace y es
  // pública (HU-ADM-06); el resto de endpoints administrativos exige sesión.
  router.use(
    '/admin',
    exigirSesionSalvo(auth, [{ metodo: 'POST', ruta: '/gobernanza/confirmar-correo' }]),
    m17.router,
  );

  return router;
}
