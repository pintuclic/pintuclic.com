import {
  lineaExistenciaSchema,
  referenciaMovimientoSchema,
  type ExistenciaComboPort,
  type LineaExistencia,
  type ReferenciaMovimiento,
  type ResultadoDescuento,
} from '../../m01-catalogo/dtos/m01-catalogo-entrega3.dto';
import {
  enTransaccion,
  esClienteTransaccion,
  type ClienteTransaccion,
  type ExistenciaComboRepository,
} from '../repositories/existencia-combo.repository';
import { errores } from './inventario-error';

/** Suma las cantidades de una misma variante (una orden puede traerla en dos líneas) y valida cada línea. */
function agrupar(lineas: readonly LineaExistencia[]): Array<{ idVariante: number; cantidad: number }> {
  const totales = new Map<number, number>();
  for (const linea of lineas) {
    const valida = lineaExistenciaSchema.safeParse(linea);
    if (!valida.success) {
      throw errores.parametroInvalido('Cada línea necesita una variante y una cantidad entera mayor que cero.');
    }
    totales.set(valida.data.idVariante, (totales.get(valida.data.idVariante) ?? 0) + valida.data.cantidad);
  }
  return [...totales].map(([idVariante, cantidad]) => ({ idVariante, cantidad }));
}

function validarReferencia(referencia: ReferenciaMovimiento): ReferenciaMovimiento {
  const r = referenciaMovimientoSchema.safeParse(referencia);
  if (!r.success) throw errores.parametroInvalido('La referencia de la orden no es válida.');
  return r.data;
}

function clienteDe(contexto: unknown): ClienteTransaccion | undefined {
  if (contexto === undefined) return undefined;
  if (!esClienteTransaccion(contexto)) {
    throw errores.parametroInvalido('El contexto debe ser la transacción de base de datos de quien llama.');
  }
  return contexto;
}

/**
 * M13 · ExistenciaComboPort (entrega 3 de M01, sección 7; R15): descontar al crearse la orden y reponer al
 * cancelarse. Solo mueve combos. Todo o nada, sin llegar nunca a menos de cero, e idempotente por referencia.
 */
export class ExistenciaComboService implements ExistenciaComboPort {
  constructor(private readonly repo: ExistenciaComboRepository) {}

  /**
   * Todo o nada: si una línea no alcanza no se mueve ninguna (se comprueba todo antes de escribir, así que
   * también es seguro dentro de la transacción de M08). Repetir la misma referencia no descuenta dos veces.
   */
  async descontar(
    lineas: readonly LineaExistencia[],
    referencia: ReferenciaMovimiento,
    contexto?: unknown,
  ): Promise<ResultadoDescuento> {
    const ref = validarReferencia(referencia);
    const pedidas = agrupar(lineas);
    return enTransaccion(clienteDe(contexto), async (tx) => {
      const ids = pedidas.map((l) => l.idVariante);
      const existencias = await this.repo.bloquearCombos(tx, ids);
      const hechas = await this.repo.movimientosDe(tx, ref, 'venta', [...existencias.keys()]);
      const pendientes = pedidas.filter((l) => existencias.has(l.idVariante) && !hechas.has(l.idVariante));
      for (const l of pendientes) {
        const disponible = existencias.get(l.idVariante) ?? 0;
        if (disponible < l.cantidad) {
          return { ok: false, idVariante: l.idVariante, existenciaDisponible: disponible };
        }
      }
      for (const l of pendientes) {
        const anterior = existencias.get(l.idVariante) ?? 0;
        await this.repo.mover(tx, l.idVariante, anterior, anterior - l.cantidad, 'venta', ref);
      }
      return { ok: true };
    });
  }

  /**
   * Devuelve lo que esa orden descontó, una sola vez por variante: sin un descuento previo con la misma
   * referencia no hay nada que devolver, y nunca se devuelve más de lo descontado. Una devolución parcial
   * posterior (M11) debe usar otra referencia.
   */
  async reponer(
    lineas: readonly LineaExistencia[],
    referencia: ReferenciaMovimiento,
    contexto?: unknown,
  ): Promise<void> {
    const ref = validarReferencia(referencia);
    const pedidas = agrupar(lineas);
    await enTransaccion(clienteDe(contexto), async (tx) => {
      const existencias = await this.repo.bloquearCombos(
        tx,
        pedidas.map((l) => l.idVariante),
      );
      const ids = [...existencias.keys()];
      const ventas = await this.repo.movimientosDe(tx, ref, 'venta', ids);
      const devueltas = await this.repo.movimientosDe(tx, ref, 'devolucion', ids);
      for (const l of pedidas) {
        const venta = ventas.get(l.idVariante);
        const actual = existencias.get(l.idVariante);
        if (venta === undefined || actual === undefined || devueltas.has(l.idVariante)) continue;
        const descontado = venta.existenciaAnterior - venta.existenciaNueva;
        await this.repo.mover(tx, l.idVariante, actual, actual + Math.min(l.cantidad, descontado), 'devolucion', ref);
      }
    });
  }
}
