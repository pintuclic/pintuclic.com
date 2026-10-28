import {
  CODIGOS_ERROR_M08,
  solicitudPagadaInputSchema,
  type EstadoOrden,
  type SolicitudPagadaInput,
} from '../dtos/m08-ordenes.dto';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';
import type { CreacionRepository, OrdenExistente } from '../interfaces/ordenes.interface';
import type { RelojPort } from '../interfaces/reloj.port';
import { UnicidadOrdenError } from '../repositories/creacion.repository';

export class CreacionOrdenError extends Error {
  constructor(
    message: string,
    public readonly codigo: 'PAGO_NO_CONFIRMADO' | 'PAGO_INSUFICIENTE' | 'PARAMETRO_INVALIDO' | 'CONFLICTO_SOLICITUD',
  ) {
    super(message);
    this.name = 'CreacionOrdenError';
  }
}

export interface ResultadoCreacion {
  codigo: string;
  estado: EstadoOrden;
  /** false = la solicitud ya tenía orden (R2). */
  creada: boolean;
}

const ZONA_COLOMBIA = 'America/Bogota';
const DIGITOS_CONSECUTIVO = 5;

function anioColombia(fecha: Date): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_COLOMBIA, year: 'numeric' }).format(fecha));
}

function aCentavos(importe: number): number {
  return Math.round(importe * 100);
}

/**
 * HU-ORD-01, 02 y 06. Llamada interna de M07 al confirmarse el pago (sin ruta HTTP, R1).
 * Idempotente (R2) y atómica (R3).
 */
export class CreacionService {
  constructor(
    private readonly repo: CreacionRepository,
    private readonly notificaciones: NotificacionesOrdenPort,
    private readonly reloj: RelojPort,
  ) {}

  async crearDesdePagoConfirmado(entradaCruda: unknown): Promise<ResultadoCreacion> {
    const entrada = this.validar(entradaCruda);

    try {
      const resultado = await this.repo.enTransaccion(async (tx) => {
        // Se bloquea el consecutivo ANTES de buscar: dos confirmaciones simultáneas de la
        // misma solicitud se serializan y la segunda encuentra la orden de la primera.
        await tx.bloquearConsecutivo();

        const existente = await tx.buscarExistente(entrada.codigoSolicitud, entrada.transaccionPagoId);
        if (existente) return this.confirmarMismaSolicitud(existente, entrada);

        const numero = await tx.avanzarConsecutivo();
        const codigo = this.formatearCodigo(numero);
        const orden = await tx.insertarOrden(codigo, entrada);
        return { ...orden, creada: true };
      });

      if (resultado.creada) {
        await this.avisarCreacion(resultado.codigo, entrada);
      }
      return resultado;
    } catch (error) {
      if (error instanceof UnicidadOrdenError) {
        const existente = await this.repo.buscarExistente(entrada.codigoSolicitud, entrada.transaccionPagoId);
        if (existente) return this.confirmarMismaSolicitud(existente, entrada);
      }
      throw error;
    }
  }

  /**
   * R2: una confirmación repetida recibe la orden existente SOLO si es la misma solicitud, el mismo pago
   * y el mismo cliente. Si alguna clave coincide pero otra difiere (un pago reutilizado, un error de
   * M07), devolver esa orden entregaría en silencio la de otro: es un conflicto y no se revela nada de ella.
   * Un valor `null` guardado (orden anterior a la copia histórica) no cuenta como diferencia.
   */
  private confirmarMismaSolicitud(existente: OrdenExistente, entrada: SolicitudPagadaInput): ResultadoCreacion {
    const difiere = (guardado: string | null, entrante: string): boolean => guardado !== null && guardado !== entrante;
    if (
      difiere(existente.codigoSolicitud, entrada.codigoSolicitud) ||
      difiere(existente.transaccionPagoId, entrada.transaccionPagoId) ||
      existente.idUsuario !== entrada.idUsuario
    ) {
      throw new CreacionOrdenError(
        'La solicitud, el pago o el cliente no coinciden con los de una orden ya registrada: no se crea ni se devuelve ninguna.',
        CODIGOS_ERROR_M08.CONFLICTO_SOLICITUD,
      );
    }
    return { codigo: existente.codigo, estado: existente.estado, creada: false };
  }

  private validar(entradaCruda: unknown): SolicitudPagadaInput {
    const transaccion = (entradaCruda as { transaccionPagoId?: unknown } | null)?.transaccionPagoId;
    if (typeof transaccion !== 'string' || transaccion.trim() === '') {
      throw new CreacionOrdenError('No existe confirmación de pago para esta solicitud.', CODIGOS_ERROR_M08.PAGO_NO_CONFIRMADO);
    }

    const analisis = solicitudPagadaInputSchema.safeParse(entradaCruda);
    if (!analisis.success) {
      const detalle = analisis.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new CreacionOrdenError(`Solicitud de pago inválida: ${detalle}`, CODIGOS_ERROR_M08.PARAMETRO_INVALIDO);
    }

    const entrada = analisis.data;
    if (aCentavos(entrada.montoPagado) < aCentavos(entrada.total)) {
      throw new CreacionOrdenError('El pago confirmado es inferior al total de la solicitud.', CODIGOS_ERROR_M08.PAGO_INSUFICIENTE);
    }
    return entrada;
  }

  private formatearCodigo(numero: number): string {
    const anio = anioColombia(this.reloj.ahora());
    return `PC-${anio}-${String(numero).padStart(DIGITOS_CONSECUTIVO, '0')}`;
  }

  /** D5: el correo va fuera de la transacción y su fallo no revierte la orden. */
  private async avisarCreacion(codigo: string, entrada: SolicitudPagadaInput): Promise<void> {
    try {
      await this.notificaciones.notificarOrdenCreada({ codigo, idUsuario: entrada.idUsuario, total: entrada.total });
    } catch (error) {
      console.error(`[M08] No se pudo notificar la orden ${codigo}:`, error instanceof Error ? error.message : error);
    }
  }
}
