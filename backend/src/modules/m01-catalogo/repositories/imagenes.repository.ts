import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { ImagenProducto } from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes } from '../interfaces/catalogo.interface';
import type {
  AsociacionImagen,
  DerivadaGuardada,
  Derivadas,
  ImagenesRepositoryPort,
  MetaImagen,
  TamanoDerivado,
} from '../interfaces/imagenes.interface';

/** Nunca se leen los bytes salvo en `obtenerBytes`. */
export const SELECCION_IMAGEN = {
  idImagen: true,
  orden: true,
  esPrincipal: true,
  mimeType: true,
  idVariante: true,
  idColor: true,
} satisfies Prisma.ImagenSelect;

export const ORDEN_GALERIA = [{ orden: 'asc' }, { idImagen: 'asc' }] satisfies Prisma.ImagenOrderByWithRelationInput[];

type FilaImagen = Prisma.ImagenGetPayload<{ select: typeof SELECCION_IMAGEN }>;

export function aImagen(f: FilaImagen): ImagenProducto {
  return {
    idImagen: f.idImagen,
    orden: f.orden,
    esPrincipal: f.esPrincipal,
    mimeType: f.mimeType as ImagenProducto['mimeType'],
    idVariante: f.idVariante,
    idColor: f.idColor,
  };
}

export class ImagenesRepository implements ImagenesRepositoryPort {
  async listar(idProducto: number): Promise<ImagenProducto[]> {
    const filas = await prisma.imagen.findMany({
      where: { idProducto },
      select: SELECCION_IMAGEN,
      orderBy: ORDEN_GALERIA,
    });
    return filas.map(aImagen);
  }

  contar(idProducto: number): Promise<number> {
    return prisma.imagen.count({ where: { idProducto } });
  }

  async crear(
    idProducto: number,
    bytes: Buffer,
    mimeType: ImagenBytes['mimeType'],
    asociacion: AsociacionImagen,
    derivadas: Derivadas,
  ): Promise<ImagenProducto> {
    const fila = await prisma.$transaction(async (tx) => {
      const ultima = await tx.imagen.aggregate({
        where: { idProducto },
        _max: { orden: true },
        _count: { _all: true },
      });
      return tx.imagen.create({
        data: {
          idProducto,
          datos: new Uint8Array(bytes),
          miniatura: new Uint8Array(derivadas.miniatura),
          mediana: new Uint8Array(derivadas.mediana),
          mimeType,
          idVariante: asociacion.idVariante,
          idColor: asociacion.idColor,
          orden: (ultima._max.orden ?? -1) + 1,
          esPrincipal: ultima._count._all === 0,
        },
        select: SELECCION_IMAGEN,
      });
    });
    return aImagen(fila);
  }

  async cambiarAsociacion(idImagen: number, asociacion: AsociacionImagen): Promise<ImagenProducto> {
    const fila = await prisma.imagen.update({
      where: { idImagen },
      data: { idVariante: asociacion.idVariante, idColor: asociacion.idColor },
      select: SELECCION_IMAGEN,
    });
    return aImagen(fila);
  }

  async obtenerDerivada(idImagen: number, tamano: TamanoDerivado): Promise<DerivadaGuardada | null> {
    // Solo se lee la columna pedida: jamás las tres a la vez.
    const f =
      tamano === 'miniatura'
        ? await prisma.imagen.findUnique({ where: { idImagen }, select: { miniatura: true } })
        : await prisma.imagen.findUnique({ where: { idImagen }, select: { mediana: true } });
    if (f === null) return null;
    const guardada = 'miniatura' in f ? f.miniatura : f.mediana;
    if (guardada !== null) return { derivada: Buffer.from(guardada), original: null };
    return { derivada: null, original: await this.obtenerBytes(idImagen) };
  }

  async guardarDerivada(idImagen: number, tamano: TamanoDerivado, bytes: Buffer): Promise<void> {
    await prisma.imagen.update({
      where: { idImagen },
      data: tamano === 'miniatura' ? { miniatura: new Uint8Array(bytes) } : { mediana: new Uint8Array(bytes) },
    });
  }

  async obtenerMeta(idImagen: number): Promise<MetaImagen | null> {
    return prisma.imagen.findUnique({
      where: { idImagen },
      select: { idImagen: true, idProducto: true, esPrincipal: true },
    });
  }

  async obtenerBytes(idImagen: number): Promise<ImagenBytes | null> {
    const f = await prisma.imagen.findUnique({ where: { idImagen }, select: { datos: true, mimeType: true } });
    return f === null ? null : { bytes: Buffer.from(f.datos), mimeType: f.mimeType as ImagenBytes['mimeType'] };
  }

  async ordenar(idProducto: number, idsOrdenados: readonly number[]): Promise<ImagenProducto[]> {
    await prisma.$transaction(
      idsOrdenados.map((idImagen, indice) => prisma.imagen.update({ where: { idImagen }, data: { orden: indice } })),
    );
    return this.listar(idProducto);
  }

  async marcarPrincipal(idImagen: number): Promise<ImagenProducto> {
    const fila = await prisma.$transaction(async (tx) => {
      const { idProducto } = await tx.imagen.findUniqueOrThrow({ where: { idImagen }, select: { idProducto: true } });
      // El índice único admite una sola principal: primero se quita la actual.
      await tx.imagen.updateMany({ where: { idProducto, esPrincipal: true }, data: { esPrincipal: false } });
      return tx.imagen.update({ where: { idImagen }, data: { esPrincipal: true }, select: SELECCION_IMAGEN });
    });
    return aImagen(fila);
  }

  async eliminar(idImagen: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const borrada = await tx.imagen.delete({ where: { idImagen }, select: { idProducto: true, esPrincipal: true } });
      if (!borrada.esPrincipal) return;
      const siguiente = await tx.imagen.findFirst({
        where: { idProducto: borrada.idProducto },
        select: { idImagen: true },
        orderBy: ORDEN_GALERIA,
      });
      if (siguiente !== null) {
        await tx.imagen.update({ where: { idImagen: siguiente.idImagen }, data: { esPrincipal: true } });
      }
    });
  }
}
