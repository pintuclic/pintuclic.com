import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { CatalogoParaCompraPort } from '../m01-catalogo/dtos/m01-catalogo-entrega3.dto';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../m20-seguridad/services/sesion.service';
import { PreciosController } from './controllers/precios.controller';
import type { ParametrosComercialesPort } from './interfaces/precios.interface';
import { construirSesionOpcional } from './middlewares/sesion-opcional';
import { CatalogoPreciosRepository } from './repositories/catalogo-precios.repository';
import { CuponesRepository } from './repositories/cupones.repository';
import { EventosRepository } from './repositories/eventos.repository';
import { PerfilRepository } from './repositories/perfil.repository';
import { TiposClienteRepository } from './repositories/tipos-cliente.repository';
import { CuponesService } from './services/cupones.service';
import { EventosService } from './services/eventos.service';
import { ImpactoReglasService } from './services/impacto-reglas.service';
import { PreciosService } from './services/precios.service';
import { TiposClienteService } from './services/tipos-cliente.service';

/**
 * Permisos de M06 (decisión D1 del contrato): se reutilizan `catalogo.ver` y `catalogo.editar`. Se comprueban
 * en servidor en cada petición, también en los GET (R21).
 */
export const PERMISOS_PRECIOS = {
  ver: 'catalogo.ver',
  editar: 'catalogo.editar',
} as const;

export interface DependenciasM06 {
  /** Para la sesión opcional de las rutas públicas. */
  sesiones: SesionService;
  /** M01: precio base y si la línea se puede vender. */
  catalogoCompra: CatalogoParaCompraPort;
  /** M17: IVA y umbral para sugerir la cuenta empresa. */
  parametros: ParametrosComercialesPort;
}

export interface ModuloM06 {
  /** Montar en `/api/v1/admin/precios`, detrás de la sesión. */
  adminRouter: Router;
  /** Montar en `/api/v1/precios`. Sin sesión obligatoria. */
  publicRouter: Router;
  /** Puerto para M05, M07, M08, M02, M21 y M01. */
  precios: PreciosService;
  /** Puerto para M04: tipos de cliente empresa. */
  tiposCliente: TiposClienteService;
  /** Puerto para M01: aviso de impacto al desactivar. */
  impacto: ImpactoReglasService;
}

export function construirModuloM06(autorizacion: AutorizacionService, dep: DependenciasM06): ModuloM06 {
  const ver = requirePermission(autorizacion, PERMISOS_PRECIOS.ver) as RequestHandler;
  const editar = requirePermission(autorizacion, PERMISOS_PRECIOS.editar) as RequestHandler;

  const eventosRepo = new EventosRepository();
  const cuponesRepo = new CuponesRepository();
  const tiposRepo = new TiposClienteRepository();
  const catalogoRepo = new CatalogoPreciosRepository();

  const eventos = new EventosService(eventosRepo, catalogoRepo);
  const cupones = new CuponesService(cuponesRepo);
  const tiposCliente = new TiposClienteService(tiposRepo);
  const precios = new PreciosService({
    catalogoCompra: dep.catalogoCompra,
    catalogo: catalogoRepo,
    eventos: eventosRepo,
    cupones: cuponesRepo,
    tipos: tiposRepo,
    perfiles: new PerfilRepository(),
    parametros: dep.parametros,
  });
  const impacto = new ImpactoReglasService(eventosRepo);
  const c = new PreciosController(eventos, cupones, tiposCliente, precios);

  const adminRouter = Router();
  adminRouter.get('/eventos', ver, c.listarEventos);
  adminRouter.post('/eventos', editar, c.crearEvento);
  adminRouter.post('/eventos/vista-previa', ver, c.vistaPreviaEvento);
  adminRouter.get('/referencias', ver, c.buscarReferencias);
  adminRouter.get('/eventos/:idEvento', ver, c.obtenerEvento);
  adminRouter.put('/eventos/:idEvento', editar, c.actualizarEvento);
  adminRouter.patch('/eventos/:idEvento/estado', editar, c.estadoEvento);

  adminRouter.get('/cupones', ver, c.listarCupones);
  adminRouter.post('/cupones', editar, c.crearCupon);
  adminRouter.get('/cupones/:idCupon', ver, c.obtenerCupon);
  adminRouter.put('/cupones/:idCupon', editar, c.actualizarCupon);
  adminRouter.patch('/cupones/:idCupon/estado', editar, c.estadoCupon);
  adminRouter.get('/cupones/:idCupon/usos', ver, c.usosCupon);

  adminRouter.get('/tipos-cliente-empresa', ver, c.listarTipos);
  adminRouter.post('/tipos-cliente-empresa', editar, c.crearTipo);
  adminRouter.put('/tipos-cliente-empresa/:idSubRolEmpresa', editar, c.actualizarTipo);
  adminRouter.patch('/tipos-cliente-empresa/:idSubRolEmpresa/estado', editar, c.estadoTipo);

  adminRouter.post('/simular', ver, c.simular);

  const publicRouter = Router();
  const sesionOpcional = construirSesionOpcional(dep.sesiones);
  publicRouter.post('/calcular', sesionOpcional, c.calcular);
  publicRouter.get('/eventos-en-curso', c.eventosEnCurso);

  return { adminRouter, publicRouter, precios, tiposCliente, impacto };
}
