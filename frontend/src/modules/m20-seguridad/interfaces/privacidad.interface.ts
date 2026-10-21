/**
 * Contratos de datos de HU-SEG-05, en paridad con
 * `.sdlc/docs/contracts/m20-seguridad.contract.ts`.
 *
 * ⚠️ Cero runtime: esta carpeta solo contiene tipos (Directiva #12).
 */

export interface AvisoPrivacidad {
  idAvisoPrivacidad: number;
  version: string;
  descripcion: string;
  esVigente: boolean;
}

export type EstadoSolicitudSupresion = 'pendiente' | 'en_proceso' | 'aprobada' | 'rechazada';

export interface SolicitudSupresion {
  idSolicitudSupresion: number;
  estado: EstadoSolicitudSupresion;
  fechaSolicitud: string;
  fechaResolucion: string | null;
}

export interface Consentimiento {
  idConsentimiento: number;
  idAvisoPrivacidad: number;
  fecha: string;
}
