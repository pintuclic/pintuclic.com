import type { MedioContacto } from '../dtos/m08-ordenes.dto';
import type { ContactoOrdenDatos, NotaOrdenDatos } from './gestion.interface';

/** Notas y contactos son solo inserción (R11): no hay actualizar ni borrar. null = la orden no existe. */
export interface NotasRepository {
  agregarNota(codigo: string, idAutor: number, texto: string): Promise<NotaOrdenDatos | null>;
  agregarContacto(
    codigo: string,
    idAutor: number,
    medio: MedioContacto,
    detalle: string | null,
  ): Promise<ContactoOrdenDatos | null>;
}
