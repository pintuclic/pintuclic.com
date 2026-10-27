import type { ProductoPublicoFicha, VariantePublica } from '../dtos/m01-catalogo-productos.dto';
import { textoRendimiento } from './rendimiento';

const TIPOS_CALIDAD: Record<number, string> = { 1: 'Tipo 1 (gama alta)', 2: 'Tipo 2', 3: 'Tipo 3' };

/** Cada dato tiene un ícono propio en la ficha; las características del producto comparten uno. */
export type ClaveDato =
  | 'marca'
  | 'categoria'
  | 'presentaciones'
  | 'rendimiento'
  | 'ambiente'
  | 'superficies'
  | 'resina'
  | 'calidad'
  | 'acabados'
  | 'caracteristica';

export interface DatoFicha {
  clave: ClaveDato;
  etiqueta: string;
  valor: string;
}

/** "Interior y exterior", "Interior" o null. */
export function textoAmbiente(p: Pick<ProductoPublicoFicha, 'usoInterior' | 'usoExterior'>): string | null {
  if (p.usoInterior && p.usoExterior) return 'Interior y exterior';
  if (p.usoInterior) return 'Interior';
  if (p.usoExterior) return 'Exterior';
  return null;
}

/**
 * HU-CAT-06: todo lo que se sabe del producto para la ficha técnica, en el orden en que se lee. Solo los datos que
 * tiene: un producto sin ficha de recubrimiento (herramientas) no muestra resina, calidad ni rendimiento.
 */
export function datosFichaTecnica(p: ProductoPublicoFicha, variante: VariantePublica | null): DatoFicha[] {
  const datos: Array<DatoFicha | null> = [
    { clave: 'marca', etiqueta: 'Marca', valor: p.linea === null ? p.marca : `${p.marca} · línea ${p.linea}` },
    { clave: 'categoria', etiqueta: 'Categoría', valor: `${p.categoria} › ${p.subcategoria}` },
    p.variantes.length === 0
      ? null
      : { clave: 'presentaciones', etiqueta: 'Presentaciones', valor: p.variantes.map((v) => v.medida).join(', ') },
    (() => {
      const rendimiento = variante === null ? null : textoRendimiento(variante.rendimiento, p.manos);
      return rendimiento === null || variante === null
        ? null
        : { clave: 'rendimiento' as const, etiqueta: `Rendimiento (${variante.medida})`, valor: rendimiento.replace(/^Rinde /, '') };
    })(),
    (() => {
      const ambiente = textoAmbiente(p);
      return ambiente === null ? null : { clave: 'ambiente' as const, etiqueta: 'Ambiente', valor: ambiente };
    })(),
    p.superficies.length === 0 ? null : { clave: 'superficies', etiqueta: 'Superficies', valor: p.superficies.join(', ') },
    p.tipoResina === null ? null : { clave: 'resina', etiqueta: 'Tipo de resina', valor: p.tipoResina },
    p.tipoCalidad === null
      ? null
      : { clave: 'calidad', etiqueta: 'Calidad', valor: TIPOS_CALIDAD[p.tipoCalidad] ?? `Tipo ${p.tipoCalidad}` },
    p.acabados.length === 0 ? null : { clave: 'acabados', etiqueta: 'Acabados', valor: p.acabados.map((a) => a.nombre).join(', ') },
    ...p.caracteristicas.map((c): DatoFicha => ({ clave: 'caracteristica', etiqueta: c.nombre, valor: c.valor })),
  ];
  return datos.filter((d): d is DatoFicha => d !== null);
}
