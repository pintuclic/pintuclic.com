import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { InventarioController } from './controllers/inventario.controller';
import { ExistenciaComboRepository } from './repositories/existencia-combo.repository';
import { InventarioRepository } from './repositories/inventario.repository';
import { CargaService } from './services/carga.service';
import { ExistenciaComboService } from './services/existencia-combo.service';
import { InventarioService } from './services/inventario.service';

/**
 * Permisos de M13 (decisión D1 del contrato): se reutilizan `catalogo.ver` y `catalogo.editar`.
 * Se comprueban en servidor en cada petición, también en los GET (R13).
 */
export const PERMISOS_INVENTARIO = {
  ver: 'catalogo.ver',
  editar: 'catalogo.editar',
} as const;

export interface ModuloM13 {
  /** Montar en `/api/v1/admin/inventario`, detrás de la sesión. */
  router: Router;
  inventarioService: InventarioService;
  cargaService: CargaService;
  /** Puerto para M08: descontar y reponer la existencia de los combos (R15). */
  existenciaCombo: ExistenciaComboService;
}

export function construirModuloM13(autorizacion: AutorizacionService): ModuloM13 {
  const ver = requirePermission(autorizacion, PERMISOS_INVENTARIO.ver) as RequestHandler;
  const editar = requirePermission(autorizacion, PERMISOS_INVENTARIO.editar) as RequestHandler;

  const repositorio = new InventarioRepository();
  const inventarioService = new InventarioService(repositorio);
  const cargaService = new CargaService(repositorio);
  const controlador = new InventarioController(inventarioService, cargaService);

  const router = Router();
  router.get('/resumen', ver, controlador.resumen);
  router.get('/variantes', ver, controlador.listar);
  router.get('/variantes/:idVariante', ver, controlador.obtener);
  router.put('/variantes/:idVariante/existencia', editar, controlador.ajustar);
  router.get('/historial', ver, controlador.historial);
  router.get('/plantilla', ver, controlador.plantilla);
  router.post('/cargas/previsualizar', editar, controlador.previsualizar);
  router.post('/cargas/aplicar', editar, controlador.aplicar);

  const existenciaCombo = new ExistenciaComboService(new ExistenciaComboRepository());

  return { router, inventarioService, cargaService, existenciaCombo };
}
