import type { EstadoOrden, MedioContacto } from '../dtos/m08-ordenes.dto';
import type { DetalleOrdenDatos, FilaResumenOrden, LineaOrdenDatos } from './consulta-cliente.interface';

export interface FilaBandejaDatos extends FilaResumenOrden {
  cliente: string;
  /** Momento en que la orden entró en su estado actual. */
  entradaEstado: Date;
}

export interface FiltroGestion {
  codigo?: string;
  /** Uno o varios estados; sin valor, todos. */
  estados?: readonly EstadoOrden[];
  desde?: Date;
  hasta?: Date;
  /** Id del cliente (ficha). */
  cliente?: number;
  correo?: string;
  telefono?: string;
  /** Solo órdenes que llevan al menos estos días en su estado actual. */
  diasEsperando?: number;
  /** `antiguedad`: las que llevan más tiempo en su estado primero; `reciente`: las más nuevas primero. */
  orden: 'antiguedad' | 'reciente';
  /** Sin `pagina` y `limite` devuelve todo (bandeja agrupada). */
  pagina?: number;
  limite?: number;
}

export interface LineaGestionDatos extends LineaOrdenDatos {
  esEntonado: boolean;
  baseConsumida: string | null;
}

export interface HistorialGestionDatos {
  estadoAnterior: EstadoOrden | null;
  estadoNuevo: EstadoOrden;
  fecha: Date;
  /** Nombre del empleado; null = transición automática del sistema. */
  autor: string | null;
  motivo: string | null;
}

export interface NotaOrdenDatos {
  idNota: number;
  texto: string;
  autor: string;
  fecha: Date;
}

export interface ContactoOrdenDatos {
  idContacto: number;
  medio: MedioContacto;
  detalle: string | null;
  autor: string;
  fecha: Date;
}

export interface DetalleGestionDatos extends Omit<DetalleOrdenDatos, 'lineas' | 'historial'> {
  cliente: { idUsuario: number; nombre: string; correo: string; telefono: string | null };
  direccion: string | null;
  codigoSolicitud: string | null;
  idCotizacion: number | null;
  observaciones: string | null;
  lineas: LineaGestionDatos[];
  historial: HistorialGestionDatos[];
  notas: NotaOrdenDatos[];
  contactos: ContactoOrdenDatos[];
}

export interface GestionRepository {
  listar(filtro: FiltroGestion): Promise<{ filas: FilaBandejaDatos[]; total: number }>;
  contarPorEstado(): Promise<Array<{ estado: EstadoOrden; cantidad: number }>>;
  buscarDetalle(codigo: string): Promise<DetalleGestionDatos | null>;
  /** Id del cliente titular de la orden, para su historial de compras. */
  buscarIdCliente(codigo: string): Promise<number | null>;
}
