import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { AnunciosController } from './controllers/anuncios.controller';
import { MedicionController } from './controllers/medicion.controller';
import { PatrociniosController } from './controllers/patrocinios.controller';
import {
  MAXIMO_EVENTOS_POR_MINUTO,
  PERMISO_EDITAR_PATROCINIOS,
  PERMISO_VER_PATROCINIOS,
} from './dtos/m14-patrocinios.dto';
import type { TarjetasPublicasPort } from './interfaces/patrocinios.interface';
import { AnunciosRepository } from './repositories/anuncios.repository';
import { CampaniasRepository } from './repositories/campanias.repository';
import { CatalogoPatrocinioRepository } from './repositories/catalogo-patrocinio.repository';
import { MedicionRepository } from './repositories/medicion.repository';
import { AnunciosService } from './services/anuncios.service';
import { CampaniasService } from './services/campanias.service';
import { LimitadorPorMinuto } from './services/limitador';
import { MedicionService } from './services/medicion.service';
import { PatrocinioService } from './services/patrocinio.service';

export interface DependenciasM14 {
  /** M01: las tarjetas públicas del bloque del inicio. Sin ellas el bloque responde una lista vacía. */
  tarjetas?: TarjetasPublicasPort;
  /** Solo para pruebas: el contador de avisos por minuto (por omisión, MAXIMO_EVENTOS_POR_MINUTO por origen). */
  limitador?: LimitadorPorMinuto;
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

  const anunciosRepo = new AnunciosRepository();
  const medicionRepo = new MedicionRepository();
  // Un solo contador por minuto para todo lo que mide (avisos y clics): el tope es del origen, no de la ruta (M6).
  const limitador = dep.limitador ?? new LimitadorPorMinuto(MAXIMO_EVENTOS_POR_MINUTO);
  const anuncios = new AnunciosController(new AnunciosService(anunciosRepo, medicionRepo), limitador);
  const medicion = new MedicionController(new MedicionService(medicionRepo, campaniasRepo, anunciosRepo), limitador);

  const adminRouter = Router();
  adminRouter.get('/campanias', ver, c.listarCampanias);
  adminRouter.post('/campanias', editar, c.crearCampania);
  adminRouter.post('/campanias/vista-previa', ver, c.vistaPrevia);
  adminRouter.get('/campanias/:idCampania', ver, c.obtenerCampania);
  adminRouter.put('/campanias/:idCampania', editar, c.actualizarCampania);
  adminRouter.patch('/campanias/:idCampania/estado', editar, c.estadoCampania);
  adminRouter.get('/campanias/:idCampania/productos', ver, c.productosCampania);
  adminRouter.get('/referencias', ver, c.buscarReferencias);
  adminRouter.get('/anuncios', ver, anuncios.listar);
  adminRouter.post('/anuncios', editar, anuncios.crear);
  adminRouter.get('/anuncios/:idAnuncio', ver, anuncios.obtener);
  adminRouter.put('/anuncios/:idAnuncio', editar, anuncios.actualizar);
  adminRouter.patch('/anuncios/:idAnuncio/estado', editar, anuncios.estado);
  adminRouter.get('/anuncios/:idAnuncio/imagen', ver, anuncios.imagenAdmin);
  adminRouter.get('/medicion/resumen', ver, medicion.resumen);
  adminRouter.get('/medicion/serie', ver, medicion.serie);
  adminRouter.get('/medicion/exportar', ver, medicion.exportar);

  const publicRouter = Router();
  publicRouter.get('/productos', c.bloqueInicio);
  publicRouter.get('/anuncios/imagenes/:idAnuncio', anuncios.imagenPublica);
  publicRouter.get('/anuncios/:idAnuncio/ir', anuncios.ir);
  publicRouter.get('/anuncios/:espacio', anuncios.publicos);
  publicRouter.post('/medicion', medicion.registrar);

  return { adminRouter, publicRouter, patrocinio };
}
