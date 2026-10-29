import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { ReportesController } from './controllers/reportes.controller';
import { PERMISOS_M19 } from './dtos/m19-reportes.dto';
import type { ReportesRepositoryPort } from './interfaces/reportes.interface';
import { ReportesRepository } from './repositories/reportes.repository';
import { ReportesService } from './services/reportes.service';

export interface DependenciasM19 {
  auditoria?: AuditoriaPort;
  repo?: ReportesRepositoryPort;
  ahora?: () => Date;
}

export interface ModuloM19 {
  /** Montar en `/api/v1/admin/reportes` detrás de sesión vigente. */
  router: Router;
  servicio: ReportesService;
}

/** R12: los reportes son del personal: una sesión de cliente nunca entra, aunque su rol traiga `ventas.*`. */
const exigirSesionDePersonal: RequestHandler = (req, res, next) => {
  if (req.actor?.tipoSesion === 'admin') {
    next();
    return;
  }
  responderRecursoNoDisponible(res);
};

export function construirModuloM19(autorizacion: AutorizacionService, deps: DependenciasM19 = {}): ModuloM19 {
  const servicio = new ReportesService(deps.repo ?? new ReportesRepository(), deps.ahora);
  const c = new ReportesController(servicio, deps.auditoria);

  const ver = requirePermission(autorizacion, PERMISOS_M19.ver) as RequestHandler;
  const verClientes = requirePermission(autorizacion, PERMISOS_M19.verClientes) as RequestHandler;
  const exportar = requirePermission(autorizacion, PERMISOS_M19.exportar) as RequestHandler;
  /** R11: `formato=csv` exige además `ventas.exportar`; en JSON no se comprueba. */
  const siEsCsv: RequestHandler = (req, res, next) => (req.query.formato === 'csv' ? exportar(req, res, next) : next());

  const router = Router();
  router.use(exigirSesionDePersonal);
  router.get('/resumen', ver, siEsCsv, c.resumen);
  router.get('/serie', ver, siEsCsv, c.serie);
  router.get('/ventas-por/:dimension', ver, siEsCsv, c.ventasPor);
  router.get('/descuentos', ver, siEsCsv, c.descuentos);
  router.get('/clientes', ver, verClientes, siEsCsv, c.clientes);
  router.get('/compradores', ver, siEsCsv, c.compradores);
  router.get('/postventa', ver, siEsCsv, c.postventa);
  router.get('/facturacion', ver, siEsCsv, c.facturacion);
  return { router, servicio };
}
