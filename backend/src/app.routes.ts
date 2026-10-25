import { Router, type RequestHandler } from 'express';
import { construirAuthMiddleware } from './core/middlewares/auth.middleware';
import { construirModuloM01 } from './modules/m01-catalogo/m01.routes';
import { construirModuloM04 } from './modules/m04-cuentas/m04.routes';
import { construirModuloM15 } from './modules/m15-atencion/m15.routes';
import { construirModuloM17 } from './modules/m17-permisos/m17.routes';
import { construirModuloM18 } from './modules/m18-notificaciones/m18.routes';
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
  const m18 = construirModuloM18(m17.autorizacionService, {
    // RF-NOT-01-03: M18 lee el límite de reintentos que el admin edita en M17.
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
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
    // ADR-009 (migrado a M18): M04 ya no construye su propio adapter SMTP.
    notificaciones: m18.notificaciones,
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

  // M15: atención al cliente. Las preguntas frecuentes, el horario y el canal son
  // públicos; el formulario de contacto exige sesión (RF-ATC-02-01). Va antes de
  // `/admin` por lo mismo que M01.
  const m15 = construirModuloM15(m17.autorizacionService);
  router.use('/admin/atencion', exigirSesionSalvo(auth, []), m15.adminRouter);
  router.use(
    '/atencion',
    exigirSesionSalvo(auth, [
      { metodo: 'GET', ruta: '/faqs' },
      { metodo: 'GET', ruta: '/horario' },
      { metodo: 'GET', ruta: '/whatsapp' },
    ]),
    m15.publicRouter,
  );

  // M17: la confirmación del cambio de correo del admin llega desde un enlace y es
  // pública (HU-ADM-06); el resto de endpoints administrativos exige sesión.
  router.use(
    '/admin',
    exigirSesionSalvo(auth, [{ metodo: 'POST', ruta: '/gobernanza/confirmar-correo' }]),
    m17.router,
  );

  // M18: Notificaciones y Comunicaciones — plantillas y diagnóstico de envíos (HU-NOT-03/04)
  router.use('/admin/notificaciones', auth, m18.router);

  return router;
}
