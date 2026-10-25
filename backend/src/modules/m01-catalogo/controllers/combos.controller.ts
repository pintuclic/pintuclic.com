import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  crearComboRequestSchema,
  editarComboRequestSchema,
  listarCombosRequestSchema,
} from '../dtos/m01-catalogo-entrega3.dto';
import type { CombosService } from '../services/combos.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';
import { responderPagina } from './catalogos.controller';

/** HU-CAT-13: combos (K1–K10). Estado, publicación, imágenes e impacto usan las rutas de producto. */
export class CombosController {
  constructor(private readonly servicio: CombosService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idProducto');
    if (valor === null) responderParametroInvalido(res, 'El identificador del combo no es válido.');
    return valor;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarCombosRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  obtener = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.obtener(id));
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearComboRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Combo creado', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, editarComboRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });
}
