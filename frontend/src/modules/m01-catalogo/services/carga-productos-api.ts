import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  BalanceCargaProductos,
  CargarProductosRequest,
  FilaProductoCarga,
  ProductoCarga,
} from '../dtos/m01-catalogo-carga-masiva.dto';
import {
  calcularBalance,
  dividirEnBloquesDeProductos,
  ENCABEZADOS_INFORME,
  filasDelInforme,
} from './carga-productos-bloques';

const BASE = '/admin/catalogo';
export const NOMBRE_PLANTILLA_PRODUCTOS = 'plantilla-productos.xlsx';
export const NOMBRE_INFORME_PRODUCTOS = 'informe-carga-productos.xlsx';
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Con `arraybuffer` hasta el cuerpo de un error llega como bytes: se relee como JSON para mostrar el mensaje de la API. */
async function errorLegible(err: unknown): Promise<unknown> {
  if (!isAxiosError<unknown>(err) || !(err.response?.data instanceof ArrayBuffer)) return err;
  try {
    const cuerpo: unknown = JSON.parse(new TextDecoder().decode(err.response.data));
    return esRespuestaError(cuerpo) ? new Error(cuerpo.error.message) : err;
  } catch {
    return err;
  }
}

interface RespuestaBloque {
  aplicada: boolean;
  balance: BalanceCargaProductos;
  productos: ProductoCarga[];
}

export interface ResultadoCarga {
  aplicada: boolean;
  balance: BalanceCargaProductos;
  productos: ProductoCarga[];
}

async function enviarBloque(ruta: 'previsualizar' | 'aplicar', cuerpo: CargarProductosRequest): Promise<RespuestaBloque> {
  const { data } = await apiClient.post<RespuestaExitosa<RespuestaBloque>>(`${BASE}/productos/importar/${ruta}`, cuerpo);
  return data.data;
}

/**
 * C8: envía las filas por bloques que no parten un producto, de a uno, y junta los resultados. `alAvanzar` informa
 * cuántos bloques van. Si un bloque falla, el error sube y lo ya aplicado queda aplicado (cada producto es atómico).
 */
async function procesar(
  ruta: 'previsualizar' | 'aplicar',
  filas: readonly FilaProductoCarga[],
  alAvanzar?: (hechos: number, total: number) => void,
): Promise<ResultadoCarga> {
  const { bloques, demasiadoGrandes } = dividirEnBloquesDeProductos(filas);
  const productos: ProductoCarga[] = [];
  for (const [i, bloque] of bloques.entries()) {
    alAvanzar?.(i, bloques.length);
    productos.push(...(await enviarBloque(ruta, { filas: bloque })).productos);
  }
  alAvanzar?.(bloques.length, bloques.length);
  const todos = [...productos, ...demasiadoGrandes];
  return { aplicada: ruta === 'aplicar', balance: calcularBalance(todos), productos: todos };
}

export const cargaProductosApi = {
  /** C7: no escribe nada; lista lo que se crearía y lo que se rechaza. */
  previsualizar: (filas: readonly FilaProductoCarga[], alAvanzar?: (hechos: number, total: number) => void) =>
    procesar('previsualizar', filas, alAvanzar),
  /** Crea los productos válidos. El servidor vuelve a validar todo (C7). */
  aplicar: (filas: readonly FilaProductoCarga[], alAvanzar?: (hechos: number, total: number) => void) =>
    procesar('aplicar', filas, alAvanzar),

  /** La plantilla se arma en el servidor con los catálogos de hoy (D3). */
  descargarPlantilla: async (): Promise<ArrayBuffer> => {
    try {
      const { data } = await apiClient.get<ArrayBuffer>(`${BASE}/productos/importar/plantilla`, { responseType: 'arraybuffer' });
      return data;
    } catch (err: unknown) {
      throw await errorLegible(err);
    }
  },
};

/** Entrega al navegador un archivo ya armado en memoria. */
export function guardarArchivoXlsx(datos: ArrayBuffer, nombre: string): void {
  const url = URL.createObjectURL(new Blob([datos], { type: TIPO_XLSX }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/** El informe de errores como Excel: una fila por variante de cada producto rechazado o ya existente (C10 ya neutraliza fórmulas). */
export async function armarInformeProductos(productos: readonly ProductoCarga[]): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Informe');
  hoja.addRow([...ENCABEZADOS_INFORME]).font = { bold: true };
  for (const fila of filasDelInforme(productos)) hoja.addRow(fila);
  [8, 22, 34, 16, 14, 30, 80].forEach((ancho, i) => {
    hoja.getColumn(i + 1).width = ancho;
  });
  return libro.xlsx.writeBuffer();
}
