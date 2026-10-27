import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import {
  actualizarCotizacionRequestSchema,
  crearCotizacionRequestSchema,
  idCotizacionParamsSchema,
  listarCotizacionesAdminRequestSchema,
  listarMisCotizacionesRequestSchema,
  rechazarAdminRequestSchema,
  rechazarClienteRequestSchema,
} from '../dtos/m21-cotizaciones.dto';
import { CotizacionesError, errores } from '../services/cotizaciones-error';
import type { CotizacionesService, Pagina } from '../services/cotizaciones.service';

/** Valida con Zod; si falla responde 400 y devuelve null. */
function validar<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const r = esquema.safeParse(entrada);
  if (r.success) return r.data;
  res.status(400).json({
    success: false,
    error: { code: 'PARAMETRO_INVALIDO', message: r.error.issues[0]?.message ?? 'Parámetros inválidos.', details: null },
  });
  return null;
}

function exito<T>(res: Response, data: T): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data });
}

function pagina<T>(res: Response, p: Pagina<T>): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: p.items,
    pagination: { pagina: p.pagina, limite: p.limite, total: p.total, totalPaginas: Math.ceil(p.total / p.limite) },
  });
}

/** R1: la identidad sale de la sesión verificada en servidor, nunca del cliente. */
function actor(req: Request): number {
  const id = req.actor?.idUsuario;
  if (id === undefined) throw errores.noDisponible();
  return id;
}

/** Traduce los errores de dominio; el resto va al manejador global (500 opaco). */
function manejar(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err: unknown) {
      if (err instanceof CotizacionesError) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: null } });
        return;
      }
      throw err;
    }
  };
}

/** HTTP de M21: valida `params`, `query` y `body` con Zod y delega en el servicio. */
export class CotizacionesController {
  constructor(private readonly servicio: CotizacionesService) {}

  /* ── Cliente ──────────────────────────────────────────────────────────── */

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearCotizacionRequestSchema, req.body ?? {});
    if (datos === null) return;
    exito(res, await this.servicio.crear(actor(req), datos));
  });

  listarMias = manejar(async (req, res) => {
    const q = validar(res, listarMisCotizacionesRequestSchema, req.query);
    if (q === null) return;
    pagina(res, await this.servicio.listarMias(actor(req), q));
  });

  obtenerMia = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.obtenerMia(actor(req), p.idCotizacion));
  });

  aceptar = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.aceptar(actor(req), p.idCotizacion));
  });

  rechazarComoCliente = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    const datos = validar(res, rechazarClienteRequestSchema, req.body ?? {});
    if (datos === null) return;
    exito(res, await this.servicio.rechazarComoCliente(actor(req), p.idCotizacion, datos));
  });

  /* ── Panel ────────────────────────────────────────────────────────────── */

  listarAdmin = manejar(async (req, res) => {
    const q = validar(res, listarCotizacionesAdminRequestSchema, req.query);
    if (q === null) return;
    pagina(res, await this.servicio.listarAdmin(q));
  });

  obtenerAdmin = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.obtenerAdmin(p.idCotizacion));
  });

  actualizar = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    const datos = validar(res, actualizarCotizacionRequestSchema, req.body);
    if (datos === null) return;
    exito(res, await this.servicio.actualizar(p.idCotizacion, datos));
  });

  enviar = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.enviar(p.idCotizacion, actor(req)));
  });

  rechazarComoAdmin = manejar(async (req, res) => {
    const p = validar(res, idCotizacionParamsSchema, req.params);
    if (p === null) return;
    const datos = validar(res, rechazarAdminRequestSchema, req.body);
    if (datos === null) return;
    exito(res, await this.servicio.rechazarComoAdmin(p.idCotizacion, actor(req), datos));
  });
}
