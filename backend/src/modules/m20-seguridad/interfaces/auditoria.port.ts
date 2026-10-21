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

export interface AuditoriaPort {
  registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void>;
}
