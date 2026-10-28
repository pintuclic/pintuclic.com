import {
  LIMITE_SOLICITUDES_POR_VENTANA,
  VENTANA_LIMITE_MINUTOS,
  type ActualizarEstadoSolicitudRequest,
  type CalificarSolicitudRequest,
  type ConfirmacionContacto,
  type CrearMensajeSolicitudRequest,
  type CrearSolicitudContactoRequest,
  type ListarSolicitudesRequest,
  type MensajeSolicitudContacto,
  type SolicitudContacto,
  type SolicitudContactoDetalle,
} from '../dtos/m15-atencion.dto';
import type {
  ConfiguracionAtencionRepositoryPort,
  ContactoRepositoryPort,
  PaginaSolicitudes,
} from '../interfaces/atencion.interface';
import { errores } from './atencion.error';
import { estaAbierto } from './horario';

/** R9 / CA-ATC-04-03: la solicitud se recibe igual fuera de horario; solo cambia el aviso. */
const AVISO_FUERA_DE_HORARIO =
  'Recibimos tu solicitud. En este momento estamos fuera del horario de atención, así que te responderemos dentro del horario.';

export class ContactoService {
  constructor(
    private readonly repo: ContactoRepositoryPort,
    private readonly configRepo: ConfiguracionAtencionRepositoryPort,
  ) {}

  /**
   * R5: el remitente es el de la sesión, nunca el del cuerpo de la petición.
   * `ahora` se inyecta para poder probar el límite y el horario sin reloj real.
   */
  async crear(
    idUsuario: number,
    datos: CrearSolicitudContactoRequest,
    ahora: Date = new Date(),
  ): Promise<ConfirmacionContacto> {
    const desde = new Date(ahora.getTime() - VENTANA_LIMITE_MINUTOS * 60_000);
    const recientes = await this.repo.contarDesde(idUsuario, desde);
    if (recientes >= LIMITE_SOLICITUDES_POR_VENTANA) {
      throw errores.limiteSolicitudes();
    }

    const solicitud = await this.repo.crear(idUsuario, datos.tipo, datos.descripcion);
    const franjas = await this.configRepo.obtenerHorario();

    return {
      solicitud,
      avisoHorario: estaAbierto(franjas, ahora) ? null : AVISO_FUERA_DE_HORARIO,
      // R4: el camino formal de una cotización es el carrito; aquí solo queda la intención.
      remitirAlCarrito: datos.tipo === 'cotizacion',
    };
  }

  /** Lista global para el panel de atención (admin/empleado con `atencion.ver`). */
  async listar(filtros: ListarSolicitudesRequest): Promise<PaginaSolicitudes> {
    return this.repo.listar({
      ...(filtros.tipo === undefined ? {} : { tipo: filtros.tipo }),
      ...(filtros.estado === undefined ? {} : { estado: filtros.estado }),
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
  }

  /** Lista únicamente las solicitudes del cliente autenticado (titular). */
  async listarDeUsuario(
    idUsuario: number,
    filtros: ListarSolicitudesRequest,
  ): Promise<PaginaSolicitudes> {
    return this.repo.listar({
      idUsuario,
      ...(filtros.tipo === undefined ? {} : { tipo: filtros.tipo }),
      ...(filtros.estado === undefined ? {} : { estado: filtros.estado }),
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
  }

  /** Detalle completo con hilo de mensajes para el panel de atención. */
  async obtenerDetalle(idSolicitud: string): Promise<SolicitudContactoDetalle> {
    const detalle = await this.repo.obtenerDetalle(idSolicitud);
    if (detalle === null) {
      throw errores.noDisponible();
    }
    return detalle;
  }

  /**
   * Detalle completo con hilo de mensajes para el cliente titular.
   * R11 / ADR-003: si no existe o pertenece a otro usuario, devuelve 404 opaco.
   */
  async obtenerDetalleDeUsuario(
    idUsuario: number,
    idSolicitud: string,
  ): Promise<SolicitudContactoDetalle> {
    const detalle = await this.repo.obtenerDetalle(idSolicitud);
    if (detalle === null || detalle.idUsuario !== idUsuario) {
      throw errores.noDisponible();
    }
    return detalle;
  }

  /**
   * R12: el cliente titular puede enviar mensajes consecutivos mientras la
   * solicitud esté en `en_revision`. Si está `atendida` o `rechazada`, queda
   * bloqueado (`409 SOLICITUD_CERRADA`).
   */
  async agregarMensajeCliente(
    idUsuario: number,
    idSolicitud: string,
    datos: CrearMensajeSolicitudRequest,
  ): Promise<MensajeSolicitudContacto> {
    const detalle = await this.repo.obtenerDetalle(idSolicitud);
    if (detalle === null || detalle.idUsuario !== idUsuario) {
      throw errores.noDisponible();
    }
    if (detalle.estado !== 'en_revision') {
      throw errores.solicitudCerrada();
    }
    const ultimoMensaje = detalle.mensajes[detalle.mensajes.length - 1];
    if (ultimoMensaje !== undefined && ultimoMensaje.rolAutor === 'cliente') {
      throw errores.esperandoRespuestaEquipo();
    }
    return this.repo.agregarMensaje(idSolicitud, idUsuario, 'cliente', datos.contenido);
  }

  /**
   * R12: el admin o empleado con permiso `atencion.atender_clientes` puede
   * responder cuando quiera, incluso con varios mensajes consecutivos sin
   * esperar respuesta del cliente.
   */
  async agregarMensajeEquipo(
    idAutor: number,
    idSolicitud: string,
    datos: CrearMensajeSolicitudRequest,
  ): Promise<MensajeSolicitudContacto> {
    const solicitud = await this.repo.obtener(idSolicitud);
    if (solicitud === null) {
      throw errores.noDisponible();
    }
    return this.repo.agregarMensaje(idSolicitud, idAutor, 'equipo', datos.contenido);
  }

  /** Cambia el estado de la solicitud (`en_revision`, `atendida` o `rechazada`). */
  async cambiarEstado(
    idSolicitud: string,
    datos: ActualizarEstadoSolicitudRequest,
  ): Promise<SolicitudContacto> {
    const solicitud = await this.repo.obtener(idSolicitud);
    if (solicitud === null) {
      throw errores.noDisponible();
    }
    if (solicitud.estado === datos.estado) {
      return solicitud;
    }
    return this.repo.cambiarEstado(idSolicitud, datos.estado);
  }

  /** Compatibilidad con la ruta legacy `/atender`. */
  async marcarAtendida(idSolicitud: string): Promise<SolicitudContacto> {
    return this.cambiarEstado(idSolicitud, { estado: 'atendida' });
  }

  /**
   * R13: el cliente titular puede calificar de 1 a 5 estrellas únicamente
   * cuando la solicitud se encuentra en estado `atendida`.
   */
  async calificarDeUsuario(
    idUsuario: number,
    idSolicitud: string,
    datos: CalificarSolicitudRequest,
    ahora: Date = new Date(),
  ): Promise<SolicitudContacto> {
    const solicitud = await this.repo.obtener(idSolicitud);
    if (solicitud === null || solicitud.idUsuario !== idUsuario) {
      throw errores.noDisponible();
    }
    if (solicitud.estado !== 'atendida') {
      throw errores.solicitudNoCalificable();
    }
    return this.repo.calificar(idSolicitud, datos.calificacion, ahora);
  }
}