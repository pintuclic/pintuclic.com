import {
  CODIGOS_ERROR_M11,
  type EstadoPostventa,
} from '../dtos/m11-postventa.dto';

export class ErrorPostventa extends Error {
  constructor(
    public readonly codigo: keyof typeof CODIGOS_ERROR_M11,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details: unknown = null
  ) {
    super(message);
    this.name = 'ErrorPostventa';
  }
}

export const ESTADOS_ORDEN_CANCELABLES: readonly string[] = [
  'orden_confirmada',
  'revision_disponibilidad',
  'en_preparacion',
];

export const ESTADOS_ORDEN_DEVOLVIBLES: readonly string[] = [
  'entregado',
  'despachado',
];

/**
 * Calcula los días hábiles (lunes a viernes) transcurridos entre dos fechas.
 */
export function calcularDiasHabiles(desde: Date, hasta: Date = new Date()): number {
  let contador = 0;
  const actual = new Date(desde);
  actual.setHours(0, 0, 0, 0);

  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);

  while (actual < fin) {
    actual.setDate(actual.getDate() + 1);
    const diaSemana = actual.getDay();
    // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      contador++;
    }
  }

  return contador;
}

/**
 * Calcula los días calendario transcurridos entre dos fechas.
 */
export function calcularDiasCalendario(desde: Date, hasta: Date = new Date()): number {
  const diffMs = Math.abs(hasta.getTime() - desde.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Valida si una orden es elegible para cancelación directa por parte del cliente.
 */
export function validarElegibilidadCancelacion(estadoOrden: string): void {
  if (!ESTADOS_ORDEN_CANCELABLES.includes(estadoOrden)) {
    throw new ErrorPostventa(
      'ORDEN_NO_ELEGIBLE',
      `La orden no puede cancelarse en su estado actual (${estadoOrden}). Solo pedidos antes de despacho admiten cancelación directa.`,
      400
    );
  }
}

/**
 * Valida si una orden y sus líneas son elegibles para devolución o garantía.
 * `fechaEntrega` es desde cuándo corren los plazos (RN-POS-02, RN-POS-03); `yaDevueltas` son las unidades por
 * línea que otras solicitudes aprobadas o reembolsadas ya devolvieron (RN-POS-05).
 */
export function validarElegibilidadDevolucion(
  tipo: 'devolucion' | 'garantia',
  estadoOrden: string,
  fechaEntrega: Date,
  lineasDevueltas: Array<{ idLineaOrden: number; cantidad: number }>,
  lineasOrdenOriginal: Array<{
    idLineaOrden: number;
    cantidad: number;
    esEntonado: boolean;
    nombreProducto: string;
  }>,
  ahora: Date = new Date(),
  yaDevueltas: ReadonlyMap<number, number> = new Map()
): void {
  if (!ESTADOS_ORDEN_DEVOLVIBLES.includes(estadoOrden)) {
    throw new ErrorPostventa(
      'ORDEN_NO_ELEGIBLE',
      `Solo órdenes entregadas o despachadas admiten solicitudes de devolución o garantía (estado actual: ${estadoOrden}).`,
      400
    );
  }

  if (tipo === 'devolucion') {
    const diasHabiles = calcularDiasHabiles(fechaEntrega, ahora);
    if (diasHabiles > 5) {
      throw new ErrorPostventa(
        'PLAZO_VENCIDO',
        `El plazo legal para ejercer el derecho de retracto es de 5 días hábiles a partir de la entrega (han transcurrido ${diasHabiles} días hábiles).`,
        400
      );
    }
  } else if (tipo === 'garantia') {
    const diasCalendario = calcularDiasCalendario(fechaEntrega, ahora);
    if (diasCalendario > 30) {
      throw new ErrorPostventa(
        'PLAZO_VENCIDO',
        `El plazo máximo para radicar reclamaciones por garantía es de 30 días calendario (han transcurrido ${diasCalendario} días).`,
        400
      );
    }
  }

  // Una misma línea repetida en la solicitud suma sus cantidades.
  const pedidas = new Map<number, number>();
  for (const l of lineasDevueltas) pedidas.set(l.idLineaOrden, (pedidas.get(l.idLineaOrden) ?? 0) + l.cantidad);

  for (const [idLineaOrden, cantidad] of pedidas) {
    const orig = lineasOrdenOriginal.find((l) => l.idLineaOrden === idLineaOrden);
    if (!orig) {
      throw new ErrorPostventa(
        'PARAMETRO_INVALIDO',
        `La línea con id ${idLineaOrden} no pertenece a esta orden.`,
        400
      );
    }

    const devueltas = yaDevueltas.get(idLineaOrden) ?? 0;
    if (cantidad + devueltas > orig.cantidad) {
      throw new ErrorPostventa(
        'PARAMETRO_INVALIDO',
        devueltas > 0
          ? `De ${orig.nombreProducto} compraste ${orig.cantidad} y ya devolviste ${devueltas}: puedes devolver como máximo ${orig.cantidad - devueltas}.`
          : `La cantidad a devolver (${cantidad}) supera la cantidad comprada (${orig.cantidad}) para ${orig.nombreProducto}.`,
        400
      );
    }

    if (tipo === 'devolucion' && orig.esEntonado) {
      throw new ErrorPostventa(
        'PRODUCTO_ENTONADO_NO_PERMITIDO',
        `El producto "${orig.nombreProducto}" es un color preparado a medida (entonado) y no admite devolución por derecho de retracto (Art. 47 Ley 1480 y RF-POS-04-04).`,
        400
      );
    }
  }
}

/**
 * Valida la máquina de estados de solicitudes de postventa.
 */
export function validarTransicionPostventa(
  estadoActual: EstadoPostventa,
  estadoNuevo: EstadoPostventa
): void {
  const transicionesValidas: Record<EstadoPostventa, readonly EstadoPostventa[]> = {
    solicitada: ['en_revision', 'aprobada', 'rechazada'],
    en_revision: ['aprobada', 'rechazada'],
    aprobada: ['reembolsada'],
    rechazada: [],
    reembolsada: [],
  };

  const permitidos = transicionesValidas[estadoActual] ?? [];
  if (!permitidos.includes(estadoNuevo)) {
    throw new ErrorPostventa(
      'TRANSICION_NO_PERMITIDA',
      `No se permite cambiar el estado de la solicitud de "${estadoActual}" a "${estadoNuevo}".`,
      409
    );
  }
}
