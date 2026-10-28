/**
 * Aritmética de dinero en centavos enteros (R9 del contrato): sin errores de coma flotante.
 * Los productos intermedios usan BigInt porque precio × cantidad × porcentaje puede pasar de 2^53.
 */
export const aCentavos = (pesos: number): number => Math.round(pesos * 100);
export const dePesos = (centavos: number): number => centavos / 100;

/** Porcentaje en puntos básicos (15,25 % → 1525). */
export const aPuntosBasicos = (porcentaje: number): number => Math.round(porcentaje * 100);

/** `centavos × bp / 10000` redondeado "mitad hacia arriba". */
export function porcentajeDe(centavos: number, puntosBasicos: number): number {
  return Number((BigInt(centavos) * BigInt(puntosBasicos) + 5000n) / 10000n);
}

/**
 * Reparte `total` centavos entre las partes en proporción a sus pesos. Cada una recibe su parte
 * truncada y el sobrante de centavos va a la de mayor peso (la primera si empatan), de modo que la
 * suma del reparto es exacta (R9).
 */
export function repartirProporcional(total: number, pesos: readonly number[]): number[] {
  const suma = pesos.reduce((a, b) => a + b, 0);
  if (suma === 0 || total === 0) return pesos.map(() => 0);
  const partes = pesos.map((p) => Number((BigInt(total) * BigInt(p)) / BigInt(suma)));
  const sobrante = total - partes.reduce((a, b) => a + b, 0);
  if (sobrante !== 0) {
    let mayor = 0;
    pesos.forEach((p, i) => {
      if (p > (pesos[mayor] ?? 0)) mayor = i;
    });
    partes[mayor] = (partes[mayor] ?? 0) + sobrante;
  }
  return partes;
}
