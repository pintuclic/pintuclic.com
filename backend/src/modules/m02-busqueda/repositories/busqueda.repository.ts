import { prisma } from '../../../core/db/client';
import { productoVisible } from '../../m01-catalogo/repositories/prisma-comun';
import type {
  BuscarColoresRequest,
  BuscarProductosRequest,
  BusquedaSinResultado,
  ColorBuscado,
  ContextoPrecio,
  ListarSinResultadoRequest,
  OpcionesFiltro,
  OpcionesFiltroRequest,
  OpcionFamiliaColor,
  OpcionFiltro,
  OpcionLinea,
  OpcionSubcategoria,
  PeriodoEstadistica,
  OfertaListado,
  OfertasListadoPort,
  PatrocinioListadoPort,
  PrecioFinalPort,
  ResultadoBusqueda,
} from '../dtos/m02-busqueda.dto';
import {
  FACTOR_COINCIDENCIA_EXACTA,
  PESOS_RELEVANCIA,
} from '../dtos/m02-busqueda.dto';
import type { BusquedaRepositoryPort, PaginaResultado } from '../interfaces/busqueda.interface';
import { PrecioFinalBaseAdapter } from '../services/precio-final.adapter';
import { compararPorRelevancia, elegirPatrocinados } from '../services/patrocinio-listado';

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

interface ProductoCrudo {
  idProducto: number;
  nombre: string;
  descripcion: string;
  idCategoria: number;
  categoriaNombre: string;
  idSubcategoria: number;
  subcategoriaNombre: string;
  idMarca: number;
  marcaNombre: string;
  idLinea: number | null;
  lineaNombre: string | null;
  idTipoResina: number | null;
  tipoResinaNombre: string | null;
  usoInterior: boolean;
  usoExterior: boolean;
  fechaCreacion: Date;
  idImagenPrincipal: number | null;
  precioDesde: number;
  enOferta: boolean;
  disponibilidad: 'disponible' | 'agotado';
  tieneColor: boolean;
  esCombo: boolean;
  compraBloqueada: boolean;
  superficies: readonly number[];
  medidas: readonly number[];
  /** Familias de los colores que el producto entrega: los de fábrica y los de su carta (M02 · B7, B8). */
  familiasColor: readonly number[];
  colores: ReadonlyArray<{ idColor: number; nombre: string; familia: string | null }>;
  /** De los colores pedidos en el filtro, los que el producto entrega por su carta (misma marca, base y acabado; M02 · B7). */
  idsColorCarta: ReadonlySet<number>;
}

export class BusquedaRepository implements BusquedaRepositoryPort {
  constructor(
    private readonly precioFinalPort: PrecioFinalPort = new PrecioFinalBaseAdapter(),
    private readonly ofertasPort: OfertasListadoPort | null = null,
    private readonly patrocinioPort: PatrocinioListadoPort | null = null,
  ) {}

  /**
   * Los productos de campañas vigentes con la ubicación `listado` (O7). Si M14 falla, se ordena sin patrocinio: el
   * catálogo no se cae por las campañas.
   */
  private async patrocinios(): Promise<ReadonlyMap<number, { prioridad: number; idCampania: number }>> {
    if (this.patrocinioPort === null) return new Map();
    try {
      const filas = await this.patrocinioPort.prioridadesDeProductos('listado');
      return new Map(filas.map((f) => [f.idProducto, { prioridad: f.prioridad, idCampania: f.idCampania }]));
    } catch {
      return new Map();
    }
  }

  /** Ids de los productos en oferta ahora (F9). Solo se pide con el filtro: un fallo de M06 se propaga. */
  private async idsEnOferta(filtros: { enOferta?: boolean | undefined }): Promise<ReadonlySet<number>> {
    if (filtros.enOferta !== true) return new Set();
    if (this.ofertasPort === null) return new Set();
    return new Set(await this.ofertasPort.idsProductosEnOferta());
  }

