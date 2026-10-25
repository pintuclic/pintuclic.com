import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { ImagenProducto } from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes } from '../interfaces/catalogo.interface';
import type { ImagenesRepositoryPort, MetaImagen } from '../interfaces/imagenes.interface';

/** Nunca se leen los bytes salvo en `obtenerBytes`. */
export const SELECCION_IMAGEN = {
  idImagen: true,
  orden: true,
  esPrincipal: true,
  mimeType: true,
} satisfies Prisma.ImagenSelect;

export const ORDEN_GALERIA = [{ orden: 'asc' }, { idImagen: 'asc' }] satisfies Prisma.ImagenOrderByWithRelationInput[];

type FilaImagen = Prisma.ImagenGetPayload<{ select: typeof SELECCION_IMAGEN }>;

export function aImagen(f: FilaImagen): ImagenProducto {
  return {
    idImagen: f.idImagen,
    orden: f.orden,
    esPrincipal: f.esPrincipal,
    mimeType: f.mimeType as ImagenProducto['mimeType'],
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

  async crear(idProducto: number, bytes: Buffer, mimeType: ImagenBytes['mimeType']): Promise<ImagenProducto> {
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
          mimeType,
          orden: (ultima._max.orden ?? -1) + 1,
          esPrincipal: ultima._count._all === 0,
        },
        select: SELECCION_IMAGEN,
      });
    });
    return aImagen(fila);
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
