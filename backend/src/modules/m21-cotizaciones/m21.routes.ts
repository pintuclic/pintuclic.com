import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { CotizacionesController } from './controllers/cotizaciones.controller';
import {
  PERMISOS_COTIZACIONES,
  type CarritoCotizacionPort,
  type NotificacionesCotizacionPort,
  type ParametrosCotizacionPort,
} from './dtos/m21-cotizaciones.dto';
import type { CotizacionesRepositoryPort } from './interfaces/cotizaciones.interface';
import { CotizacionesRepository } from './repositories/cotizaciones.repository';
import { CotizacionesService } from './services/cotizaciones.service';

export interface DependenciasM21 {
  /** M05: el carrito de la cuenta y la entrada de las líneas acordadas. */
  carrito: CarritoCotizacionPort;
  /** M17: días de vigencia por defecto (D4). */
  parametros?: ParametrosCotizacionPort;
  /** M18 (D8): hasta que exista, no se avisa nada. */
  notificaciones?: NotificacionesCotizacionPort;
  /** Solo pruebas. */
  repo?: CotizacionesRepositoryPort;
  reloj?: () => Date;
}

export interface ModuloM21 {
  /** Montar en `/api/v1/cotizaciones`, detrás de la sesión (R1). */
  clienteRouter: Router;
  /** Montar en `/api/v1/admin/cotizaciones`, detrás de la sesión; el permiso se comprueba aquí (R12). */
  adminRouter: Router;
  cotizaciones: CotizacionesService;
}

export function construirModuloM21(autorizacion: AutorizacionService, dep: DependenciasM21): ModuloM21 {
  const ver = requirePermission(autorizacion, PERMISOS_COTIZACIONES.ver) as RequestHandler;
  const gestionar = requirePermission(autorizacion, PERMISOS_COTIZACIONES.gestionar) as RequestHandler;

  const cotizaciones = new CotizacionesService({
    repo: dep.repo ?? new CotizacionesRepository(),
    carrito: dep.carrito,
    ...(dep.parametros === undefined ? {} : { parametros: dep.parametros }),
    ...(dep.notificaciones === undefined ? {} : { notificaciones: dep.notificaciones }),
    ...(dep.reloj === undefined ? {} : { reloj: dep.reloj }),
  });
  const c = new CotizacionesController(cotizaciones);

  const clienteRouter = Router();
  clienteRouter.post('/', c.crear);
  clienteRouter.get('/', c.listarMias);
  clienteRouter.get('/:idCotizacion', c.obtenerMia);
  clienteRouter.post('/:idCotizacion/aceptar', c.aceptar);
  clienteRouter.post('/:idCotizacion/rechazar', c.rechazarComoCliente);

  const adminRouter = Router();
  adminRouter.get('/', ver, c.listarAdmin);
  adminRouter.get('/:idCotizacion', ver, c.obtenerAdmin);
  adminRouter.put('/:idCotizacion', gestionar, c.actualizar);
  adminRouter.post('/:idCotizacion/enviar', gestionar, c.enviar);
  adminRouter.post('/:idCotizacion/rechazar', gestionar, c.rechazarComoAdmin);

  return { clienteRouter, adminRouter, cotizaciones };
}
