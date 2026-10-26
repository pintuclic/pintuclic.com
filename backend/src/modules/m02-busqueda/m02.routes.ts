import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { BusquedaController } from './controllers/busqueda.controller';
import { PERMISO_CONSULTAR_ESTADISTICAS } from './dtos/m02-busqueda.dto';
import type { OfertasListadoPort, PatrocinioListadoPort, PrecioFinalPort } from './dtos/m02-busqueda.dto';
import type { BusquedaRepositoryPort, BusquedaServicePort } from './interfaces/busqueda.interface';
import { BusquedaRepository } from './repositories/busqueda.repository';
import { BusquedaService } from './services/busqueda.service';

export interface DependenciasM02 {
  busquedaRepo?: BusquedaRepositoryPort;
  busquedaService?: BusquedaServicePort;
  /** Precio final y ofertas de M06; sin ellos, precio base y sin ofertas (el cableado lo hace `app.routes`). */
  precioFinal?: PrecioFinalPort;
  ofertas?: OfertasListadoPort;
  /** Campañas de M14 para el listado (O7); sin ellas no hay patrocinio. */
  patrocinio?: PatrocinioListadoPort;
}

export interface ModuloM02 {
  adminRouter: Router;
  publicRouter: Router;
  busquedaService: BusquedaServicePort;
}

export function construirModuloM02(
  autorizacion: AutorizacionService,
  deps: DependenciasM02 = {},
): ModuloM02 {
  const puedeConsultarEstadisticas = requirePermission(
    autorizacion,
    PERMISO_CONSULTAR_ESTADISTICAS,
  ) as RequestHandler;

  const repo = deps.busquedaRepo ?? new BusquedaRepository(deps.precioFinal, deps.ofertas ?? null, deps.patrocinio ?? null);
  const busquedaService = deps.busquedaService ?? new BusquedaService(repo);
  const controller = new BusquedaController(busquedaService);

  const publicRouter = Router();
  publicRouter.get('/productos', controller.buscarProductos);
  publicRouter.get('/filtros', controller.obtenerFiltros);
  publicRouter.get('/colores', controller.buscarColores);

  const adminRouter = Router();
  adminRouter.get('/sin-resultado', puedeConsultarEstadisticas, controller.listarSinResultado);

  return {
    adminRouter,
    publicRouter,
    busquedaService,
  };
}
