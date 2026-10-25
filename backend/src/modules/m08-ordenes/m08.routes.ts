import { Router } from 'express';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';

/**
 * M08 · Orden de venta. Esqueleto montado por el PR general (contracts/m08-ordenes.contract.ts):
 * las rutas reales llegan con el módulo, en `feature/m08-ordenes`.
 */
export function construirModuloM08(_autorizacion: AutorizacionService): { router: Router } {
  return { router: Router() };
}
