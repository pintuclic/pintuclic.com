import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  AjusteInventario,
  ItemInventario,
  ListarHistorialRequest,
  ListarInventarioRequest,
  ResumenInventario,
} from '../dtos/m13-inventario.dto';
import type {
  CambioAplicado,
  CambioCarga,
  DatosAjuste,
  FilaPlantilla,
  FiltroPlantilla,
  InventarioRepositoryPort,
  Pagina,
  ResultadoAjuste,
  VarianteBuscable,
} from '../interfaces/inventario.interface';

const SELECCION_ITEM = {
  idVariante: true,
  idProducto: true,
  sku: true,
  existenciaReferencial: true,
  estado: true,
  medida: { select: { nombre: true } },
  producto: { select: { nombre: true, marca: { select: { nombre: true } } } },
} satisfies Prisma.VarianteSelect;

type FilaItem = Prisma.VarianteGetPayload<{ select: typeof SELECCION_ITEM }>;

const SELECCION_AJUSTE = {
  idAjuste: true,
  idVariante: true,
  existenciaAnterior: true,
  existenciaNueva: true,
  motivo: true,
  nota: true,
  origen: true,
  idCarga: true,
  idUsuario: true,
  referencia: true,
  fecha: true,
  usuario: { select: { nombre: true } },
  variante: {
    select: {
      sku: true,
      medida: { select: { nombre: true } },
      producto: { select: { nombre: true, marca: { select: { nombre: true } } } },
    },
  },
} satisfies Prisma.AjusteInventarioSelect;

type FilaAjuste = Prisma.AjusteInventarioGetPayload<{ select: typeof SELECCION_AJUSTE }>;

const USUARIO_ELIMINADO = 'Usuario eliminado';
/** Los movimientos de una orden (origen 'orden') no tienen usuario: los hace el sistema. */
const USUARIO_SISTEMA = 'Sistema';

const ORDEN_VARIANTES: Prisma.VarianteOrderByWithRelationInput[] = [
  { producto: { marca: { nombre: 'asc' } } },
  { producto: { nombre: 'asc' } },
  { medida: { nombre: 'asc' } },
  { idVariante: 'asc' },
];

function aItem(f: FilaItem, ultimoAjuste: Date | null): ItemInventario {
  return {
    idVariante: f.idVariante,
    idProducto: f.idProducto,
    marca: f.producto.marca.nombre,
    producto: f.producto.nombre,
    medida: f.medida.nombre,
    sku: f.sku,
    existenciaReferencial: f.existenciaReferencial,
    // R12: "agotado" se deriva al leer; nunca se guarda.
    estadoExistencia: f.existenciaReferencial === 0 ? 'agotado' : 'disponible',
    estadoVariante: f.estado === 'activo' ? 'activo' : 'inactivo',
    ultimoAjuste: ultimoAjuste === null ? null : ultimoAjuste.toISOString(),
  };
}

function aAjuste(f: FilaAjuste): AjusteInventario {
  return {
    idAjuste: f.idAjuste,
    idVariante: f.idVariante,
    marca: f.variante.producto.marca.nombre,
    producto: f.variante.producto.nombre,
    medida: f.variante.medida.nombre,
    sku: f.variante.sku,
    existenciaAnterior: f.existenciaAnterior,
    existenciaNueva: f.existenciaNueva,
    motivo: f.motivo,
    nota: f.nota,
    origen: f.origen,
    idCarga: f.idCarga,
    idUsuario: f.idUsuario,
    // D5: el nombre vigente del usuario; si ya no existe, un rótulo fijo; y 'Sistema' para las órdenes.
    usuario: f.usuario?.nombre ?? (f.origen === 'orden' ? USUARIO_SISTEMA : USUARIO_ELIMINADO),
    referencia: f.referencia,
    fecha: f.fecha.toISOString(),
  };
}

/** R11: por defecto solo las variantes activas. */
function filtroVariantes(incluirInactivas: boolean | undefined): Prisma.VarianteWhereInput {
  return incluirInactivas === true ? {} : { estado: 'activo' };
}

function filtroBusqueda(busqueda: string | undefined): Prisma.VarianteWhereInput {
  if (busqueda === undefined || busqueda === '') return {};
  const contiene = { contains: busqueda, mode: 'insensitive' } satisfies Prisma.StringFilter;
  return {
    OR: [
      { sku: contiene },
      { medida: { nombre: contiene } },
      { producto: { nombre: contiene } },
      { producto: { marca: { nombre: contiene } } },
    ],
  };
}

