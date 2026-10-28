import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';
import { avisarCarritoActualizado } from '@/core/utils/eventos-carrito';

/**
 * Agregar al carrito desde la ficha (contrato M05 · P3): `POST /carrito/lineas`. Si la variante y el color ya
 * están en el carrito, M05 suma la cantidad. La cookie del carrito la maneja el navegador.
 */
export async function agregarAlCarrito(idVariante: number, idColor: number | null, cantidad: number): Promise<void> {
  await apiClient.post('/carrito/lineas', { idVariante, idColor, cantidad });
  avisarCarritoActualizado();
}

/** El mensaje que da M05 (límite, tope, producto no disponible…) o uno general. */
export function mensajeErrorCarrito(err: unknown): string {
  if (isAxiosError<unknown>(err) && esRespuestaError(err.response?.data)) return err.response.data.error.message;
  return 'No fue posible agregar el producto al carrito. Intenta de nuevo.';
}
