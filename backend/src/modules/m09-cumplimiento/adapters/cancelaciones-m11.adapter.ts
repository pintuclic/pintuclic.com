import { ErrorPostventa } from '../../m11-postventa/services/reglas-postventa';
import type { PostventaServicePort } from '../../m11-postventa/interfaces/postventa.interface';
import { CODIGOS_ERROR_M09 } from '../dtos/m09-cumplimiento.dto';
import type { CancelacionesPort } from '../interfaces/cumplimiento.interface';
import { CumplimientoError } from '../services/cumplimiento.service';

/** R18. Abre la cancelación en M11 y traduce sus errores a los de M09 (el resto se relanza: es un fallo, no una regla). */
export class CancelacionesM11Adapter implements CancelacionesPort {
  constructor(private readonly postventa: Pick<PostventaServicePort, 'solicitarCancelacionPorTienda'>) {}

  async solicitarPorTienda(idEmpleado: number, codigoOrden: string, motivo: string): Promise<{ codigo: string; fecha: Date }> {
    try {
      const solicitud = await this.postventa.solicitarCancelacionPorTienda(idEmpleado, codigoOrden, motivo);
      return { codigo: solicitud.codigo, fecha: new Date(solicitud.fechaSolicitud) };
    } catch (error: unknown) {
      if (!(error instanceof ErrorPostventa)) throw error;
      if (error.codigo === 'RECURSO_NO_DISPONIBLE') {
        throw new CumplimientoError('Recurso no disponible.', CODIGOS_ERROR_M09.RECURSO_NO_DISPONIBLE, 404);
      }
      if (error.codigo === 'ORDEN_NO_ELEGIBLE') {
        throw new CumplimientoError(error.message, CODIGOS_ERROR_M09.ORDEN_NO_CANCELABLE, 409);
      }
      if (error.codigo === 'SOLICITUD_DUPLICADA') {
        throw new CumplimientoError(error.message, CODIGOS_ERROR_M09.SOLICITUD_DUPLICADA, 409);
      }
      throw error;
    }
  }
}
