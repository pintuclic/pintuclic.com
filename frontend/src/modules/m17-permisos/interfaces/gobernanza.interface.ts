/**
 * ==============================================================================
 * Contratos de Tipado para Gobernanza de Admin — M17 (Frontend)
 * ==============================================================================
 * CERO RUNTIME. Solo definiciones de TypeScript.
 */

export interface SolicitudSustitucionRespuesta {
  mensaje: string;
  correoAnterior: string;
  nuevoCorreo: string;
  expiracionMinutos: number;
}

export interface ConfirmarSustitucionRespuesta {
  mensaje: string;
  correoActualizado: string;
  sesionesPreviasInvalidadas: boolean;
}

export interface PrimerAccesoRespuesta {
  mensaje: string;
  primerAccesoCompletado: boolean;
}
