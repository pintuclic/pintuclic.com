import { prisma } from '../../../core/db/client';
import type { MedioContacto } from '../dtos/m08-ordenes.dto';
import type { ContactoOrdenDatos, NotaOrdenDatos } from '../interfaces/gestion.interface';
import type { NotasRepository } from '../interfaces/notas.interface';

/**
 * Solo inserción (R11). Se comprueba primero que la orden existe: así `null` significa SIEMPRE «la orden no
 * existe». Un `connect` fallido del autor (sesión huérfana) no se disfraza de eso: sale como error y queda en
 * el registro del servidor.
 */
async function existeOrden(codigo: string): Promise<boolean> {
  const fila = await prisma.orden.findUnique({ where: { codigoVisible: codigo }, select: { idOrden: true } });
  return fila !== null;
}

export class PrismaNotasRepository implements NotasRepository {
  async agregarNota(codigo: string, idAutor: number, texto: string): Promise<NotaOrdenDatos | null> {
    if (!(await existeOrden(codigo))) return null;

    const fila = await prisma.notaOrden.create({
      data: { orden: { connect: { codigoVisible: codigo } }, autor: { connect: { idUsuario: idAutor } }, texto },
      include: { autor: { select: { nombre: true } } },
    });
    return { idNota: fila.idNotaOrden, texto: fila.texto, autor: fila.autor.nombre, fecha: fila.fecha };
  }

  async agregarContacto(
    codigo: string,
    idAutor: number,
    medio: MedioContacto,
    detalle: string | null,
  ): Promise<ContactoOrdenDatos | null> {
    if (!(await existeOrden(codigo))) return null;

    const fila = await prisma.contactoOrden.create({
      data: { orden: { connect: { codigoVisible: codigo } }, autor: { connect: { idUsuario: idAutor } }, medio, detalle },
      include: { autor: { select: { nombre: true } } },
    });
    // El medio ya viene validado por el contrato: se devuelve el recibido, sin reinterpretarlo tras guardar.
    return { idContacto: fila.idContactoOrden, medio, detalle: fila.detalle, autor: fila.autor.nombre, fecha: fila.fecha };
  }
}