  /** La oferta de cada tarjeta de la página. Si M06 falla, las tarjetas salen sin etiqueta. */
  private async ofertasDeLaPagina(ids: readonly number[]): Promise<ReadonlyMap<number, OfertaListado | null>> {
    if (this.ofertasPort === null || ids.length === 0) return new Map();
    try {
      const filas = await this.ofertasPort.ofertasDeProductos(ids);
      // Solo la forma pública: M06 también informa el evento (`idEvento`), que no sale de la API.
      return new Map(
        filas.map((f) => [
          f.idProducto,
          f.oferta === null
            ? null
            : {
                nombre: f.oferta.nombre,
                porcentaje: f.oferta.porcentaje,
                precioAntes: f.oferta.precioAntes,
                precioConOferta: f.oferta.precioConOferta,
              },
        ]),
      );
    } catch {
      return new Map();
    }
  }

  /**
   * M02 · B7, B8: lo que un producto ENTONABLE puede entregar no está en una tabla, se deduce: los colores activos de su
   * marca cuya base y acabado están entre los suyos (la misma regla P5 de M01 que usa la ficha). Se indexa por «marca, base y
   * acabado» para saber, de cada producto, qué familias entrega y cuáles de los colores pedidos entrega.
   */
  private async indiceDeCarta(idsPedidos: readonly number[]): Promise<{
    familiasPorClave: ReadonlyMap<string, ReadonlySet<number>>;
    claveDeColorPedido: ReadonlyMap<number, string>;
  }> {
    const colores = await prisma.color.findMany({
      where: { estado: 'activo', idBase: { not: null }, marca: { estado: 'activo' } },
      select: { idColor: true, idMarca: true, idBase: true, idAcabado: true, idFamiliaColor: true },
    });
    const familiasPorClave = new Map<string, Set<number>>();
    const claveDeColorPedido = new Map<number, string>();
    const pedidos = new Set(idsPedidos);
    for (const c of colores) {
      const clave = `${c.idMarca}|${String(c.idBase)}|${c.idAcabado}`;
      if (c.idFamiliaColor !== null) {
        const familias = familiasPorClave.get(clave) ?? new Set<number>();
        familias.add(c.idFamiliaColor);
        familiasPorClave.set(clave, familias);
      }
      if (pedidos.has(c.idColor)) claveDeColorPedido.set(c.idColor, clave);
    }
    return { familiasPorClave, claveDeColorPedido };
  }

