import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  EditarLineaRequest,
  EditarMarcaRequest,
  EditarMedidaRequest,
  Estado,
  ImpactoDesactivacion,
  Linea,
  ListarBaseRequest,
  ListarLineasRequest,
  ListarMedidasRequest,
  Marca,
  Medida,
} from '../dtos/m01-catalogo.dto';
import type {
  ClaveMedida,
  CrearLineaDatos,
  CrearMarcaDatos,
  CrearMedidaDatos,
  LineasRepositoryPort,
  LogotipoMarca,
  MarcasRepositoryPort,
  MedidasRepositoryPort,
  Pagina,
} from '../interfaces/catalogo.interface';
import { impactoVacio, productoVisible, sinIndefinidos } from './prisma-comun';

const igualSinMayusculas = (texto: string): Prisma.StringFilter => ({ equals: texto, mode: 'insensitive' });
const contiene = (texto: string): Prisma.StringFilter => ({ contains: texto, mode: 'insensitive' });
const desplazamiento = (pagina: number, limite: number): { skip: number; take: number } => ({
  skip: (pagina - 1) * limite,
  take: limite,
});

/* ─── Marcas ─────────────────────────────────────────────────────────────── */

/** Nunca se leen los bytes del logotipo salvo en `obtenerLogotipo`. */
const SELECCION_MARCA = {
  idMarca: true,
  nombre: true,
  estado: true,
  logotipoMimeType: true,
} satisfies Prisma.MarcaSelect;

type FilaMarca = Prisma.MarcaGetPayload<{ select: typeof SELECCION_MARCA }>;

function aMarca(f: FilaMarca): Marca {
  return {
    idMarca: f.idMarca,
    nombre: f.nombre,
    estado: f.estado,
    logotipoMimeType: f.logotipoMimeType as Marca['logotipoMimeType'],
  };
}

export class MarcasRepository implements MarcasRepositoryPort {
  async listar(query: ListarBaseRequest): Promise<Pagina<Marca>> {
    const where: Prisma.MarcaWhereInput = {
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.busqueda !== undefined && query.busqueda !== '' ? { nombre: contiene(query.busqueda) } : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.marca.findMany({
        where,
        select: SELECCION_MARCA,
        orderBy: { nombre: 'asc' },
        ...desplazamiento(query.pagina, query.limite),
      }),
      prisma.marca.count({ where }),
    ]);
    return { items: filas.map(aMarca), total };
  }

  async obtener(id: number): Promise<Marca | null> {
    const f = await prisma.marca.findUnique({ where: { idMarca: id }, select: SELECCION_MARCA });
    return f === null ? null : aMarca(f);
  }

  async crear(datos: CrearMarcaDatos): Promise<Marca> {
    const f = await prisma.marca.create({
      data: {
        nombre: datos.nombre,
        logotipo: Uint8Array.from(datos.logotipo),
        logotipoMimeType: datos.logotipoMimeType,
      },
      select: SELECCION_MARCA,
    });
    return aMarca(f);
  }

  async editar(id: number, datos: EditarMarcaRequest): Promise<Marca> {
    const f = await prisma.marca.update({
      where: { idMarca: id },
      data: { nombre: datos.nombre },
      select: SELECCION_MARCA,
    });
    return aMarca(f);
  }

  async reemplazarLogotipo(id: number, logotipo: Buffer, mimeType: Marca['logotipoMimeType']): Promise<Marca> {
    const f = await prisma.marca.update({
      where: { idMarca: id },
      data: { logotipo: Uint8Array.from(logotipo), logotipoMimeType: mimeType },
      select: SELECCION_MARCA,
    });
    return aMarca(f);
  }

  async obtenerLogotipo(id: number): Promise<LogotipoMarca | null> {
    const f = await prisma.marca.findUnique({
      where: { idMarca: id },
      select: { logotipo: true, logotipoMimeType: true },
    });
    if (f === null) return null;
    return { bytes: Buffer.from(f.logotipo), mimeType: f.logotipoMimeType as Marca['logotipoMimeType'] };
  }

  /** R5: desactivar una marca desactiva sus líneas y sus colores, en una sola transacción. */
  async cambiarEstado(id: number, estado: Estado): Promise<Marca> {
    const f = await prisma.$transaction(async (tx) => {
      if (estado === 'inactivo') {
        await tx.linea.updateMany({ where: { idMarca: id }, data: { estado: 'inactivo' } });
        await tx.color.updateMany({ where: { idMarca: id }, data: { estado: 'inactivo' } });
      }
      return tx.marca.update({ where: { idMarca: id }, data: { estado }, select: SELECCION_MARCA });
    });
    return aMarca(f);
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const [lineas, colores, productos] = await Promise.all([
      prisma.linea.count({ where: { idMarca: id, estado: 'activo' } }),
      prisma.color.count({ where: { idMarca: id, estado: 'activo' } }),
      prisma.producto.count({ where: productoVisible({ idMarca: id }) }),
    ]);
    return { ...impactoVacio(), lineas, colores, productos };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.marca.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idMarca: excluirId } } : {}),
      },
      select: { idMarca: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

/* ─── Líneas ─────────────────────────────────────────────────────────────── */

type FilaLinea = Prisma.LineaGetPayload<Record<string, never>>;

function aLinea(f: FilaLinea): Linea {
  return {
    idLinea: f.idLinea,
    idMarca: f.idMarca,
    nombre: f.nombre,
    gamaComercial: f.gamaComercial,
    estado: f.estado,
  };
}

export class LineasRepository implements LineasRepositoryPort {
  async listar(query: ListarLineasRequest): Promise<Pagina<Linea>> {
    const where: Prisma.LineaWhereInput = {
      ...(query.idMarca !== undefined ? { idMarca: query.idMarca } : {}),
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.busqueda !== undefined && query.busqueda !== '' ? { nombre: contiene(query.busqueda) } : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.linea.findMany({
        where,
        orderBy: [{ idMarca: 'asc' }, { nombre: 'asc' }],
        ...desplazamiento(query.pagina, query.limite),
      }),
      prisma.linea.count({ where }),
    ]);
    return { items: filas.map(aLinea), total };
  }

  async obtener(id: number): Promise<Linea | null> {
    const f = await prisma.linea.findUnique({ where: { idLinea: id } });
    return f === null ? null : aLinea(f);
  }

  async crear(datos: CrearLineaDatos): Promise<Linea> {
    return aLinea(
      await prisma.linea.create({
        data: { idMarca: datos.idMarca, nombre: datos.nombre, gamaComercial: datos.gamaComercial },
      }),
    );
  }

  async editar(id: number, datos: EditarLineaRequest): Promise<Linea> {
    return aLinea(
      await prisma.linea.update({
        where: { idLinea: id },
        data: sinIndefinidos({ nombre: datos.nombre, gamaComercial: datos.gamaComercial }),
      }),
    );
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Linea> {
    return aLinea(await prisma.linea.update({ where: { idLinea: id }, data: { estado } }));
  }

  /** Los productos de una línea inactiva dejan de verse (R5). */
  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const productos = await prisma.producto.count({ where: productoVisible({ idLinea: id }) });
    return { ...impactoVacio(), productos };
  }

  async existeDuplicado(clave: { idMarca: number; nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.linea.findFirst({
      where: {
        idMarca: clave.idMarca,
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idLinea: excluirId } } : {}),
      },
      select: { idLinea: true },
    });
    return f !== null;
  }

  /** R7: la marca debe estar activa. */
  async padreActivo(id: number): Promise<boolean> {
    const f = await prisma.linea.findUnique({ where: { idLinea: id }, select: { marca: { select: { estado: true } } } });
    return f?.marca.estado === 'activo';
  }
}

