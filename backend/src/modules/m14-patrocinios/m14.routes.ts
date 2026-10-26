import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { PatrociniosController } from './controllers/patrocinios.controller';
import { PERMISO_EDITAR_PATROCINIOS, PERMISO_VER_PATROCINIOS } from './dtos/m14-patrocinios.dto';
import type { TarjetasPublicasPort } from './interfaces/patrocinios.interface';
import { CampaniasRepository } from './repositories/campanias.repository';
import { CatalogoPatrocinioRepository } from './repositories/catalogo-patrocinio.repository';
import { CampaniasService } from './services/campanias.service';
import { PatrocinioService } from './services/patrocinio.service';

export interface DependenciasM14 {
  /** M01: las tarjetas públicas del bloque del inicio. Sin ellas el bloque responde una lista vacía. */
  tarjetas?: TarjetasPublicasPort;
}

export interface ModuloM14 {
  /** Montar en `/api/v1/admin/patrocinios`, detrás de la sesión. */
  adminRouter: Router;
  /** Montar en `/api/v1/patrocinios`. Sin sesión. */
  publicRouter: Router;
  /** Puerto para M02 y M01 (`PatrocinioPort`). */
  patrocinio: PatrocinioService;
}

/**
 * Los permisos son propios (contrato C1): `patrocinios.ver` y `patrocinios.editar`; `catalogo.*` no sirve. Se
 * comprueban en servidor en cada petición, también en los GET.
 */
export function construirModuloM14(autorizacion: AutorizacionService, dep: DependenciasM14 = {}): ModuloM14 {
  const ver = requirePermission(autorizacion, PERMISO_VER_PATROCINIOS) as RequestHandler;
  const editar = requirePermission(autorizacion, PERMISO_EDITAR_PATROCINIOS) as RequestHandler;

  const campaniasRepo = new CampaniasRepository();
  const catalogoRepo = new CatalogoPatrocinioRepository();
  const campanias = new CampaniasService(campaniasRepo, catalogoRepo);
  const patrocinio = new PatrocinioService(campaniasRepo, catalogoRepo, dep.tarjetas ?? null);
  const c = new PatrociniosController(campanias, patrocinio);

  const adminRouter = Router();
  adminRouter.get('/campanias', ver, c.listarCampanias);
  adminRouter.post('/campanias', editar, c.crearCampania);
  adminRouter.post('/campanias/vista-previa', ver, c.vistaPrevia);
  adminRouter.get('/campanias/:idCampania', ver, c.obtenerCampania);
  adminRouter.put('/campanias/:idCampania', editar, c.actualizarCampania);
  adminRouter.patch('/campanias/:idCampania/estado', editar, c.estadoCampania);
  adminRouter.get('/campanias/:idCampania/productos', ver, c.productosCampania);
  adminRouter.get('/referencias', ver, c.buscarReferencias);

  const publicRouter = Router();
  publicRouter.get('/productos', c.bloqueInicio);

  return { adminRouter, publicRouter, patrocinio };
}
