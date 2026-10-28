import type { ImpactoReglasPort, Objetivo } from '../dtos/m06-precios.dto';
import type { EventosRepositoryPort } from '../interfaces/precios.interface';
import { aBogota } from './fechas';

/**
 * ImpactoReglasPort (lo consume M01 antes de desactivar una línea, marca o producto, HU-CAT-11): cuántos
 * eventos activos y no vencidos tienen una regla con alguno de esos objetivos. No cuenta las reglas de todo
 * el catálogo.
 */
export class ImpactoReglasService implements ImpactoReglasPort {
  constructor(
    private readonly eventos: EventosRepositoryPort,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async contarEventosVigentes(objetivos: readonly Objetivo[]): Promise<number> {
    if (objetivos.length === 0) return 0;
    const activos = await this.eventos.listarActivos(aBogota(this.reloj()).fecha);
    return activos.filter((e) =>
      e.reglas.some(
        (r) => r.objetivo !== null && objetivos.some((o) => o.tipo === r.objetivo?.tipo && o.id === r.objetivo.id),
      ),
    ).length;
  }
}