  private async cargarProductosBase(enOferta: ReadonlySet<number>, idsColorPedidos: readonly number[] = []): Promise<ProductoCrudo[]> {
    const indice = await this.indiceDeCarta(idsColorPedidos);
    const productosDb = await prisma.producto.findMany({
      where: productoVisible(),
      include: {
        marca: true,
        linea: true,
        subcategoria: {
          include: { categoria: true },
        },
        ficha: {
          include: { tipoResina: true },
        },
        imagenes: {
          select: { idImagen: true, esPrincipal: true, orden: true },
          orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }, { idImagen: 'asc' }],
        },
        variantes: {
          where: { estado: 'activo' },
          select: {
            idVariante: true,
            idMedida: true,
            precioVigente: true,
            existenciaReferencial: true,
          },
        },
        superficies: {
          select: { idSuperficie: true },
        },
        bases: {
          where: { base: { estado: 'activo' } },
          select: { idBase: true },
        },
        acabados: {
          where: { acabado: { estado: 'activo' } },
          select: { idAcabado: true },
        },
        coloresFabrica: {
          select: {
            color: {
              select: {
                idColor: true,
                nombre: true,
                idFamiliaColor: true,
                familia: { select: { nombre: true } },
              },
            },
          },
        },
      },
      orderBy: [{ nombre: 'asc' }, { idProducto: 'asc' }],
    });

    const todosIdsVariante = productosDb.flatMap((p) => p.variantes.map((v) => v.idVariante));
    // Si M06 falla, los listados siguen con el precio base: el catálogo no se cae por las promociones.
    const mapaPrecios = await this.precioFinalPort
      .preciosFinales(todosIdsVariante, { idUsuario: null })
      .catch((): ReadonlyMap<number, number> => new Map());

    return productosDb.map((p) => {
      const preciosVariantes = p.variantes.map(
        (v) => mapaPrecios.get(v.idVariante) ?? Number(v.precioVigente),
      );
      const precioMin = preciosVariantes.length > 0 ? Math.min(...preciosVariantes) : 0;
      const tieneStock = p.variantes.some((v) => (v.existenciaReferencial ?? 0) > 0);

      const portada = p.imagenes[0]?.idImagen ?? null;
      const coloresLista = p.coloresFabrica.map((c) => ({
        idColor: c.color.idColor,
        nombre: c.color.nombre,
        familia: c.color.familia?.nombre ?? null,
      }));

      const familiasSet = new Set<number>();
      for (const c of p.coloresFabrica) {
        if (c.color.idFamiliaColor) {
          familiasSet.add(c.color.idFamiliaColor);
        }
      }

      const medidasSet = new Set<number>();
      for (const v of p.variantes) {
        if (v.idMedida) {
          medidasSet.add(v.idMedida);
        }
      }

      const tieneColor = p.bases.length > 0 || p.coloresFabrica.length > 0;

      // Lo que entrega por su carta: cada base y acabado del producto, con su marca (M02 · B7, B8).
      const clavesCarta = new Set<string>();
      for (const b of p.bases) {
        for (const a of p.acabados) clavesCarta.add(`${p.idMarca}|${b.idBase}|${a.idAcabado}`);
      }
      for (const clave of clavesCarta) {
        for (const familia of indice.familiasPorClave.get(clave) ?? []) familiasSet.add(familia);
      }
      const idsColorCarta = new Set<number>();
      for (const [idColor, clave] of indice.claveDeColorPedido) {
        if (clavesCarta.has(clave)) idsColorCarta.add(idColor);
      }

      return {
        idProducto: p.idProducto,
        nombre: p.nombre,
        descripcion: p.descripcion ?? '',
        idCategoria: p.subcategoria.categoria.idCategoria,
        categoriaNombre: p.subcategoria.categoria.nombre,
        idSubcategoria: p.subcategoria.idSubcategoria,
        subcategoriaNombre: p.subcategoria.nombre,
        idMarca: p.marca.idMarca,
        marcaNombre: p.marca.nombre,
        idLinea: p.linea?.idLinea ?? null,
        lineaNombre: p.linea?.nombre ?? null,
        idTipoResina: p.ficha?.tipoResina?.idTipoResina ?? null,
        tipoResinaNombre: p.ficha?.tipoResina?.nombre ?? null,
        usoInterior: p.usoInterior,
        usoExterior: p.usoExterior,
        fechaCreacion: p.fechaCreacion,
        idImagenPrincipal: portada,
        precioDesde: precioMin,
        enOferta: enOferta.has(p.idProducto),
        disponibilidad: tieneStock ? 'disponible' : 'agotado',
        tieneColor,
        esCombo: p.esCombo,
        compraBloqueada: p.esCombo && !tieneStock,
        superficies: p.superficies.map((s) => s.idSuperficie),
        medidas: [...medidasSet],
        familiasColor: [...familiasSet],
        colores: coloresLista,
        idsColorCarta,
      };
    });
  }

  private evaluarCoincidencia(
    producto: ProductoCrudo,
    terminoNormalizado: string,
  ): { puntaje: number; coincidenciaColor: string | null } {
    if (terminoNormalizado === '') {
      return { puntaje: 1, coincidenciaColor: null };
    }

    let puntaje = 0;
    let coincidenciaColor: string | null = null;

    const nombreNorm = normalizarTexto(producto.nombre);
    const marcaNorm = normalizarTexto(producto.marcaNombre);
    const lineaNorm = normalizarTexto(producto.lineaNombre ?? '');
    const descNorm = normalizarTexto(producto.descripcion);

    // Nombre (peso 5)
    if (nombreNorm === terminoNormalizado) {
      puntaje += PESOS_RELEVANCIA.nombre * FACTOR_COINCIDENCIA_EXACTA;
    } else if (nombreNorm.includes(terminoNormalizado)) {
      puntaje += PESOS_RELEVANCIA.nombre;
    }

    // Marca (peso 4)
    if (marcaNorm === terminoNormalizado) {
      puntaje += PESOS_RELEVANCIA.marca * FACTOR_COINCIDENCIA_EXACTA;
    } else if (marcaNorm.includes(terminoNormalizado)) {
      puntaje += PESOS_RELEVANCIA.marca;
    }

    // Línea (peso 3)
    if (lineaNorm !== '') {
      if (lineaNorm === terminoNormalizado) {
        puntaje += PESOS_RELEVANCIA.linea * FACTOR_COINCIDENCIA_EXACTA;
      } else if (lineaNorm.includes(terminoNormalizado)) {
        puntaje += PESOS_RELEVANCIA.linea;
      }
    }

    // Color y familia cromática (peso 2)
    for (const c of producto.colores) {
      const colNorm = normalizarTexto(c.nombre);
      const famNorm = normalizarTexto(c.familia ?? '');

      if (colNorm === terminoNormalizado) {
        puntaje += PESOS_RELEVANCIA.color * FACTOR_COINCIDENCIA_EXACTA;
        if (!coincidenciaColor) coincidenciaColor = c.nombre;
      } else if (colNorm.includes(terminoNormalizado)) {
        puntaje += PESOS_RELEVANCIA.color;
        if (!coincidenciaColor) coincidenciaColor = c.nombre;
      } else if (famNorm !== '' && (famNorm === terminoNormalizado || famNorm.includes(terminoNormalizado))) {
        puntaje += PESOS_RELEVANCIA.color;
        if (!coincidenciaColor && c.familia) coincidenciaColor = `Familia ${c.familia}`;
      }
    }

    // Descripción (peso 1)
    if (descNorm.includes(terminoNormalizado)) {
      puntaje += PESOS_RELEVANCIA.descripcion;
    }

    // Búsqueda flexible por palabras si el término tiene varios términos
    const palabras = terminoNormalizado.split(' ').filter((p) => p.length > 2);
    if (palabras.length > 1) {
      let palabrasEncontradas = 0;
      for (const palabra of palabras) {
        if (
          nombreNorm.includes(palabra) ||
          marcaNorm.includes(palabra) ||
          lineaNorm.includes(palabra) ||
          descNorm.includes(palabra) ||
          producto.colores.some((c) => normalizarTexto(c.nombre).includes(palabra))
        ) {
          palabrasEncontradas += 1;
        }
      }
      if (palabrasEncontradas === palabras.length) {
        puntaje += 3;
      }
    }

    return { puntaje, coincidenciaColor };
  }

  private cumpleFiltrosBase(p: ProductoCrudo, f: OpcionesFiltroRequest, omitirGrupo?: string): boolean {
    if (omitirGrupo !== 'idCategoria' && f.idCategoria && f.idCategoria.length > 0) {
      if (!f.idCategoria.includes(p.idCategoria)) return false;
    }
    if (omitirGrupo !== 'idSubcategoria' && f.idSubcategoria && f.idSubcategoria.length > 0) {
      if (!f.idSubcategoria.includes(p.idSubcategoria)) return false;
    }
    if (omitirGrupo !== 'idMarca' && f.idMarca && f.idMarca.length > 0) {
      if (!f.idMarca.includes(p.idMarca)) return false;
    }
    if (omitirGrupo !== 'idLinea' && f.idLinea && f.idLinea.length > 0) {
      if (p.idLinea === null || !f.idLinea.includes(p.idLinea)) return false;
    }
    if (omitirGrupo !== 'idTipoResina' && f.idTipoResina && f.idTipoResina.length > 0) {
      if (p.idTipoResina === null || !f.idTipoResina.includes(p.idTipoResina)) return false;
    }
    if (omitirGrupo !== 'idFamiliaColor' && f.idFamiliaColor && f.idFamiliaColor.length > 0) {
      const coincide = f.idFamiliaColor.some((idFam: number) => p.familiasColor.includes(idFam));
      if (!coincide) return false;
    }
    if (omitirGrupo !== 'idColor' && f.idColor && f.idColor.length > 0) {
      const coincide = f.idColor.some((idCol: number) => p.idsColorCarta.has(idCol) || p.colores.some((c) => c.idColor === idCol));
      if (!coincide) return false;
    }
    if (omitirGrupo !== 'idMedida' && f.idMedida && f.idMedida.length > 0) {
      const coincide = f.idMedida.some((idMed: number) => p.medidas.includes(idMed));
      if (!coincide) return false;
    }
    if (omitirGrupo !== 'idSuperficie' && f.idSuperficie && f.idSuperficie.length > 0) {
      const coincide = f.idSuperficie.some((idSup: number) => p.superficies.includes(idSup));
      if (!coincide) return false;
    }
    if (omitirGrupo !== 'ambiente' && f.ambiente) {
      if (f.ambiente === 'interior' && !p.usoInterior) return false;
      if (f.ambiente === 'exterior' && !p.usoExterior) return false;
    }
    if (omitirGrupo !== 'enOferta' && f.enOferta === true && !p.enOferta) return false;
    if (omitirGrupo !== 'precio') {
      if (f.precioMin !== undefined && p.precioDesde < f.precioMin) return false;
      if (f.precioMax !== undefined && p.precioDesde > f.precioMax) return false;
    }
    return true;
  }

  async buscarProductos(
    filtros: BuscarProductosRequest,
    _contexto: ContextoPrecio,
  ): Promise<PaginaResultado<ResultadoBusqueda>> {
    const productosBase = await this.cargarProductosBase(await this.idsEnOferta(filtros), filtros.idColor ?? []);
    const terminoNorm = normalizarTexto(filtros.q ?? '');

    const evaluados: Array<{
      producto: ProductoCrudo;
      puntaje: number;
      coincidenciaColor: string | null;
    }> = [];

    for (const p of productosBase) {
      if (!this.cumpleFiltrosBase(p, filtros)) {
        continue;
      }

      const { puntaje, coincidenciaColor } = this.evaluarCoincidencia(p, terminoNorm);
      if (terminoNorm !== '' && puntaje === 0) {
        continue;
      }

      evaluados.push({ producto: p, puntaje, coincidenciaColor });
    }

    // Patrocinio (O7): solo con el orden por relevancia, con cupo, y sin cambiar quién aparece ni cuántos.
    const patrocinados = elegirPatrocinados(
      evaluados.map((e) => ({ idProducto: e.producto.idProducto, puntaje: e.puntaje, nombre: e.producto.nombre })),
      filtros.ordenar === 'relevancia' ? await this.patrocinios() : new Map(),
      filtros.ordenar,
    );

    // Ordenar resultados (O1–O7)
    evaluados.sort((a, b) => {
      if (filtros.ordenar === 'relevancia') {
        const porRelevancia = compararPorRelevancia(
          { idProducto: a.producto.idProducto, puntaje: a.puntaje },
          { idProducto: b.producto.idProducto, puntaje: b.puntaje },
          patrocinados,
        );
        if (porRelevancia !== 0) return porRelevancia;
      } else if (filtros.ordenar === 'precio_asc') {
        if (a.producto.precioDesde !== b.producto.precioDesde) {
          return a.producto.precioDesde - b.producto.precioDesde;
        }
      } else if (filtros.ordenar === 'precio_desc') {
        if (a.producto.precioDesde !== b.producto.precioDesde) {
          return b.producto.precioDesde - a.producto.precioDesde;
        }
      } else if (filtros.ordenar === 'novedad') {
        const diffTiempo = b.producto.fechaCreacion.getTime() - a.producto.fechaCreacion.getTime();
        if (diffTiempo !== 0) return diffTiempo;
      }

      // O4: Desempate estable por nombre y luego idProducto
      const cmpNombre = a.producto.nombre.localeCompare(b.producto.nombre);
      if (cmpNombre !== 0) return cmpNombre;
      return a.producto.idProducto - b.producto.idProducto;
    });

    const total = evaluados.length;
    const pagina = filtros.pagina;
    const limite = filtros.limite;
    const totalPaginas = Math.ceil(total / limite);
    const inicio = (pagina - 1) * limite;
    const paginados = evaluados.slice(inicio, inicio + limite);

    const ofertas = await this.ofertasDeLaPagina(paginados.map(({ producto }) => producto.idProducto));
    const items: ResultadoBusqueda[] = paginados.map(({ producto, coincidenciaColor }) => ({
      idProducto: producto.idProducto,
      nombre: producto.nombre,
      marca: producto.marcaNombre,
      linea: producto.lineaNombre,
      categoria: producto.categoriaNombre,
      subcategoria: producto.subcategoriaNombre,
      precioDesde: producto.precioDesde,
      tieneColor: producto.tieneColor,
      disponibilidad: producto.disponibilidad,
      idImagenPrincipal: producto.idImagenPrincipal,
      esCombo: producto.esCombo,
      compraBloqueada: producto.compraBloqueada,
      oferta: ofertas.get(producto.idProducto) ?? null,
      patrocinado: patrocinados.has(producto.idProducto),
      idCampania: patrocinados.get(producto.idProducto)?.idCampania ?? null,
      coincidenciaColor,
    }));

    return {
      items,
      total,
      pagina,
      limite,
      totalPaginas,
    };
  }

  async obtenerOpcionesFiltro(
    filtros: OpcionesFiltroRequest,
    _contexto: ContextoPrecio,
  ): Promise<OpcionesFiltro> {
    const productosBase = await this.cargarProductosBase(await this.idsEnOferta(filtros), filtros.idColor ?? []);
    const terminoNorm = normalizarTexto(filtros.q ?? '');

    // 1. Filtrar los que coinciden con el término de búsqueda
    const productosCoincidentes = productosBase.filter((p) => {
      const { puntaje } = this.evaluarCoincidencia(p, terminoNorm);
      return terminoNorm === '' || puntaje > 0;
    });

    // 2. F3: Para cada grupo de filtro, filtrar omitiendo ese grupo
    const paraCat = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idCategoria'));
    const paraSub = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idSubcategoria'));
    const paraMar = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idMarca'));
    const paraLin = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idLinea'));
    const paraRes = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idTipoResina'));
    const paraFam = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idFamiliaColor'));
    const paraMed = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idMedida'));
    const paraSup = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros, 'idSuperficie'));
    const paraTodos = productosCoincidentes.filter((p) => this.cumpleFiltrosBase(p, filtros));

    // Agrupar categorías
    const catMap = new Map<number, OpcionFiltro>();
    for (const p of paraCat) {
      const cur = catMap.get(p.idCategoria) ?? { id: p.idCategoria, nombre: p.categoriaNombre, total: 0 };
      cur.total += 1;
      catMap.set(p.idCategoria, cur);
    }

    // Agrupar subcategorías
    const subMap = new Map<number, OpcionSubcategoria>();
    for (const p of paraSub) {
      const cur = subMap.get(p.idSubcategoria) ?? {
        id: p.idSubcategoria,
        nombre: p.subcategoriaNombre,
        idCategoria: p.idCategoria,
        total: 0,
      };
      cur.total += 1;
      subMap.set(p.idSubcategoria, cur);
    }

    // Agrupar marcas
    const marMap = new Map<number, OpcionFiltro>();
    for (const p of paraMar) {
      const cur = marMap.get(p.idMarca) ?? { id: p.idMarca, nombre: p.marcaNombre, total: 0 };
      cur.total += 1;
      marMap.set(p.idMarca, cur);
    }

    // Agrupar líneas
    const linMap = new Map<number, OpcionLinea>();
    for (const p of paraLin) {
      if (p.idLinea !== null && p.lineaNombre !== null) {
        const cur = linMap.get(p.idLinea) ?? {
          id: p.idLinea,
          nombre: p.lineaNombre,
          idMarca: p.idMarca,
          total: 0,
        };
        cur.total += 1;
        linMap.set(p.idLinea, cur);
      }
    }

    // Agrupar resinas
    const resMap = new Map<number, OpcionFiltro>();
    for (const p of paraRes) {
      if (p.idTipoResina !== null && p.tipoResinaNombre !== null) {
        const cur = resMap.get(p.idTipoResina) ?? {
          id: p.idTipoResina,
          nombre: p.tipoResinaNombre,
          total: 0,
        };
        cur.total += 1;
        resMap.set(p.idTipoResina, cur);
      }
    }

    // Agrupar familias de color (cargando muestra hexadecimal desde DB)
    const famMap = new Map<number, number>();
    for (const p of paraFam) {
      for (const idFam of p.familiasColor) {
        famMap.set(idFam, (famMap.get(idFam) ?? 0) + 1);
      }
    }
    const idsFamilias = [...famMap.keys()];
    const familiasDb = idsFamilias.length > 0
      ? await prisma.familiaColor.findMany({
          where: { idFamiliaColor: { in: idsFamilias } },
          select: { idFamiliaColor: true, nombre: true, hexadecimal: true },
          orderBy: { orden: 'asc' },
        })
      : [];
    const familiasColor: OpcionFamiliaColor[] = familiasDb.map((f) => ({
      id: f.idFamiliaColor,
      nombre: f.nombre,
      hexadecimal: f.hexadecimal,
      total: famMap.get(f.idFamiliaColor) ?? 0,
    }));

    // Agrupar presentaciones (medidas)
    const medMap = new Map<number, number>();
    for (const p of paraMed) {
      for (const idMed of p.medidas) {
        medMap.set(idMed, (medMap.get(idMed) ?? 0) + 1);
      }
    }
    const idsMedidas = [...medMap.keys()];
    const medidasDb = idsMedidas.length > 0
      ? await prisma.medida.findMany({
          where: { idMedida: { in: idsMedidas } },
          select: { idMedida: true, nombre: true },
          orderBy: [{ nombre: 'asc' }, { idMedida: 'asc' }],
        })
      : [];
    const presentaciones: OpcionFiltro[] = medidasDb.map((m) => ({
      id: m.idMedida,
      nombre: m.nombre,
      total: medMap.get(m.idMedida) ?? 0,
    }));

    // Agrupar superficies
    const supMap = new Map<number, number>();
    for (const p of paraSup) {
      for (const idSup of p.superficies) {
        supMap.set(idSup, (supMap.get(idSup) ?? 0) + 1);
      }
    }
    const idsSuperficies = [...supMap.keys()];
    const superficiesDb = idsSuperficies.length > 0
      ? await prisma.superficie.findMany({
          where: { idSuperficie: { in: idsSuperficies } },
          select: { idSuperficie: true, nombre: true, orden: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        })
      : [];
    const superficies: OpcionFiltro[] = superficiesDb.map((s) => ({
      id: s.idSuperficie,
      nombre: s.nombre,
      total: supMap.get(s.idSuperficie) ?? 0,
    }));

    // Rango de precios entre los resultados completos
    let precio: { minimo: number; maximo: number } | null = null;
    if (paraTodos.length > 0) {
      const precios = paraTodos.map((p) => p.precioDesde);
      precio = {
        minimo: Math.min(...precios),
        maximo: Math.max(...precios),
      };
    }

    return {
      totalResultados: paraTodos.length,
      categorias: [...catMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      subcategorias: [...subMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      marcas: [...marMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      lineas: [...linMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      tiposResina: [...resMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      familiasColor,
      presentaciones,
      superficies,
      precio,
    };
  }

  async buscarColores(filtros: BuscarColoresRequest): Promise<PaginaResultado<ColorBuscado>> {
    const terminoNorm = normalizarTexto(filtros.q);

    const where = {
      estado: 'activo' as const,
      AND: [
        {
          OR: [
            { nombre: { contains: terminoNorm, mode: 'insensitive' as const } },
            { codigo: { contains: terminoNorm, mode: 'insensitive' as const } },
          ],
        },
        filtros.idFamiliaColor && filtros.idFamiliaColor.length > 0
          ? { idFamiliaColor: { in: [...filtros.idFamiliaColor] } }
          : {},
        filtros.idMarca && filtros.idMarca.length > 0
          ? { idMarca: { in: [...filtros.idMarca] } }
          : {},
      ],
    };

    const total = await prisma.color.count({ where });
    const pagina = filtros.pagina;
    const limite = filtros.limite;
    const totalPaginas = Math.ceil(total / limite);
    const skip = (pagina - 1) * limite;

    const coloresDb = await prisma.color.findMany({
      where,
      include: {
        marca: true,
        familia: true,
      },
      orderBy: [{ nombre: 'asc' }, { idColor: 'asc' }],
      skip,
      take: limite,
    });

    const items: ColorBuscado[] = coloresDb.map((c) => ({
      idColor: c.idColor,
      nombre: c.nombre,
      codigo: c.codigo,
      hexadecimal: c.hexadecimal,
      marca: c.marca.nombre,
      familia: c.familia?.nombre ?? null,
    }));

    return {
      items,
      total,
      pagina,
      limite,
      totalPaginas,
    };
  }

  async registrarBusquedaSinResultado(termino: string): Promise<void> {
    try {
      const terminoNorm = normalizarTexto(termino);
      if (terminoNorm === '') return;
      await prisma.$executeRaw`
        INSERT INTO busqueda_sin_resultado (termino, fecha)
        VALUES (${terminoNorm}, now())
      `;
    } catch {
      // S3: Si escribir falla, se ignora y se continúa sin afectar al usuario
    }
  }

  private calcularCortePeriodo(periodo: PeriodoEstadistica): Date {
    const ahora = new Date();
    switch (periodo) {
      case 'diario':
        return new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
      case 'semanal':
        return new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'mensual':
        return new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'anual':
      default:
        return new Date(ahora.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
  }

  async listarBusquedasSinResultado(
    filtros: ListarSinResultadoRequest,
  ): Promise<PaginaResultado<BusquedaSinResultado>> {
    const fechaCorte = this.calcularCortePeriodo(filtros.periodo);
    const pagina = filtros.pagina;
    const limite = filtros.limite;
    const offset = (pagina - 1) * limite;

    interface FilaAgrupada {
      termino: string;
      repeticiones: bigint | number;
      ultimo_intento: Date;
    }

    interface FilaTotal {
      total: bigint | number;
    }

    const [filas, totalConteo] = await Promise.all([
      prisma.$queryRaw<FilaAgrupada[]>`
        SELECT termino, COUNT(*)::bigint AS repeticiones, MAX(fecha) AS ultimo_intento
        FROM busqueda_sin_resultado
        WHERE fecha >= ${fechaCorte}
        GROUP BY termino
        ORDER BY repeticiones DESC, ultimo_intento DESC
        LIMIT ${limite} OFFSET ${offset}
      `,
      prisma.$queryRaw<FilaTotal[]>`
        SELECT COUNT(DISTINCT termino)::bigint AS total
        FROM busqueda_sin_resultado
        WHERE fecha >= ${fechaCorte}
      `,
    ]);

    const total = Number(totalConteo[0]?.total ?? 0);
    const totalPaginas = Math.ceil(total / limite);

    const items: BusquedaSinResultado[] = filas.map((f) => ({
      termino: f.termino,
      repeticiones: Number(f.repeticiones),
      ultimoIntento: f.ultimo_intento.toISOString(),
    }));

    return {
      items,
      total,
      pagina,
      limite,
      totalPaginas,
    };
  }
}
