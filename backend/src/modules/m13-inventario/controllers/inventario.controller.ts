import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  aplicarCargaRequestSchema,
  ajustarExistenciaRequestSchema,
  listarHistorialRequestSchema,
  listarInventarioRequestSchema,
  plantillaRequestSchema,
  previsualizarCargaRequestSchema,
} from '../dtos/m13-inventario.dto';
import type { CargaService } from '../services/carga.service';
import type { InventarioService } from '../services/inventario.service';
import { errores } from '../services/inventario-error';
import { leerId, manejar, responderParametroInvalido, validar } from './inventario-http';

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

/** M13: existencias, ajuste manual, historial, plantilla y carga masiva. */
export class InventarioController {
  constructor(
    private readonly inventario: InventarioService,
    private readonly carga: CargaService,
  ) {}

  private idVariante(req: Request, res: Response): number | null {
    const id = leerId(req, 'idVariante');
    if (id === null) responderParametroInvalido(res, 'El identificador de la variante no es válido.');
    return id;
  }

  resumen = manejar(async (_req, res) => {
    responderExito(res, await this.inventario.resumen());
  });

  listar = manejar(async (req, res) => {
    const query = validar(res, listarInventarioRequestSchema, req.query);
    if (query === null) return;
    const pagina = await this.inventario.listar(query);
    responderPagina(res, pagina.items, pagina.total, query.pagina, query.limite);
  });

  obtener = manejar(async (req, res) => {
    const id = this.idVariante(req, res);
    if (id === null) return;
    responderExito(res, await this.inventario.obtener(id));
  });

  ajustar = manejar(async (req, res) => {
    const id = this.idVariante(req, res);
    if (id === null) return;
    const peticion = validar(res, ajustarExistenciaRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.inventario.ajustar(id, peticion, idUsuarioDe(req)));
  });

  historial = manejar(async (req, res) => {
    const query = validar(res, listarHistorialRequestSchema, req.query);
    if (query === null) return;
    const pagina = await this.inventario.historial(query);
    responderPagina(res, pagina.items, pagina.total, query.pagina, query.limite);
  });

  plantilla = manejar(async (req, res) => {
    const query = validar(res, plantillaRequestSchema, req.query);
    if (query === null) return;
    const csv = await this.inventario.plantilla(query);
    res
      .status(200)
      .type('text/csv; charset=utf-8')
      .setHeader('Content-Disposition', 'attachment; filename="plantilla-inventario.csv"')
      .setHeader('Cache-Control', 'no-store')
      .send(csv);
  });

  previsualizar = manejar(async (req, res) => {
    const peticion = validar(res, previsualizarCargaRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.carga.previsualizar(peticion));
  });

  aplicar = manejar(async (req, res) => {
    const peticion = validar(res, aplicarCargaRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.carga.aplicar(peticion, idUsuarioDe(req)), 'Carga aplicada');
  });
}
