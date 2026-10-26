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
import { ColoresController } from './controllers/colores.controller';
import { CombosController } from './controllers/combos.controller';
import { ConsultaPublicaController } from './controllers/consulta-publica.controller';
import { ImagenesController, ImagenMedidaController } from './controllers/imagenes.controller';
import { ProductosController, VariantesController } from './controllers/productos.controller';
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
import { ColoresRepository } from './repositories/colores.repository';
import { CombosRepository } from './repositories/combos.repository';
import { CompraRepository } from './repositories/compra.repository';
import { ConsultaPublicaRepository } from './repositories/consulta-publica.repository';
import { ImagenesRepository } from './repositories/imagenes.repository';
import { ProductosRepository } from './repositories/productos.repository';
import { VariantesRepository } from './repositories/variantes.repository';
import { LineasRepository, MarcasRepository, MedidasRepository } from './repositories/marcas-lineas-medidas.repository';
import { AcabadosService, CatalogoSimpleService, TiposMedidaService } from './services/catalogo-simple.service';
import { CatalogoParaCompraService } from './services/catalogo-para-compra.service';
import { ClasificacionService } from './services/clasificacion.service';
import { ColoresService } from './services/colores.service';
import { CombosService } from './services/combos.service';
import { ConsultaPublicaService } from './services/consulta-publica.service';
import { ImagenesService } from './services/imagenes.service';
import { LineasService } from './services/lineas.service';
import type { ImpactoReglasPort, OfertasPort } from './interfaces/ofertas.port';
import { MarcasService } from './services/marcas.service';
import { MedidasService } from './services/medidas.service';
import { ProductosService } from './services/productos.service';
import { VariantesService } from './services/variantes.service';

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
  /** Montar en `/api/v1/catalogo`, SIN sesión: solo lectura de lo publicado (HU-CAT-06). */
  publicRouter: Router;
  clasificacionService: ClasificacionService;
  marcasService: MarcasService;
  lineasService: LineasService;
  medidasService: MedidasService;
  coloresService: ColoresService;
  productosService: ProductosService;
  variantesService: VariantesService;
  imagenesService: ImagenesService;
  combosService: CombosService;
  /** Puerto interno para M05, M07, M08, M06 y M21 (entrega 3, sección 6). */
  catalogoParaCompra: CatalogoParaCompraService;
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

/** Lo que M01 pide a M06 (los puertos viven en `interfaces/ofertas.port.ts`). Sin ellos no hay ofertas ni conteo de eventos. */
export interface DependenciasM01 {
  ofertas?: OfertasPort;
  impactoReglas?: ImpactoReglasPort;
}

