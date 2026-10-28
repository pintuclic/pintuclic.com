import { prisma } from '../../../core/db/client';
import type { ContactoAdminEntity, EditarContactoRequest } from '../dtos/m16-contenido.dto';
import type { ContactoRepositoryPort } from '../interfaces/contenido.interface';

/** La ficha de contacto es una sola fila (id = 1): se crea al guardar por primera vez. */
const ID_CONTACTO = 1;

const SELECCION = {
  direccion: true,
  telefono: true,
  correo: true,
  facebook: true,
  instagram: true,
  youtube: true,
  tiktok: true,
  fechaActualizacion: true,
  usuarioActualizo: { select: { nombre: true } },
} as const;

const VACIA: ContactoAdminEntity = {
  direccion: null,
  telefono: null,
  correo: null,
  facebook: null,
  instagram: null,
  youtube: null,
  tiktok: null,
  fechaActualizacion: null,
  actualizadoPor: null,
};

export class ContactoRepository implements ContactoRepositoryPort {
  async obtener(): Promise<ContactoAdminEntity> {
    const fila = await prisma.contactoInstitucional.findUnique({ where: { idContacto: ID_CONTACTO }, select: SELECCION });
    if (fila === null) return VACIA;
    const { usuarioActualizo, fechaActualizacion, ...campos } = fila;
    return { ...campos, fechaActualizacion: fechaActualizacion.toISOString(), actualizadoPor: usuarioActualizo?.nombre ?? null };
  }

  async guardar(datos: EditarContactoRequest, idAutor: number | null): Promise<ContactoAdminEntity> {
    const valores = { ...datos, idUsuarioActualizo: idAutor, fechaActualizacion: new Date() };
    await prisma.contactoInstitucional.upsert({
      where: { idContacto: ID_CONTACTO },
      create: { idContacto: ID_CONTACTO, ...valores },
      update: valores,
    });
    return this.obtener();
  }
}
