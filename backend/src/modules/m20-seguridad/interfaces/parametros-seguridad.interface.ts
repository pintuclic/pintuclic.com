import type { TipoSesion } from '@prisma/client';

/**
 * RF-SEG-02-07 — Los tiempos de vigencia son configurables desde el panel, pero
 * el almacén de parámetros es HU-ADM-05 de M17, que aún no existe.
 *
 * M20 expone este puerto con una implementación por variables de entorno. Cuando
 * M17 entregue su tabla de parámetros, sustituirá la implementación sin que
 * ningún llamador cambie.
 */
export interface ParametrosSeguridadPort {
  ventanaInactividadSegundos(tipo: TipoSesion): number;
}
