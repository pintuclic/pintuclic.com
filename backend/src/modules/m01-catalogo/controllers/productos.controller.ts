import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  cambiarEstadoProductoRequestSchema,
  crearProductoRequestSchema,
  crearVarianteRequestSchema,
  editarProductoRequestSchema,
  editarVarianteRequestSchema,
  listarColoresProductoRequestSchema,
  listarProductosRequestSchema,
  publicarProductoRequestSchema,
} from '../dtos/m01-catalogo-productos.dto';
import type { ProductosService } from '../services/productos.service';
import type { VariantesService } from '../services/variantes.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';
import { responderPagina } from './catalogos.controller';

/** Respuesta de la carta de colores: paginada y con las familias presentes (U4). */
export function responderColores(
  res: Response,
  resultado: { items: unknown[]; total: number; familias: unknown[] },
  pagina: number,
  limite: number,
): void {
  res.status(200).json({
    success: true,
    data: resultado.items,
    pagination: {
      pagina,
      limite,
      total: resultado.total,
      totalPaginas: Math.ceil(resultado.total / limite),
    },
    familias: resultado.familias,
  });
}

export class ProductosController {
  constructor(private readonly servicio: ProductosService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idProducto');
    if (valor === null) responderParametroInvalido(res, 'El identificador del producto no es válido.');
    return valor;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarProductosRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  obtener = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.obtener(id));
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearProductoRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Producto creado', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, editarProductoRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  cambiarEstado = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const peticion = validar(res, cambiarEstadoProductoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  publicar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const peticion = validar(res, publicarProductoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.publicar(id, peticion.publicado));
  });

  impacto = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.impacto(id));
  });

  colores = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const query = validar(res, listarColoresProductoRequestSchema, req.query);
    if (query === null) return;
    responderColores(res, await this.servicio.listarColores(id, query), query.pagina, query.limite);
  });
}

export class VariantesController {
  constructor(private readonly servicio: VariantesService) {}

  private idVariante(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idVariante');
    if (valor === null) responderParametroInvalido(res, 'El identificador de la variante no es válido.');
    return valor;
  }

  crear = manejar(async (req, res) => {
    const idProducto = leerId(req, 'idProducto');
    if (idProducto === null) {
      responderParametroInvalido(res, 'El identificador del producto no es válido.');
      return;
    }
    const datos = validar(res, crearVarianteRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(idProducto, datos), 'Variante creada', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.idVariante(req, res);
    if (id === null) return;
    const datos = validar(res, editarVarianteRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  cambiarEstado = manejar(async (req, res) => {
    const id = this.idVariante(req, res);
    if (id === null) return;
    const peticion = validar(res, cambiarEstadoProductoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  impacto = manejar(async (req, res) => {
    const id = this.idVariante(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.impacto(id));
  });
}