/* ─── Medidas ────────────────────────────────────────────────────────────── */

type FilaMedida = Prisma.MedidaGetPayload<Record<string, never>>;

function aMedida(f: FilaMedida): Medida {
  return {
    idMedida: f.idMedida,
    idTipoMedida: f.idTipoMedida,
    valor: f.valor.toNumber(),
    nombre: f.nombre,
    estado: f.estado,
  };
}

export class MedidasRepository implements MedidasRepositoryPort {
  async listar(query: ListarMedidasRequest): Promise<Pagina<Medida>> {
    const where: Prisma.MedidaWhereInput = {
      ...(query.idTipoMedida !== undefined ? { idTipoMedida: query.idTipoMedida } : {}),
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.busqueda !== undefined && query.busqueda !== '' ? { nombre: contiene(query.busqueda) } : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.medida.findMany({
        where,
        orderBy: [{ idTipoMedida: 'asc' }, { valor: 'asc' }],
        ...desplazamiento(query.pagina, query.limite),
      }),
      prisma.medida.count({ where }),
    ]);
    return { items: filas.map(aMedida), total };
  }

  async obtener(id: number): Promise<Medida | null> {
    const f = await prisma.medida.findUnique({ where: { idMedida: id } });
    return f === null ? null : aMedida(f);
  }

  async crear(datos: CrearMedidaDatos): Promise<Medida> {
    return aMedida(
      await prisma.medida.create({
        data: { idTipoMedida: datos.idTipoMedida, valor: datos.valor, nombre: datos.nombre },
      }),
    );
  }

  async editar(id: number, datos: EditarMedidaRequest): Promise<Medida> {
    return aMedida(
      await prisma.medida.update({
        where: { idMedida: id },
        data: sinIndefinidos({ valor: datos.valor, nombre: datos.nombre }),
      }),
    );
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Medida> {
    return aMedida(await prisma.medida.update({ where: { idMedida: id }, data: { estado } }));
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const variantes = await prisma.variante.count({ where: { idMedida: id, estado: 'activo' } });
    return { ...impactoVacio(), variantes };
  }

  /** R3: única por (tipo, valor) y única por nombre. */
  async existeDuplicado(clave: ClaveMedida, excluirId?: number): Promise<boolean> {
    const f = await prisma.medida.findFirst({
      where: {
        OR: [{ idTipoMedida: clave.idTipoMedida, valor: clave.valor }, { nombre: igualSinMayusculas(clave.nombre) }],
        ...(excluirId !== undefined ? { NOT: { idMedida: excluirId } } : {}),
      },
      select: { idMedida: true },
    });
    return f !== null;
  }

  /** R7: el tipo de medida debe estar activo. */
  async padreActivo(id: number): Promise<boolean> {
    const f = await prisma.medida.findUnique({
      where: { idMedida: id },
      select: { tipoMedida: { select: { estado: true } } },
    });
    return f?.tipoMedida.estado === 'activo';
  }
}
