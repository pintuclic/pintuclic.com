import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { SinEventosOrdenAdapter, RelojSistemaAdapter } from '../m08-ordenes/adapters/predeterminados.adapter';
import type { EventosOrdenPort } from '../m08-ordenes/interfaces/eventos-orden.port';
import type { RelojPort } from '../m08-ordenes/interfaces/reloj.port';
import { exigirSesionDePersonal } from '../m08-ordenes/m08.routes';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { CumplimientoController } from './controllers/cumplimiento.controller';
import type { CumplimientoRepository } from './interfaces/cumplimiento.interface';
import { PrismaCumplimientoRepository } from './repositories/cumplimiento.repository';
import { CumplimientoService } from './services/cumplimiento.service';

/** D5: todo el módulo se reserva al permiso «Gestión de pedidos», ya sembrado (RF-CUM-01-10). */
export const PERMISO_CUMPLIMIENTO = 'ventas.gestionar';

export interface ModuloM09Config {
  /** Puerto de auditoría de M20, para registrar los accesos denegados por tipo de sesión. */
  auditoria?: AuditoriaPort;
  /** Dobles inyectables para pruebas; en producción se usan el de Prisma y los adaptadores por defecto. */
  repo?: CumplimientoRepository;
  eventos?: EventosOrdenPort;
  reloj?: RelojPort;
}

/**
 * M09 · Cumplimiento y preparación (contracts/m09-cumplimiento.contract.ts). Se monta bajo `/cumplimiento`, detrás de
 * la sesión. Es del personal: una sesión de cliente nunca entra, aunque su rol traiga `ventas.gestionar`.
 */
export function construirModuloM09(autorizacion: AutorizacionService, config?: ModuloM09Config): { router: Router } {
  const servicio = new CumplimientoService(
    config?.repo ?? new PrismaCumplimientoRepository(),
    config?.eventos ?? new SinEventosOrdenAdapter(),
    config?.reloj ?? new RelojSistemaAdapter(),
  );
  const controlador = new CumplimientoController(servicio);
  const gestionar = requirePermission(autorizacion, PERMISO_CUMPLIMIENTO) as RequestHandler;

  const router = Router();
  router.use(exigirSesionDePersonal(config?.auditoria));

  // `/retenidas` va antes de `/ordenes/:codigo/...` solo por claridad: no comparten prefijo.
  router.get('/retenidas', gestionar, controlador.retenidas);
  router.get('/ordenes/:codigo/verificacion', gestionar, controlador.verificacion);
  router.put('/ordenes/:codigo/verificacion', gestionar, controlador.marcar);
  router.get('/ordenes/:codigo/hoja', gestionar, controlador.hoja);
  return { router };
}
