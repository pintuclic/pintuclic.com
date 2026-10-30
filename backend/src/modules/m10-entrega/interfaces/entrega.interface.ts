import type { EstadoEnvio, OrigenEnvio } from '../dtos/m10-entrega.dto';

/** Lo que M10 necesita leer de una orden de M08 para crear el envío. Solo lectura. */
export interface OrdenParaEnvio {
  codigo: string;
  idUsuario: number;
  modoEntrega: 'domicilio' | 'recogida' | null;
  /** Texto con el que M07 guardó la dirección (R14 de M07). */
  direccion: string | null;
  total: number;
  lineas: ReadonlyArray<{ descripcion: string; cantidad: number; valor: number }>;
}

export interface OrdenesParaEnvioPort {
  buscarPorCodigo(codigo: string): Promise<OrdenParaEnvio | null>;
}

/** P3: de dónde sale el envío; lo lee de la ficha de datos del vendedor de M12. */
export interface OrigenEnvioPort {
  obtener(): Promise<OrigenEnvio>;
}

export interface EnvioGuardado {
  idEnvio: string;
  codigoOrden: string;
  idUsuario: number;
  proveedor: string;
  idExterno: string | null;
  numeroGuia: string | null;
  urlSeguimiento: string | null;
  urlEtiqueta: string | null;
  estado: EstadoEnvio;
  ultimoError: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface DatosGuardarEnvio {
  codigoOrden: string;
  proveedor: string;
  estado: EstadoEnvio;
  idExterno: string | null;
  numeroGuia: string | null;
  urlSeguimiento: string | null;
  urlEtiqueta: string | null;
  ultimoError: string | null;
}

export interface NovedadGuardada {
  idNovedad: string;
  detalle: string;
  fecha: Date;
}

export interface EnviosRepositoryPort {
  buscarPorCodigoOrden(codigo: string): Promise<EnvioGuardado | null>;
  buscarPorProveedorYExterno(proveedor: string, idExterno: string): Promise<EnvioGuardado | null>;
  /** Crea el envío de la orden o reemplaza el existente (uno por orden). */
  guardar(datos: DatosGuardarEnvio): Promise<EnvioGuardado>;
  actualizarEstado(idEnvio: string, estado: EstadoEnvio): Promise<void>;
  registrarNovedad(idEnvio: string, detalle: string): Promise<void>;
  listarNovedades(idEnvio: string): Promise<NovedadGuardada[]>;
}

/** Parámetros de M17 que lee el adaptador por defecto; null si no se pudo leer. */
export interface ParametrosEnvioPort {
  obtenerNumero(clave: string): Promise<number | null>;
}
