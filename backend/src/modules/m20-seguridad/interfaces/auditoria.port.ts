/**
 * RN-SEG-15 / ADR-002 — Puerto de auditoría.
 *
 * HU-SEG-04 está APLAZADA por el Product Owner, pero RF-SEG-03-07 y el diagrama
 * HU-SEG-03_autorizacion_servidor.png exigen registrar todo acceso denegado.
 *
 * Se cablea el puerto desde el primer día para que, al desbloquearse HU-SEG-04,
 * solo haya que sustituir el adaptador y no reabrir cada punto de denegación.
 */

export interface EventoAccesoDenegado {
  idUsuario: number | null;
  operacionIntentada: string;
  permisoRequerido: string | null;
  fecha: Date;
  ipOrigen: string | null;
}

/**
 * HU-SEG-04 (RF-SEG-04-02, RF-SEG-04-03): una acción relevante que quedó registrada.
 *
 * El emisor decide qué es relevante y YA recorta los valores: un texto largo se registra por
 * su longitud y una huella, nunca completo (M03 · A2). El evento jamás transporta
 * contraseñas, hashes, datos de pago ni la clave de un servicio externo (RF-SEG-04-07).
 */
export interface EventoAccionAuditada {
  /** Null cuando la acción la hizo el sistema y no una persona. */
  idUsuario: number | null;
  /** Copia del nombre del actor: el registro sigue siendo legible si la cuenta se elimina. */
  actor: string | null;
  /** Acción en punto, como el código de un permiso: `asesoria.configuracion.editar`. */
  accion: string;
  entidad: string;
  idEntidad: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  resultado: 'exito' | 'fallo';
  fecha: Date;
  ipOrigen: string | null;
}

export interface AuditoriaPort {
  registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void>;
  /**
   * HU-SEG-04. El adaptador persistente escribe en `registro_auditoria`, que es inmutable.
   *
   * OPCIONAL a propósito, igual que `notificarCambioCorreoConfirmado` de M18: exigirlo
   * obligaría a tocar los dobles de prueba de M13, M14, M16 y de cualquier módulo que ya
   * inyecta el puerto, y la regla de aislamiento de AGENTS.md pide no entrar en código ajeno
   * sin necesidad. Quien audita comprueba que el método esté antes de llamarlo.
   *
   * Un fallo aquí NO debe deshacer la operación que se estaba auditando (M03 · A4): quien
   * llama captura el error y continúa.
   */
  registrarAccion?(evento: EventoAccionAuditada): Promise<void>;
}
