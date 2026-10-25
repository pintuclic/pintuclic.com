/**
 * HU-ATC-05 — PUERTO DE ESCALAMIENTO A ASESOR HUMANO.
 *
 * Se contrata la FIRMA, no la API ni la pantalla (contrato §6, decisión D8).
 * RF-ATC-05-04 —qué señales deciden que una consulta escala y cómo se asigna a
 * un empleado concreto— sigue PENDIENTE y depende de M03, que todavía no
 * existe: por eso aquí no hay adaptador ni llamador. Cuando M03 aterrice,
 * implementa este puerto y M15 no cambia.
 *
 * El permiso `atencion.atender_clientes` (RF-ATC-05-01) ya está declarado en el
 * catálogo de M17 y queda reservado para la atención de consultas escaladas.
 */

export interface SolicitudEscalamiento {
  /** Null cuando la consulta automatizada venía de un visitante sin sesión. */
  idUsuario: number | null;
  resumenConsulta: string;
}

export interface EscalamientoConsultasPort {
  escalarAHumano(solicitud: SolicitudEscalamiento): Promise<void>;
}
