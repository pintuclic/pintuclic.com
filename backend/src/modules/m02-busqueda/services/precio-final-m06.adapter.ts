import type { ContextoPrecio, PrecioFinalPort } from '../dtos/m02-busqueda.dto';

/** Lo que M02 necesita de `PreciosPort.preciosDeVariantes` de M06 (forma estructural; no se importa M06). */
export interface PreciosDeVariantesPort {
  preciosDeVariantes(
    consultas: ReadonlyArray<{ idVariante: number }>,
  ): Promise<ReadonlyArray<{ idVariante: number; vendible: boolean; precioConOferta: number | null }>>;
}

/** M06 acepta hasta 500 variantes por consulta (MAXIMO_VARIANTES_PRECIO). */
const TAMANO_LOTE = 500;

/**
 * Precio final de una variante para los listados: el precio con el evento en curso, IVA incluido (M02 · F5).
 * Una variante que M06 no puede vender o no trae precio queda fuera del mapa y conserva su precio base.
 */
export class PrecioFinalM06Adapter implements PrecioFinalPort {
  constructor(private readonly precios: PreciosDeVariantesPort) {}

  async preciosFinales(
    idsVariante: readonly number[],
    _contexto: ContextoPrecio,
  ): Promise<ReadonlyMap<number, number>> {
    const lotes: number[][] = [];
    for (let i = 0; i < idsVariante.length; i += TAMANO_LOTE) {
      lotes.push(idsVariante.slice(i, i + TAMANO_LOTE) as number[]);
    }
    const respuestas = await Promise.all(
      lotes.map((lote) => this.precios.preciosDeVariantes(lote.map((idVariante) => ({ idVariante })))),
    );
    const mapa = new Map<number, number>();
    for (const respuesta of respuestas) {
      for (const p of respuesta) {
        if (p.vendible && p.precioConOferta !== null) mapa.set(p.idVariante, p.precioConOferta);
      }
    }
    return mapa;
  }
}
