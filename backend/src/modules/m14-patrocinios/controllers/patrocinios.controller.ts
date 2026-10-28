import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  actualizarCampaniaRequestSchema,
  bloqueQuerySchema,
  buscarReferenciasRequestSchema,
  cambiarEstadoRequestSchema,
  crearCampaniaRequestSchema,
  listarCampaniasRequestSchema,
  vistaPreviaCampaniaRequestSchema,
  vistaPreviaQuerySchema,
} from '../dtos/m14-patrocinios.dto';
import type { CampaniasService } from '../services/campanias.service';
import type { PatrocinioService } from '../services/patrocinio.service';
import { errores } from '../services/patrocinios-error';
import { leerId, manejar, responderParametroInvalido, validar } from './patrocinios-http';

function responderPagina<T>(res: Response, items: T[], total: number, pagina: number, limite: number): void {
  res.status(200).json({
    success: true,
    data: items,
    pagination: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
  });
}

/** El usuario sale de la sesión verificada en el servidor; nunca del cuerpo (Anti-IDOR). */
function idUsuarioDe(req: Request): number {
  if (req.actor === undefined) throw errores.noDisponible();
  return req.actor.idUsuario;
}

/** M14: administración de campañas de patrocinio y bloque público «Productos patrocinados». */
export class PatrociniosController {
  constructor(
    private readonly campanias: CampaniasService,
    private readonly patrocinio: PatrocinioService,
  ) {}

  private id(req: Request, res: Response, nombre: string): number | null {
    const id = leerId(req, nombre);
    if (id === null) responderParametroInvalido(res, 'El identificador no es válido.');
    return id;
  }

  listarCampanias = manejar(async (req, res) => {
    const query = validar(res, listarCampaniasRequestSchema, req.query);
    if (query === null) return;
    const p = await this.campanias.listar(query);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  obtenerCampania = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCampania');
    if (id === null) return;
    responderExito(res, await this.campanias.obtener(id));
  });

  crearCampania = manejar(async (req, res) => {
    const datos = validar(res, crearCampaniaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.campanias.crear(datos, idUsuarioDe(req)), undefined, 201);
  });

  actualizarCampania = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCampania');
    const datos = validar(res, actualizarCampaniaRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.campanias.actualizar(id, datos, idUsuarioDe(req)));
  });

  estadoCampania = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCampania');
    const datos = validar(res, cambiarEstadoRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.campanias.cambiarEstado(id, datos.estado, idUsuarioDe(req)));
  });

  productosCampania = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCampania');
    const query = validar(res, vistaPreviaQuerySchema, req.query);
    if (id === null || query === null) return;
    const p = await this.campanias.productosDeCampania(id, query.pagina, query.limite);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  vistaPrevia = manejar(async (req, res) => {
    const query = validar(res, vistaPreviaQuerySchema, req.query);
    const datos = validar(res, vistaPreviaCampaniaRequestSchema, req.body);
    if (query === null || datos === null) return;
    const p = await this.campanias.vistaPrevia(datos.objetivos, query.pagina, query.limite);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  buscarReferencias = manejar(async (req, res) => {
    const query = validar(res, buscarReferenciasRequestSchema, req.query);
    if (query === null) return;
    responderExito(res, await this.campanias.buscarReferencias(query));
  });

  /** Público (A10): el bloque del inicio. */
  bloqueInicio = manejar(async (req, res) => {
    const query = validar(res, bloqueQuerySchema, req.query);
    if (query === null) return;
    responderExito(res, await this.patrocinio.bloqueInicio(query.limite));
  });
}
