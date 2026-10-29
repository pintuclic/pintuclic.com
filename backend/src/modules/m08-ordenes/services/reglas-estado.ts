import type { EstadoOrden, ModoEntrega } from '../dtos/m08-ordenes.dto';

export type ResultadoTransicion = { ok: true } | { ok: false; razon: 'NO_PERMITIDA' | 'NO_HABILITADA' };

interface ReglaTransicion {
  desde: EstadoOrden;
  hacia: EstadoOrden;
  /** Solo aplica a ese modo de entrega; una orden sin modo (anterior a v3.9) admite ambos. */
  modo?: ModoEntrega;
}

/** Tabla del §5 de la spec y TRANSICIONES_ESTADO del contrato (R7). El orden fija el de las listas. */
const TRANSICIONES_HABILITADAS: readonly ReglaTransicion[] = [
  { desde: 'orden_confirmada', hacia: 'revision_disponibilidad' },
  { desde: 'revision_disponibilidad', hacia: 'en_preparacion' },
  { desde: 'en_preparacion', hacia: 'preparada' },
  { desde: 'preparada', hacia: 'en_preparacion' },
  { desde: 'preparada', hacia: 'despachado', modo: 'domicilio' },
  { desde: 'preparada', hacia: 'entregado', modo: 'recogida' },
  { desde: 'despachado', hacia: 'entregado' },
];

/** Esperan la política de M11 (RF-POS-04-03): se rechazan siempre (R9). */
const DESTINOS_SIN_POLITICA: readonly EstadoOrden[] = ['cancelado', 'devuelto'];

function aplicaAlModo(regla: ReglaTransicion, modo: ModoEntrega | null): boolean {
  return regla.modo === undefined || modo === null || regla.modo === modo;
}

export function evaluarTransicion(desde: EstadoOrden, hacia: EstadoOrden, modo: ModoEntrega | null): ResultadoTransicion {
  if (DESTINOS_SIN_POLITICA.includes(hacia)) return { ok: false, razon: 'NO_HABILITADA' };

  const regla = TRANSICIONES_HABILITADAS.find((r) => r.desde === desde && r.hacia === hacia);
  if (!regla || !aplicaAlModo(regla, modo)) return { ok: false, razon: 'NO_PERMITIDA' };
  return { ok: true };
}

/**
 * M11 (RN-POS-01, RF-POS-05-03 y RF-POS-05-04): cancelado y devuelto solo llegan por una solicitud de postventa
 * aprobada, nunca desde el panel de pedidos (por eso `evaluarTransicion` los sigue rechazando).
 */
const ORIGENES_POSTVENTA: Readonly<Record<'cancelado' | 'devuelto', readonly EstadoOrden[]>> = {
  cancelado: ['orden_confirmada', 'revision_disponibilidad', 'en_preparacion'],
  devuelto: ['despachado', 'entregado'],
};

export function permitidaPorPostventa(desde: EstadoOrden, hacia: 'cancelado' | 'devuelto'): boolean {
  return ORIGENES_POSTVENTA[hacia].includes(desde);
}

/** RF-CUM-05-05: retroceder de preparada a en preparación deja constancia del motivo. */
export function exigeMotivo(desde: EstadoOrden, hacia: EstadoOrden): boolean {
  return desde === 'preparada' && hacia === 'en_preparacion';
}

/** Estados a los que el personal puede pasar la orden hoy (`transicionesPermitidas` del detalle). */
export function transicionesDisponibles(desde: EstadoOrden, modo: ModoEntrega | null): EstadoOrden[] {
  return TRANSICIONES_HABILITADAS.filter((r) => r.desde === desde && aplicaAlModo(r, modo)).map((r) => r.hacia);
}
