import { createHash } from 'node:crypto';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';

/** Quién hizo el cambio, tal como llega de la sesión. */
export interface ActorAuditoria {
  idUsuario: number | null;
  nombre: string | null;
  ipOrigen: string | null;
}

/**
 * Escritura en el registro de auditoría de M20 (contrato · A1-A4).
 *
 * Dos reglas que no se pueden perder de vista:
 *
 *  · A4 — un fallo al auditar NO deshace el cambio del administrador. Una bitácora caída no
 *    puede bloquear el panel, así que el error se registra y la operación continúa.
 *  · El método del puerto es OPCIONAL: los módulos que ya inyectan `AuditoriaPort` no lo
 *    implementan, así que se comprueba antes de llamarlo.
 */
export class AuditoriaAsesoria {
  constructor(private readonly auditoria: AuditoriaPort | null) {}

  async registrar(args: {
    actor: ActorAuditoria;
    accion: string;
    entidad: string;
    idEntidad: string | null;
    valorAnterior: string | null;
    valorNuevo: string | null;
  }): Promise<void> {
    const registrar = this.auditoria?.registrarAccion?.bind(this.auditoria);
    if (registrar === undefined) return;

    try {
      await registrar({
        idUsuario: args.actor.idUsuario,
        actor: args.actor.nombre,
        accion: args.accion,
        entidad: args.entidad,
        idEntidad: args.idEntidad,
        valorAnterior: args.valorAnterior,
        valorNuevo: args.valorNuevo,
        resultado: 'exito',
        fecha: new Date(),
        ipOrigen: args.actor.ipOrigen,
      });
    } catch (err: unknown) {
      // A4: se informa y se sigue. El cambio ya se guardó y no se deshace.
      console.error('[M03][AUDITORIA] no se pudo registrar la acción', {
        accion: args.accion,
        entidad: args.entidad,
        motivo: err instanceof Error ? err.message : 'desconocido',
      });
    }
  }
}

/**
 * A2 — un texto largo se registra por su longitud y una huella, nunca entero: el guion llega
 * a 4000 caracteres y dos versiones suyas llenarían el registro en cada guardado. La huella
 * basta para saber si cambió y para comparar dos versiones.
 */
export function huellaDeTexto(texto: string): string {
  const huella = createHash('sha256').update(texto).digest('hex').slice(0, 12);
  return `largo:${texto.length} huella:${huella}`;
}

/** Valor corto que sí cabe entero en el registro. */
export function valorCorto(valor: string | number | boolean | null): string | null {
  return valor === null ? null : String(valor);
}
