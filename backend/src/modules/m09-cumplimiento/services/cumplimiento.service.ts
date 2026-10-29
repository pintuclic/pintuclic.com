import type { EventosOrdenPort } from '../../m08-ordenes/interfaces/eventos-orden.port';
import type { RelojPort } from '../../m08-ordenes/interfaces/reloj.port';
import {
  CODIGOS_ERROR_M09,
  type HojaPreparacion,
  type OrdenRetenida,
  type Paginacion,
  type VerificacionOrden,
  type VerificarLineasRequest,
} from '../dtos/m09-cumplimiento.dto';
import type { CumplimientoRepository, MarcaNueva, OrdenDatos } from '../interfaces/cumplimiento.interface';
import {
  armarHoja,
  armarVerificacion,
  esEstadoDeCumplimiento,
  estadoDeLinea,
  motivosDeRetencion,
  todasDisponibles,
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
  /** true = esta petición movió la orden a preparación (R7). */
  avanzo: boolean;
}

const MENSAJE_FUERA = 'Esta orden ya no está en revisión ni en preparación.';
const MENSAJE_CAMBIADO = 'La orden cambió de estado mientras la consultaba. Recargue y vuelva a intentarlo.';

function noDisponible(): CumplimientoError {
  return new CumplimientoError('Recurso no disponible.', CODIGOS_ERROR_M09.RECURSO_NO_DISPONIBLE, 404);
}

/** M09 · Cumplimiento y preparación. Lista de chequeo por línea, avance automático, retenidas y hoja. */
export class CumplimientoService {
  constructor(
    private readonly repo: CumplimientoRepository,
    private readonly eventos: EventosOrdenPort,
    private readonly reloj: RelojPort,
  ) {}

  /** HU-CUM-01 · La lista de chequeo de una orden con el rastro de cada línea. */
  async verificacion(codigo: string): Promise<VerificacionOrden> {
    const orden = await this.cargarVerificable(codigo);
    return armarVerificacion(orden.datos, orden.estado);
  }

  /**
   * HU-CUM-01 y HU-CUM-03 · Pone marcas a una o varias líneas y, si con ellas todas quedan disponibles, pasa la orden a
   * preparación en la misma transacción (R7). Una marca igual a la vigente no escribe nada (R3).
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
        else if (estadoDeLinea(linea) !== marca.estado) nuevas.push({ idLinea: linea.idLinea, estado: marca.estado });
      }
      if (inexistentes.length > 0) {
        throw new CumplimientoError(
          `La orden no tiene la línea ${inexistentes.join(', ')}.`,
          CODIGOS_ERROR_M09.PARAMETRO_INVALIDO,
          400,
          { lineasInexistentes: inexistentes },
        );
      }
      if (nuevas.length > 0) await tx.insertarMarcas(nuevas, actor.idUsuario);

      // Se vuelve a leer: lo que se devuelve es lo que quedó guardado, no lo que se esperaba guardar (R5, R6).
      let despues = nuevas.length > 0 ? await tx.cargarOrden(codigo) : antes;
      if (!despues) throw noDisponible();

      let avanzo = false;
      if (despues.estado === 'revision_disponibilidad' && todasDisponibles(despues.lineas)) {
        const avance = await tx.avanzarAPreparacion(codigo, actor.idUsuario);
        if (!avance.ok) {
          if (avance.razon === 'NO_EXISTE') throw noDisponible();
          throw new CumplimientoError(MENSAJE_CAMBIADO, CODIGOS_ERROR_M09.ESTADO_CAMBIADO, 409);
        }
        avanzo = true;
        despues = (await tx.cargarOrden(codigo)) ?? despues;
      }
      return { orden: despues, avanzo };
    });

    if (resultado.avanzo) await this.publicarAvance(resultado.orden, actor);
    if (!esEstadoDeCumplimiento(resultado.orden.estado)) throw noDisponible();
    return { verificacion: armarVerificacion(resultado.orden, resultado.orden.estado), avanzo: resultado.avanzo };
  }

  /** HU-CUM-03 · Órdenes detenidas en la revisión y por qué (R12). */
  async retenidas(pagina: number, limite: number): Promise<{ filas: OrdenRetenida[]; paginacion: Paginacion }> {
    const { filas, total } = await this.repo.listarRetenidas(pagina, limite);
    const ahora = this.reloj.ahora().getTime();
    return {
      filas: filas.map((f) => {
        const motivos = motivosDeRetencion(f.lineas);
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
    const orden = await this.cargarVerificable(codigo);
    return armarHoja(orden.datos, orden.estado, this.reloj.ahora());
  }

  private async cargarVerificable(codigo: string) {
    const datos = await this.repo.cargarOrden(codigo);
    if (!datos) throw noDisponible();
    if (!esEstadoDeCumplimiento(datos.estado)) {
      throw new CumplimientoError(MENSAJE_FUERA, CODIGOS_ERROR_M09.ORDEN_FUERA_DE_CUMPLIMIENTO, 409);
    }
    return { datos, estado: datos.estado };
  }

  /** El evento sale tras confirmar el cambio; su fallo no lo revierte, igual que en M08. */
  private async publicarAvance(orden: OrdenDatos, actor: ActorCumplimiento): Promise<void> {
    try {
      await this.eventos.emitirCambioEstado({
        codigo: orden.codigo,
        idUsuario: orden.idUsuario,
        estadoAnterior: 'revision_disponibilidad',
        estadoNuevo: 'en_preparacion',
        idUsuarioAutor: actor.idUsuario,
        fecha: this.reloj.ahora(),
      });
    } catch (error) {
      console.error(`[M09] No se pudo emitir el evento de ${orden.codigo}:`, error instanceof Error ? error.message : error);
    }
  }
}
