import type { CambiarEstadoRequest, CrearContactoRequest, EstadoOrden } from '../dtos/m08-ordenes.dto';
import type { CambioEstadoForm, ContactoForm, FiltrosBandejaForm } from '../dtos/formularios.dto';
import type { FiltrosBandeja } from '../interfaces/ordenes.interface';

/** Convierte el formulario de búsqueda en parámetros del contrato, omitiendo los campos vacíos. */
export function aFiltrosBandeja(valores: FiltrosBandejaForm): FiltrosBandeja {
  return {
    ...(valores.codigo === '' ? {} : { codigo: valores.codigo }),
    ...(valores.correo === '' ? {} : { correo: valores.correo }),
    ...(valores.telefono === '' ? {} : { telefono: valores.telefono }),
    ...(valores.estado === '' ? {} : { estado: valores.estado }),
    ...(valores.desde === '' ? {} : { desde: valores.desde }),
    ...(valores.hasta === '' ? {} : { hasta: valores.hasta }),
  };
}

/** El PATCH lleva el estado que el empleado veía: si ya cambió, el servidor responde 409 (R8). */
export function aCambioEstado(estadoActual: EstadoOrden, valores: CambioEstadoForm): CambiarEstadoRequest {
  return {
    estadoActual,
    estadoNuevo: valores.estadoNuevo,
    ...(valores.motivo === '' ? {} : { motivo: valores.motivo }),
  };
}

export function aContacto(valores: ContactoForm): CrearContactoRequest {
  return { medio: valores.medio, ...(valores.detalle === '' ? {} : { detalle: valores.detalle }) };
}