export class InventarioRepository implements InventarioRepositoryPort {
  /** El resumen cuenta las variantes activas, igual que la lista por defecto. */
  async resumen(): Promise<ResumenInventario> {
    const activas: Prisma.VarianteWhereInput = { estado: 'activo' };
    const [totalVariantes, agotadas, sinAjustes, ultimo] = await Promise.all([
      prisma.variante.count({ where: activas }),
      prisma.variante.count({ where: { ...activas, existenciaReferencial: 0 } }),
      prisma.variante.count({ where: { ...activas, ajustes: { none: {} } } }),
      prisma.ajusteInventario.aggregate({ _max: { fecha: true } }),
    ]);
    return {
      totalVariantes,
      disponibles: totalVariantes - agotadas,
      agotadas,
      sinAjustes,
      ultimoAjuste: ultimo._max.fecha === null ? null : ultimo._max.fecha.toISOString(),
    };
  }

  async listar(filtro: ListarInventarioRequest): Promise<Pagina<ItemInventario>> {
    const where: Prisma.VarianteWhereInput = {
      AND: [
        filtroVariantes(filtro.incluirInactivas),
        filtroBusqueda(filtro.busqueda),
        filtro.idMarca === undefined ? {} : { producto: { idMarca: filtro.idMarca } },
        filtro.estadoExistencia === undefined
          ? {}
          : filtro.estadoExistencia === 'agotado'
            ? { existenciaReferencial: 0 }
            : { existenciaReferencial: { gt: 0 } },
      ],
    };
    const [total, filas] = await Promise.all([
      prisma.variante.count({ where }),
      prisma.variante.findMany({
        where,
        select: SELECCION_ITEM,
        orderBy: ORDEN_VARIANTES,
        skip: (filtro.pagina - 1) * filtro.limite,
        take: filtro.limite,
      }),
    ]);
    const ultimos = await this.ultimosAjustes(filas.map((f) => f.idVariante));
    return { total, items: filas.map((f) => aItem(f, ultimos.get(f.idVariante) ?? null)) };
  }

  async obtener(idVariante: number): Promise<ItemInventario | null> {
    const f = await prisma.variante.findUnique({ where: { idVariante }, select: SELECCION_ITEM });
    if (f === null) return null;
    const ultimos = await this.ultimosAjustes([idVariante]);
    return aItem(f, ultimos.get(idVariante) ?? null);
  }

  async historial(filtro: ListarHistorialRequest): Promise<Pagina<AjusteInventario>> {
    const where: Prisma.AjusteInventarioWhereInput = {
      ...(filtro.idVariante === undefined ? {} : { idVariante: filtro.idVariante }),
      ...(filtro.origen === undefined ? {} : { origen: filtro.origen }),
      ...(filtro.idCarga === undefined ? {} : { idCarga: filtro.idCarga }),
    };
    const [total, filas] = await Promise.all([
      prisma.ajusteInventario.count({ where }),
      prisma.ajusteInventario.findMany({
        where,
        select: SELECCION_AJUSTE,
        orderBy: [{ fecha: 'desc' }, { idAjuste: 'desc' }],
        skip: (filtro.pagina - 1) * filtro.limite,
        take: filtro.limite,
      }),
    ]);
    return { total, items: filas.map(aAjuste) };
  }

  /**
   * R2–R4: bloquea la fila de la variante, compara con lo esperado, y si cambia escribe la
   * existencia y su historial en la misma transacción.
   */
  async ajustar(idVariante: number, datos: DatosAjuste): Promise<ResultadoAjuste> {
    return prisma.$transaction(async (tx): Promise<ResultadoAjuste> => {
      const filas = await tx.$queryRaw<Array<{ existencia: number }>>`
        SELECT existencia_referencial AS existencia FROM variante WHERE id_variante = ${idVariante} FOR UPDATE`;
      const actual = filas[0]?.existencia;
      if (actual === undefined) return { tipo: 'no_existe' };
      if (datos.existenciaEsperada !== undefined && datos.existenciaEsperada !== actual) {
        return { tipo: 'conflicto', existenciaActual: actual };
      }
      if (datos.existencia === actual) return { tipo: 'sin_cambios' };
      await tx.variante.update({ where: { idVariante }, data: { existenciaReferencial: datos.existencia } });
      const ajuste = await tx.ajusteInventario.create({
        data: {
          idVariante,
          existenciaAnterior: actual,
          existenciaNueva: datos.existencia,
          motivo: datos.motivo,
          origen: datos.origen,
          idUsuario: datos.idUsuario,
          ...(datos.nota === undefined ? {} : { nota: datos.nota }),
        },
        select: { idAjuste: true },
      });
      return { tipo: 'modificada', idAjuste: ajuste.idAjuste };
    });
  }

