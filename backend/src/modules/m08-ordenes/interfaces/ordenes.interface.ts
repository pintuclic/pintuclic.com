import type { EstadoOrden, SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';

/** Lo mínimo que la creación necesita saber de una orden ya existente. */
export interface OrdenCreada {
  codigo: string;
  estado: EstadoOrden;
}

/**
 * Operaciones que corren dentro de UNA transacción de base de datos (R3 del contrato):
 * orden, líneas, descuentos, historial y consecutivo se confirman o se revierten juntos.
 */
export interface CreacionTx {
  /** Bloquea la fila del consecutivo `orden` (la crea si falta) hasta cerrar la transacción. */
  bloquearConsecutivo(): Promise<void>;
  buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenCreada | null>;
  /** Incrementa el consecutivo corrido y devuelve el nuevo valor. */
  avanzarConsecutivo(): Promise<number>;
  /** Inserta orden, líneas, descuentos e historial inicial (autor null = sistema). */
  insertarOrden(codigo: string, entrada: SolicitudPagadaInput): Promise<OrdenCreada>;
}

export interface CreacionRepository {
  enTransaccion<T>(trabajo: (tx: CreacionTx) => Promise<T>): Promise<T>;
  /** Lectura fuera de transacción, para recuperarse de una violación de unicidad. */
  buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenCreada | null>;
}
