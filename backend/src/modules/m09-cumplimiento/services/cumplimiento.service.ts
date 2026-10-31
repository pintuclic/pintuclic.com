import type { EventosOrdenPort } from '../../m08-ordenes/interfaces/eventos-orden.port';
import type { RelojPort } from '../../m08-ordenes/interfaces/reloj.port';
import {
  CODIGOS_ERROR_M09,
  type HojaPreparacion,
  type OrdenRetenida,
  type Paginacion,
  type SolicitarCancelacionRequest,
  type TramiteCancelacion,
  type VerificacionOrden,
  type VerificarLineasRequest,
} from '../dtos/m09-cumplimiento.dto';
import type {
  CancelacionesPort,
  CumplimientoRepository,
  DestinoAvance,
  MarcaNueva,
  OrdenDatos,
} from '../interfaces/cumplimiento.interface';
import {
  armarHoja,
  armarVerificacion,
  componerMotivoCancelacion,
  esEstadoDeCumplimiento,
  estadoDeLinea,
  motivosDeRetencion,
  todasDisponibles,
  todasPreparadas,
} from './reglas-cumplimiento';

export class CumplimientoError extends Error {
  constructor(
    message: string,
    public readonly codigo: keyof typeof CODIGOS_ERROR_M09,
    public readonly statusCode: number,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'CumplimientoError';
  }
}

export interface ActorCumplimiento {
  idUsuario: number;
}

export interface ResultadoMarcado {
  verificacion: VerificacionOrden;
  /** true = esta petición movió la orden: a preparación (R7) o a preparada (R15). */
  avanzo: boolean;
}

const MENSAJE_FUERA = 'Esta orden ya no está en revisión ni en preparación.';
const MENSAJE_CAMBIADO = 'La orden cambió de estado mientras la consultaba. Recargue y vuelva a intentarlo.';

function noDisponible(): CumplimientoError {
  return new CumplimientoError('Recurso no disponible.', CODIGOS_ERROR_M09.RECURSO_NO_DISPONIBLE, 404);
}

/** M09 · Cumplimiento y preparación. Lista de chequeo por línea, avances automáticos, retenidas, hoja y cancelación. */
export class CumplimientoService {
  constructor(
    private readonly repo: CumplimientoRepository,
    private readonly eventos: EventosOrdenPort,
    private readonly reloj: RelojPort,
    private readonly cancelaciones?: CancelacionesPort,
  ) {}

  /** HU-CUM-01 · La lista de chequeo de una orden con el rastro de cada línea. Se consulta en cualquier estado (R4). */
  async verificacion(codigo: string): Promise<VerificacionOrden> {
    const datos = await this.repo.cargarOrden(codigo);
    if (!datos) throw noDisponible();
    return armarVerificacion(datos);
  }

  /**
   * HU-CUM-01 y HU-CUM-03 · Pone marcas a una o varias líneas y, si con ellas todas quedan disponibles (o todas preparadas),
   * mueve la orden en la misma transacción (R7, R15). Una marca igual a la vigente no escribe nada (R3).
   */
  async marcar(codigo: string, peticion: VerificarLineasRequest, actor: ActorCumplimiento): Promise<ResultadoMarcado> {
    const resultado = await this.repo.enTransaccion(async (tx) => {
      const antes = await tx.cargarOrden(codigo);
      if (!antes) throw noDisponible();
      if (!esEstadoDeCumplimiento(antes.estado)) {
        throw new CumplimientoError(MENSAJE_FUERA, CODIGOS_ERROR_M09.ORDEN_FUERA_DE_CUMPLIMIENTO, 409);
      }

      const nuevas: MarcaNueva[] = [];
      const inexistentes: number[] = [];
      for (const marca of peticion.lineas) {
        const linea = antes.lineas.find((l) => l.numeroLinea === marca.numeroLinea);
        if (!linea) inexistentes.push(marca.numeroLinea);
        else if (estadoDeLinea(antes.estado, linea) !== marca.estado) nuevas.push({ idLinea: linea.idLinea, estado: marca.estado });
      }
      if (inexistentes.length > 0) {
        throw new CumplimientoError(
          `La orden no tiene la línea ${inexistentes.join(', ')}.`,
          CODIGOS_ERROR_M09.PARAMETRO_INVALIDO,
          400,
          { lineasInexistentes: inexistentes },
        );
      }
      // R15: preparar antes de tener la disponibilidad completa no tiene sentido.
      const prematuras = peticion.lineas.filter((m) => m.estado === 'preparada').map((m) => m.numeroLinea);
      if (antes.estado === 'revision_disponibilidad' && prematuras.length > 0) {
        throw new CumplimientoError(
          'No se puede marcar como preparada una línea mientras el pedido está en revisión de disponibilidad.',
          CODIGOS_ERROR_M09.MARCA_NO_PERMITIDA,
          409,
          { lineas: prematuras },
        );
      }
      if (nuevas.length > 0) await tx.insertarMarcas(nuevas, actor.idUsuario);

      // Se vuelve a leer: lo que se devuelve es lo que quedó guardado, no lo que se esperaba guardar (R5, R6).
      let despues = nuevas.length > 0 ? await tx.cargarOrden(codigo) : antes;
      if (!despues) throw noDisponible();

      let avance: { desde: OrdenDatos['estado']; hacia: DestinoAvance } | null = null;
      if (despues.estado === 'revision_disponibilidad' && todasDisponibles(despues.estado, despues.lineas)) {
        avance = { desde: 'revision_disponibilidad', hacia: 'en_preparacion' };
      } else if (despues.estado === 'en_preparacion' && todasPreparadas(despues.estado, despues.lineas)) {
        avance = { desde: 'en_preparacion', hacia: 'preparada' };
      }
      if (avance) {
        const resultadoAvance = await tx.avanzar(codigo, avance.hacia, actor.idUsuario);
        if (!resultadoAvance.ok) {
          if (resultadoAvance.razon === 'NO_EXISTE') throw noDisponible();
          throw new CumplimientoError(MENSAJE_CAMBIADO, CODIGOS_ERROR_M09.ESTADO_CAMBIADO, 409);
        }
        despues = (await tx.cargarOrden(codigo)) ?? despues;
      }
      return { orden: despues, avance };
    });

    if (resultado.avance) await this.publicarAvance(resultado.orden, resultado.avance, actor);
    return { verificacion: armarVerificacion(resultado.orden), avanzo: resultado.avance !== null };
  }

