/**
 * Aritmética decimal EXACTA para la calculadora (M03 · K5).
 *
 * El contrato prohíbe la coma flotante: `50 * 2 / 25` debe dar exactamente 4 y no
 * 4,0000001, porque el resultado se redondea HACIA ARRIBA y ese error de la última cifra
 * convertiría 4 galones en 5. Con `number` eso pasa en cuanto la equivalencia de la medida
 * no es redonda (un litro son 0,264172052 galones).
 *
 * Cada valor se guarda como un entero grande y su escala: `{ v, e }` representa `v / 10^e`.
 * Las multiplicaciones suman escalas y no pierden ni una cifra; las divisiones se hacen una
 * sola vez, al final, con el redondeo que pide cada regla (techo en K3, piso en K4).
 *
 * No depende de Prisma: los repositorios entregan los decimales de la base como texto
 * (`Decimal.toString()`, que es exacto) y aquí se convierten sin pasar por `number`.
 */

export interface Exacto {
  readonly v: bigint;
  readonly e: number;
}

const SOLO_DECIMAL = /^-?\d+(\.\d+)?$/;

export function potencia10(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Escala inválida: ${n}`);
  return 10n ** BigInt(n);
}

/** Lee un decimal escrito como texto sin pasar por `number`. La escala es la del texto. */
export function exacto(texto: string): Exacto {
  const limpio = texto.trim();
  if (!SOLO_DECIMAL.test(limpio)) {
    throw new RangeError(`No es un decimal: "${texto}"`);
  }
  const punto = limpio.indexOf('.');
  if (punto === -1) return { v: BigInt(limpio), e: 0 };
  const entero = limpio.slice(0, punto);
  const fraccion = limpio.slice(punto + 1);
  // "-0.5" -> BigInt("-05") = -5 con escala 1, que es -0,5.
  return { v: BigInt(entero + fraccion), e: fraccion.length };
}

export function deEntero(n: number): Exacto {
  if (!Number.isSafeInteger(n)) throw new RangeError(`No es un entero seguro: ${n}`);
  return { v: BigInt(n), e: 0 };
}

/** Producto exacto: las escalas se suman, no se redondea nada. */
export function multiplicar(a: Exacto, b: Exacto): Exacto {
  return { v: a.v * b.v, e: a.e + b.e };
}

export function esPositivo(a: Exacto): boolean {
  return a.v > 0n;
}

/**
 * `ceil(a / b)` con enteros, para K3: siempre se compra la unidad entera de más.
 * Exige los dos positivos; la calculadora nunca divide por cero porque K1 descarta los
 * productos sin rendimiento y el rendimiento debe ser mayor que cero.
 */
export function techoDivision(a: Exacto, b: Exacto): bigint {
  const numerador = a.v * potencia10(b.e);
  const denominador = b.v * potencia10(a.e);
  if (denominador <= 0n || numerador < 0n) {
    throw new RangeError('techoDivision espera un dividendo no negativo y un divisor positivo');
  }
  return (numerador + denominador - 1n) / denominador;
}

/**
 * `floor(a / b × 10^escala)` para K4: la cobertura se recorta hacia abajo, para no prometer
 * más área de la que el producto alcanza a cubrir.
 */
export function pisoDivisionEscalada(a: Exacto, b: Exacto, escala: number): bigint {
  const numerador = a.v * potencia10(b.e + escala);
  const denominador = b.v * potencia10(a.e);
  if (denominador <= 0n || numerador < 0n) {
    throw new RangeError('pisoDivisionEscalada espera un dividendo no negativo y un divisor positivo');
  }
  return numerador / denominador;
}

/** Redondea al más cercano (medio hacia arriba) y devuelve el entero escalado. */
export function redondearEscalado(a: Exacto, escala: number): bigint {
  const numerador = a.v * potencia10(escala);
  const denominador = potencia10(a.e);
  const cociente = numerador / denominador;
  const resto = numerador % denominador;
  return resto * 2n >= denominador ? cociente + 1n : cociente;
}

/**
 * Último paso: de entero escalado a `number`, ya para la respuesta HTTP. Solo se llama
 * cuando el cálculo terminó, nunca en medio de una operación.
 */
export function aNumero(escalado: bigint, escala: number): number {
  const divisor = potencia10(escala);
  const entero = escalado / divisor;
  const resto = escalado % divisor;
  if (resto === 0n) return Number(entero);
  return Number(escalado) / Number(divisor);
}
