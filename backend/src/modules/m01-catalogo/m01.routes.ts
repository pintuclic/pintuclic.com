import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import {
  controladorSimple,
  LineasController,
  MarcasController,
  MedidasController,
  type ControladorRecurso,
} from './controllers/catalogos.controller';
import { ClasificacionController } from './controllers/clasificacion.controller';
import {
  crearAcabadoRequestSchema,
  crearBaseRequestSchema,
  crearFamiliaColorRequestSchema,
  crearSuperficieRequestSchema,
  crearTipoMedidaRequestSchema,
  crearTipoResinaRequestSchema,
  editarAcabadoRequestSchema,
  editarBaseRequestSchema,
  editarFamiliaColorRequestSchema,
  editarSuperficieRequestSchema,
  editarTipoMedidaRequestSchema,
} from './dtos/m01-catalogo.dto';
import {
  AcabadosRepository,
  BasesRepository,
  FamiliasColorRepository,
  SuperficiesRepository,
  TiposMedidaRepository,
  TiposResinaRepository,
} from './repositories/catalogos-simples.repository';
import { CategoriasRepository, SubcategoriasRepository } from './repositories/clasificacion.repository';
import {
  LineasRepository,
  MarcasRepository,
  MedidasRepository,
} from './repositories/marcas-lineas-medidas.repository';
import { AcabadosService, CatalogoSimpleService, TiposMedidaService } from './services/catalogo-simple.service';
import { ClasificacionService } from './services/clasificacion.service';
import { LineasService } from './services/lineas.service';
import { MarcasService } from './services/marcas.service';
import { MedidasService } from './services/medidas.service';

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
  marcasService: MarcasService;
  lineasService: LineasService;
  medidasService: MedidasService;
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
  const marcasRepo = new MarcasRepository();
  const lineasRepo = new LineasRepository();
  const medidasRepo = new MedidasRepository();
  const tiposMedidaRepo = new TiposMedidaRepository();

  // Servicios
  const clasificacionService = new ClasificacionService(categoriasRepo, subcategoriasRepo);
  const marcasService = new MarcasService(marcasRepo);
  const lineasService = new LineasService(lineasRepo, marcasRepo);
  const medidasService = new MedidasService(medidasRepo, tiposMedidaRepo);

  // Controladores
  const clasificacion = new ClasificacionController(clasificacionService);
  const marcas = new MarcasController(marcasService);
  const lineas = new LineasController(lineasService);
  const medidas = new MedidasController(medidasService);
  const superficies = controladorSimple({
    servicio: new CatalogoSimpleService(new SuperficiesRepository(), 'una superficie'),
    esquemaCrear: crearSuperficieRequestSchema,
    esquemaEditar: editarSuperficieRequestSchema,
    parametroId: 'idSuperficie',
    deQue: 'de la superficie',
    mensajeCreado: 'Superficie creada',
  });
  const tiposResina = controladorSimple({
    servicio: new CatalogoSimpleService(new TiposResinaRepository(), 'un tipo de resina'),
    esquemaCrear: crearTipoResinaRequestSchema,
    esquemaEditar: crearTipoResinaRequestSchema,
    parametroId: 'idTipoResina',
    deQue: 'del tipo de resina',
    mensajeCreado: 'Tipo de resina creado',
  });
  const acabados = controladorSimple({
    servicio: new AcabadosService(new AcabadosRepository()),
    esquemaCrear: crearAcabadoRequestSchema,
    esquemaEditar: editarAcabadoRequestSchema,
    parametroId: 'idAcabado',
    deQue: 'del acabado',
    mensajeCreado: 'Acabado creado',
  });
  const bases = controladorSimple({
    servicio: new CatalogoSimpleService(new BasesRepository(), 'una base'),
    esquemaCrear: crearBaseRequestSchema,
    esquemaEditar: editarBaseRequestSchema,
    parametroId: 'idBase',
    deQue: 'de la base',
    mensajeCreado: 'Base creada',
  });
  const familiasColor = controladorSimple({
    servicio: new CatalogoSimpleService(new FamiliasColorRepository(), 'una familia de color'),
    esquemaCrear: crearFamiliaColorRequestSchema,
    esquemaEditar: editarFamiliaColorRequestSchema,
    parametroId: 'idFamiliaColor',
    deQue: 'de la familia de color',
    mensajeCreado: 'Familia de color creada',
  });
  const tiposMedida = controladorSimple({
    servicio: new TiposMedidaService(tiposMedidaRepo),
    esquemaCrear: crearTipoMedidaRequestSchema,
    esquemaEditar: editarTipoMedidaRequestSchema,
    parametroId: 'idTipoMedida',
    deQue: 'del tipo de medida',
    mensajeCreado: 'Tipo de medida creado',
  });

  const adminRouter = Router();

  /** GET lista · POST · PUT /:id · PATCH /:id/estado · GET /:id/impacto-desactivacion */
  const montarRecurso = (ruta: string, parametro: string, c: ControladorRecurso): void => {
    adminRouter.get(`/${ruta}`, ver, c.listar as RequestHandler);
    adminRouter.post(`/${ruta}`, crear, c.crear as RequestHandler);
    adminRouter.put(`/${ruta}/:${parametro}`, editar, c.editar as RequestHandler);
    adminRouter.patch(`/${ruta}/:${parametro}/estado`, cambiarEstado, c.cambiarEstado as RequestHandler);
    adminRouter.get(`/${ruta}/:${parametro}/impacto-desactivacion`, ver, c.impacto as RequestHandler);
  };

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

  // HU-CAT-04: marcas (el logotipo viaja en base64; ver D2)
  adminRouter.get('/marcas', ver, marcas.listar as RequestHandler);
  adminRouter.post('/marcas', crear, marcas.crear as RequestHandler);
  adminRouter.get('/marcas/:idMarca', ver, marcas.obtener as RequestHandler);
  adminRouter.put('/marcas/:idMarca', editar, marcas.editar as RequestHandler);
  adminRouter.put('/marcas/:idMarca/logotipo', editar, marcas.reemplazarLogotipo as RequestHandler);
  adminRouter.get('/marcas/:idMarca/logotipo', ver, marcas.logotipo as RequestHandler);
  adminRouter.patch('/marcas/:idMarca/estado', cambiarEstado, marcas.cambiarEstado as RequestHandler);
  adminRouter.get('/marcas/:idMarca/impacto-desactivacion', ver, marcas.impacto as RequestHandler);

  // HU-CAT-11: líneas · catálogos pequeños y medidas
  montarRecurso('lineas', 'idLinea', lineas);
  montarRecurso('superficies', 'idSuperficie', superficies);
  montarRecurso('tipos-resina', 'idTipoResina', tiposResina);
  montarRecurso('acabados', 'idAcabado', acabados);
  montarRecurso('bases', 'idBase', bases);
  montarRecurso('familias-color', 'idFamiliaColor', familiasColor);
  montarRecurso('tipos-medida', 'idTipoMedida', tiposMedida);
  montarRecurso('medidas', 'idMedida', medidas);

  return { adminRouter, clasificacionService, marcasService, lineasService, medidasService };
}
