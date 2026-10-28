import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  buscarColoresRequestSchema,
  buscarProductosRequestSchema,
  listarSinResultadoRequestSchema,
  opcionesFiltroRequestSchema,
} from '../dtos/m02-busqueda.dto';
import type { BusquedaServicePort } from '../interfaces/busqueda.interface';

function validarQuery<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'PARAMETRO_INVALIDO',
        message: resultado.error.issues[0]?.message ?? 'Parámetros inválidos.',
        details: null,
      },
    });
    return null;
  }
  return resultado.data;
}

export class BusquedaController {
  constructor(private readonly servicio: BusquedaServicePort) {}

  buscarProductos = async (req: Request, res: Response): Promise<void> => {
    const query = validarQuery(res, buscarProductosRequestSchema, req.query);
    if (!query) return;

    const idUsuario = (req as unknown as { usuario?: { idUsuario: number } }).usuario?.idUsuario ?? null;
    const resultado = await this.servicio.buscarProductos(query, { idUsuario });

    res.status(200).json({
      success: true,
      data: resultado.items,
      pagination: {
        pagina: resultado.pagina,
        limite: resultado.limite,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
      },
    });
  };

  obtenerFiltros = async (req: Request, res: Response): Promise<void> => {
    const query = validarQuery(res, opcionesFiltroRequestSchema, req.query);
    if (!query) return;

    const idUsuario = (req as unknown as { usuario?: { idUsuario: number } }).usuario?.idUsuario ?? null;
    const resultado = await this.servicio.obtenerOpcionesFiltro(query, { idUsuario });

    responderExito(res, resultado);
  };

  buscarColores = async (req: Request, res: Response): Promise<void> => {
    const query = validarQuery(res, buscarColoresRequestSchema, req.query);
    if (!query) return;

    const resultado = await this.servicio.buscarColores(query);

    res.status(200).json({
      success: true,
      data: resultado.items,
      pagination: {
        pagina: resultado.pagina,
        limite: resultado.limite,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
      },
    });
  };

  listarSinResultado = async (req: Request, res: Response): Promise<void> => {
    const query = validarQuery(res, listarSinResultadoRequestSchema, req.query);
    if (!query) return;

    const resultado = await this.servicio.listarBusquedasSinResultado(query);

    res.status(200).json({
      success: true,
      data: resultado.items,
      pagination: {
        pagina: resultado.pagina,
        limite: resultado.limite,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
      },
    });
  };
}
