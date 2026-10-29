import { CODIGOS_ERROR_M08, type CambiarEstadoRequest, type EstadoOrden } from '../dtos/m08-ordenes.dto';
import type { ActorGestion, EstadosRepository, EstadosTx, OrdenParaEstado } from '../interfaces/estados.interface';
import type { EventosOrdenPort } from '../interfaces/eventos-orden.port';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';
import type { RelojPort } from '../interfaces/reloj.port';
import { evaluarTransicion, exigeMotivo, permitidaPorPostventa } from './reglas-estado';

export type ResultadoCambioPostventa =
  | { ok: true; estadoAnterior: EstadoOrden }
  | { ok: false; razon: 'NO_EXISTE' }
  | { ok: false; razon: 'NO_PERMITIDA' | 'ESTADO_CAMBIADO'; estadoActual: EstadoOrden };

/**
 * M11: aprobar una cancelación o una devolución total cambia la orden dentro de la transacción de postventa, con las
 * mismas garantías que `cambiarEstado`: regla de origen, candado optimista e historial con autor y motivo.
 */
export async function cambiarEstadoPorPostventa(
  tx: EstadosTx,
  codigo: string,
  hacia: 'cancelado' | 'devuelto',
  motivo: string,
  idUsuarioAutor: number,
): Promise<ResultadoCambioPostventa> {
  const actual = await tx.buscarOrden(codigo);
  if (!actual) return { ok: false, razon: 'NO_EXISTE' };
  if (!permitidaPorPostventa(actual.estado, hacia)) return { ok: false, razon: 'NO_PERMITIDA', estadoActual: actual.estado };

  if (!(await tx.actualizarEstadoSiCoincide(codigo, actual.estado, hacia))) {
    return { ok: false, razon: 'ESTADO_CAMBIADO', estadoActual: actual.estado };
  }
  await tx.registrarHistorial({ codigo, estadoAnterior: actual.estado, estadoNuevo: hacia, idUsuarioAutor, motivo });
  return { ok: true, estadoAnterior: actual.estado };
}

export type ResultadoAvanceCumplimiento =
  | { ok: true }
  | { ok: false; razon: 'NO_EXISTE' }
  | { ok: false; razon: 'ESTADO_CAMBIADO'; estadoActual: EstadoOrden };

/**
 * M09: cuando todas las líneas de una orden en revisión de disponibilidad están disponibles, la orden pasa a
 * preparación dentro de la transacción de M09, con las mismas garantías que `cambiarEstado`: candado optimista e
 * historial con autor y motivo. Es la única vía a `en_preparacion` desde la revisión (ver `reglas-estado`).
 */
export async function cambiarEstadoPorCumplimiento(
  tx: EstadosTx,
  codigo: string,
  motivo: string,
  idUsuarioAutor: number,
): Promise<ResultadoAvanceCumplimiento> {
  const actual = await tx.buscarOrden(codigo);
  if (!actual) return { ok: false, razon: 'NO_EXISTE' };
  if (actual.estado !== 'revision_disponibilidad') return { ok: false, razon: 'ESTADO_CAMBIADO', estadoActual: actual.estado };

  if (!(await tx.actualizarEstadoSiCoincide(codigo, 'revision_disponibilidad', 'en_preparacion'))) {
    return { ok: false, razon: 'ESTADO_CAMBIADO', estadoActual: actual.estado };
  }
  await tx.registrarHistorial({
    codigo,
    estadoAnterior: 'revision_disponibilidad',
    estadoNuevo: 'en_preparacion',
    idUsuarioAutor,
    motivo,
  });
  return { ok: true };
}

export class EstadoOrdenError extends Error {
  constructor(
    message: string,
    public readonly codigo: keyof typeof CODIGOS_ERROR_M08,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'EstadoOrdenError';
  }
}

export interface ResultadoCambioEstado {
  codigo: string;
  estadoAnterior: EstadoOrden;
  estadoNuevo: EstadoOrden;
}

const MENSAJE_ESTADO_CAMBIADO = 'La orden cambió de estado mientras la consultaba. Recargue y vuelva a intentarlo.';

