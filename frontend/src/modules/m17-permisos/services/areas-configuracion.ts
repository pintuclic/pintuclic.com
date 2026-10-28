import type { AreaParametro, ParametroConfiguracion } from '../interfaces/configuracion.interface';

export type FiltroArea = AreaParametro | 'todas';

/** Nombre de cada área como lo lee el administrador (el código interno va sin tildes). */
export const ETIQUETAS_AREA: Record<AreaParametro, string> = {
  autenticacion: 'Autenticación',
  comunicaciones: 'Comunicaciones',
  comercial: 'Comercial',
};

/** Cuántos parámetros hay en total y por área, según lo que devolvió el servidor (nunca un número fijo). */
export function contarPorArea(parametros: readonly ParametroConfiguracion[]): Record<FiltroArea, number> {
  const conteo: Record<FiltroArea, number> = { todas: parametros.length, autenticacion: 0, comunicaciones: 0, comercial: 0 };
  for (const p of parametros) conteo[p.area] += 1;
  return conteo;
}

export function filtrarPorArea(
  parametros: readonly ParametroConfiguracion[],
  area: FiltroArea,
): ParametroConfiguracion[] {
  return area === 'todas' ? [...parametros] : parametros.filter((p) => p.area === area);
}
