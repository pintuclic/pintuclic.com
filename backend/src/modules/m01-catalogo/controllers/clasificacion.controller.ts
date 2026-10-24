import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  cambiarEstadoRequestSchema,
  crearCategoriaRequestSchema,
  crearSubcategoriaRequestSchema,
  editarCategoriaRequestSchema,
  editarSubcategoriaRequestSchema,
  listarCompletoRequestSchema,
} from '../dtos/m01-catalogo.dto';
import type { ClasificacionService } from '../services/clasificacion.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';

export class ClasificacionController {
  constructor(private readonly servicio: ClasificacionService) {}

  listar = manejar(async (req: Request, res: Response) => {
    const query = validar(res, listarCompletoRequestSchema, req.query);
    if (query === null) return;
    responderExito(res, await this.servicio.listar(query));
  });

  crear = manejar(async (req: Request, res: Response) => {
    const datos = validar(res, crearCategoriaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Categoría creada', 201);
  });

  editar = manejar(async (req: Request, res: Response) => {
    const id = leerId(req, 'idCategoria');
    if (id === null) return responderParametroInvalido(res, 'El identificador de la categoría no es válido.');
    const datos = validar(res, editarCategoriaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  cambiarEstado = manejar(async (req: Request, res: Response) => {
    const id = leerId(req, 'idCategoria');
    if (id === null) return responderParametroInvalido(res, 'El identificador de la categoría no es válido.');
    const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  impacto = manejar(async (req: Request, res: Response) => {
    const id = leerId(req, 'idCategoria');
    if (id === null) return responderParametroInvalido(res, 'El identificador de la categoría no es válido.');
    responderExito(res, await this.servicio.impacto(id));
  });

  crearSubcategoria = manejar(async (req: Request, res: Response) => {
    const idCategoria = leerId(req, 'idCategoria');
    if (idCategoria === null) return responderParametroInvalido(res, 'El identificador de la categoría no es válido.');
    const datos = validar(res, crearSubcategoriaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crearSubcategoria(idCategoria, datos), 'Subcategoría creada', 201);
  });

  editarSubcategoria = manejar(async (req: Request, res: Response) => {
    const id = leerId(req, 'idSubcategoria');
    if (id === null) return responderParametroInvalido(res, 'El identificador de la subcategoría no es válido.');
    const datos = validar(res, editarSubcategoriaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editarSubcategoria(id, datos));
  });

  cambiarEstadoSubcategoria = manejar(async (req: Request, res: Response) => {
    const id = leerId(req, 'idSubcategoria');
    if (id === null) return responderParametroInvalido(res, 'El identificador de la subcategoría no es válido.');
    const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstadoSubcategoria(id, peticion));
  });

  impactoSubcategoria = manejar(async (req: Request, res: Response) => {
    const id = leerId(req, 'idSubcategoria');
    if (id === null) return responderParametroInvalido(res, 'El identificador de la subcategoría no es válido.');
    responderExito(res, await this.servicio.impactoSubcategoria(id));
  });
}
