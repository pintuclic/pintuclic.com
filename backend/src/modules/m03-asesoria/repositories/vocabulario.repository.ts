import { prisma } from '../../../core/db/client';
import type { ValorVocabulario } from '../dtos/cuestionario.dto';
import type { FamiliaCromatica, VocabularioRepositoryPort } from '../interfaces/cuestionario.interface';

/**
 * El vocabulario de filtros: los valores ACTIVOS del catálogo que el cuestionario puede
 * proponer (contrato · V1).
 *
 * Son seis tablas pequeñas (unas decenas de filas en total), así que se leen enteras en una
 * sola ida a la base. Con ellas se valida cada efecto (F4) y se arma la lista de objetivos
 * que ofrece el panel.
 *
 * El acabado NO entra aunque exista en M01: M02 no lo filtra, así que no se puede llevar al
 * catálogo (V2). El día que M02 lo admita, se agrega aquí y en `dimensionFiltroSchema`.
 */
export class PrismaVocabularioRepository implements VocabularioRepositoryPort {
  async obtener(): Promise<ValorVocabulario[]> {
    const activo = { estado: 'activo' } as const;

    const [categorias, subcategorias, superficies, familias, resinas, lineas] = await Promise.all([
      prisma.categoria.findMany({
        where: activo,
        select: { idCategoria: true, nombre: true },
        orderBy: { orden: 'asc' },
      }),
      prisma.subcategoria.findMany({
        where: { ...activo, categoria: activo },
        select: { idSubcategoria: true, nombre: true },
        orderBy: { orden: 'asc' },
      }),
      prisma.superficie.findMany({
        where: activo,
        select: { idSuperficie: true, nombre: true },
        orderBy: { orden: 'asc' },
      }),
      // `familia_color` no tiene estado: todas las familias del catálogo son válidas.
      prisma.familiaColor.findMany({
        select: { idFamiliaColor: true, nombre: true },
        orderBy: { orden: 'asc' },
      }),
      prisma.tipoResina.findMany({
        where: activo,
        select: { idTipoResina: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.linea.findMany({
        where: { ...activo, marca: activo },
        select: { idLinea: true, nombre: true, marca: { select: { nombre: true } } },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    return [
      ...categorias.map((c) => ({ dimension: 'categoria' as const, idValor: c.idCategoria, nombre: c.nombre })),
      ...subcategorias.map((s) => ({
        dimension: 'subcategoria' as const,
        idValor: s.idSubcategoria,
        nombre: s.nombre,
      })),
      ...superficies.map((s) => ({ dimension: 'superficie' as const, idValor: s.idSuperficie, nombre: s.nombre })),
      ...familias.map((f) => ({
        dimension: 'familia_color' as const,
        idValor: f.idFamiliaColor,
        nombre: f.nombre,
      })),
      ...resinas.map((r) => ({ dimension: 'tipo_resina' as const, idValor: r.idTipoResina, nombre: r.nombre })),
      // La línea se nombra con su marca: «Viniltex» solo no dice de quién es.
      ...lineas.map((l) => ({
        dimension: 'linea' as const,
        idValor: l.idLinea,
        nombre: `${l.nombre} (${l.marca.nombre})`,
      })),
    ];
  }

  async obtenerFamilias(): Promise<FamiliaCromatica[]> {
    const familias = await prisma.familiaColor.findMany({
      select: { idFamiliaColor: true, nombre: true, hexadecimal: true },
      orderBy: { orden: 'asc' },
    });
    return familias.map((f) => ({
      idFamiliaColor: f.idFamiliaColor,
      nombre: f.nombre,
      hexadecimal: f.hexadecimal,
    }));
  }
}