export function construirModuloM01(autorizacion: AutorizacionService, dependencias: DependenciasM01 = {}): ModuloM01 {
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
  const basesRepo = new BasesRepository();
  const acabadosRepo = new AcabadosRepository();
  const familiasRepo = new FamiliasColorRepository();

  // Servicios
  const clasificacionService = new ClasificacionService(categoriasRepo, subcategoriasRepo);
  const marcasService = new MarcasService(marcasRepo);
  const lineasService = new LineasService(lineasRepo, marcasRepo);
  const medidasService = new MedidasService(medidasRepo, tiposMedidaRepo);
  const productosRepo = new ProductosRepository();
  const productosService = new ProductosService(productosRepo, marcasRepo, lineasRepo, subcategoriasRepo);
  const imagenesService = new ImagenesService(new ImagenesRepository(), productosRepo);
  const variantesRepo = new VariantesRepository();
  const variantesService = new VariantesService(variantesRepo, productosRepo, medidasRepo);
  const combosService = new CombosService(
    new CombosRepository(),
    productosRepo,
    variantesRepo,
    marcasRepo,
    subcategoriasRepo,
    medidasRepo,
    tiposMedidaRepo,
  );
  const coloresService = new ColoresService(new ColoresRepository(), marcasRepo, basesRepo, acabadosRepo, familiasRepo);

  // Controladores
  const clasificacion = new ClasificacionController(clasificacionService);
  const marcas = new MarcasController(marcasService);
  const lineas = new LineasController(lineasService);
  const medidas = new MedidasController(medidasService);
  const colores = new ColoresController(coloresService);
  const productos = new ProductosController(productosService);
  const variantes = new VariantesController(variantesService);
  const combos = new CombosController(combosService);
  const imagenes = new ImagenesController(imagenesService);
  const imagenMedida = new ImagenMedidaController(medidasService);
  const consultaPublica = new ConsultaPublicaController(
    new ConsultaPublicaService(new ConsultaPublicaRepository(), dependencias.ofertas),
  );
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
    servicio: new AcabadosService(acabadosRepo),
    esquemaCrear: crearAcabadoRequestSchema,
    esquemaEditar: editarAcabadoRequestSchema,
    parametroId: 'idAcabado',
    deQue: 'del acabado',
    mensajeCreado: 'Acabado creado',
  });
  const bases = controladorSimple({
    servicio: new CatalogoSimpleService(basesRepo, 'una base'),
    esquemaCrear: crearBaseRequestSchema,
    esquemaEditar: editarBaseRequestSchema,
    parametroId: 'idBase',
    deQue: 'de la base',
    mensajeCreado: 'Base creada',
  });
  const familiasColor = controladorSimple({
    servicio: new CatalogoSimpleService(familiasRepo, 'una familia de color'),
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

  // HU-CAT-05: colores. Las rutas de importación van antes de `/colores/:idColor`.
  adminRouter.post('/colores/importar/previsualizar', crear, colores.previsualizarImportacion as RequestHandler);
  adminRouter.post('/colores/importar/aplicar', crear, colores.aplicarImportacion as RequestHandler);
  adminRouter.get('/colores', ver, colores.listar as RequestHandler);
  adminRouter.post('/colores', crear, colores.crear as RequestHandler);
  adminRouter.get('/colores/:idColor', ver, colores.obtener as RequestHandler);
  adminRouter.put('/colores/:idColor', editar, colores.editar as RequestHandler);
  adminRouter.patch('/colores/:idColor/estado', cambiarEstado, colores.cambiarEstado as RequestHandler);
  adminRouter.get('/colores/:idColor/impacto-desactivacion', ver, colores.impacto as RequestHandler);

  // HU-CAT-02/09/10/12: productos
  adminRouter.get('/productos', ver, productos.listar as RequestHandler);
  adminRouter.post('/productos', crear, productos.crear as RequestHandler);
  adminRouter.get('/productos/:idProducto', ver, productos.obtener as RequestHandler);
  adminRouter.put('/productos/:idProducto', editar, productos.editar as RequestHandler);
  adminRouter.patch('/productos/:idProducto/estado', cambiarEstado, productos.cambiarEstado as RequestHandler);
  adminRouter.patch('/productos/:idProducto/publicacion', editar, productos.publicar as RequestHandler);
  adminRouter.get('/productos/:idProducto/impacto-desactivacion', ver, productos.impacto as RequestHandler);
  adminRouter.get('/productos/:idProducto/colores', ver, productos.colores as RequestHandler);

  // HU-CAT-07: imágenes de productos y de medidas
  adminRouter.get('/productos/:idProducto/imagenes', ver, imagenes.listar as RequestHandler);
  adminRouter.post('/productos/:idProducto/imagenes', editar, imagenes.subir as RequestHandler);
  adminRouter.patch('/productos/:idProducto/imagenes/orden', editar, imagenes.ordenar as RequestHandler);
  adminRouter.get('/imagenes/:idImagen', ver, imagenes.bytes as RequestHandler);
  adminRouter.patch('/imagenes/:idImagen/principal', editar, imagenes.marcarPrincipal as RequestHandler);
  adminRouter.patch('/imagenes/:idImagen/asociacion', editar, imagenes.cambiarAsociacion as RequestHandler);
  adminRouter.delete('/imagenes/:idImagen', editar, imagenes.eliminar as RequestHandler);
  adminRouter.get('/medidas/:idMedida/imagen', ver, imagenMedida.bytes as RequestHandler);
  adminRouter.put('/medidas/:idMedida/imagen', editar, imagenMedida.reemplazar as RequestHandler);
  adminRouter.delete('/medidas/:idMedida/imagen', editar, imagenMedida.quitar as RequestHandler);

  // HU-CAT-03: variantes
  // Combos (entrega 3): un producto con una sola variante.
  adminRouter.get('/combos', ver, combos.listar as RequestHandler);
  adminRouter.post('/combos', crear, combos.crear as RequestHandler);
  adminRouter.get('/combos/:idProducto', ver, combos.obtener as RequestHandler);
  adminRouter.put('/combos/:idProducto', editar, combos.editar as RequestHandler);

  adminRouter.post('/productos/:idProducto/variantes', crear, variantes.crear as RequestHandler);
  adminRouter.put('/variantes/:idVariante', editar, variantes.editar as RequestHandler);
  adminRouter.patch('/variantes/:idVariante/estado', cambiarEstado, variantes.cambiarEstado as RequestHandler);
  adminRouter.get('/variantes/:idVariante/impacto-desactivacion', ver, variantes.impacto as RequestHandler);

  // HU-CAT-06: consulta pública, sin sesión y solo GET.
  const publicRouter = Router();
  publicRouter.get('/categorias', consultaPublica.categorias as RequestHandler);
  publicRouter.get('/filtros', consultaPublica.filtros as RequestHandler);
  publicRouter.get('/productos', consultaPublica.listar as RequestHandler);
  publicRouter.get('/productos/:idProducto', consultaPublica.ficha as RequestHandler);
  publicRouter.get('/productos/:idProducto/colores', consultaPublica.colores as RequestHandler);
  publicRouter.get('/productos/:idProducto/ofertas', consultaPublica.ofertas as RequestHandler);
  publicRouter.get('/productos/:idProducto/complementarios', consultaPublica.complementarios as RequestHandler);
  publicRouter.get('/imagenes/:idImagen', consultaPublica.imagen as RequestHandler);
  publicRouter.get('/medidas/:idMedida/imagen', consultaPublica.imagenMedida as RequestHandler);
  publicRouter.get('/marcas/:idMarca/logotipo', consultaPublica.logotipo as RequestHandler);

  // M06: el impacto de desactivar cuenta los eventos que apuntan a la entidad (HU-CAT-11).
  if (dependencias.impactoReglas !== undefined) {
    for (const servicio of [clasificacionService, marcasService, lineasService, productosService, variantesService]) {
      servicio.conectarImpactoReglas(dependencias.impactoReglas);
    }
  }

  return {
    adminRouter,
    publicRouter,
    clasificacionService,
    marcasService,
    lineasService,
    medidasService,
    coloresService,
    productosService,
    variantesService,
    imagenesService,
    combosService,
    catalogoParaCompra: new CatalogoParaCompraService(new CompraRepository()),
  };
}
