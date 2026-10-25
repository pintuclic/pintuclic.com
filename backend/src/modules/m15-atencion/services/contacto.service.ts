import {
  LIMITE_SOLICITUDES_POR_VENTANA,
  VENTANA_LIMITE_MINUTOS,
  type ConfirmacionContacto,
  type CrearSolicitudContactoRequest,
  type ListarSolicitudesRequest,
  type SolicitudContacto,
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

  async listar(filtros: ListarSolicitudesRequest): Promise<PaginaSolicitudes> {
    return this.repo.listar({
      ...(filtros.tipo === undefined ? {} : { tipo: filtros.tipo }),
      ...(filtros.estado === undefined ? {} : { estado: filtros.estado }),
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
  }

  async marcarAtendida(idSolicitud: string): Promise<SolicitudContacto> {
    const solicitud = await this.repo.obtener(idSolicitud);
    if (solicitud === null) {
      throw errores.noDisponible();
    }
    if (solicitud.estado === 'atendida') {
      return solicitud;
    }
    return this.repo.marcarAtendida(idSolicitud);
  }
}
