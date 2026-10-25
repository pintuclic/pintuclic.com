import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { medioContactoSchema, type MedioContacto } from '../dtos/m08-ordenes.dto';
import type { ContactoOrdenDatos, NotaOrdenDatos } from '../interfaces/gestion.interface';
import type { NotasRepository } from '../interfaces/notas.interface';

/** `connect` sobre una orden inexistente lanza P2025: es el «no existe» que el servicio traduce a 404. */
function esOrdenInexistente(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export class PrismaNotasRepository implements NotasRepository {
  async agregarNota(codigo: string, idAutor: number, texto: string): Promise<NotaOrdenDatos | null> {
    try {
      const fila = await prisma.notaOrden.create({
        data: { orden: { connect: { codigoVisible: codigo } }, autor: { connect: { idUsuario: idAutor } }, texto },
        include: { autor: { select: { nombre: true } } },
      });
      return { idNota: fila.idNotaOrden, texto: fila.texto, autor: fila.autor.nombre, fecha: fila.fecha };
    } catch (error) {
      if (esOrdenInexistente(error)) return null;
      throw error;
    }
  }

  async agregarContacto(
    codigo: string,
    idAutor: number,
    medio: MedioContacto,
    detalle: string | null,
  ): Promise<ContactoOrdenDatos | null> {
    try {
      const fila = await prisma.contactoOrden.create({
        data: { orden: { connect: { codigoVisible: codigo } }, autor: { connect: { idUsuario: idAutor } }, medio, detalle },
        include: { autor: { select: { nombre: true } } },
      });
      return {
        idContacto: fila.idContactoOrden,
        medio: medioContactoSchema.parse(fila.medio),
        detalle: fila.detalle,
        autor: fila.autor.nombre,
        fecha: fila.fecha,
      };
    } catch (error) {
      if (esOrdenInexistente(error)) return null;
      throw error;
    }
  }
}
