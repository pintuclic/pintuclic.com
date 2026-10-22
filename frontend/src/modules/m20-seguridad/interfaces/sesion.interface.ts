/** Espejo de los enums de sesión del contrato. Cero runtime. */

export type EstadoSesion = 'activa' | 'cerrada' | 'expirada' | 'revocada';

export type MotivoCierreSesion =
  | 'cierre_manual'
  | 'inactividad'
  | 'cambio_contrasena'
  | 'cuenta_desactivada'
  | 'permisos_retirados';

export interface SesionCerrada {
  idSesion: string;
  estado: EstadoSesion;
  motivoCierre: MotivoCierreSesion | null;
}