  async obtenerAjuste(idAjuste: number): Promise<AjusteInventario | null> {
    const f = await prisma.ajusteInventario.findUnique({ where: { idAjuste }, select: SELECCION_AJUSTE });
    return f === null ? null : aAjuste(f);
  }

  async variantesBuscables(): Promise<VarianteBuscable[]> {
    const filas = await prisma.variante.findMany({
      select: {
        idVariante: true,
        sku: true,
        existenciaReferencial: true,
        medida: { select: { nombre: true } },
        producto: { select: { nombre: true, marca: { select: { nombre: true } } } },
      },
    });
    return filas.map((f) => ({
      idVariante: f.idVariante,
      sku: f.sku,
      marca: f.producto.marca.nombre,
      producto: f.producto.nombre,
      medida: f.medida.nombre,
      existenciaReferencial: f.existenciaReferencial,
    }));
  }

  /**
   * R3, R7: un bloque entero en una transacción. Las filas se bloquean en orden de id (sin
   * interbloqueos entre cargas) y se compara contra la existencia que HAY al bloquear, no
   * contra la que se vio en la vista previa.
   */
  async aplicarCarga(cambios: readonly CambioCarga[], idCarga: string, idUsuario: number): Promise<CambioAplicado[]> {
    if (cambios.length === 0) return [];
    const ordenados = [...cambios].sort((a, b) => a.idVariante - b.idVariante);
    const ids = ordenados.map((c) => c.idVariante);
    return prisma.$transaction(async (tx) => {
      const vigentes = await tx.$queryRaw<Array<{ id: number; existencia: number }>>`
        SELECT id_variante AS id, existencia_referencial AS existencia
        FROM variante WHERE id_variante = ANY(${ids}::int[]) ORDER BY id_variante FOR UPDATE`;
      const porId = new Map(vigentes.map((v) => [v.id, v.existencia]));
      const aplicados: CambioAplicado[] = [];
      for (const cambio of ordenados) {
        const anterior = porId.get(cambio.idVariante);
        if (anterior === undefined) throw new Error(`La variante ${cambio.idVariante} ya no existe.`);
        if (anterior === cambio.existencia) {
          aplicados.push({ idVariante: cambio.idVariante, existenciaAnterior: anterior, modificada: false });
          continue;
        }
        await tx.variante.update({
          where: { idVariante: cambio.idVariante },
          data: { existenciaReferencial: cambio.existencia },
        });
        await tx.ajusteInventario.create({
          data: {
            idVariante: cambio.idVariante,
            existenciaAnterior: anterior,
            existenciaNueva: cambio.existencia,
            motivo: 'carga_masiva',
            origen: 'carga_masiva',
            idCarga,
            idUsuario,
            ...(cambio.nota === undefined ? {} : { nota: cambio.nota }),
          },
        });
        aplicados.push({ idVariante: cambio.idVariante, existenciaAnterior: anterior, modificada: true });
      }
      return aplicados;
    });
  }

  private filtroPlantilla(filtro: FiltroPlantilla): Prisma.VarianteWhereInput {
    return {
      AND: [
        filtroVariantes(filtro.incluirInactivas),
        filtro.idMarca === undefined ? {} : { producto: { idMarca: filtro.idMarca } },
      ],
    };
  }

  contarParaPlantilla(filtro: FiltroPlantilla): Promise<number> {
    return prisma.variante.count({ where: this.filtroPlantilla(filtro) });
  }

  async filasParaPlantilla(filtro: FiltroPlantilla): Promise<FilaPlantilla[]> {
    const filas = await prisma.variante.findMany({
      where: this.filtroPlantilla(filtro),
      select: {
        sku: true,
        existenciaReferencial: true,
        medida: { select: { nombre: true } },
        producto: { select: { nombre: true, marca: { select: { nombre: true } } } },
      },
      orderBy: ORDEN_VARIANTES,
    });
    return filas.map((f) => ({
      marca: f.producto.marca.nombre,
      producto: f.producto.nombre,
      medida: f.medida.nombre,
      sku: f.sku,
      existenciaReferencial: f.existenciaReferencial,
    }));
  }

  /** Fecha del último ajuste de cada variante dada. */
  private async ultimosAjustes(ids: readonly number[]): Promise<Map<number, Date>> {
    if (ids.length === 0) return new Map();
    const grupos = await prisma.ajusteInventario.groupBy({
      by: ['idVariante'],
      where: { idVariante: { in: [...ids] } },
      _max: { fecha: true },
    });
    const mapa = new Map<number, Date>();
    for (const g of grupos) {
      if (g._max.fecha !== null) mapa.set(g.idVariante, g._max.fecha);
    }
    return mapa;
  }
}
