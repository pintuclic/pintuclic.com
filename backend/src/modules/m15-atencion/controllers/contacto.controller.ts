import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  actualizarEstadoSolicitudRequestSchema,
  calificarSolicitudRequestSchema,
  crearMensajeSolicitudRequestSchema,
  crearSolicitudContactoRequestSchema,
  idSolicitudSchema,
  listarSolicitudesRequestSchema,
} from '../dtos/m15-atencion.dto';
import { errores } from '../services/atencion.error';
import type { ContactoService } from '../services/contacto.service';
import { manejar, validar } from './atencion-http';

function exigirIdUsuario(req: Request): number {
  const idUsuario = req.actor?.idUsuario;
  if (idUsuario === undefined) {
    // R11 / ADR-003: sin sesión no se distingue de un recurso inexistente.
    throw errores.noDisponible();
  }
  return idUsuario;
}

function exigirIdSolicitud(req: Request): string {
  const parseo = idSolicitudSchema.safeParse(req.params.idSolicitud);
  if (!parseo.success) {
    // R11 / ADR-003: un identificador inválido responde igual que uno inexistente.
    throw errores.noDisponible();
  }
  return parseo.data;
}

export class ContactoController {
  constructor(private readonly servicio: ContactoService) {}

  /** POST /atencion/contacto — exige sesión (R3); el remitente sale de ella (R5). */
  crear = manejar(async (req: Request, res: Response): Promise<void> => {
    const idUsuario = exigirIdUsuario(req);
    const datos = validar(res, crearSolicitudContactoRequestSchema, req.body);
    if (datos === null) return;

    const confirmacion = await this.servicio.crear(idUsuario, datos);
    responderExito(res, confirmacion, 'Recibimos tu solicitud.', 201);
  });

  /** GET /atencion/mis-solicitudes — solicitudes del cliente autenticado. */
  listarMias = manejar(async (req: Request, res: Response): Promise<void> => {
    const idUsuario = exigirIdUsuario(req);
    const filtros = validar(res, listarSolicitudesRequestSchema, req.query);
    if (filtros === null) return;

    const { items, total } = await this.servicio.listarDeUsuario(idUsuario, filtros);
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

  /** GET /atencion/mis-solicitudes/:idSolicitud — detalle e hilo del cliente titular. */
  obtenerMiaDetalle = manejar(async (req: Request, res: Response): Promise<void> => {
    const idUsuario = exigirIdUsuario(req);
    const idSolicitud = exigirIdSolicitud(req);

    const detalle = await this.servicio.obtenerDetalleDeUsuario(idUsuario, idSolicitud);
    responderExito(res, detalle);
  });

  /** POST /atencion/mis-solicitudes/:idSolicitud/mensajes — nuevo mensaje del cliente (R12). */
  agregarMensajeCliente = manejar(async (req: Request, res: Response): Promise<void> => {
    const idUsuario = exigirIdUsuario(req);
    const idSolicitud = exigirIdSolicitud(req);
    const datos = validar(res, crearMensajeSolicitudRequestSchema, req.body);
    if (datos === null) return;

    const mensaje = await this.servicio.agregarMensajeCliente(idUsuario, idSolicitud, datos);
    responderExito(res, mensaje, 'Mensaje enviado.', 201);
  });

  /** PATCH /atencion/mis-solicitudes/:idSolicitud/calificacion — valoración 1..5 estrellas (R13). */
  calificarMia = manejar(async (req: Request, res: Response): Promise<void> => {
    const idUsuario = exigirIdUsuario(req);
    const idSolicitud = exigirIdSolicitud(req);
    const datos = validar(res, calificarSolicitudRequestSchema, req.body);
    if (datos === null) return;

    const solicitud = await this.servicio.calificarDeUsuario(idUsuario, idSolicitud, datos);
    responderExito(res, solicitud, 'Gracias por calificar nuestra atención.');
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

  /** GET /admin/atencion/solicitudes-contacto/:idSolicitud */
  obtenerDetalle = manejar(async (req: Request, res: Response): Promise<void> => {
    const idSolicitud = exigirIdSolicitud(req);
    const detalle = await this.servicio.obtenerDetalle(idSolicitud);
    responderExito(res, detalle);
  });

  /** POST /admin/atencion/solicitudes-contacto/:idSolicitud/mensajes */
  agregarMensajeEquipo = manejar(async (req: Request, res: Response): Promise<void> => {
    const idAutor = exigirIdUsuario(req);
    const idSolicitud = exigirIdSolicitud(req);
    const datos = validar(res, crearMensajeSolicitudRequestSchema, req.body);
    if (datos === null) return;

    const mensaje = await this.servicio.agregarMensajeEquipo(idAutor, idSolicitud, datos);
    responderExito(res, mensaje, 'Respuesta enviada al cliente.', 201);
  });

  /** PATCH /admin/atencion/solicitudes-contacto/:idSolicitud/estado */
  cambiarEstado = manejar(async (req: Request, res: Response): Promise<void> => {
    const idSolicitud = exigirIdSolicitud(req);
    const datos = validar(res, actualizarEstadoSolicitudRequestSchema, req.body);
    if (datos === null) return;

    const solicitud = await this.servicio.cambiarEstado(idSolicitud, datos);
    responderExito(res, solicitud, 'Estado de la solicitud actualizado.');
  });

  /** PATCH /admin/atencion/solicitudes-contacto/:idSolicitud/atender (compatibilidad). */
  marcarAtendida = manejar(async (req: Request, res: Response): Promise<void> => {
    const idSolicitud = exigirIdSolicitud(req);
    const solicitud = await this.servicio.marcarAtendida(idSolicitud);
    responderExito(res, solicitud, 'Solicitud marcada como atendida.');
  });
}