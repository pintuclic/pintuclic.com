import { prisma } from '../../../core/db/client';
import type { ColorCatalogo, FamiliaCatalogo, InstantaneaPaleta, PaletaRepositoryPort } from '../interfaces/paleta.interface';
import { hexAHsl, hexALab } from '../services/color-matematica';
import { productoVisible } from './prisma-comun';

/** Sin tildes ni mayúsculas, para buscar «azul oceano» y encontrar «Azul Océano». */
export const normalizarTexto = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** P3: familia (según su orden; sin familia al final), de más claro a más oscuro, luego por nombre. */
export function compararColores(a: ColorCatalogo, b: ColorCatalogo): number {
  return (
    (a.ordenFamilia ?? Number.MAX_SAFE_INTEGER) - (b.ordenFamilia ?? Number.MAX_SAFE_INTEGER) ||
    (a.idFamiliaColor ?? 0) - (b.idFamiliaColor ?? 0) ||
    b.luminosidad - a.luminosidad ||
    a.nombre.localeCompare(b.nombre, 'es') ||
    a.idColor - b.idColor
  );
}

/**
 * P1: lee los colores activos y los productos visibles y cuenta, por color, cuántos productos lo entregan: los de
 * fábrica de un producto, y los de la carta de un entonable (misma marca, base y acabado activos y entre los del producto;
 * regla P5 de M01). Es el mismo criterio de `filtroColoresOfrecidos`, aplicado de producto a color para recorrer el
 * catálogo una sola vez.
 */
export class PaletaRepository implements PaletaRepositoryPort {
  async construir(): Promise<InstantaneaPaleta> {
    const [colores, productos, familiasBd] = await Promise.all([
      prisma.color.findMany({
        where: { estado: 'activo', marca: { estado: 'activo' } },
        select: {
          idColor: true,
          nombre: true,
          codigo: true,
          hexadecimal: true,
          idMarca: true,
          idBase: true,
          idAcabado: true,
          idFamiliaColor: true,
          marca: { select: { nombre: true } },
          familia: { select: { nombre: true, orden: true, estado: true } },
          acabado: { select: { nombre: true } },
        },
      }),
      prisma.producto.findMany({
        where: productoVisible({ variantes: { some: { estado: 'activo' } } }),
        select: {
          idMarca: true,
          bases: { where: { base: { estado: 'activo' } }, select: { idBase: true } },
          acabados: { where: { acabado: { estado: 'activo' } }, select: { idAcabado: true } },
          coloresFabrica: { select: { idColor: true } },
        },
      }),
      prisma.familiaColor.findMany({ where: { estado: 'activo' }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    ]);

    // Los colores de la carta, agrupados por lo que los hace entregables: marca + base + acabado.
    const porClave = new Map<string, number[]>();
    for (const c of colores) {
      if (c.idBase === null) continue;
      const clave = `${c.idMarca}|${c.idBase}|${c.idAcabado}`;
      porClave.set(clave, [...(porClave.get(clave) ?? []), c.idColor]);
    }
    const conteo = new Map<number, number>();
    const sumar = (idColor: number): void => void conteo.set(idColor, (conteo.get(idColor) ?? 0) + 1);
    for (const p of productos) {
      const entregados = new Set<number>(p.coloresFabrica.map((f) => f.idColor));
      for (const b of p.bases) {
        for (const a of p.acabados) {
          for (const idColor of porClave.get(`${p.idMarca}|${b.idBase}|${a.idAcabado}`) ?? []) entregados.add(idColor);
        }
      }
      entregados.forEach(sumar);
    }

    const catalogo: ColorCatalogo[] = colores
      .filter((c) => conteo.has(c.idColor))
      .map((c) => {
        const familiaActiva = c.familia !== null && c.familia.estado === 'activo';
        return {
          idColor: c.idColor,
          nombre: c.nombre,
          codigo: c.codigo,
          hexadecimal: c.hexadecimal.toUpperCase(),
          idMarca: c.idMarca,
          marca: c.marca.nombre,
          idFamiliaColor: familiaActiva ? c.idFamiliaColor : null,
          familia: familiaActiva ? (c.familia?.nombre ?? null) : null,
          ordenFamilia: familiaActiva ? (c.familia?.orden ?? null) : null,
          acabado: c.acabado.nombre,
          lab: hexALab(c.hexadecimal),
          luminosidad: hexAHsl(c.hexadecimal).l,
          textoBusqueda: normalizarTexto(`${c.nombre} ${c.codigo ?? ''}`),
        };
      })
      .sort(compararColores);

    const familias: FamiliaCatalogo[] = familiasBd.map((f) => ({
      idFamiliaColor: f.idFamiliaColor,
      nombre: f.nombre,
      hexadecimal: f.hexadecimal,
      orden: f.orden,
    }));
    return { colores: catalogo, productosPorColor: conteo, familias };
  }
}
