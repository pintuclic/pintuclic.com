export type SeccionPromociones = 'eventos' | 'cupones' | 'empresas' | 'simulador';

const SECCIONES: readonly SeccionPromociones[] = ['eventos', 'cupones', 'empresas', 'simulador'];

/** La sección vive en la URL (`?seccion=`): se puede compartir. Cualquier valor raro cae en «eventos». */
export function leerSeccion(valor: string | null): SeccionPromociones {
  return SECCIONES.find((s) => s === valor) ?? 'eventos';
}

export function enlaceSeccion(seccion: SeccionPromociones): string {
  return seccion === 'eventos' ? '/admin/promociones' : `/admin/promociones?seccion=${seccion}`;
}
