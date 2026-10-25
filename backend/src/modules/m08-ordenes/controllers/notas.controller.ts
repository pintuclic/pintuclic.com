import type { Request, Response } from 'express';
import { responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { codigoOrdenParamsSchema, crearContactoRequestSchema, crearNotaRequestSchema } from '../dtos/m08-ordenes.dto';
import type { NotasService } from '../services/notas.service';
import { manejarOrden, validar } from './orden-http';

/** Rutas `/ordenes/gestion/:codigo/notas` y `/contactos`; el permiso `ventas.gestionar` lo exige el router. */
export class NotasController {
  constructor(private readonly servicio: NotasService) {}

  crearNota = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    const nota = validar(res, crearNotaRequestSchema, req.body);
    if (parametros === null || nota === null) return;

    res.status(201).json({ success: true, data: await this.servicio.crearNota(parametros.codigo, nota, actor) });
  });

  crearContacto = manejarOrden(async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const parametros = validar(res, codigoOrdenParamsSchema, req.params);
    const contacto = validar(res, crearContactoRequestSchema, req.body);
    if (parametros === null || contacto === null) return;

    res.status(201).json({ success: true, data: await this.servicio.crearContacto(parametros.codigo, contacto, actor) });
  });

  /** R11: editar o borrar una nota o un contacto nunca se permite; solo se añade otro. */
  inmutable = (_req: Request, res: Response): void => {
    res.status(405).json({
      success: false,
      error: {
        code: 'NOTA_INMUTABLE',
        message: 'Las notas y los contactos registrados no se pueden modificar ni borrar: añada uno nuevo.',
        details: null,
      },
    });
  };
}
