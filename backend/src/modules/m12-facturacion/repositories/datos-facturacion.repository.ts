import { prisma } from '../../../core/db/client';
import type { DatosFacturacion, EditarDatosFacturacionRequest } from '../dtos/m12-facturacion.dto';
import type { DatosFacturacionRepositoryPort } from '../interfaces/facturacion.interface';

/** La ficha del vendedor es una sola fila (id = 1): se crea al guardar por primera vez. */
const ID_DATOS = 1;

const SELECCION = {
  razonSocial: true,
  nit: true,
  regimen: true,
  direccion: true,
  ciudad: true,
  telefono: true,
  correo: true,
  pieLegal: true,
  fechaActualizacion: true,
  usuarioActualizo: { select: { nombre: true } },
} as const;

/** R6: qué falta para poder emitir. */
export function faltantesDe(f: { razonSocial: string | null; nit: string | null; direccion: string | null }): DatosFacturacion['faltantes'] {
  const faltantes: DatosFacturacion['faltantes'] = [];
  if (f.razonSocial === null) faltantes.push('razonSocial');
  if (f.nit === null) faltantes.push('nit');
  if (f.direccion === null) faltantes.push('direccion');
  return faltantes;
}

const VACIA: DatosFacturacion = {
  razonSocial: null,
  nit: null,
  regimen: null,
  direccion: null,
  ciudad: null,
  telefono: null,
  correo: null,
  pieLegal: null,
  faltantes: ['razonSocial', 'nit', 'direccion'],
  fechaActualizacion: null,
  actualizadoPor: null,
};

export class DatosFacturacionRepository implements DatosFacturacionRepositoryPort {
  async obtener(): Promise<DatosFacturacion> {
    const fila = await prisma.datosFacturacion.findUnique({ where: { idDatos: ID_DATOS }, select: SELECCION });
    if (fila === null) return VACIA;
    const { usuarioActualizo, fechaActualizacion, ...campos } = fila;
    return { ...campos, faltantes: faltantesDe(campos), fechaActualizacion: fechaActualizacion.toISOString(), actualizadoPor: usuarioActualizo?.nombre ?? null };
  }

  async guardar(datos: EditarDatosFacturacionRequest, idAutor: number | null): Promise<DatosFacturacion> {
    const valores = { ...datos, idUsuarioActualizo: idAutor, fechaActualizacion: new Date() };
    await prisma.datosFacturacion.upsert({
      where: { idDatos: ID_DATOS },
      create: { idDatos: ID_DATOS, ...valores },
      update: valores,
    });
    return this.obtener();
  }
}
