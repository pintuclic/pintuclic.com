import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import {
  codigoSolicitudParamsSchema,
  crearSolicitudRequestSchema,
  listarSolicitudesAdminRequestSchema,
  prepararCheckoutRequestSchema,
  reintentarPagoRequestSchema,
} from '../dtos/m07-checkout.dto';
import type { Pagina } from '../interfaces/checkout.interface';
import { CheckoutError, errores } from '../services/checkout-error';
import type { CheckoutService } from '../services/checkout.service';

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

function exito<T>(res: Response, data: T, status = 200): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json({ success: true, data });
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

function ipDe(req: Request): string | null {
  return req.ip ?? null;
}

/** Traduce los errores de dominio; el resto va al manejador global (500 opaco). */
function manejar(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err: unknown) {
      if (err instanceof CheckoutError) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
        return;
      }
      throw err;
    }
  };
}

/** HTTP de M07: valida `params`, `query` y `body` con Zod y delega en el servicio. */
export class CheckoutController {
  constructor(private readonly servicio: CheckoutService) {}

  /* ── Cliente ──────────────────────────────────────────────────────────── */

  preparar = manejar(async (req, res) => {
    const q = validar(res, prepararCheckoutRequestSchema, req.query);
    if (q === null) return;
    const directa =
      q.idVariante === undefined ? undefined : { idVariante: q.idVariante, idColor: q.idColor ?? null, cantidad: q.cantidad ?? 1 };
    exito(res, await this.servicio.preparar(actor(req), q.codigoCupon, directa));
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearSolicitudRequestSchema, req.body);
    if (datos === null) return;
    exito(res, await this.servicio.crear(actor(req), datos), 201);
  });

  obtener = manejar(async (req, res) => {
    const p = validar(res, codigoSolicitudParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.obtenerMia(actor(req), p.codigo));
  });

  reintentar = manejar(async (req, res) => {
    const p = validar(res, codigoSolicitudParamsSchema, req.params);
    if (p === null) return;
    const datos = validar(res, reintentarPagoRequestSchema, req.body);
    if (datos === null) return;
    exito(res, await this.servicio.reintentar(actor(req), p.codigo, datos));
  });

  cancelar = manejar(async (req, res) => {
    const p = validar(res, codigoSolicitudParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.cancelar(actor(req), p.codigo));
  });

  /* ── Wompi ────────────────────────────────────────────────────────────── */

  /** R5 c: 200 vacío con firma válida; Wompi reintenta si no lo recibe. */
  evento = manejar(async (req, res) => {
    const cabecera = req.get('x-event-checksum') ?? null;
    await this.servicio.procesarEvento(req.body, cabecera, ipDe(req));
    res.status(200).end();
  });

  /* ── Panel ────────────────────────────────────────────────────────────── */

  listar = manejar(async (req, res) => {
    const q = validar(res, listarSolicitudesAdminRequestSchema, req.query);
    if (q === null) return;
    pagina(res, await this.servicio.listar(q));
  });

  obtenerAdmin = manejar(async (req, res) => {
    const p = validar(res, codigoSolicitudParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.obtenerAdmin(p.codigo));
  });

  consultarWompi = manejar(async (req, res) => {
    const p = validar(res, codigoSolicitudParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.consultarWompi(p.codigo, actor(req), ipDe(req)));
  });

  reintentarOrden = manejar(async (req, res) => {
    const p = validar(res, codigoSolicitudParamsSchema, req.params);
    if (p === null) return;
    exito(res, await this.servicio.reintentarOrden(p.codigo, actor(req), ipDe(req)));
  });
}
