import type { TipoSesion } from '@prisma/client';

/**
 * Actor autenticado. Se construye SIEMPRE desde la sesión verificada en el
 * servidor; nunca desde datos enviados por el cliente (Anti-IDOR).
 */
export interface Actor {
  idUsuario: number;
  idSesion: string;
  tipoSesion: TipoSesion;
}