  /** HU-CUM-03 · Órdenes detenidas en la revisión y por qué (R12). */
  async retenidas(pagina: number, limite: number): Promise<{ filas: OrdenRetenida[]; paginacion: Paginacion }> {
    const { filas, total } = await this.repo.listarRetenidas(pagina, limite);
    const ahora = this.reloj.ahora().getTime();
    return {
      filas: filas.map((f) => {
        const motivos = motivosDeRetencion('revision_disponibilidad', f.lineas);
        return {
          codigo: f.codigo,
          cliente: f.cliente,
          fecha: f.fecha.toISOString(),
          segundosEnEstado: Math.max(0, Math.floor((ahora - f.entradaEstado.getTime()) / 1000)),
          lineasSinConfirmar: motivos.length,
          lineasTotales: f.lineas.length,
          motivos,
        };
      }),
      paginacion: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
    };
  }

  /** HU-CUM-06 · Datos de la hoja de preparación, con la fecha y el estado de la orden al generarla (R13). */
  async hoja(codigo: string): Promise<HojaPreparacion> {
    const datos = await this.repo.cargarOrden(codigo);
    if (!datos) throw noDisponible();
    if (!esEstadoDeCumplimiento(datos.estado)) {
      throw new CumplimientoError(MENSAJE_FUERA, CODIGOS_ERROR_M09.ORDEN_FUERA_DE_CUMPLIMIENTO, 409);
    }
    return armarHoja(datos, datos.estado, this.reloj.ahora());
  }

  /**
   * HU-CUM-03 · R18. Abre en M11 una cancelación iniciada por la tienda con los productos sin stock. No cancela nada: la
   * resuelve M11, y es entonces cuando el cliente recibe el correo (R20).
   */
  async solicitarCancelacion(
    codigo: string,
    peticion: SolicitarCancelacionRequest,
    actor: ActorCumplimiento,
  ): Promise<TramiteCancelacion> {
    const datos = await this.repo.cargarOrden(codigo);
    if (!datos) throw noDisponible();
    if (datos.estado !== 'revision_disponibilidad' && datos.estado !== 'en_preparacion') {
      throw new CumplimientoError(
        'Solo se puede pedir la cancelación mientras el pedido está en revisión o en preparación.',
        CODIGOS_ERROR_M09.ORDEN_NO_CANCELABLE,
        409,
      );
    }
    const sinStock = datos.lineas.filter((l) => estadoDeLinea(datos.estado, l) === 'no_disponible');
    if (sinStock.length === 0) {
      throw new CumplimientoError(
        'Para pedir la cancelación, al menos un producto debe estar marcado como no disponible.',
        CODIGOS_ERROR_M09.SIN_LINEAS_NO_DISPONIBLES,
        409,
      );
    }
    if (!this.cancelaciones) throw new Error('M09: falta conectar la cancelación con M11.');

    const creada = await this.cancelaciones.solicitarPorTienda(
      actor.idUsuario,
      codigo,
      componerMotivoCancelacion(sinStock, peticion.nota),
    );
    return { codigo: creada.codigo, estado: 'solicitada', iniciadaPor: 'tienda', fecha: creada.fecha.toISOString() };
  }

  /** El evento sale tras confirmar el cambio; su fallo no lo revierte, igual que en M08. */
  private async publicarAvance(
    orden: OrdenDatos,
    avance: { desde: OrdenDatos['estado']; hacia: DestinoAvance },
    actor: ActorCumplimiento,
  ): Promise<void> {
    try {
      await this.eventos.emitirCambioEstado({
        codigo: orden.codigo,
        idUsuario: orden.idUsuario,
        estadoAnterior: avance.desde,
        estadoNuevo: avance.hacia,
        idUsuarioAutor: actor.idUsuario,
        fecha: this.reloj.ahora(),
      });
    } catch (error) {
      console.error(`[M09] No se pudo emitir el evento de ${orden.codigo}:`, error instanceof Error ? error.message : error);
    }
  }
}
