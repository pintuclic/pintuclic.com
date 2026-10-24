import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { cambiarEstadoRequestSchema } from '../dtos/m01-catalogo.dto';
import {
  crearColorRequestSchema,
  editarColorRequestSchema,
  importarColoresRequestSchema,
  listarColoresRequestSchema,
} from '../dtos/m01-catalogo-productos.dto';
import type { ColoresService } from '../services/colores.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';
import { responderPagina, type ControladorRecurso } from './catalogos.controller';

/** HU-CAT-05: colores de marca con importación por bloques (C1–C8). */
export class ColoresController implements ControladorRecurso {
  constructor(private readonly servicio: ColoresService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idColor');
    if (valor === null) responderParametroInvalido(res, 'El identificador del color no es válido.');
    return valor;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarColoresRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  obtener = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.obtener(id));
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearColorRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Color creado', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, editarColorRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  cambiarEstado = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  impacto = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.impacto(id));
  });

  previsualizarImportacion = manejar(async (req, res) => {
    const peticion = validar(res, importarColoresRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.previsualizarImportacion(peticion));
  });

  aplicarImportacion = manejar(async (req, res) => {
    const peticion = validar(res, importarColoresRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.aplicarImportacion(peticion), 'Importación aplicada');
  });
}
