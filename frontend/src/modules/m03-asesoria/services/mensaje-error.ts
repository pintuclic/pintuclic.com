import { isAxiosError } from 'axios';
import { esRespuestaError } from '@/core/api/apiClient';

/**
 * Traduce un fallo de red al mensaje de dominio que emitió la API, igual que en M15 y M17:
 * se prefiere el `error.message` del envelope canónico y solo se cae al respaldo cuando la
 * respuesta no trae uno legible.
 */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    return esRespuestaError(cuerpo) ? cuerpo.error.message : respaldo;
  }
  return err instanceof Error && err.message ? err.message : respaldo;
}

/**
 * Un 404 en la calculadora significa que el producto no ofrece calculadora (K1): no es un
 * error que haya que mostrar, simplemente la calculadora no se muestra (CA-ASE-02-07).
 */
export function esSinCalculadora(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 404;
}

/** Texto de un resultado: una cifra sola cuando los extremos coinciden, o un intervalo. */
export function formatearIntervalo(minimo: number, maximo: number, unidad: string): string {
  const numero = (n: number): string =>
    n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return minimo === maximo
    ? `${numero(minimo)} ${unidad}`
    : `entre ${numero(minimo)} y ${numero(maximo)} ${unidad}`;
}

/**
 * «1 unidad» y no «1 unidades»: el intervalo solo va en singular cuando los dos extremos
 * son uno, porque «entre 1 y 2» ya es plural.
 */
export function unidadesDe(minimo: number, maximo: number): string {
  return minimo === 1 && maximo === 1 ? 'unidad' : 'unidades';
}
