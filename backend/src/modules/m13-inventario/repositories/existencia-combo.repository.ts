import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { ReferenciaMovimiento } from '../../m01-catalogo/dtos/m01-catalogo-entrega3.dto';

/** Cliente de transacción de Prisma: el de `prisma.$transaction` o el que pasa quien llama (M08). */
export type ClienteTransaccion = Prisma.TransactionClient;

interface FilaCombo {
  id: number;
  existencia: number;
}

/**
 * Un cliente de transacción no tiene `$transaction` ni `$connect`; el cliente raíz sí. Así se distingue
 * lo que M08 pasa como `contexto` de cualquier otra cosa.
 */
export function esClienteTransaccion(valor: unknown): valor is ClienteTransaccion {
  if (typeof valor !== 'object' || valor === null) return false;
  const candidato = valor as { $queryRaw?: unknown; $transaction?: unknown };
  return typeof candidato.$queryRaw === 'function' && candidato.$transaction === undefined;
}

/** Ejecuta `fn` dentro de la transacción de quien llama, o en una propia si no hay. */
export function enTransaccion<T>(
  contexto: ClienteTransaccion | undefined,
  fn: (tx: ClienteTransaccion) => Promise<T>,
): Promise<T> {
  return contexto === undefined ? prisma.$transaction(fn) : fn(contexto);
}

/**
 * Movimientos de existencia de los combos por orden (ExistenciaComboPort). Escribe solo
 * `existencia_referencial` y su historial, como el resto de M13.
 */
export class ExistenciaComboRepository {
  /**
   * Bloquea las filas de los combos entre las variantes dadas (en orden de id, sin interbloqueos entre
   * órdenes) y devuelve su existencia vigente. Las variantes que no son de un combo, o no existen, no
   * aparecen: la existencia de un producto común es referencial y no se mueve con las ventas.
   */
  async bloquearCombos(tx: ClienteTransaccion, ids: readonly number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const filas = await tx.$queryRaw<FilaCombo[]>`
      SELECT v.id_variante AS id, v.existencia_referencial AS existencia
      FROM variante v JOIN producto p ON p.id_producto = v.id_producto
      WHERE v.id_variante = ANY(${[...ids]}::int[]) AND p.es_combo
      ORDER BY v.id_variante
      FOR UPDATE OF v`;
    return new Map(filas.map((f) => [f.id, f.existencia]));
  }

  /** Movimientos ya hechos con esta referencia y motivo, por variante (idempotencia, P6). */
  async movimientosDe(
    tx: ClienteTransaccion,
    referencia: ReferenciaMovimiento,
    motivo: 'venta' | 'devolucion',
    ids: readonly number[],
  ): Promise<Map<number, { existenciaAnterior: number; existenciaNueva: number }>> {
    if (ids.length === 0) return new Map();
    const filas = await tx.ajusteInventario.findMany({
      where: { referencia: referencia.id, motivo, origen: 'orden', idVariante: { in: [...ids] } },
      select: { idVariante: true, existenciaAnterior: true, existenciaNueva: true },
    });
    return new Map(filas.map((f) => [f.idVariante, f]));
  }

  /** Escribe la nueva existencia y su historial, sin usuario (lo hace el sistema). */
  async mover(
    tx: ClienteTransaccion,
    idVariante: number,
    anterior: number,
    nueva: number,
    motivo: 'venta' | 'devolucion',
    referencia: ReferenciaMovimiento,
  ): Promise<void> {
    await tx.variante.update({ where: { idVariante }, data: { existenciaReferencial: nueva } });
    await tx.ajusteInventario.create({
      data: {
        idVariante,
        existenciaAnterior: anterior,
        existenciaNueva: nueva,
        motivo,
        origen: 'orden',
        referencia: referencia.id,
      },
    });
  }
}
