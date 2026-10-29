import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { NotificacionesPort } from '../m18-notificaciones/interfaces/notificaciones.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { AvisoM18Adapter } from './adapters/aviso-m18.adapter';
import { ComprobanteAlCrearOrdenAdapter } from './adapters/orden-creada.adapter';
import { FacturacionController } from './controllers/facturacion.controller';
import { PERMISOS_M12 } from './dtos/m12-facturacion.dto';
import type {
  AvisoComprobantePort,
  ComprobantesRepositoryPort,
  DatosFacturacionRepositoryPort,
} from './interfaces/facturacion.interface';
import { ComprobantesRepository } from './repositories/comprobantes.repository';
import { DatosFacturacionRepository } from './repositories/datos-facturacion.repository';
import { ComprobantesService } from './services/comprobantes.service';
import { DatosFacturacionService } from './services/datos-facturacion.service';

export interface DependenciasM12 {
  /** M18: con él sale el aviso al cliente (R9). Sin él, se emite igual y no se avisa. */
  notificaciones?: Pick<NotificacionesPort, 'notificarComprobanteVenta'>;
  comprobantesRepo?: ComprobantesRepositoryPort;
  datosRepo?: DatosFacturacionRepositoryPort;
  aviso?: AvisoComprobantePort;
}

export interface ModuloM12 {
  /** Montar en `/api/v1/facturacion` detrás de sesión vigente. */
  router: Router;
  /** Montar en `/api/v1/admin/facturacion` detrás de sesión vigente. */
  adminRouter: Router;
  comprobantes: ComprobantesService;
  /** Puerto para pasarle a M08 (`estados.notificaciones`): emite el comprobante al crearse la orden. */
  alCrearOrden: ComprobanteAlCrearOrdenAdapter;
}

/** El comprobante de otros clientes es del personal: una sesión de cliente nunca entra a `/gestion`, aunque su rol traiga `ventas.*`. */
const exigirSesionDePersonal: RequestHandler = (req, res, next) => {
  if (req.actor?.tipoSesion === 'admin') {
    next();
    return;
  }
  responderRecursoNoDisponible(res);
};

export function construirModuloM12(autorizacion: AutorizacionService, deps: DependenciasM12 = {}): ModuloM12 {
  const datos = new DatosFacturacionService(deps.datosRepo ?? new DatosFacturacionRepository());
  const aviso = deps.aviso ?? (deps.notificaciones === undefined ? undefined : new AvisoM18Adapter(deps.notificaciones));
  const comprobantes = new ComprobantesService(deps.comprobantesRepo ?? new ComprobantesRepository(), datos, aviso);
  const c = new FacturacionController(comprobantes, datos);

  const ver = requirePermission(autorizacion, PERMISOS_M12.verComprobantes) as RequestHandler;
  const reenviar = requirePermission(autorizacion, PERMISOS_M12.reenviarComprobantes) as RequestHandler;
  const verDatos = requirePermission(autorizacion, PERMISOS_M12.verDatos) as RequestHandler;
  const editarDatos = requirePermission(autorizacion, PERMISOS_M12.editarDatos) as RequestHandler;

  const router = Router();
  router.get('/mis-comprobantes/:codigoOrden', c.miComprobante);
  router.use('/gestion', exigirSesionDePersonal);
  router.get('/gestion/:codigoOrden', ver, c.comprobanteDePersonal);
  router.post('/gestion/:codigoOrden/reenviar', reenviar, c.reenviar);

  const adminRouter = Router();
  adminRouter.get('/datos', verDatos, c.obtenerDatos);
  adminRouter.put('/datos', editarDatos, c.guardarDatos);

  return { router, adminRouter, comprobantes, alCrearOrden: new ComprobanteAlCrearOrdenAdapter(comprobantes) };
}
