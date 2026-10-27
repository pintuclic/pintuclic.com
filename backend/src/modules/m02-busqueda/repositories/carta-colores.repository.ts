import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { ColorMuestra } from '../dtos/m02-busqueda.dto';

/**
 * Colores que OFRECE cada producto, con la misma regla que la ficha (P5 de M01): colores activos de su marca que son
 * de fábrica del producto, o cuya base y acabado (activos) son de los suyos. Se resuelve en la base con `p` = producto
 * y `c` = color, para no cargar nunca la carta completa (U3 de M01, D4). Solo lectura (D2).
 */
const COLOR_OFRECIDO = Prisma.sql`
  c.id_marca = p.id_marca
  AND c.estado = 'activo'
  AND (
    EXISTS (SELECT 1 FROM producto_color pc WHERE pc.id_producto = p.id_producto AND pc.id_color = c.id_color)
    OR (
      EXISTS (
        SELECT 1 FROM producto_base pb JOIN base b ON b.id_base = pb.id_base AND b.estado = 'activo'
        WHERE pb.id_producto = p.id_producto AND pb.id_base = c.id_base
      )
      AND EXISTS (
        SELECT 1 FROM producto_acabado pa JOIN acabado a ON a.id_acabado = pa.id_acabado AND a.estado = 'activo'
        WHERE pa.id_producto = p.id_producto AND pa.id_acabado = c.id_acabado
      )
    )
  )`;

/** `%` y `_` del término se buscan como letras, no como comodines. */
function patronContiene(palabra: string): string {
  return `%${palabra.replace(/[\\%_]/g, (letra) => `\\${letra}`)}%`;
}

export interface ColorCoincidente {
  idColor: number;
  nombre: string;
}

export interface PreferenciasMuestra {
  /** T2: los colores del filtro `idColor`. */
  idsColorFiltro: readonly number[];
  /** T2: el color que coincidió con el término, por producto. */
  colorDelTermino: ReadonlyMap<number, number>;
  /** T2: las familias del filtro `idFamiliaColor`. */
  idsFamiliaFiltro: readonly number[];
}

export class CartaColoresRepository {
  /** Familias que puede entregar cada producto (B8, filtro de familia), incluidas las de su carta. */
  async familiasPorProducto(idsProducto: readonly number[]): Promise<Map<number, number[]>> {
    if (idsProducto.length === 0) return new Map();
    const filas = await prisma.$queryRaw<Array<{ id_producto: number; id_familia_color: number }>>`
      SELECT DISTINCT p.id_producto, c.id_familia_color
      FROM producto p
      JOIN color c ON ${COLOR_OFRECIDO}
      WHERE p.id_producto = ANY(${[...idsProducto]}::int[]) AND c.id_familia_color IS NOT NULL
    `;
    const mapa = new Map<number, number[]>();
    for (const f of filas) mapa.set(f.id_producto, [...(mapa.get(f.id_producto) ?? []), f.id_familia_color]);
    return mapa;
  }

  /** Qué colores del filtro `idColor` ofrece cada producto (B7). */
  async coloresDelFiltroPorProducto(
    idsProducto: readonly number[],
    idsColor: readonly number[],
  ): Promise<Map<number, number[]>> {
    if (idsProducto.length === 0 || idsColor.length === 0) return new Map();
    const filas = await prisma.$queryRaw<Array<{ id_producto: number; id_color: number }>>`
      SELECT DISTINCT p.id_producto, c.id_color
      FROM producto p
      JOIN color c ON ${COLOR_OFRECIDO}
      WHERE p.id_producto = ANY(${[...idsProducto]}::int[]) AND c.id_color = ANY(${[...idsColor]}::int[])
    `;
    const mapa = new Map<number, number[]>();
    for (const f of filas) mapa.set(f.id_producto, [...(mapa.get(f.id_producto) ?? []), f.id_color]);
    return mapa;
  }

  /**
   * B7: el primer color (por nombre) que ofrece cada producto y cuyo nombre contiene la palabra. Sin distinguir
   * mayúsculas; los acentos y los errores no se toleran aquí (D7).
   */
  async colorQueContiene(
    idsProducto: readonly number[],
    palabra: string,
  ): Promise<Map<number, ColorCoincidente>> {
    if (idsProducto.length === 0 || palabra === '') return new Map();
    const filas = await prisma.$queryRaw<Array<{ id_producto: number; id_color: number; nombre: string }>>`
      SELECT DISTINCT ON (p.id_producto) p.id_producto, c.id_color, c.nombre
      FROM producto p
      JOIN color c ON ${COLOR_OFRECIDO}
      WHERE p.id_producto = ANY(${[...idsProducto]}::int[]) AND c.nombre ILIKE ${patronContiene(palabra)}
      ORDER BY p.id_producto, c.nombre, c.id_color
    `;
    return new Map(filas.map((f) => [f.id_producto, { idColor: f.id_color, nombre: f.nombre }]));
  }

  /**
   * T1–T3: el color de muestra de cada producto de la página, en una consulta. Primero el del filtro de color, luego
   * el que coincidió con el término, luego uno de la familia filtrada y, si no, el primero por nombre e id (el orden
   * de la ficha). Un producto sin colores no aparece en el resultado.
   */
  async coloresDeMuestra(
    idsProducto: readonly number[],
    preferencias: PreferenciasMuestra,
  ): Promise<Map<number, ColorMuestra>> {
    if (idsProducto.length === 0) return new Map();
    const delTermino = [...preferencias.colorDelTermino.entries()];
    const filas = await prisma.$queryRaw<Array<{ id_producto: number; nombre: string; hexadecimal: string }>>`
      SELECT DISTINCT ON (p.id_producto) p.id_producto, c.nombre, c.hexadecimal
      FROM producto p
      JOIN color c ON ${COLOR_OFRECIDO}
      WHERE p.id_producto = ANY(${[...idsProducto]}::int[])
      ORDER BY
        p.id_producto,
        (c.id_color = ANY(${[...preferencias.idsColorFiltro]}::int[])) DESC,
        ((p.id_producto, c.id_color) IN (
          SELECT * FROM unnest(${delTermino.map(([idProducto]) => idProducto)}::int[], ${delTermino.map(([, idColor]) => idColor)}::int[])
        )) DESC,
        (c.id_familia_color = ANY(${[...preferencias.idsFamiliaFiltro]}::int[])) IS TRUE DESC,
        c.nombre,
        c.id_color
    `;
    return new Map(filas.map((f) => [f.id_producto, { nombre: f.nombre, hexadecimal: f.hexadecimal.trim() }]));
  }
}
