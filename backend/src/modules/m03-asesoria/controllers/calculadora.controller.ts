import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  calcularRequestSchema,
  listarProductosCalculablesQuerySchema,
} from '../dtos/m03-asesoria.dto';
import { recursoNoDisponible } from '../services/asesoria.error';
import type { CalculadoraService } from '../services/calculadora.service';
import { leerId, manejar, validar } from './asesoria-http';

/**
 * HU-ASE-02 — Calculadora. Las tres rutas son PÚBLICAS: no piden sesión (K11,
 * CA-ASE-02-09).
 */
export class CalculadoraController {
  constructor(private readonly servicio: CalculadoraService) {}

  /** GET /asesoria/calculadora/productos — el selector con buscador de la landing (K10). */
  listarProductos = manejar(async (req: Request, res: Response): Promise<void> => {
    const query = validar(res, listarProductosCalculablesQuerySchema, req.query);
    if (query === null) return;

    const { datos, total } = await this.servicio.listarProductos(query);
    res.status(200).json({
      success: true,
      data: datos,
      pagination: {
        page: query.pagina,
        limit: query.limite,
        total,
        totalPages: Math.ceil(total / query.limite),
      },
    });
  });

  /** GET /asesoria/calculadora/productos/:idProducto */
  obtenerDeProducto = manejar(async (req: Request, res: Response): Promise<void> => {
    const idProducto = leerId(req, 'idProducto');
    if (idProducto === null) throw recursoNoDisponible();

    const calculadora = await this.servicio.obtenerDeProducto(idProducto);
    responderExito(res, calculadora);
  });

  /** POST /asesoria/calculadora/calcular */
  calcular = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, calcularRequestSchema, req.body);
    if (datos === null) return;

    const resultado = await this.servicio.calcular(datos);
    responderExito(res, resultado);
  });
}