/** HU-ORD-03. Cada cambio queda en el historial con autor, motivo y momento (RF-ORD-03-02). */
export class EstadosService {
  constructor(
    private readonly repo: EstadosRepository,
    private readonly eventos: EventosOrdenPort,
    private readonly notificaciones: NotificacionesOrdenPort,
    private readonly reloj: RelojPort,
  ) {}

  async cambiarEstado(codigo: string, cambio: CambiarEstadoRequest, actor: ActorGestion): Promise<ResultadoCambioEstado> {
    const motivo = cambio.motivo ?? null;

    const orden = await this.repo.enTransaccion(async (tx) => {
      const actual = await tx.buscarOrden(codigo);
      if (!actual) {
        throw new EstadoOrdenError('Recurso no disponible.', CODIGOS_ERROR_M08.RECURSO_NO_DISPONIBLE, 404);
      }
      this.validar(actual, cambio);

      const cambiada = await tx.actualizarEstadoSiCoincide(codigo, cambio.estadoActual, cambio.estadoNuevo);
      if (!cambiada) {
        throw new EstadoOrdenError(MENSAJE_ESTADO_CAMBIADO, CODIGOS_ERROR_M08.ESTADO_CAMBIADO, 409);
      }
      await tx.registrarHistorial({
        codigo,
        estadoAnterior: cambio.estadoActual,
        estadoNuevo: cambio.estadoNuevo,
        idUsuarioAutor: actor.idUsuario,
        motivo,
      });
      return actual;
    });

    await this.publicar(orden, cambio, actor);
    return { codigo, estadoAnterior: cambio.estadoActual, estadoNuevo: cambio.estadoNuevo };
  }

  private validar(actual: OrdenParaEstado, cambio: CambiarEstadoRequest): void {
    if (actual.estado !== cambio.estadoActual) {
      throw new EstadoOrdenError(MENSAJE_ESTADO_CAMBIADO, CODIGOS_ERROR_M08.ESTADO_CAMBIADO, 409);
    }

    const evaluacion = evaluarTransicion(actual.estado, cambio.estadoNuevo, actual.modoEntrega);
    if (!evaluacion.ok) {
      if (evaluacion.razon === 'NO_HABILITADA') {
        throw new EstadoOrdenError(
          'Cancelar y devolver aún no están habilitados: esperan la política de postventa.',
          CODIGOS_ERROR_M08.OPERACION_NO_HABILITADA,
          409,
        );
      }
      throw new EstadoOrdenError(
        `No se puede pasar la orden de ${actual.estado} a ${cambio.estadoNuevo}.`,
        CODIGOS_ERROR_M08.TRANSICION_NO_PERMITIDA,
        409,
      );
    }

    if (exigeMotivo(actual.estado, cambio.estadoNuevo) && !cambio.motivo) {
      throw new EstadoOrdenError('Volver a preparación exige indicar el motivo.', CODIGOS_ERROR_M08.MOTIVO_REQUERIDO, 422);
    }
  }

  /** El evento y el correo salen tras confirmar el cambio; su fallo no lo revierte. */
  private async publicar(orden: OrdenParaEstado, cambio: CambiarEstadoRequest, actor: ActorGestion): Promise<void> {
    try {
      await this.eventos.emitirCambioEstado({
        codigo: orden.codigo,
        idUsuario: orden.idUsuario,
        estadoAnterior: cambio.estadoActual,
        estadoNuevo: cambio.estadoNuevo,
        idUsuarioAutor: actor.idUsuario,
        fecha: this.reloj.ahora(),
      });
    } catch (error) {
      console.error(`[M08] No se pudo emitir el evento de ${orden.codigo}:`, error instanceof Error ? error.message : error);
    }

    if (cambio.estadoNuevo !== 'despachado') return;
    try {
      await this.notificaciones.notificarOrdenDespachada({ codigo: orden.codigo, idUsuario: orden.idUsuario });
    } catch (error) {
      console.error(`[M08] No se pudo avisar el despacho de ${orden.codigo}:`, error instanceof Error ? error.message : error);
    }
  }
}
