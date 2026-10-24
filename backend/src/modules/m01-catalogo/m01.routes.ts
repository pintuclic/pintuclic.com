import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { ClasificacionController } from './controllers/clasificacion.controller';
import { CategoriasRepository, SubcategoriasRepository } from './repositories/clasificacion.repository';
import { ClasificacionService } from './services/clasificacion.service';

/**
 * Permisos del catálogo (decisión D1 del contrato): se reutilizan los `catalogo.*` del seed.
 * Se comprueban en servidor en cada petición (HU-ADM-03).
 */
export const PERMISOS_CATALOGO = {
  ver: 'catalogo.ver',
  crear: 'catalogo.crear',
  editar: 'catalogo.editar',
  desactivar: 'catalogo.eliminar',
} as const;

export interface ModuloM01 {
  /** Montar en `/api/v1/admin/catalogo`, detrás de la sesión. */
  adminRouter: Router;
  clasificacionService: ClasificacionService;
}

/**
 * Activar exige `catalogo.editar`; desactivar exige `catalogo.eliminar` (D1). El permiso
 * se decide por el `estado` pedido; un cuerpo inválido cae en `editar` y luego responde 400.
 */
function permisoDeCambioEstado(autorizacion: AutorizacionService): RequestHandler {
  const puedeEditar = requirePermission(autorizacion, PERMISOS_CATALOGO.editar) as RequestHandler;
  const puedeDesactivar = requirePermission(autorizacion, PERMISOS_CATALOGO.desactivar) as RequestHandler;
  return (req: Request, res: Response, next: NextFunction): void => {
    const cuerpo: unknown = req.body;
    const pideDesactivar =
      typeof cuerpo === 'object' && cuerpo !== null && (cuerpo as { estado?: unknown }).estado === 'inactivo';
    void (pideDesactivar ? puedeDesactivar : puedeEditar)(req, res, next);
  };
}

export function construirModuloM01(autorizacion: AutorizacionService): ModuloM01 {
  const ver = requirePermission(autorizacion, PERMISOS_CATALOGO.ver) as RequestHandler;
  const crear = requirePermission(autorizacion, PERMISOS_CATALOGO.crear) as RequestHandler;
  const editar = requirePermission(autorizacion, PERMISOS_CATALOGO.editar) as RequestHandler;
  const cambiarEstado = permisoDeCambioEstado(autorizacion);

  // Repositorios
  const categoriasRepo = new CategoriasRepository();
  const subcategoriasRepo = new SubcategoriasRepository();

  // Servicios
  const clasificacionService = new ClasificacionService(categoriasRepo, subcategoriasRepo);

  // Controladores
  const clasificacion = new ClasificacionController(clasificacionService);

  const adminRouter = Router();

  // HU-CAT-01: categorías y subcategorías
  adminRouter.get('/categorias', ver, clasificacion.listar as RequestHandler);
  adminRouter.post('/categorias', crear, clasificacion.crear as RequestHandler);
  adminRouter.put('/categorias/:idCategoria', editar, clasificacion.editar as RequestHandler);
  adminRouter.patch('/categorias/:idCategoria/estado', cambiarEstado, clasificacion.cambiarEstado as RequestHandler);
  adminRouter.get('/categorias/:idCategoria/impacto-desactivacion', ver, clasificacion.impacto as RequestHandler);
  adminRouter.post('/categorias/:idCategoria/subcategorias', crear, clasificacion.crearSubcategoria as RequestHandler);
  adminRouter.put('/subcategorias/:idSubcategoria', editar, clasificacion.editarSubcategoria as RequestHandler);
  adminRouter.patch(
    '/subcategorias/:idSubcategoria/estado',
    cambiarEstado,
    clasificacion.cambiarEstadoSubcategoria as RequestHandler,
  );
  adminRouter.get(
    '/subcategorias/:idSubcategoria/impacto-desactivacion',
    ver,
    clasificacion.impactoSubcategoria as RequestHandler,
  );

  return { adminRouter, clasificacionService };
}
