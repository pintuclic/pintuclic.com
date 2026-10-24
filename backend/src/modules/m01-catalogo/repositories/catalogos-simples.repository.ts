import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  Acabado,
  Base,
  CrearAcabadoRequest,
  CrearBaseRequest,
  CrearFamiliaColorRequest,
  CrearSuperficieRequest,
  CrearTipoMedidaRequest,
  CrearTipoResinaRequest,
  EditarAcabadoRequest,
  EditarBaseRequest,
  EditarFamiliaColorRequest,
  EditarSuperficieRequest,
  EditarTipoMedidaRequest,
  Estado,
  FamiliaColor,
  ImpactoDesactivacion,
  ListarCompletoRequest,
  Superficie,
  TipoMedida,
  TipoResina,
} from '../dtos/m01-catalogo.dto';
import type {
  AcabadosRepositoryPort,
  BasesRepositoryPort,
  FamiliasColorRepositoryPort,
  SuperficiesRepositoryPort,
  TiposMedidaRepositoryPort,
  TiposResinaRepositoryPort,
} from '../interfaces/catalogo.interface';
import { impactoVacio, sinIndefinidos } from './prisma-comun';

const filtroEstado = (query: ListarCompletoRequest): { estado?: Estado } =>
  query.estado !== undefined ? { estado: query.estado } : {};

/** Coincidencia sin distinguir mayúsculas (R3, D4). */
const igualSinMayusculas = (nombre: string): Prisma.StringFilter => ({ equals: nombre, mode: 'insensitive' });

/* ─── Superficies ────────────────────────────────────────────────────────── */

export class SuperficiesRepository implements SuperficiesRepositoryPort {
  private aDto(f: { idSuperficie: number; nombre: string; orden: number; estado: Estado }): Superficie {
    return { idSuperficie: f.idSuperficie, nombre: f.nombre, orden: f.orden, estado: f.estado };
  }

