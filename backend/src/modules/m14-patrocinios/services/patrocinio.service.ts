import type {
  PrioridadProducto,
  ProductoPatrocinado,
  UbicacionPatrocinio,
} from '../dtos/m14-patrocinios.dto';
import type {
  CampaniasRepositoryPort,
  CatalogoPatrocinioRepositoryPort,
  PatrocinioPort,
  TarjetasPublicasPort,
} from '../interfaces/patrocinios.interface';
import { ordenarParaBloque, prioridadesPorProducto, vigentesEn } from './campanias';
import { fechaBogota } from './fechas';

export interface PrioridadResuelta extends PrioridadProducto {
  visible: boolean;
}

/**
 * Lo que M14 ofrece al resto del sitio: `PatrocinioPort` para M02 y M01 (A5, A8, A12) y el bloque «Productos
 * patrocinados» del inicio (A10).
 */
export class PatrocinioService implements PatrocinioPort {
  constructor(
    private readonly campanias: CampaniasRepositoryPort,
    private readonly catalogo: CatalogoPatrocinioRepositoryPort,
    private readonly tarjetas: TarjetasPublicasPort | null = null,
    private readonly reloj: () => Date = () => new Date(),
    private readonly aleatorio: () => number = Math.random,
  ) {}

  /** Los productos de campañas vigentes en esa ubicación, con su prioridad. No filtra por visibilidad (A6). */
  async prioridadesDeProductos(ubicacion: UbicacionPatrocinio, momento?: string): Promise<PrioridadProducto[]> {
    const resueltas = await this.resolver(ubicacion, momento === undefined ? this.reloj() : new Date(momento));
    return resueltas.map(({ idProducto, prioridad, idCampania }) => ({ idProducto, prioridad, idCampania }));
  }

  /** A10: las tarjetas del bloque del inicio, por prioridad y, entre iguales, al azar. */
  async bloqueInicio(limite: number): Promise<ProductoPatrocinado[]> {
    if (this.tarjetas === null) return [];
    const visibles = (await this.resolver('inicio', this.reloj())).filter((r) => r.visible);
    const elegidos = ordenarParaBloque(visibles, this.aleatorio).slice(0, limite);
    if (elegidos.length === 0) return [];
    const tarjetas = new Map((await this.tarjetas.tarjetasPublicas(elegidos.map((e) => e.idProducto))).map((t) => [t.idProducto, t]));
    return elegidos.flatMap((e) => {
      const tarjeta = tarjetas.get(e.idProducto);
      return tarjeta === undefined ? [] : [{ ...tarjeta, patrocinado: true as const, idCampania: e.idCampania }];
    });
  }

  private async resolver(ubicacion: UbicacionPatrocinio, ahora: Date): Promise<PrioridadResuelta[]> {
    const vigentes = vigentesEn(await this.campanias.listarActivasDesde(fechaBogota(ahora)), ubicacion, ahora);
    if (vigentes.length === 0) return [];
    const productos = await this.catalogo.productosDeObjetivos(vigentes.flatMap((c) => c.objetivos));
    const visible = new Map(productos.map((p) => [p.idProducto, p.visible]));
    return prioridadesPorProducto(vigentes, productos).map((p) => ({ ...p, visible: visible.get(p.idProducto) === true }));
  }
}
