import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import type { NotificacionesPort } from '../m18-notificaciones/interfaces/notificaciones.port';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { AvisoServicioIaM18 } from './adapters/aviso-m18.adapter';
import {
  AsistenteController,
  CuestionarioAsistidoController,
  IaAdminController,
} from './controllers/asistente.controller';
import { CalculadoraController } from './controllers/calculadora.controller';
import {
  CuestionarioAdminController,
  CuestionarioController,
} from './controllers/cuestionario.controller';
import {
  CHAT_MENSAJES_POR_MINUTO,
  PERMISO_ASESORIA_EDITAR,
  PERMISO_ASESORIA_VER,
  TURNOS_CUESTIONARIO_POR_MINUTO,
} from './dtos/m03-asesoria.dto';
import { GeminiClient } from './gemini/gemini.client';
import { leerConfiguracionGemini } from './gemini/gemini.config';
import { LimitadorPorMinuto } from './gemini/limitador-minuto';
import { ResilienciaIa } from './gemini/resiliencia-ia';
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
import {
  PrismaIncidentesRepository,
  type IncidentesRepositoryPort,
} from './repositories/incidentes.repository';
import { PrismaVocabularioRepository } from './repositories/vocabulario.repository';
import { AuditoriaAsesoria } from './services/auditoria-asesoria';
import { AsistenteService, type ContextoCatalogoPort } from './services/asistente.service';
import { CalculadoraService } from './services/calculadora.service';
import { CuestionarioAdminService } from './services/cuestionario-admin.service';
import { CuestionarioAsistidoService } from './services/cuestionario-asistido.service';
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
  /** H3: la lista cerrada de productos del asistente. Sin él, el asistente no se ofrece. */
  contextoCatalogo?: ContextoCatalogoPort;
  incidentesRepo?: IncidentesRepositoryPort;
  /** I9: por dónde sale la alerta al administrador. */
  notificaciones?: NotificacionesPort;
  correoAdministrador?: string;
  /** Solo para pruebas: sustituye al cliente real de Gemini. */
  gemini?: GeminiClient | null;
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
  asistenteService: AsistenteService;
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
  const adminService = new CuestionarioAdminService(
    cuestionarioRepo,
    vocabularioRepo,
    configuracionRepo,
    new AuditoriaAsesoria(dependencias.auditoria ?? null),
  );

  /* ── Inteligencia artificial (carpeta `gemini/`, aislada del resto) ─────── */
  const incidentesRepo = dependencias.incidentesRepo ?? new PrismaIncidentesRepository();
  const resiliencia = new ResilienciaIa(
    incidentesRepo,
    new AvisoServicioIaM18(
      dependencias.notificaciones ?? null,
      dependencias.correoAdministrador ?? null,
    ),
  );

  // Sin `GEMINI_API_KEY` el cliente es null: el asistente se declara «no configurado» y el
  // resto del módulo —calculadora y cuestionario fijo— sigue funcionando igual (I6).
  const configGemini = leerConfiguracionGemini();
  const gemini =
    dependencias.gemini !== undefined
      ? dependencias.gemini
      : configGemini === null
        ? null
        : new GeminiClient(configGemini);

  // Sin contexto de catálogo el asistente no puede acotar lo que menciona, así que no se ofrece.
  const contextoCatalogo = dependencias.contextoCatalogo ?? null;
  const asistenteService = new AsistenteService(
    contextoCatalogo === null ? null : gemini,
    resiliencia,
    configuracionRepo,
    contextoCatalogo ?? { buscarParaAsistente: async () => ({ resumen: [], tarjetas: new Map() }) },
    incidentesRepo,
  );
  const asistidoService = new CuestionarioAsistidoService(
    gemini,
    resiliencia,
    vocabularioRepo,
    configuracionRepo,
    catalogo,
  );

  // El cuestionario consulta la disponibilidad de la IA para no ofrecer el modo asistido
  // cuando el servicio está caído o suspendido (R10).
  const cuestionarioService = new CuestionarioService(
    cuestionarioRepo,
    vocabularioRepo,
    configuracionRepo,
    catalogo,
    () => asistenteService.estadoPublico().disponible,
  );

  const calculadora = new CalculadoraController(calculadoraService);
  const cuestionario = new CuestionarioController(cuestionarioService);
  const admin = new CuestionarioAdminController(adminService);
  const asistente = new AsistenteController(
    asistenteService,
    new LimitadorPorMinuto(CHAT_MENSAJES_POR_MINUTO),
  );
  const asistido = new CuestionarioAsistidoController(
    asistidoService,
    new LimitadorPorMinuto(TURNOS_CUESTIONARIO_POR_MINUTO),
  );
  const ia = new IaAdminController(asistenteService, incidentesRepo);

  /* ── Público (sin sesión) ───────────────────────────────────────────────── */
  const publicRouter = Router();
  publicRouter.get('/cuestionario', cuestionario.obtener as RequestHandler);
  publicRouter.post('/cuestionario/resultado', cuestionario.resultado as RequestHandler);
  publicRouter.post('/cuestionario/turno', asistido.turno as RequestHandler);
  publicRouter.get('/asistente/estado', asistente.estado as RequestHandler);
  publicRouter.post('/asistente/mensajes', asistente.responder as RequestHandler);
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
  adminRouter.get('/ia/estado', puedeVer, ia.estado as RequestHandler);
  adminRouter.get('/incidentes', puedeVer, ia.listarIncidentes as RequestHandler);

  return {
    publicRouter,
    adminRouter,
    calculadoraService,
    cuestionarioService,
    asistenteService,
  };
}
