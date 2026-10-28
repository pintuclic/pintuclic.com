import { prisma } from '../db/client';
import type { CategoriaInicioAdminEntity, CategoriaInicioPublicaItem, TipoMimeBannerInicio } from './fp01-landing.dto';

export interface ImagenCategoriaBytes {
  bytes: Buffer;
  mimeType: TipoMimeBannerInicio;
}

export interface GuardarImagenCategoriaRepositorioInput {
  imagen?: { bytes: Buffer; mimeType: TipoMimeBannerInicio };
  focoX?: number;
  focoY?: number;
  idAutor: number | null;
}

export interface CategoriasInicioRepositoryPort {
  listarPublicas(): Promise<CategoriaInicioPublicaItem[]>;
  obtenerImagen(idCategoria: number): Promise<ImagenCategoriaBytes | null>;
  listarAdmin(): Promise<CategoriaInicioAdminEntity[]>;
  /** Devuelve null si la categoría no existe, o si solo cambia el enfoque y todavía no tiene imagen. */
  guardar(idCategoria: number, datos: GuardarImagenCategoriaRepositorioInput): Promise<CategoriaInicioAdminEntity | null>;
  quitar(idCategoria: number): Promise<void>;
}

const MIMES: ReadonlyArray<string> = ['image/jpeg', 'image/png', 'image/webp'];

function esMime(valor: string): valor is TipoMimeBannerInicio {
  return MIMES.includes(valor);
}

export class PrismaCategoriasInicioRepository implements CategoriasInicioRepositoryPort {
  async listarPublicas(): Promise<CategoriaInicioPublicaItem[]> {
    const filas = await prisma.imagenCategoriaInicio.findMany({
      select: { idCategoria: true, focoX: true, focoY: true, fechaActualizacion: true },
      orderBy: { idCategoria: 'asc' },
    });
    return filas.map((f) => ({
      idCategoria: f.idCategoria,
      focoX: f.focoX,
      focoY: f.focoY,
      version: String(f.fechaActualizacion.getTime()),
    }));
  }

  async obtenerImagen(idCategoria: number): Promise<ImagenCategoriaBytes | null> {
    const fila = await prisma.imagenCategoriaInicio.findUnique({
      where: { idCategoria },
      select: { contenido: true, mimeType: true },
    });
    if (fila === null || !esMime(fila.mimeType)) return null;
    return { bytes: Buffer.from(fila.contenido), mimeType: fila.mimeType };
  }

  async listarAdmin(): Promise<CategoriaInicioAdminEntity[]> {
    const filas = await prisma.categoria.findMany({
      select: {
        idCategoria: true,
        nombre: true,
        imagenInicio: { select: { focoX: true, focoY: true, fechaActualizacion: true } },
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map((f) => ({
      idCategoria: f.idCategoria,
      nombre: f.nombre,
      tieneImagen: f.imagenInicio !== null,
      focoX: f.imagenInicio?.focoX ?? 50,
      focoY: f.imagenInicio?.focoY ?? 50,
      fechaActualizacion: f.imagenInicio?.fechaActualizacion.toISOString() ?? null,
    }));
  }

  async guardar(idCategoria: number, datos: GuardarImagenCategoriaRepositorioInput): Promise<CategoriaInicioAdminEntity | null> {
    const categoria = await prisma.categoria.findUnique({ where: { idCategoria }, select: { idCategoria: true } });
    if (categoria === null) return null;
    const existente = await prisma.imagenCategoriaInicio.findUnique({ where: { idCategoria }, select: { idCategoria: true } });
    if (existente === null && datos.imagen === undefined) return null;

    const comunes = {
      ...(datos.focoX === undefined ? {} : { focoX: datos.focoX }),
      ...(datos.focoY === undefined ? {} : { focoY: datos.focoY }),
      idUsuarioActualizo: datos.idAutor,
      fechaActualizacion: new Date(),
    };
    if (datos.imagen === undefined) {
      await prisma.imagenCategoriaInicio.update({ where: { idCategoria }, data: comunes });
    } else {
      const imagen = { contenido: new Uint8Array(datos.imagen.bytes), mimeType: datos.imagen.mimeType };
      await prisma.imagenCategoriaInicio.upsert({
        where: { idCategoria },
        create: { idCategoria, ...imagen, ...comunes },
        update: { ...imagen, ...comunes },
      });
    }
    const lista = await this.listarAdmin();
    return lista.find((c) => c.idCategoria === idCategoria) ?? null;
  }

  async quitar(idCategoria: number): Promise<void> {
    await prisma.imagenCategoriaInicio.deleteMany({ where: { idCategoria } });
  }
}
