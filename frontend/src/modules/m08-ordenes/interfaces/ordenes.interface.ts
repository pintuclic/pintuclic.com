import type { EstadoOrden } from '../dtos/m08-ordenes.dto';

/** Parámetros de GET /ordenes/mis-pedidos. */
export interface ConsultaMisPedidos {
  q?: string;
  pagina?: number;
  limite?: number;
}

/** Parámetros de GET /ordenes/gestion. Las fechas van como `AAAA-MM-DD`. */
export interface FiltrosBandeja {
  codigo?: string;
  estado?: EstadoOrden;
  desde?: string;
  hasta?: string;
  cliente?: number;
  nombre?: string;
  correo?: string;
  telefono?: string;
  orden?: 'antiguedad' | 'reciente';
  diasEsperando?: number;
  pagina?: number;
  limite?: number;
}

/** Filtro de «Mis pedidos» según la separación del contrato (R12). */
export type FiltroEstadoPedidos = 'todos' | 'en_curso' | 'finalizados';
