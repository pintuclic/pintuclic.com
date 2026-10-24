import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Estado, ImpactoDesactivacion } from '../dtos/m01-catalogo.dto';
import type { Cielab, Color, ListarColoresRequest } from '../dtos/m01-catalogo-productos.dto';
import type { Pagina } from '../interfaces/catalogo.interface';
import type {
  ClaveColor,
  ColoresRepositoryPort,
  CrearColorDatos,
  EditarColorDatos,
  OperacionImportacionColor,
} from '../interfaces/colores.interface';
import { impactoVacio, productoVisible } from './prisma-comun';

const INCLUIR = {
  marca: { select: { nombre: true } },
  base: { select: { nombre: true } },
  acabado: { select: { nombre: true } },
  familia: { select: { nombre: true } },
} satisfies Prisma.ColorInclude;

type FilaColor = Prisma.ColorGetPayload<{ include: typeof INCLUIR }>;

function aCielab(f: FilaColor): Cielab | null {
  if (f.cieL === null || f.cieA === null || f.cieB === null) return null;
  return { l: f.cieL.toNumber(), a: f.cieA.toNumber(), b: f.cieB.toNumber() };
}

function aColor(f: FilaColor): Color {
  return {
    idColor: f.idColor,
    idMarca: f.idMarca,
    marca: f.marca.nombre,
    nombre: f.nombre,
    codigo: f.codigo,
    hexadecimal: f.hexadecimal,
    idBase: f.idBase,
    base: f.base?.nombre ?? null,
    idAcabado: f.idAcabado,
    acabado: f.acabado.nombre,
    idFamiliaColor: f.idFamiliaColor,
    familia: f.familia?.nombre ?? null,
    cielab: aCielab(f),
    sinBase: f.idBase === null,
    estado: f.estado,
  };
}

/** Columnas CIELAB de Prisma a partir del valor del contrato (completo o nulo, C5). */
function columnasCielab(cielab: Cielab | null): { cieL: number | null; cieA: number | null; cieB: number | null } {
  return cielab === null
    ? { cieL: null, cieA: null, cieB: null }
    : { cieL: cielab.l, cieA: cielab.a, cieB: cielab.b };
}

function datosCrear(d: CrearColorDatos): Prisma.ColorUncheckedCreateInput {
  return {
    idMarca: d.idMarca,
    nombre: d.nombre,
    codigo: d.codigo,
    hexadecimal: d.hexadecimal,
    idBase: d.idBase,
    idAcabado: d.idAcabado,
    idFamiliaColor: d.idFamiliaColor,
    ...columnasCielab(d.cielab),
  };
}

function datosEditar(d: EditarColorDatos): Prisma.ColorUncheckedUpdateInput {
  return {
    ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
    ...(d.codigo !== undefined ? { codigo: d.codigo } : {}),
    ...(d.hexadecimal !== undefined ? { hexadecimal: d.hexadecimal } : {}),
    ...(d.idBase !== undefined ? { idBase: d.idBase } : {}),
    ...(d.idAcabado !== undefined ? { idAcabado: d.idAcabado } : {}),
    ...(d.idFamiliaColor !== undefined ? { idFamiliaColor: d.idFamiliaColor } : {}),
    ...(d.cielab !== undefined ? columnasCielab(d.cielab) : {}),
  };
}

const igualSinMayusculas = (texto: string): Prisma.StringFilter => ({ equals: texto, mode: 'insensitive' });

