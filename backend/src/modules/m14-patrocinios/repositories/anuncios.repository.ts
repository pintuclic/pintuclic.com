import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Estado } from '../dtos/m14-patrocinios.dto';
import type {
  AnunciosRepositoryPort,
  DatosAnuncio,
  FilaAnuncio,
  ImagenBytes,
  ImagenPreparada,
  TamanoImagen,
  VarianteImagen,
} from '../interfaces/patrocinios.interface';
import { columnaDeFecha, fechaDeColumna } from '../services/fechas';

/** Nunca se trae el contenido de las imágenes en las consultas de datos: solo se necesita saber si hay móvil. */
const SELECCION = {
  idAnuncio: true,
  nombre: true,
  anunciante: true,
  espacio: true,
  textoAlternativo: true,
  enlace: true,
  estado: true,
  fechaInicio: true,
  fechaFin: true,
  orden: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  usuarioActualizo: { select: { nombre: true } },
  imagenes: { where: { variante: 'movil', tamano: 'original' }, select: { variante: true } },
} satisfies Prisma.AnuncioPublicitarioSelect;

type FilaPrisma = Prisma.AnuncioPublicitarioGetPayload<{ select: typeof SELECCION }>;

function aFila(f: FilaPrisma): FilaAnuncio {
  return {
    idAnuncio: f.idAnuncio,
    nombre: f.nombre,
    anunciante: f.anunciante,
    espacio: f.espacio,
    textoAlternativo: f.textoAlternativo,
    enlace: f.enlace,
    estado: f.estado,
    fechaInicio: fechaDeColumna(f.fechaInicio),
    fechaFin: fechaDeColumna(f.fechaFin),
    orden: f.orden,
    tieneImagenMovil: f.imagenes.length > 0,
    fechaCreacion: f.fechaCreacion,
    fechaActualizacion: f.fechaActualizacion,
    actualizadoPor: f.usuarioActualizo?.nombre ?? null,
  };
}

/** Tres filas por imagen subida: el original y las dos reducidas. */
function filasImagen(idAnuncio: number, i: ImagenPreparada): Prisma.AnuncioImagenCreateManyInput[] {
  return [
    { idAnuncio, variante: i.variante, tamano: 'original', contenido: new Uint8Array(i.original.bytes), mimeType: i.mimeType, ancho: i.original.ancho, alto: i.original.alto },
    { idAnuncio, variante: i.variante, tamano: 'mediano', contenido: new Uint8Array(i.mediano.bytes), mimeType: 'image/webp', ancho: i.mediano.ancho, alto: i.mediano.alto },
    { idAnuncio, variante: i.variante, tamano: 'pequeno', contenido: new Uint8Array(i.pequeno.bytes), mimeType: 'image/webp', ancho: i.pequeno.ancho, alto: i.pequeno.alto },
  ];
}

export class AnunciosRepository implements AnunciosRepositoryPort {
  async listarTodos(): Promise<FilaAnuncio[]> {
    const filas = await prisma.anuncioPublicitario.findMany({ select: SELECCION, orderBy: { idAnuncio: 'desc' } });
    return filas.map(aFila);
  }

  async vigentes(espacio: DatosAnuncio['espacio'], hoy: string, limite: number): Promise<FilaAnuncio[]> {
    const dia = columnaDeFecha(hoy);
    const filas = await prisma.anuncioPublicitario.findMany({
      where: { espacio, estado: 'activo', fechaInicio: { lte: dia }, fechaFin: { gte: dia } },
      select: SELECCION,
      orderBy: [{ orden: 'asc' }, { idAnuncio: 'asc' }],
      take: limite,
    });
    return filas.map(aFila);
  }

  async obtener(idAnuncio: number): Promise<FilaAnuncio | null> {
    const fila = await prisma.anuncioPublicitario.findUnique({ where: { idAnuncio }, select: SELECCION });
    return fila === null ? null : aFila(fila);
  }

  async crear(datos: DatosAnuncio, imagenes: readonly ImagenPreparada[], idUsuario: number): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const anuncio = await tx.anuncioPublicitario.create({
        data: {
          nombre: datos.nombre,
          anunciante: datos.anunciante,
          espacio: datos.espacio,
          textoAlternativo: datos.textoAlternativo,
          enlace: datos.enlace,
          fechaInicio: columnaDeFecha(datos.fechaInicio),
          fechaFin: columnaDeFecha(datos.fechaFin),
          orden: datos.orden,
          idUsuarioActualizo: idUsuario,
        },
        select: { idAnuncio: true },
      });
      await tx.anuncioImagen.createMany({ data: imagenes.flatMap((i) => filasImagen(anuncio.idAnuncio, i)) });
      return anuncio.idAnuncio;
    });
  }

  async reemplazar(
    idAnuncio: number,
    datos: Omit<DatosAnuncio, 'espacio'>,
    imagenes: readonly ImagenPreparada[],
    quitarMovil: boolean,
    idUsuario: number,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existe = await tx.anuncioPublicitario.findUnique({ where: { idAnuncio }, select: { idAnuncio: true } });
      if (existe === null) return false;
      const variantes = imagenes.map((i) => i.variante);
      if (quitarMovil) variantes.push('movil');
      if (variantes.length > 0) await tx.anuncioImagen.deleteMany({ where: { idAnuncio, variante: { in: variantes } } });
      if (imagenes.length > 0) await tx.anuncioImagen.createMany({ data: imagenes.flatMap((i) => filasImagen(idAnuncio, i)) });
      await tx.anuncioPublicitario.update({
        where: { idAnuncio },
        data: {
          nombre: datos.nombre,
          anunciante: datos.anunciante,
          textoAlternativo: datos.textoAlternativo,
          enlace: datos.enlace,
          fechaInicio: columnaDeFecha(datos.fechaInicio),
          fechaFin: columnaDeFecha(datos.fechaFin),
          orden: datos.orden,
          idUsuarioActualizo: idUsuario,
          fechaActualizacion: new Date(),
        },
      });
      return true;
    });
  }

  async cambiarEstado(idAnuncio: number, estado: Estado, idUsuario: number): Promise<boolean> {
    const { count } = await prisma.anuncioPublicitario.updateMany({
      where: { idAnuncio },
      data: { estado, idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
    });
    return count > 0;
  }

  async imagen(idAnuncio: number, variante: VarianteImagen, tamano: TamanoImagen): Promise<ImagenBytes | null> {
    const fila = await prisma.anuncioImagen.findUnique({
      where: { idAnuncio_variante_tamano: { idAnuncio, variante, tamano } },
      select: { contenido: true, mimeType: true },
    });
    return fila === null ? null : { bytes: Buffer.from(fila.contenido), mimeType: fila.mimeType };
  }
}
