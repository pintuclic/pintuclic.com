import type { ContextoPrecio, PrecioFinalPort } from '../dtos/m02-busqueda.dto';
import { prisma } from '../../../core/db/client';

export class PrecioFinalBaseAdapter implements PrecioFinalPort {
  async preciosFinales(
    idsVariante: readonly number[],
    _contexto: ContextoPrecio,
  ): Promise<ReadonlyMap<number, number>> {
    if (idsVariante.length === 0) {
      return new Map();
    }

    const variantes = await prisma.variante.findMany({
      where: {
        idVariante: { in: [...idsVariante] },
      },
      select: {
        idVariante: true,
        precioVigente: true,
      },
    });

    const mapa = new Map<number, number>();
    for (const v of variantes) {
      mapa.set(v.idVariante, Number(v.precioVigente));
    }
    return mapa;
  }
}
