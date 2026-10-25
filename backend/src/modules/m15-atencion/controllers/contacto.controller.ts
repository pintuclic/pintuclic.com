import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  crearSolicitudContactoRequestSchema,
  idSolicitudSchema,
  listarSolicitudesRequestSchema,
} from '../dtos/m15-atencion.dto';
import { errores } from '../services/atencion.error';
import type { ContactoService } from '../services/contacto.service';
import { manejar, validar } from './atencion-http';

export class ContactoController {
  constructor(private readonly servicio: ContactoService) {}

  /** POST /atencion/contacto — exige sesión (R3); el remitente sale de ella (R5). */
  crear = manejar(async (req: Request, res: Response): Promise<void> => {
    const idUsuario = req.actor?.idUsuario;
    if (idUsuario === undefined) {
      // Sin sesión no se distingue de un recurso inexistente (R11).
      throw errores.noDisponible();
    }

    const datos = validar(res, crearSolicitudContactoRequestSchema, req.body);
    if (datos === null) return;

    const confirmacion = await this.servicio.crear(idUsuario, datos);
    responderExito(res, confirmacion, 'Recibimos tu solicitud.', 201);
  });

  /** GET /admin/atencion/solicitudes-contacto */
  listar = manejar(async (req: Request, res: Response): Promise<void> => {
    const filtros = validar(res, listarSolicitudesRequestSchema, req.query);
    if (filtros === null) return;

    const { items, total } = await this.servicio.listar(filtros);
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

  /** PATCH /admin/atencion/solicitudes-contacto/:idSolicitud/atender */
  marcarAtendida = manejar(async (req: Request, res: Response): Promise<void> => {
    const parseo = idSolicitudSchema.safeParse(req.params.idSolicitud);
    if (!parseo.success) {
      // Un identificador con forma inválida no revela nada: no existe (R11).
      throw errores.noDisponible();
    }

    const solicitud = await this.servicio.marcarAtendida(parseo.data);
    responderExito(res, solicitud, 'Solicitud marcada como atendida.');
  });
}
