import { prisma } from '../../../core/db/client';
import type {
  AuditoriaPort,
  EventoAccesoDenegado,
  EventoAccionAuditada,
} from '../interfaces/auditoria.port';

/**
 * ADR-002 — Adaptador de registro técnico del puerto de auditoría.
 *
 * Escribe en el registro técnico interno en lugar de la bitácora persistente. Sigue siendo
 * el adaptador de los accesos denegados: RF-SEG-04-01 pide decidir con el Product Owner
 * qué acciones se guardan, y los accesos denegados aún no están en esa lista.
 *
 * ⚠️ Para los accesos denegados, CA-SEG-03-05 NO se considera cumplido: se certifica la
 * emisión, no la persistencia.
 */
export class AuditoriaRegistroTecnico implements AuditoriaPort {
  async registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void> {
    // RF-SEG-04-07: el evento jamás transporta credenciales ni datos de pago.
    console.warn(
      '[ACCESO-DENEGADO]',
      JSON.stringify({
        idUsuario: evento.idUsuario,
        operacion: evento.operacionIntentada,
        permisoRequerido: evento.permisoRequerido,
        fecha: evento.fecha.toISOString(),
        ipOrigen: evento.ipOrigen,
      }),
    );
    return Promise.resolve();
  }

  async registrarAccion(evento: EventoAccionAuditada): Promise<void> {
    console.info(
      '[AUDITORIA]',
      JSON.stringify({
        idUsuario: evento.idUsuario,
        accion: evento.accion,
        entidad: evento.entidad,
        idEntidad: evento.idEntidad,
        resultado: evento.resultado,
        fecha: evento.fecha.toISOString(),
      }),
    );
    return Promise.resolve();
  }
}

/**
 * HU-SEG-04 — Adaptador persistente: escribe en `registro_auditoria`.
 *
 * La tabla es INMUTABLE (RF-SEG-04-04): el DDL revoca UPDATE, DELETE y TRUNCATE, así que
 * este adaptador solo inserta. No hay método para corregir ni borrar un registro, a
 * propósito.
 *
 * Los accesos denegados siguen yendo al registro técnico (RF-SEG-04-01: la lista de
 * acciones que se persisten la define el Product Owner y aún no los incluye).
 */
export class AuditoriaPersistente implements AuditoriaPort {
  constructor(private readonly tecnico: AuditoriaPort = new AuditoriaRegistroTecnico()) {}

  async registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void> {
    return this.tecnico.registrarAccesoDenegado(evento);
  }

  async registrarAccion(evento: EventoAccionAuditada): Promise<void> {
    await prisma.registroAuditoria.create({
      data: {
        fecha: evento.fecha,
        idUsuario: evento.idUsuario,
        actor: evento.actor,
        accion: evento.accion,
        entidad: evento.entidad,
        idEntidad: evento.idEntidad,
        valorAnterior: evento.valorAnterior,
        valorNuevo: evento.valorNuevo,
        resultado: evento.resultado,
        ipOrigen: evento.ipOrigen,
      },
    });
  }
}
