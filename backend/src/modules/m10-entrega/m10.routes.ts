import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { EnvioPropioAdapter } from './adapters/envio-propio.adapter';
import { EnvioAlDespacharAdapter } from './adapters/despacho.adapter';
import { EnviosController } from './controllers/envios.controller';
import { PERMISOS_M10, type ServicioEnviosPort } from './dtos/m10-entrega.dto';
import type { EnviosRepositoryPort, OrdenesParaEnvioPort, ParametrosEnvioPort } from './interfaces/entrega.interface';
import { PrismaEnviosRepository, PrismaOrdenesParaEnvio } from './repositories/envios.repository';
import { EnviosService } from './services/envios.service';

export interface DependenciasM10 {
  /** El servicio de envíos que atiende (R1). Por defecto, la entrega propia de la tienda (R2). */
  proveedor?: ServicioEnviosPort;
  /** M17: tarifa del adaptador por defecto. Sin él se usan los valores de M07 · R10. */
  parametros?: ParametrosEnvioPort;
  auditoria?: AuditoriaPort;
  /** Token del webhook del proveedor; por defecto `ENVIOS_WEBHOOK_TOKEN`. Sin él, el webhook responde 503. */
  webhookToken?: string;
  /** Solo pruebas. */
  repo?: EnviosRepositoryPort;
  ordenes?: OrdenesParaEnvioPort;
}

export interface ModuloM10 {
  /** Montar en `/api/v1/ordenes` ANTES que el de M08, detrás de la sesión: añade `/…/:codigo/envio`. */
  router: Router;
  /** Montar en `/api/v1/entregas/webhook`, sin sesión (la identidad es el token). */
  webhookRouter: Router;
  envios: EnviosService;
  /** Para pasarle a M08 (`estados.eventos`): crea el envío al despachar. */
  alDespachar: EnvioAlDespacharAdapter;
}

const sinParametros: ParametrosEnvioPort = { obtenerNumero: async () => null };

export function construirModuloM10(autorizacion: AutorizacionService, deps: DependenciasM10 = {}): ModuloM10 {
  const proveedor = deps.proveedor ?? new EnvioPropioAdapter(deps.parametros ?? sinParametros);
  const envios = new EnviosService(proveedor, deps.repo ?? new PrismaEnviosRepository(), deps.ordenes ?? new PrismaOrdenesParaEnvio());
  const c = new EnviosController(envios, deps.auditoria, deps.webhookToken ?? process.env.ENVIOS_WEBHOOK_TOKEN?.trim());

  const ver = requirePermission(autorizacion, PERMISOS_M10.ver) as RequestHandler;
  const gestionar = requirePermission(autorizacion, PERMISOS_M10.gestionar) as RequestHandler;
  /** Como en M08: `/gestion` es del personal aunque una sesión de cliente traiga `ventas.*`. */
  const soloPersonal: RequestHandler = (req, res, next) => {
    if (req.actor?.tipoSesion === 'admin') {
      next();
      return;
    }
    responderRecursoNoDisponible(res);
  };

  const router = Router();
  router.get('/mis-pedidos/:codigo/envio', c.delCliente);
  router.get('/gestion/:codigo/envio', soloPersonal, ver, c.delPersonal);
  router.post('/gestion/:codigo/envio/reintentar', soloPersonal, gestionar, c.reintentar);

  const webhookRouter = Router();
  webhookRouter.post('/:proveedor', c.webhook);

  return { router, webhookRouter, envios, alDespachar: new EnvioAlDespacharAdapter(envios) };
}
