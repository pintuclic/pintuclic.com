/**
 * Lee un porcentaje escrito por una persona: "15", "12,5" o "12.5". Devuelve null si no es un número
 * mayor que 0 y hasta 100 con dos decimales como máximo.
 */
export function parsearPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace('%', '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const valor = Number(limpio);
  return valor > 0 && valor <= 100 ? valor : null;
}

/**
 * Lee un monto en pesos: "300000", "300.000", "1.234.567,50" o "1234,5". Devuelve null si no es un número
 * de cero o más con dos decimales como máximo.
 */
export function parsearDinero(texto: string): number | null {
  const base = texto.trim().replace(/\s/g, '').replace(/^\$/, '');
  if (base === '') return null;
  const conMiles = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(base);
  const normal = conMiles ? base.replace(/\./g, '').replace(',', '.') : base.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const valor = Number(normal);
  return Number.isFinite(valor) && valor <= 9_999_999_999.99 ? valor : null;
}

/** Entero de cero o más; null si no lo es. */
export function parsearEntero(texto: string): number | null {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) return null;
  const valor = Number(limpio);
  return Number.isSafeInteger(valor) ? valor : null;
}
