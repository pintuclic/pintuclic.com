import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { PrismaPerfilCheckoutAdapter } from './adapters/perfil.adapter';
import { configuracionWompiDesdeEntorno, WompiAdapter } from './adapters/wompi.adapter';
import { CheckoutController } from './controllers/checkout.controller';
import {
  PERMISOS_PAGOS,
  type CarritoCheckoutPort,
  type OrdenesCheckoutPort,
  type ParametrosCheckoutPort,
  type PasarelaPagoPort,
  type PerfilCheckoutPort,
  type PreciosCheckoutPort,
} from './dtos/m07-checkout.dto';
import type { CheckoutRepositoryPort } from './interfaces/checkout.interface';
import { CheckoutRepository } from './repositories/checkout.repository';
import { CheckoutService } from './services/checkout.service';

/** Cada cuánto corre la tarea que crea las órdenes en cola, pregunta a Wompi y vence solicitudes (R3, R5, R6). */
const INTERVALO_TAREA_MS = 60_000;

export interface DependenciasM07 {
  /** M05: carrito de la cuenta, revalidación y quitar lo comprado (P3). */
  carrito: CarritoCheckoutPort;
  /** M06: registrar y liberar el uso del cupón. */
  precios: PreciosCheckoutPort;
  /** M08: crear la orden con el pago confirmado (P4). */
  ordenes: OrdenesCheckoutPort;
  /** M17: parámetros de envío (R10). */
  parametros?: ParametrosCheckoutPort;
  /** M20: acciones del panel y eventos con firma inválida. */
  auditoria?: AuditoriaPort;
  /** Por defecto, Wompi con las variables WOMPI_* (P8). */
  pasarela?: PasarelaPagoPort;
  perfil?: PerfilCheckoutPort;
  /** false en pruebas: no arranca la tarea periódica. */
  tareaPeriodica?: boolean;
  /** Solo pruebas. */
  repo?: CheckoutRepositoryPort;
  reloj?: () => Date;
}

export interface ModuloM07 {
  /** Montar en `/api/v1/checkout`, detrás de la sesión (R1). */
  clienteRouter: Router;
  /** Montar en `/api/v1/checkout/wompi` ANTES que `clienteRouter`, sin sesión: lo protege la firma (R5). */
  wompiRouter: Router;
  /** Montar en `/api/v1/admin/pagos`, detrás de la sesión; el permiso se comprueba aquí (R16). */
  adminRouter: Router;
  checkout: CheckoutService;
}

/** R1: solo una sesión de cliente compra; una de personal recibe el mismo 404 que lo inexistente. */
const soloCliente: RequestHandler = (req, res, next) => {
  if (req.actor?.tipoSesion === 'cliente') {
    next();
    return;
  }
  responderRecursoNoDisponible(res);
};

/** R16: el panel es del personal, aunque una cuenta de cliente tuviera el permiso por su rol (como en M08). */
function soloPersonal(auditoria?: AuditoriaPort): RequestHandler {
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
        ipOrigen: req.ip ?? null,
      });
    }
    responderRecursoNoDisponible(res);
  };
}

export function construirModuloM07(autorizacion: AutorizacionService, dep: DependenciasM07): ModuloM07 {
  const ver = requirePermission(autorizacion, PERMISOS_PAGOS.ver) as RequestHandler;
  const gestionar = requirePermission(autorizacion, PERMISOS_PAGOS.gestionar) as RequestHandler;

  const checkout = new CheckoutService({
    repo: dep.repo ?? new CheckoutRepository(),
    carrito: dep.carrito,
    precios: dep.precios,
    ordenes: dep.ordenes,
    pasarela: dep.pasarela ?? new WompiAdapter(configuracionWompiDesdeEntorno()),
    perfil: dep.perfil ?? new PrismaPerfilCheckoutAdapter(),
    ...(dep.parametros === undefined ? {} : { parametros: dep.parametros }),
    ...(dep.auditoria === undefined ? {} : { auditoria: dep.auditoria }),
    ...(dep.reloj === undefined ? {} : { reloj: dep.reloj }),
  });
  const c = new CheckoutController(checkout);

  const clienteRouter = Router();
  clienteRouter.use(soloCliente);
  clienteRouter.get('/preparar', c.preparar);
  clienteRouter.post('/solicitudes', c.crear);
  clienteRouter.get('/solicitudes/:codigo', c.obtener);
  clienteRouter.post('/solicitudes/:codigo/reintentar', c.reintentar);
  clienteRouter.post('/solicitudes/:codigo/cancelar', c.cancelar);

  const wompiRouter = Router();
  wompiRouter.post('/eventos', c.evento);

  const adminRouter = Router();
  adminRouter.use(soloPersonal(dep.auditoria));
  adminRouter.get('/', ver, c.listar);
  adminRouter.get('/:codigo', ver, c.obtenerAdmin);
  adminRouter.post('/:codigo/consultar-wompi', gestionar, c.consultarWompi);
  adminRouter.post('/:codigo/reintentar-orden', gestionar, c.reintentarOrden);

  if (dep.tareaPeriodica !== false) {
    let enCurso = false;
    const tarea = setInterval(() => {
      if (enCurso) return;
      enCurso = true;
      checkout
        .procesarPendientes()
        .catch((error: unknown) => {
          console.error('[M07] Falló la tarea de pagos pendientes:', error instanceof Error ? error.message : error);
        })
        .finally(() => {
          enCurso = false;
        });
    }, INTERVALO_TAREA_MS);
    // No mantiene vivo el proceso (pruebas, cierre ordenado).
    tarea.unref();
  }

  return { clienteRouter, wompiRouter, adminRouter, checkout };
}
