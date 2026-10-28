import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  CalculadoraProducto,
  Paginacion,
  PaginaProductosCalculables,
  ProductoCalculable,
  ResultadoCalculo,
} from '../interfaces/asesoria.interface';

interface RespuestaPaginada<T> {
  success: true;
  data: T[];
  pagination: Paginacion;
}

/** K10: solo productos que ofrecen calculadora, para el selector de la calculadora general. */
export async function listarProductosCalculables(query: {
  q?: string;
  pagina?: number;
  limite?: number;
}): Promise<PaginaProductosCalculables> {
  const params = new URLSearchParams();
  if (query.q !== undefined && query.q.trim() !== '') params.set('q', query.q.trim());
  params.set('pagina', String(query.pagina ?? 1));
  params.set('limite', String(query.limite ?? 20));

  const { data } = await apiClient.get<RespuestaPaginada<ProductoCalculable>>(
    `/asesoria/calculadora/productos?${params.toString()}`,
  );
  return { datos: data.data, paginacion: data.pagination };
}

/** Un 404 significa que el producto no ofrece calculadora: la pantalla no la muestra (K1). */
export async function obtenerCalculadoraDeProducto(idProducto: number): Promise<CalculadoraProducto> {
  const { data } = await apiClient.get<RespuestaExitosa<CalculadoraProducto>>(
    `/asesoria/calculadora/productos/${idProducto}`,
  );
  return data.data;
}

export async function calcularCantidad(peticion: {
  idProducto: number;
  idVariante: number;
  area: number;
  manos: number;
}): Promise<ResultadoCalculo> {
  const { data } = await apiClient.post<RespuestaExitosa<ResultadoCalculo>>(
    '/asesoria/calculadora/calcular',
    { sentido: 'cantidad', ...peticion },
  );
  return data.data;
}

export async function calcularCobertura(peticion: {
  idProducto: number;
  idVariante: number;
  unidades: number;
  manos: number;
}): Promise<ResultadoCalculo> {
  const { data } = await apiClient.post<RespuestaExitosa<ResultadoCalculo>>(
    '/asesoria/calculadora/calcular',
    { sentido: 'cobertura', ...peticion },
  );
  return data.data;
}
