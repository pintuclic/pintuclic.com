import { prisma } from '../../../core/db/client';
import type { CatalogoDisponibilidadPort } from '../interfaces/consulta-cliente.interface';

/**
 * Lectura de solo existencia sobre el catálogo de M01 (D6 del contrato): una variante sigue
 * «en el catálogo» mientras ella y su producto estén activos; `agotado` no la retira.
 * No modifica ni importa código de M01: solo consulta sus tablas.
 */
export class PrismaCatalogoDisponibilidadAdapter implements CatalogoDisponibilidadPort {
  async variantesDisponibles(idsVariante: number[]): Promise<Set<number>> {
    if (idsVariante.length === 0) return new Set();

    const filas = await prisma.variante.findMany({
      where: {
        idVariante: { in: idsVariante },
        estado: { in: ['activo', 'agotado'] },
        producto: { estado: 'activo' },
      },
      select: { idVariante: true },
    });
    return new Set(filas.map((f) => f.idVariante));
  }
}
