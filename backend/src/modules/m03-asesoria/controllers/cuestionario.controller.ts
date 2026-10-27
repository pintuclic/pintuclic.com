import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  crearOpcionRequestSchema,
  crearPreguntaRequestSchema,
  editarConfiguracionRequestSchema,
  editarOpcionRequestSchema,
  editarPreguntaRequestSchema,
  reemplazarEfectosRequestSchema,
  resultadoFijoRequestSchema,
} from '../dtos/cuestionario.dto';
import { recursoNoDisponible } from '../services/asesoria.error';
import type { ActorAuditoria } from '../services/auditoria-asesoria';
import type { CuestionarioAdminService } from '../services/cuestionario-admin.service';
import type { CuestionarioService } from '../services/cuestionario.service';
import { leerId, manejar, validar } from './asesoria-http';

/** Quién hace el cambio, para el registro de auditoría (A1). */
function actorDe(req: Request): ActorAuditoria {
  return {
    idUsuario: req.actor?.idUsuario ?? null,
    nombre: null,
    ipOrigen: typeof req.ip === 'string' ? req.ip : null,
  };
}

/** HU-ASE-01 — público. Las dos rutas son abiertas: no piden sesión (R1, CA-ASE-01-01). */
export class CuestionarioController {
  constructor(private readonly servicio: CuestionarioService) {}

  /** GET /asesoria/cuestionario */
  obtener = manejar(async (_req: Request, res: Response): Promise<void> => {
    responderExito(res, await this.servicio.obtenerPublico());
  });

  /** POST /asesoria/cuestionario/resultado */
  resultado = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, resultadoFijoRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.calcularResultado(datos));
  });
}

/** HU-ASE-01 — panel. Lectura con `asesoria.ver`, escritura con `asesoria.editar`. */
export class CuestionarioAdminController {
  constructor(private readonly servicio: CuestionarioAdminService) {}

  /** GET /admin/asesoria/cuestionario */
  obtener = manejar(async (_req: Request, res: Response): Promise<void> => {
    responderExito(res, await this.servicio.obtener());
  });

  /** POST /admin/asesoria/preguntas */
  crearPregunta = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, crearPreguntaRequestSchema, req.body);
    if (datos === null) return;
    const pregunta = await this.servicio.crearPregunta(datos, actorDe(req));
    res.status(201).json({ success: true, data: pregunta, message: 'Pregunta creada.' });
  });

  /** PATCH /admin/asesoria/preguntas/:idPregunta */
  editarPregunta = manejar(async (req: Request, res: Response): Promise<void> => {
    const idPregunta = leerId(req, 'idPregunta');
    if (idPregunta === null) throw recursoNoDisponible();

    const datos = validar(res, editarPreguntaRequestSchema, req.body);
    if (datos === null) return;

    const pregunta = await this.servicio.editarPregunta(idPregunta, datos, actorDe(req));
    responderExito(res, pregunta, 'Pregunta actualizada.');
  });

  /** POST /admin/asesoria/preguntas/:idPregunta/opciones */
  crearOpcion = manejar(async (req: Request, res: Response): Promise<void> => {
    const idPregunta = leerId(req, 'idPregunta');
    if (idPregunta === null) throw recursoNoDisponible();

    const datos = validar(res, crearOpcionRequestSchema, req.body);
    if (datos === null) return;

    const opcion = await this.servicio.crearOpcion(idPregunta, datos, actorDe(req));
    res.status(201).json({ success: true, data: opcion, message: 'Opción creada.' });
  });

  /** PATCH /admin/asesoria/opciones/:idOpcion */
  editarOpcion = manejar(async (req: Request, res: Response): Promise<void> => {
    const idOpcion = leerId(req, 'idOpcion');
    if (idOpcion === null) throw recursoNoDisponible();

    const datos = validar(res, editarOpcionRequestSchema, req.body);
    if (datos === null) return;

    const opcion = await this.servicio.editarOpcion(idOpcion, datos, actorDe(req));
    responderExito(res, opcion, 'Opción actualizada.');
  });

  /** PUT /admin/asesoria/opciones/:idOpcion/efectos */
  reemplazarEfectos = manejar(async (req: Request, res: Response): Promise<void> => {
    const idOpcion = leerId(req, 'idOpcion');
    if (idOpcion === null) throw recursoNoDisponible();

    const datos = validar(res, reemplazarEfectosRequestSchema, req.body);
    if (datos === null) return;

    const opcion = await this.servicio.reemplazarEfectos(idOpcion, datos, actorDe(req));
    responderExito(res, opcion, 'Filtros de la opción actualizados.');
  });

  /** GET /admin/asesoria/configuracion */
  obtenerConfiguracion = manejar(async (_req: Request, res: Response): Promise<void> => {
    responderExito(res, await this.servicio.obtenerConfiguracion());
  });

  /** PATCH /admin/asesoria/configuracion */
  editarConfiguracion = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, editarConfiguracionRequestSchema, req.body);
    if (datos === null) return;

    const configuracion = await this.servicio.editarConfiguracion(datos, actorDe(req));
    responderExito(res, configuracion, 'Configuración actualizada.');
  });
}