  async listar(query: ListarCompletoRequest): Promise<Superficie[]> {
    const filas = await prisma.superficie.findMany({
      where: filtroEstado(query),
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map((f) => this.aDto(f));
  }

  async obtener(id: number): Promise<Superficie | null> {
    const f = await prisma.superficie.findUnique({ where: { idSuperficie: id } });
    return f === null ? null : this.aDto(f);
  }

  async crear(datos: CrearSuperficieRequest): Promise<Superficie> {
    return this.aDto(await prisma.superficie.create({ data: { nombre: datos.nombre, orden: datos.orden } }));
  }

  async editar(id: number, datos: EditarSuperficieRequest): Promise<Superficie> {
    const f = await prisma.superficie.update({
      where: { idSuperficie: id },
      data: sinIndefinidos({ nombre: datos.nombre, orden: datos.orden }),
    });
    return this.aDto(f);
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Superficie> {
    return this.aDto(await prisma.superficie.update({ where: { idSuperficie: id }, data: { estado } }));
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const productos = await prisma.producto.count({
      where: { estado: 'activo', superficies: { some: { idSuperficie: id } } },
    });
    return { ...impactoVacio(), productos };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.superficie.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idSuperficie: excluirId } } : {}),
      },
      select: { idSuperficie: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

/* ─── Tipos de resina ────────────────────────────────────────────────────── */

export class TiposResinaRepository implements TiposResinaRepositoryPort {
  private aDto(f: { idTipoResina: number; nombre: string; estado: Estado }): TipoResina {
    return { idTipoResina: f.idTipoResina, nombre: f.nombre, estado: f.estado };
  }

  async listar(query: ListarCompletoRequest): Promise<TipoResina[]> {
    const filas = await prisma.tipoResina.findMany({ where: filtroEstado(query), orderBy: { nombre: 'asc' } });
    return filas.map((f) => this.aDto(f));
  }

  async obtener(id: number): Promise<TipoResina | null> {
    const f = await prisma.tipoResina.findUnique({ where: { idTipoResina: id } });
    return f === null ? null : this.aDto(f);
  }

  async crear(datos: CrearTipoResinaRequest): Promise<TipoResina> {
    return this.aDto(await prisma.tipoResina.create({ data: { nombre: datos.nombre } }));
  }

  async editar(id: number, datos: CrearTipoResinaRequest): Promise<TipoResina> {
    return this.aDto(await prisma.tipoResina.update({ where: { idTipoResina: id }, data: { nombre: datos.nombre } }));
  }

  async cambiarEstado(id: number, estado: Estado): Promise<TipoResina> {
    return this.aDto(await prisma.tipoResina.update({ where: { idTipoResina: id }, data: { estado } }));
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const productos = await prisma.producto.count({ where: { estado: 'activo', ficha: { idTipoResina: id } } });
    return { ...impactoVacio(), productos };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.tipoResina.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idTipoResina: excluirId } } : {}),
      },
      select: { idTipoResina: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

/* ─── Acabados ───────────────────────────────────────────────────────────── */

export class AcabadosRepository implements AcabadosRepositoryPort {
  private aDto(f: { idAcabado: number; nombre: string; orden: number; estado: Estado }): Acabado {
    return { idAcabado: f.idAcabado, nombre: f.nombre, orden: f.orden, estado: f.estado };
  }

  async listar(query: ListarCompletoRequest): Promise<Acabado[]> {
    const filas = await prisma.acabado.findMany({
      where: filtroEstado(query),
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map((f) => this.aDto(f));
  }

  async obtener(id: number): Promise<Acabado | null> {
    const f = await prisma.acabado.findUnique({ where: { idAcabado: id } });
    return f === null ? null : this.aDto(f);
  }

  async crear(datos: CrearAcabadoRequest): Promise<Acabado> {
    return this.aDto(await prisma.acabado.create({ data: { nombre: datos.nombre, orden: datos.orden } }));
  }

  async editar(id: number, datos: EditarAcabadoRequest): Promise<Acabado> {
    const f = await prisma.acabado.update({
      where: { idAcabado: id },
      data: sinIndefinidos({ nombre: datos.nombre, orden: datos.orden }),
    });
    return this.aDto(f);
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Acabado> {
    return this.aDto(await prisma.acabado.update({ where: { idAcabado: id }, data: { estado } }));
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const [colores, productos] = await Promise.all([
      prisma.color.count({ where: { idAcabado: id, estado: 'activo' } }),
      prisma.producto.count({ where: { estado: 'activo', acabados: { some: { idAcabado: id } } } }),
    ]);
    return { ...impactoVacio(), colores, productos };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.acabado.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idAcabado: excluirId } } : {}),
      },
      select: { idAcabado: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

/* ─── Bases de colorimetría ──────────────────────────────────────────────── */

export class BasesRepository implements BasesRepositoryPort {
  private aDto(f: { idBase: number; nombre: string; orden: number; estado: Estado }): Base {
    return { idBase: f.idBase, nombre: f.nombre, orden: f.orden, estado: f.estado };
  }

  async listar(query: ListarCompletoRequest): Promise<Base[]> {
    const filas = await prisma.base.findMany({
      where: filtroEstado(query),
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map((f) => this.aDto(f));
  }

  async obtener(id: number): Promise<Base | null> {
    const f = await prisma.base.findUnique({ where: { idBase: id } });
    return f === null ? null : this.aDto(f);
  }

  async crear(datos: CrearBaseRequest): Promise<Base> {
    return this.aDto(await prisma.base.create({ data: { nombre: datos.nombre, orden: datos.orden } }));
  }

  async editar(id: number, datos: EditarBaseRequest): Promise<Base> {
    const f = await prisma.base.update({
      where: { idBase: id },
      data: sinIndefinidos({ nombre: datos.nombre, orden: datos.orden }),
    });
    return this.aDto(f);
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Base> {
    return this.aDto(await prisma.base.update({ where: { idBase: id }, data: { estado } }));
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const [colores, productos] = await Promise.all([
      prisma.color.count({ where: { idBase: id, estado: 'activo' } }),
      prisma.producto.count({ where: { estado: 'activo', bases: { some: { idBase: id } } } }),
    ]);
    return { ...impactoVacio(), colores, productos };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.base.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idBase: excluirId } } : {}),
      },
      select: { idBase: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

/* ─── Familias de color ──────────────────────────────────────────────────── */

export class FamiliasColorRepository implements FamiliasColorRepositoryPort {
  private aDto(f: {
    idFamiliaColor: number;
    nombre: string;
    hexadecimal: string;
    orden: number;
    estado: Estado;
  }): FamiliaColor {
    return {
      idFamiliaColor: f.idFamiliaColor,
      nombre: f.nombre,
      hexadecimal: f.hexadecimal,
      orden: f.orden,
      estado: f.estado,
    };
  }

  async listar(query: ListarCompletoRequest): Promise<FamiliaColor[]> {
    const filas = await prisma.familiaColor.findMany({
      where: filtroEstado(query),
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map((f) => this.aDto(f));
  }

  async obtener(id: number): Promise<FamiliaColor | null> {
    const f = await prisma.familiaColor.findUnique({ where: { idFamiliaColor: id } });
    return f === null ? null : this.aDto(f);
  }

  async crear(datos: CrearFamiliaColorRequest): Promise<FamiliaColor> {
    return this.aDto(
      await prisma.familiaColor.create({
        data: { nombre: datos.nombre, hexadecimal: datos.hexadecimal.toUpperCase(), orden: datos.orden },
      }),
    );
  }

  async editar(id: number, datos: EditarFamiliaColorRequest): Promise<FamiliaColor> {
    const f = await prisma.familiaColor.update({
      where: { idFamiliaColor: id },
      data: sinIndefinidos({
        nombre: datos.nombre,
        hexadecimal: datos.hexadecimal?.toUpperCase(),
        orden: datos.orden,
      }),
    });
    return this.aDto(f);
  }

  async cambiarEstado(id: number, estado: Estado): Promise<FamiliaColor> {
    return this.aDto(await prisma.familiaColor.update({ where: { idFamiliaColor: id }, data: { estado } }));
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const colores = await prisma.color.count({ where: { idFamiliaColor: id, estado: 'activo' } });
    return { ...impactoVacio(), colores };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.familiaColor.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idFamiliaColor: excluirId } } : {}),
      },
      select: { idFamiliaColor: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

/* ─── Tipos de medida ────────────────────────────────────────────────────── */

type FilaTipoMedida = Prisma.TipoMedidaGetPayload<Record<string, never>>;

export class TiposMedidaRepository implements TiposMedidaRepositoryPort {
  private aDto(f: FilaTipoMedida): TipoMedida {
    return {
      idTipoMedida: f.idTipoMedida,
      nombre: f.nombre,
      abreviatura: f.abreviatura,
      equivalenciaGalones: f.equivalenciaGalones === null ? null : f.equivalenciaGalones.toNumber(),
      estado: f.estado,
    };
  }

  async listar(query: ListarCompletoRequest): Promise<TipoMedida[]> {
    const filas = await prisma.tipoMedida.findMany({ where: filtroEstado(query), orderBy: { nombre: 'asc' } });
    return filas.map((f) => this.aDto(f));
  }

  async obtener(id: number): Promise<TipoMedida | null> {
    const f = await prisma.tipoMedida.findUnique({ where: { idTipoMedida: id } });
    return f === null ? null : this.aDto(f);
  }

  async crear(datos: CrearTipoMedidaRequest): Promise<TipoMedida> {
    const f = await prisma.tipoMedida.create({
      data: {
        nombre: datos.nombre,
        abreviatura: datos.abreviatura,
        equivalenciaGalones: datos.equivalenciaGalones ?? null,
      },
    });
    return this.aDto(f);
  }

  async editar(id: number, datos: EditarTipoMedidaRequest): Promise<TipoMedida> {
    const f = await prisma.tipoMedida.update({
      where: { idTipoMedida: id },
      data: sinIndefinidos({
        nombre: datos.nombre,
        abreviatura: datos.abreviatura,
        equivalenciaGalones: datos.equivalenciaGalones,
      }),
    });
    return this.aDto(f);
  }

  /** R5: desactivar un tipo de medida desactiva sus medidas, en una sola transacción. */
  async cambiarEstado(id: number, estado: Estado): Promise<TipoMedida> {
    const f = await prisma.$transaction(async (tx) => {
      if (estado === 'inactivo') {
        await tx.medida.updateMany({ where: { idTipoMedida: id }, data: { estado: 'inactivo' } });
      }
      return tx.tipoMedida.update({ where: { idTipoMedida: id }, data: { estado } });
    });
    return this.aDto(f);
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const variantes = await prisma.variante.count({
      where: { estado: 'activo', medida: { idTipoMedida: id, estado: 'activo' } },
    });
    return { ...impactoVacio(), variantes };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const f = await prisma.tipoMedida.findFirst({
      where: {
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idTipoMedida: excluirId } } : {}),
      },
      select: { idTipoMedida: true },
    });
    return f !== null;
  }

  async existeAbreviatura(abreviatura: string, excluirId?: number): Promise<boolean> {
    const f = await prisma.tipoMedida.findFirst({
      where: {
        abreviatura: igualSinMayusculas(abreviatura),
        ...(excluirId !== undefined ? { NOT: { idTipoMedida: excluirId } } : {}),
      },
      select: { idTipoMedida: true },
    });
    return f !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}
