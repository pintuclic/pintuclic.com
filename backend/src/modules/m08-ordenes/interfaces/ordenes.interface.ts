import type { EstadoOrden, SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';

/** Lo mínimo que la creación necesita saber de una orden ya existente. */
export interface OrdenCreada {
  codigo: string;
  estado: EstadoOrden;
}

/**
 * Orden ya existente con las claves que la identifican. Permite comprobar que quien repite una
 * confirmación es de verdad el mismo (solicitud, pago y cliente) antes de devolverle la orden (R2).
 * Las órdenes anteriores a la copia histórica pueden tener `null` en las claves.
 */
export interface OrdenExistente extends OrdenCreada {
  codigoSolicitud: string | null;
  transaccionPagoId: string | null;
  idUsuario: number;
}

/**
 * Operaciones que corren dentro de UNA transacción de base de datos (R3 del contrato):
 * orden, líneas, descuentos, historial y consecutivo se confirman o se revierten juntos.
 */
export interface CreacionTx {
  /** Bloquea la fila del consecutivo `orden` (la crea si falta) hasta cerrar la transacción. */
  bloquearConsecutivo(): Promise<void>;
  buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenExistente | null>;
  /** Incrementa el consecutivo corrido y devuelve el nuevo valor. */
  avanzarConsecutivo(): Promise<number>;
  /** Inserta orden, líneas, descuentos e historial inicial (autor null = sistema). */
  insertarOrden(codigo: string, entrada: SolicitudPagadaInput): Promise<OrdenCreada>;
}

export interface CreacionRepository {
  enTransaccion<T>(trabajo: (tx: CreacionTx) => Promise<T>): Promise<T>;
  /** Lectura fuera de transacción, para recuperarse de una violación de unicidad. */
  buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenExistente | null>;
}
