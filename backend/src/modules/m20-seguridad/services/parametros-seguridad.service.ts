import type { TipoSesion } from '@prisma/client';
import type { ParametrosSeguridadPort } from '../interfaces/parametros-seguridad.interface';

/** RF-SEG-02-02: 30 minutos en panel administrativo, 30 días en cliente. */
const POR_DEFECTO: Readonly<Record<TipoSesion, number>> = {
  admin: 1800,
  cliente: 2592000,
};

/**
 * Implementación por variables de entorno del puerto de parámetros.
 * Se sustituirá por la tabla de parámetros de M17 (HU-ADM-05) sin tocar llamadores.
 */
export class ParametrosSeguridadEnv implements ParametrosSeguridadPort {
  ventanaInactividadSegundos(tipo: TipoSesion): number {
    const bruto =
      tipo === 'admin'
        ? process.env.SESION_INACTIVIDAD_ADMIN_SEG
        : process.env.SESION_INACTIVIDAD_CLIENTE_SEG;

    if (bruto === undefined) {
      return POR_DEFECTO[tipo];
    }
    const valor = Number.parseInt(bruto, 10);
    return Number.isInteger(valor) && valor > 0 ? valor : POR_DEFECTO[tipo];
  }
}
