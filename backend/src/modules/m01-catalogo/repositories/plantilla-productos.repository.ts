import { prisma } from '../../../core/db/client';
import type { CatalogosPlantilla } from '../services/plantilla-productos';

/** Cuántos colores como máximo se listan en la hoja «Colores» (el libro debe poder abrirse en cualquier equipo). */
const MAXIMO_COLORES_LISTADOS = 20_000;

export interface CatalogosPlantillaPort {
  leer(): Promise<CatalogosPlantilla>;
}

/** Lee los catálogos activos de M01 para armar la plantilla de carga masiva. Solo lectura. */
export class PrismaCatalogosPlantilla implements CatalogosPlantillaPort {
  async leer(): Promise<CatalogosPlantilla> {
    const activo = { estado: 'activo' } as const;
    const [marcas, lineas, categorias, subcategorias, medidas, superficies, acabados, bases, resinas, colores] = await Promise.all([
      prisma.marca.findMany({ where: activo, select: { nombre: true } }),
      prisma.linea.findMany({ where: activo, select: { nombre: true, marca: { select: { nombre: true } } } }),
      prisma.categoria.findMany({ where: activo, select: { nombre: true } }),
      prisma.subcategoria.findMany({ where: activo, select: { nombre: true, categoria: { select: { nombre: true } } } }),
      prisma.medida.findMany({ where: activo, select: { nombre: true, tipoMedida: { select: { nombre: true } } } }),
      prisma.superficie.findMany({ where: activo, select: { nombre: true } }),
      prisma.acabado.findMany({ where: activo, select: { nombre: true } }),
      prisma.base.findMany({ where: activo, select: { nombre: true } }),
      prisma.tipoResina.findMany({ where: activo, select: { nombre: true } }),
      prisma.color.findMany({ where: activo, take: MAXIMO_COLORES_LISTADOS, select: { nombre: true, marca: { select: { nombre: true } } } }),
    ]);
    return {
      marcas: marcas.map((m) => m.nombre),
      lineas: lineas.map((l) => ({ marca: l.marca.nombre, nombre: l.nombre })),
      categorias: categorias.map((c) => c.nombre),
      subcategorias: subcategorias.map((s) => ({ categoria: s.categoria.nombre, nombre: s.nombre })),
      medidas: medidas.map((m) => ({ tipo: m.tipoMedida.nombre, nombre: m.nombre })),
      superficies: superficies.map((s) => s.nombre),
      acabados: acabados.map((a) => a.nombre),
      bases: bases.map((b) => b.nombre),
      tiposResina: resinas.map((r) => r.nombre),
      colores: colores.map((c) => ({ marca: c.marca.nombre, nombre: c.nombre })),
    };
  }
}