export class ColoresRepository implements ColoresRepositoryPort {
  async listar(query: ListarColoresRequest): Promise<Pagina<Color>> {
    const busqueda = query.busqueda;
    const where: Prisma.ColorWhereInput = {
      ...(query.idMarca !== undefined ? { idMarca: query.idMarca } : {}),
      ...(query.idFamiliaColor !== undefined ? { idFamiliaColor: query.idFamiliaColor } : {}),
      ...(query.idBase !== undefined ? { idBase: query.idBase } : {}),
      ...(query.idAcabado !== undefined ? { idAcabado: query.idAcabado } : {}),
      ...(query.sinBase === true ? { idBase: null } : {}),
      ...(query.sinBase === false ? { idBase: { not: null } } : {}),
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(busqueda !== undefined && busqueda !== ''
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: 'insensitive' } },
              { codigo: { contains: busqueda, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.color.findMany({
        where,
        include: INCLUIR,
        orderBy: [{ nombre: 'asc' }, { idColor: 'asc' }],
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
      prisma.color.count({ where }),
    ]);
    return { items: filas.map(aColor), total };
  }

  async obtener(id: number): Promise<Color | null> {
    const f = await prisma.color.findUnique({ where: { idColor: id }, include: INCLUIR });
    return f === null ? null : aColor(f);
  }

  async crear(datos: CrearColorDatos): Promise<Color> {
    return aColor(await prisma.color.create({ data: datosCrear(datos), include: INCLUIR }));
  }

  async editar(id: number, datos: EditarColorDatos): Promise<Color> {
    return aColor(await prisma.color.update({ where: { idColor: id }, data: datosEditar(datos), include: INCLUIR }));
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Color> {
    return aColor(await prisma.color.update({ where: { idColor: id }, data: { estado }, include: INCLUIR }));
  }

  /**
   * C7: productos visibles que hoy ofrecen este color, porque es de fábrica o porque su
   * carta incluye la base y el acabado del color.
   */
  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const color = await prisma.color.findUnique({ where: { idColor: id }, select: { idBase: true, idAcabado: true } });
    if (color === null) return impactoVacio();
    const alternativas: Prisma.ProductoWhereInput[] = [{ coloresFabrica: { some: { idColor: id } } }];
    if (color.idBase !== null) {
      alternativas.push({
        AND: [{ bases: { some: { idBase: color.idBase } } }, { acabados: { some: { idAcabado: color.idAcabado } } }],
      });
    }
    const productos = await prisma.producto.count({ where: productoVisible({ OR: alternativas }) });
    return { ...impactoVacio(), productos };
  }

  async existeDuplicado(clave: ClaveColor, excluirId?: number): Promise<boolean> {
    const f = await prisma.color.findFirst({
      where: {
        idMarca: clave.idMarca,
        idAcabado: clave.idAcabado,
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idColor: excluirId } } : {}),
      },
      select: { idColor: true },
    });
    return f !== null;
  }

  async existeCodigo(idMarca: number, codigo: string, excluirId?: number): Promise<boolean> {
    const f = await prisma.color.findFirst({
      where: {
        idMarca,
        codigo: igualSinMayusculas(codigo),
        ...(excluirId !== undefined ? { NOT: { idColor: excluirId } } : {}),
      },
      select: { idColor: true },
    });
    return f !== null;
  }

  async buscarPorClave(clave: ClaveColor): Promise<Color | null> {
    const f = await prisma.color.findFirst({
      where: { idMarca: clave.idMarca, idAcabado: clave.idAcabado, nombre: igualSinMayusculas(clave.nombre) },
      include: INCLUIR,
    });
    return f === null ? null : aColor(f);
  }

  async buscarPorCodigo(idMarca: number, codigo: string): Promise<Color | null> {
    const f = await prisma.color.findFirst({
      where: { idMarca, codigo: igualSinMayusculas(codigo) },
      include: INCLUIR,
    });
    return f === null ? null : aColor(f);
  }

  /** C8: todo el bloque o nada, aunque cada fila se haya evaluado por separado. */
  async aplicarImportacion(operaciones: readonly OperacionImportacionColor[]): Promise<Map<number, number>> {
    const resultado = new Map<number, number>();
    await prisma.$transaction(async (tx) => {
      for (const op of operaciones) {
        if (op.tipo === 'crear') {
          const f = await tx.color.create({ data: datosCrear(op.datos), select: { idColor: true } });
          resultado.set(op.indice, f.idColor);
        } else {
          await tx.color.update({ where: { idColor: op.idColor }, data: datosEditar(op.datos) });
          resultado.set(op.indice, op.idColor);
        }
      }
    });
    return resultado;
  }

  /** R7: la marca, la base y el acabado del color deben estar activos. */
  async padreActivo(id: number): Promise<boolean> {
    const f = await prisma.color.findUnique({
      where: { idColor: id },
      select: { marca: { select: { estado: true } }, base: { select: { estado: true } }, acabado: { select: { estado: true } } },
    });
    if (f === null) return false;
    return f.marca.estado === 'activo' && f.acabado.estado === 'activo' && (f.base === null || f.base.estado === 'activo');
  }
}
