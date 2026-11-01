import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';

const BASE = '/admin/catalogo';
export const NOMBRE_PLANTILLA_PRODUCTOS = 'plantilla-productos.xlsx';
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

export const cargaProductosApi = {
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
