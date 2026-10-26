import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  actualizarCuponRequestSchema,
  actualizarEventoRequestSchema,
  actualizarTipoClienteRequestSchema,
  calcularRequestSchema,
  cambiarEstadoRequestSchema,
  crearCuponRequestSchema,
  crearEventoRequestSchema,
  crearTipoClienteRequestSchema,
  listarCuponesRequestSchema,
  listarEventosRequestSchema,
  listarUsosCuponRequestSchema,
  simularRequestSchema,
  vistaPreviaEventoRequestSchema,
} from '../dtos/m06-precios.dto';
import { paginacionQuerySchema } from '../dtos/m06-precios.dto';
import type { CuponesService } from '../services/cupones.service';
import type { EventosService } from '../services/eventos.service';
import { errores } from '../services/precios-error';
import type { PreciosService } from '../services/precios.service';
import type { TiposClienteService } from '../services/tipos-cliente.service';
import { leerId, manejar, responderParametroInvalido, validar } from './precios-http';

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

/** M06: administración de eventos, cupones y tipos de cliente; simulador; cálculo y eventos en curso. */
export class PreciosController {
  constructor(
    private readonly eventos: EventosService,
    private readonly cupones: CuponesService,
    private readonly tipos: TiposClienteService,
    private readonly precios: PreciosService,
  ) {}

  private id(req: Request, res: Response, nombre: string): number | null {
    const id = leerId(req, nombre);
    if (id === null) responderParametroInvalido(res, 'El identificador no es válido.');
    return id;
  }

  /* ── Eventos ─────────────────────────────────────────────────────────── */

  listarEventos = manejar(async (req, res) => {
    const query = validar(res, listarEventosRequestSchema, req.query);
    if (query === null) return;
    const p = await this.eventos.listar(query);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  obtenerEvento = manejar(async (req, res) => {
    const id = this.id(req, res, 'idEvento');
    if (id === null) return;
    responderExito(res, await this.eventos.obtener(id));
  });

  crearEvento = manejar(async (req, res) => {
    const datos = validar(res, crearEventoRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.eventos.crear(datos, idUsuarioDe(req)), undefined, 201);
  });

  actualizarEvento = manejar(async (req, res) => {
    const id = this.id(req, res, 'idEvento');
    const datos = validar(res, actualizarEventoRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.eventos.actualizar(id, datos, idUsuarioDe(req)));
  });

  estadoEvento = manejar(async (req, res) => {
    const id = this.id(req, res, 'idEvento');
    const datos = validar(res, cambiarEstadoRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.eventos.cambiarEstado(id, datos.estado, idUsuarioDe(req)));
  });

  vistaPreviaEvento = manejar(async (req, res) => {
    const query = validar(res, paginacionQuerySchema, req.query);
    const datos = validar(res, vistaPreviaEventoRequestSchema, req.body);
    if (query === null || datos === null) return;
    const p = await this.eventos.vistaPrevia(datos, query.pagina, query.limite);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  /* ── Cupones ─────────────────────────────────────────────────────────── */

  listarCupones = manejar(async (req, res) => {
    const query = validar(res, listarCuponesRequestSchema, req.query);
    if (query === null) return;
    const p = await this.cupones.listar(query);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  obtenerCupon = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCupon');
    if (id === null) return;
    responderExito(res, await this.cupones.obtener(id));
  });

  crearCupon = manejar(async (req, res) => {
    const datos = validar(res, crearCuponRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.cupones.crear(datos, idUsuarioDe(req)), undefined, 201);
  });

  actualizarCupon = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCupon');
    const datos = validar(res, actualizarCuponRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.cupones.actualizar(id, datos, idUsuarioDe(req)));
  });

  estadoCupon = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCupon');
    const datos = validar(res, cambiarEstadoRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.cupones.cambiarEstado(id, datos.estado, idUsuarioDe(req)));
  });

  usosCupon = manejar(async (req, res) => {
    const id = this.id(req, res, 'idCupon');
    const query = validar(res, listarUsosCuponRequestSchema, req.query);
    if (id === null || query === null) return;
    const p = await this.cupones.usos(id, query);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  /* ── Tipos de cliente empresa ────────────────────────────────────────── */

  listarTipos = manejar(async (_req, res) => {
    responderExito(res, await this.tipos.listar());
  });

  crearTipo = manejar(async (req, res) => {
    const datos = validar(res, crearTipoClienteRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.tipos.crear(datos), undefined, 201);
  });

  actualizarTipo = manejar(async (req, res) => {
    const id = this.id(req, res, 'idSubRolEmpresa');
    const datos = validar(res, actualizarTipoClienteRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.tipos.actualizar(id, datos));
  });

  estadoTipo = manejar(async (req, res) => {
    const id = this.id(req, res, 'idSubRolEmpresa');
    const datos = validar(res, cambiarEstadoRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.tipos.cambiarEstado(id, datos.estado));
  });

  /* ── Simulador (administración) ──────────────────────────────────────── */

  simular = manejar(async (req, res) => {
    const datos = validar(res, simularRequestSchema, req.body);
    if (datos === null) return;
    const calculo = await this.precios.calcular({
      lineas: datos.lineas,
      ...(datos.codigoCupon === undefined ? {} : { codigoCupon: datos.codigoCupon }),
      contexto: {
        idUsuario: datos.idUsuario ?? null,
        perfil: datos.perfil,
        ...(datos.momento === undefined ? {} : { momento: datos.momento }),
      },
    });
    responderExito(res, calculo);
  });

  /* ── Público ─────────────────────────────────────────────────────────── */

  /** El perfil sale de la sesión si la hay; `precioAcordado` y `momento` no se aceptan del cliente. */
  calcular = manejar(async (req, res) => {
    const datos = validar(res, calcularRequestSchema, req.body);
    if (datos === null) return;
    const calculo = await this.precios.calcular({
      lineas: datos.lineas,
      ...(datos.codigoCupon === undefined ? {} : { codigoCupon: datos.codigoCupon }),
      contexto: { idUsuario: req.actor?.idUsuario ?? null },
    });
    res.setHeader('Cache-Control', 'no-store');
    responderExito(res, calculo);
  });

  eventosEnCurso = manejar(async (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60');
    responderExito(res, await this.eventos.enCurso());
  });
}
