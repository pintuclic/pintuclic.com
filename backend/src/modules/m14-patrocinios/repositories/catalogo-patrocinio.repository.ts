import { prisma } from '../../../core/db/client';
import { productoVisible } from '../../m01-catalogo/repositories/prisma-comun';
import type { ObjetivoPatrocinio, TipoObjetivoPatrocinio } from '../dtos/m14-patrocinios.dto';
import type { CatalogoPatrocinioRepositoryPort, ProductoDeCatalogo } from '../interfaces/patrocinios.interface';

export const claveObjetivo = (o: ObjetivoPatrocinio): string => `${o.tipo}:${o.id}`;

/** Lectura del catálogo de M01 para resolver objetivos a productos. No escribe nada. */
export class CatalogoPatrocinioRepository implements CatalogoPatrocinioRepositoryPort {
  async buscar(
    tipo: TipoObjetivoPatrocinio,
    busqueda: string,
    limite: number,
  ): Promise<Array<{ id: number; nombre: string }>> {
    const contiene = (campo: string): Record<string, unknown> =>
      busqueda === '' ? {} : { [campo]: { contains: busqueda, mode: 'insensitive' } };
    switch (tipo) {
      case 'marca':
        return (
          await prisma.marca.findMany({
            where: { estado: 'activo', ...contiene('nombre') },
            orderBy: { nombre: 'asc' },
            take: limite,
          })
        ).map((m) => ({ id: m.idMarca, nombre: m.nombre }));
      case 'linea':
        return (
          await prisma.linea.findMany({
            where: { estado: 'activo', ...contiene('nombre') },
            include: { marca: { select: { nombre: true } } },
            orderBy: [{ marca: { nombre: 'asc' } }, { nombre: 'asc' }],
            take: limite,
          })
        ).map((l) => ({ id: l.idLinea, nombre: `${l.marca.nombre} · ${l.nombre}` }));
      case 'producto':
        return (
          await prisma.producto.findMany({
            where: { estado: 'activo', ...contiene('nombre') },
            include: { marca: { select: { nombre: true } } },
            orderBy: [{ marca: { nombre: 'asc' } }, { nombre: 'asc' }],
            take: limite,
          })
        ).map((p) => ({ id: p.idProducto, nombre: `${p.marca.nombre} · ${p.nombre}` }));
    }
  }

  async nombrar(objetivos: readonly ObjetivoPatrocinio[]): Promise<{
    nombres: Map<string, string>;
    inexistentes: ObjetivoPatrocinio[];
  }> {
    const ids = (tipo: TipoObjetivoPatrocinio): number[] => objetivos.filter((o) => o.tipo === tipo).map((o) => o.id);
    const nombres = new Map<string, string>();
    const [marcas, lineas, productos] = await Promise.all([
      ids('marca').length === 0
        ? []
        : prisma.marca.findMany({ where: { idMarca: { in: ids('marca') } }, select: { idMarca: true, nombre: true } }),
      ids('linea').length === 0
        ? []
        : prisma.linea.findMany({
            where: { idLinea: { in: ids('linea') } },
            select: { idLinea: true, nombre: true, marca: { select: { nombre: true } } },
          }),
      ids('producto').length === 0
        ? []
        : prisma.producto.findMany({
            where: { idProducto: { in: ids('producto') } },
            select: { idProducto: true, nombre: true, marca: { select: { nombre: true } } },
          }),
    ]);
    for (const m of marcas) nombres.set(`marca:${m.idMarca}`, m.nombre);
    for (const l of lineas) nombres.set(`linea:${l.idLinea}`, `${l.marca.nombre} · ${l.nombre}`);
    for (const p of productos) nombres.set(`producto:${p.idProducto}`, `${p.marca.nombre} · ${p.nombre}`);
    return { nombres, inexistentes: objetivos.filter((o) => !nombres.has(claveObjetivo(o))) };
  }

  async productosDeObjetivos(objetivos: readonly ObjetivoPatrocinio[]): Promise<ProductoDeCatalogo[]> {
    if (objetivos.length === 0) return [];
    const ids = (tipo: TipoObjetivoPatrocinio): number[] => objetivos.filter((o) => o.tipo === tipo).map((o) => o.id);
    const filas = await prisma.producto.findMany({
      where: {
        OR: [
          ...(ids('producto').length === 0 ? [] : [{ idProducto: { in: ids('producto') } }]),
          ...(ids('linea').length === 0 ? [] : [{ idLinea: { in: ids('linea') } }]),
          ...(ids('marca').length === 0 ? [] : [{ idMarca: { in: ids('marca') } }]),
        ],
      },
      select: {
        idProducto: true,
        idMarca: true,
        idLinea: true,
        nombre: true,
        marca: { select: { nombre: true } },
        linea: { select: { nombre: true } },
        subcategoria: { select: { nombre: true } },
      },
      orderBy: [{ nombre: 'asc' }, { idProducto: 'asc' }],
    });
    const visibles = await this.idsVisibles(filas.map((f) => f.idProducto));
    return filas.map((f) => ({
      idProducto: f.idProducto,
      idMarca: f.idMarca,
      idLinea: f.idLinea,
      nombre: f.nombre,
      marca: f.marca.nombre,
      linea: f.linea?.nombre ?? null,
      subcategoria: f.subcategoria.nombre,
      visible: visibles.has(f.idProducto),
    }));
  }

  async idsVisibles(idsProducto: readonly number[]): Promise<Set<number>> {
    if (idsProducto.length === 0) return new Set();
    // Lo que muestra el catálogo público de M01 (U1): la regla de visibilidad y, además, algo que comprar (una variante activa).
    const filas = await prisma.producto.findMany({
      where: productoVisible({ idProducto: { in: [...idsProducto] }, variantes: { some: { estado: 'activo' } } }),
      select: { idProducto: true },
    });
    return new Set(filas.map((f) => f.idProducto));
  }
}
