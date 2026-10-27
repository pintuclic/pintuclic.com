import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { CalculadoraController } from './controllers/calculadora.controller';
import {
  CuestionarioAdminController,
  CuestionarioController,
} from './controllers/cuestionario.controller';
import { PERMISO_ASESORIA_EDITAR, PERMISO_ASESORIA_VER } from './dtos/m03-asesoria.dto';
import type {
  CalculadoraRepositoryPort,
  ConfiguracionCalculadoraPort,
} from './interfaces/calculadora.interface';
import type {
  CatalogoPreviewPort,
  ConfiguracionRepositoryPort,
  CuestionarioRepositoryPort,
  VocabularioRepositoryPort,
} from './interfaces/cuestionario.interface';
import { PrismaCalculadoraRepository } from './repositories/calculadora.repository';
import { PrismaConfiguracionAsesoriaRepository } from './repositories/configuracion.repository';
import { PrismaCuestionarioRepository } from './repositories/cuestionario.repository';
import { PrismaVocabularioRepository } from './repositories/vocabulario.repository';
import { AuditoriaAsesoria } from './services/auditoria-asesoria';
import { CalculadoraService } from './services/calculadora.service';
import { CuestionarioAdminService } from './services/cuestionario-admin.service';
import { CuestionarioService } from './services/cuestionario.service';

export interface DependenciasM03 {
  calculadoraRepo?: CalculadoraRepositoryPort;
  configuracionRepo?: ConfiguracionCalculadoraPort & ConfiguracionRepositoryPort;
  cuestionarioRepo?: CuestionarioRepositoryPort;
  vocabularioRepo?: VocabularioRepositoryPort;
  /**
   * La vista previa del cuestionario la resuelve M02 (R7). Sin este puerto el cuestionario
   * no puede anunciar cuántos productos cumplen, así que `app.routes.ts` siempre lo pasa.
   */
  catalogo?: CatalogoPreviewPort;
  /** Registro de auditoría de M20 (A1); si falta, los cambios no se registran. */
  auditoria?: AuditoriaPort;
}

/**
 * M03 — Asesoría y asistencia.
 *
 * Esta entrega monta la CALCULADORA (HU-ASE-02) y el CUESTIONARIO GUIADO en modo `fijo`
 * (HU-ASE-01), ninguno de los dos con inteligencia artificial: responden aunque el servicio
 * de IA esté caído (I6). El modo `asistido` y el asistente llegan en la etapa E4.
 */
export function construirModuloM03(
  autorizacion: AutorizacionService,
  dependencias: DependenciasM03 = {},
): {
  publicRouter: Router;
  adminRouter: Router;
  calculadoraService: CalculadoraService;
  cuestionarioService: CuestionarioService;
} {
  const configuracionRepo = dependencias.configuracionRepo ?? new PrismaConfiguracionAsesoriaRepository();
  const calculadoraRepo = dependencias.calculadoraRepo ?? new PrismaCalculadoraRepository();
  const cuestionarioRepo = dependencias.cuestionarioRepo ?? new PrismaCuestionarioRepository();
  const vocabularioRepo = dependencias.vocabularioRepo ?? new PrismaVocabularioRepository();

  // Sin el puerto del catálogo, la vista previa queda vacía en vez de romper el flujo.
  const catalogo: CatalogoPreviewPort = dependencias.catalogo ?? {
    contarYMostrar: async () => ({ total: 0, productos: [] }),
  };

  const calculadoraService = new CalculadoraService(calculadoraRepo, configuracionRepo);
  const cuestionarioService = new CuestionarioService(
    cuestionarioRepo,
    vocabularioRepo,
    configuracionRepo,
    catalogo,
  );
  const adminService = new CuestionarioAdminService(
    cuestionarioRepo,
    vocabularioRepo,
    configuracionRepo,
    new AuditoriaAsesoria(dependencias.auditoria ?? null),
  );

  const calculadora = new CalculadoraController(calculadoraService);
  const cuestionario = new CuestionarioController(cuestionarioService);
  const admin = new CuestionarioAdminController(adminService);

  /* ── Público (sin sesión) ───────────────────────────────────────────────── */
  const publicRouter = Router();
  publicRouter.get('/cuestionario', cuestionario.obtener as RequestHandler);
  publicRouter.post('/cuestionario/resultado', cuestionario.resultado as RequestHandler);
  publicRouter.get('/calculadora/productos', calculadora.listarProductos as RequestHandler);
  publicRouter.get(
    '/calculadora/productos/:idProducto',
    calculadora.obtenerDeProducto as RequestHandler,
  );
  publicRouter.post('/calculadora/calcular', calculadora.calcular as RequestHandler);

  /* ── Panel (sesión y permiso; sin él, 404 opaco por ADR-003) ────────────── */
  const puedeVer = requirePermission(autorizacion, PERMISO_ASESORIA_VER) as RequestHandler;
  const puedeEditar = requirePermission(autorizacion, PERMISO_ASESORIA_EDITAR) as RequestHandler;

  const adminRouter = Router();
  adminRouter.get('/cuestionario', puedeVer, admin.obtener as RequestHandler);
  adminRouter.post('/preguntas', puedeEditar, admin.crearPregunta as RequestHandler);
  adminRouter.patch('/preguntas/:idPregunta', puedeEditar, admin.editarPregunta as RequestHandler);
  adminRouter.post(
    '/preguntas/:idPregunta/opciones',
    puedeEditar,
    admin.crearOpcion as RequestHandler,
  );
  adminRouter.patch('/opciones/:idOpcion', puedeEditar, admin.editarOpcion as RequestHandler);
  adminRouter.put(
    '/opciones/:idOpcion/efectos',
    puedeEditar,
    admin.reemplazarEfectos as RequestHandler,
  );
  adminRouter.get('/configuracion', puedeVer, admin.obtenerConfiguracion as RequestHandler);
  adminRouter.patch('/configuracion', puedeEditar, admin.editarConfiguracion as RequestHandler);

  return { publicRouter, adminRouter, calculadoraService, cuestionarioService };
}
