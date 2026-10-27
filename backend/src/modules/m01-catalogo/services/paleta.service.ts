import {
  SEGUNDOS_CACHE_PALETA,
  TIPOS_ARMONIA,
  UMBRAL_COLOR_CERCANO,
  type Armonia,
  type ArmoniasColor,
  type ColorCercano,
  type ColorPaleta,
  type FamiliaPaleta,
  type ListarPaletaRequest,
  type MarcaPaleta,
} from '../dtos/m01-catalogo-paleta.dto';
import type { ColorCatalogo, InstantaneaPaleta, PaletaRepositoryPort } from '../interfaces/paleta.interface';
import { normalizarTexto } from '../repositories/paleta.repository';
import { errores } from './catalogo-base.service';
import { deltaE76, esSinTono, hexALab, muestrasDeArmonia } from './color-matematica';

export interface ResultadoPaleta {
  colores: ColorPaleta[];
  familias: FamiliaPaleta[];
  marcas: MarcaPaleta[];
  total: number;
}

const redondear1 = (n: number): number => Math.round(n * 10) / 10;

/** Paleta de color (contrato M01 · entrega 4): recorrer los colores que se entregan hoy y sus armonías. */
export class PaletaService {
  private guardada: { instantanea: InstantaneaPaleta; construidaEn: number } | null = null;
  private enCurso: Promise<InstantaneaPaleta> | null = null;

  constructor(
    private readonly repo: PaletaRepositoryPort,
    private readonly ahora: () => number = () => Date.now(),
    private readonly vigenciaMs: number = SEGUNDOS_CACHE_PALETA * 1000,
  ) {}

  /** P13: la instantánea se reutiliza hasta que vence; varias consultas a la vez comparten una sola construcción. */
  private async instantanea(): Promise<InstantaneaPaleta> {
    const g = this.guardada;
    if (g !== null && this.ahora() - g.construidaEn < this.vigenciaMs) return g.instantanea;
    this.enCurso ??= this.repo
      .construir()
      .then((instantanea) => {
        this.guardada = { instantanea, construidaEn: this.ahora() };
        return instantanea;
      })
      .finally(() => {
        this.enCurso = null;
      });
    return this.enCurso;
  }

  /** Olvida lo guardado (pruebas y cambios que deben verse ya). */
  invalidar(): void {
    this.guardada = null;
  }

  private aColor(c: ColorCatalogo, snap: InstantaneaPaleta): ColorPaleta {
    return {
      idColor: c.idColor,
      nombre: c.nombre,
      codigo: c.codigo,
      hexadecimal: c.hexadecimal,
      idMarca: c.idMarca,
      marca: c.marca,
      idFamiliaColor: c.idFamiliaColor,
      familia: c.familia,
      acabado: c.acabado,
      totalProductos: snap.productosPorColor.get(c.idColor) ?? 1,
    };
  }

  /** P1 a P4. */
  async listar(q: ListarPaletaRequest): Promise<ResultadoPaleta> {
    const snap = await this.instantanea();
    const texto = q.q === undefined || q.q === '' ? null : normalizarTexto(q.q);
    const coincideTexto = (c: ColorCatalogo): boolean => texto === null || c.textoBusqueda.includes(texto);
    const conTexto = snap.colores.filter(coincideTexto);

    // P2: cada lista de apoyo se cuenta sin su propio filtro.
    const paraFamilias = conTexto.filter((c) => q.idMarca === undefined || c.idMarca === q.idMarca);
    const paraMarcas = conTexto.filter((c) => q.familia === undefined || c.idFamiliaColor === q.familia);
    const filtrados = paraFamilias.filter((c) => q.familia === undefined || c.idFamiliaColor === q.familia);

    const porFamilia = new Map<number, number>();
    for (const c of paraFamilias) {
      if (c.idFamiliaColor !== null) porFamilia.set(c.idFamiliaColor, (porFamilia.get(c.idFamiliaColor) ?? 0) + 1);
    }
    const familias: FamiliaPaleta[] = snap.familias
      .filter((f) => porFamilia.has(f.idFamiliaColor))
      .map((f) => ({
        idFamiliaColor: f.idFamiliaColor,
        nombre: f.nombre,
        hexadecimal: f.hexadecimal,
        total: porFamilia.get(f.idFamiliaColor) ?? 0,
      }));

    const porMarca = new Map<number, { nombre: string; total: number }>();
    for (const c of paraMarcas) {
      const previo = porMarca.get(c.idMarca);
      porMarca.set(c.idMarca, { nombre: c.marca, total: (previo?.total ?? 0) + 1 });
    }
    const marcas: MarcaPaleta[] = [...porMarca.entries()]
      .map(([idMarca, m]) => ({ idMarca, nombre: m.nombre, total: m.total }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.idMarca - b.idMarca);

    const desde = (q.pagina - 1) * q.limite;
    return {
      colores: filtrados.slice(desde, desde + q.limite).map((c) => this.aColor(c, snap)),
      familias,
      marcas,
      total: filtrados.length,
    };
  }

  /** P7, P8. 404 si el color no se ofrece (inexistente, apagado o sin productos que lo entreguen). */
  async armonias(idColor: number): Promise<ArmoniasColor> {
    const snap = await this.instantanea();
    const elegido = snap.colores.find((c) => c.idColor === idColor);
    if (elegido === undefined) throw errores.noDisponible();
    const candidatos = snap.colores.filter((c) => c.idMarca === elegido.idMarca && c.idColor !== elegido.idColor);

    const parecido = (hex: string): ColorCercano | null => {
      const muestra = hexALab(hex);
      let mejor: { color: ColorCatalogo; distancia: number } | null = null;
      for (const c of candidatos) {
        const d = deltaE76(muestra, c.lab);
        if (mejor === null || d < mejor.distancia || (d === mejor.distancia && c.idColor < mejor.color.idColor)) {
          mejor = { color: c, distancia: d };
        }
      }
      if (mejor === null || mejor.distancia > UMBRAL_COLOR_CERCANO) return null;
      return { ...this.aColor(mejor.color, snap), deltaE: redondear1(mejor.distancia) };
    };

    const armonias: Armonia[] = TIPOS_ARMONIA.map((tipo) => ({
      tipo,
      muestras: muestrasDeArmonia(elegido.hexadecimal, tipo).map((m) => ({
        hexadecimal: m.hexadecimal,
        cercano: parecido(m.hexadecimal),
      })),
    }));
    return { color: this.aColor(elegido, snap), sinTono: esSinTono(elegido.hexadecimal), armonias };
  }
}
