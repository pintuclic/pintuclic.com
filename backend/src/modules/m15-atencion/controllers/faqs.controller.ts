import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  crearFaqRequestSchema,
  editarFaqRequestSchema,
  listarFaqsAdminRequestSchema,
  reordenarFaqsRequestSchema,
} from '../dtos/m15-atencion.dto';
import { errores } from '../services/atencion.error';
import type { FaqsService } from '../services/faqs.service';
import { leerId, manejar, validar } from './atencion-http';

export class FaqsController {
  constructor(private readonly servicio: FaqsService) {}

  /** GET /atencion/faqs — público (R1, R2). */
  listarPublicas = manejar(async (_req: Request, res: Response): Promise<void> => {
    const preguntas = await this.servicio.listarPublicas();
    responderExito(res, preguntas);
  });

  /** GET /admin/atencion/faqs */
  listarAdmin = manejar(async (req: Request, res: Response): Promise<void> => {
    const filtros = validar(res, listarFaqsAdminRequestSchema, req.query);
    if (filtros === null) return;

    const { items, total } = await this.servicio.listarAdmin(filtros);
    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total,
        totalPaginas: Math.ceil(total / filtros.limite),
      },
    });
  });

  /** POST /admin/atencion/faqs */
  crear = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, crearFaqRequestSchema, req.body);
    if (datos === null) return;

    const pregunta = await this.servicio.crear(datos);
    responderExito(res, pregunta, 'Pregunta frecuente creada.', 201);
  });

  /** PUT /admin/atencion/faqs/:idPregunta */
  editar = manejar(async (req: Request, res: Response): Promise<void> => {
    const idPregunta = leerId(req, 'idPregunta');
    if (idPregunta === null) throw errores.noDisponible();

    const datos = validar(res, editarFaqRequestSchema, req.body);
    if (datos === null) return;

    const pregunta = await this.servicio.editar(idPregunta, datos);
    responderExito(res, pregunta, 'Pregunta frecuente actualizada.');
  });

  /** DELETE /admin/atencion/faqs/:idPregunta */
  eliminar = manejar(async (req: Request, res: Response): Promise<void> => {
    const idPregunta = leerId(req, 'idPregunta');
    if (idPregunta === null) throw errores.noDisponible();

    await this.servicio.eliminar(idPregunta);
    responderExito(res, { idPregunta }, 'Pregunta frecuente eliminada.');
  });

  /** PATCH /admin/atencion/faqs/:idPregunta/activar */
  activar = manejar(async (req: Request, res: Response): Promise<void> => {
    await this.cambiarActiva(req, res, true);
  });

  /** PATCH /admin/atencion/faqs/:idPregunta/desactivar */
  desactivar = manejar(async (req: Request, res: Response): Promise<void> => {
    await this.cambiarActiva(req, res, false);
  });

  /** PUT /admin/atencion/faqs/orden */
  reordenar = manejar(async (req: Request, res: Response): Promise<void> => {
    const datos = validar(res, reordenarFaqsRequestSchema, req.body);
    if (datos === null) return;

    const preguntas = await this.servicio.reordenar(datos);
    responderExito(res, preguntas, 'Orden actualizado.');
  });

  private async cambiarActiva(req: Request, res: Response, activa: boolean): Promise<void> {
    const idPregunta = leerId(req, 'idPregunta');
    if (idPregunta === null) throw errores.noDisponible();

    const pregunta = await this.servicio.cambiarActiva(idPregunta, activa);
    responderExito(res, pregunta, activa ? 'Pregunta activada.' : 'Pregunta desactivada.');
  }
}
