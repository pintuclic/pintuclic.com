/** Un tipo de medida activo contra el que se reconoce la unidad escrita (galón, L, ml…). */
export interface TipoMedidaReconocible {
  id: number;
  nombre: string;
  abreviatura: string;
}

export interface MedidaDeducida {
  idTipoMedida: number;
  valor: number;
}

export type Deduccion = { ok: true; valor: MedidaDeducida } | { ok: false; motivo: string };

const MAXIMO_VALOR = 9_999_999;
const SIN_TILDES = (t: string): string => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** «1», «0,25», «1/4» o «1 1/2»; devuelve null si no es un número escrito de esas formas. */
function leerCantidad(texto: string): number | null {
  const mixto = /^(\d+)\s+(\d+)\/(\d+)$/.exec(texto);
  if (mixto !== null) {
    const [, entero, numerador, denominador] = mixto;
    return denominador === '0' ? null : Number(entero) + Number(numerador) / Number(denominador);
  }
  const fraccion = /^(\d+)\/(\d+)$/.exec(texto);
  if (fraccion !== null) {
    const [, numerador, denominador] = fraccion;
    return denominador === '0' ? null : Number(numerador) / Number(denominador);
  }
  if (/^\d+(?:[.,]\d+)?$/.test(texto)) return Number(texto.replace(',', '.'));
  return null;
}

/**
 * Deduce el valor y el tipo de una medida escrita como «1/4 de galón», «300 ml», «5 galones» o «0,5 L».
 * Solo reconoce «cantidad + unidad»: una palabra suelta («Cuarto») no basta para saber cuánto es.
 */
export function deducirMedida(texto: string, tipos: readonly TipoMedidaReconocible[]): Deduccion {
  const limpio = SIN_TILDES(texto);
  const partes = /^(\d+(?:[.,]\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:de\s+)?([a-z]+)\.?$/.exec(limpio);
  if (partes === null) {
    return { ok: false, motivo: 'no se entiende como «cantidad + unidad» (por ejemplo «1/4 de galón», «300 ml» o «5 galones»)' };
  }
  const [, cantidadTexto, unidad] = partes;
  const cantidad = leerCantidad(cantidadTexto ?? '');
  if (cantidad === null || unidad === undefined) {
    return { ok: false, motivo: 'la cantidad no es un número válido' };
  }
  const tipo = tipos.find((t) => {
    const nombre = SIN_TILDES(t.nombre);
    const abreviatura = SIN_TILDES(t.abreviatura);
    return [nombre, `${nombre}s`, `${nombre}es`, abreviatura, `${abreviatura}s`].includes(unidad);
  });
  if (tipo === undefined) {
    const conocidos = tipos.map((t) => `${t.nombre} (${t.abreviatura})`).join(', ');
    return { ok: false, motivo: `la unidad «${unidad}» no corresponde a ningún tipo de medida activo (${conocidos})` };
  }
  const valor = Math.round(cantidad * 1000) / 1000;
  if (Math.abs(valor - cantidad) > 1e-9) {
    return { ok: false, motivo: 'el valor no es exacto con 3 decimales; escríbalo en decimales (por ejemplo 0.333)' };
  }
  if (valor <= 0 || valor > MAXIMO_VALOR) {
    return { ok: false, motivo: `el valor debe ser mayor que 0 y no pasar de ${MAXIMO_VALOR}` };
  }
  return { ok: true, valor: { idTipoMedida: tipo.id, valor } };
}
