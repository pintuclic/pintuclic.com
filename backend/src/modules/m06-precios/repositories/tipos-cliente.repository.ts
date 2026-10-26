import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Estado } from '../dtos/m06-precios.dto';
import type { DatosTipoCliente, FilaTipoCliente, TiposClienteRepositoryPort } from '../interfaces/precios.interface';
import type { TipoClienteParaCalcular } from '../services/calculo';

const SELECCION = {
  idSubRolEmpresa: true,
  nombre: true,
  estado: true,
  descuento: true,
  _count: { select: { cuentas: true } },
} satisfies Prisma.SubRolEmpresaSelect;

type FilaPrisma = Prisma.SubRolEmpresaGetPayload<{ select: typeof SELECCION }>;

/** Un sub-rol sin política de descuento no es un tipo de cliente de M06: no se lista ni se calcula. */
function aFila(f: FilaPrisma): FilaTipoCliente | null {
  if (f.descuento === null) return null;
  return {
    idSubRolEmpresa: f.idSubRolEmpresa,
    nombre: f.nombre,
    idDescuento: f.descuento.idDescuento,
    porcentaje: Number(f.descuento.porcentajeDescuento),
    montoMinimoCompra: Number(f.descuento.montoMinimoCompra),
    tope: Number(f.descuento.tope),
    estado: f.estado,
    cuentasAsociadas: f._count.cuentas,
  };
}

const esViolacionDeUnicidad = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';

export class TiposClienteRepository implements TiposClienteRepositoryPort {
  async listar(): Promise<FilaTipoCliente[]> {
    const filas = await prisma.subRolEmpresa.findMany({ select: SELECCION, orderBy: { idSubRolEmpresa: 'asc' } });
    return filas.map(aFila).filter((f): f is FilaTipoCliente => f !== null);
  }

  async obtener(idSubRolEmpresa: number): Promise<FilaTipoCliente | null> {
    const f = await prisma.subRolEmpresa.findUnique({ where: { idSubRolEmpresa }, select: SELECCION });
    return f === null ? null : aFila(f);
  }

  async activoParaCalcular(idSubRolEmpresa: number): Promise<TipoClienteParaCalcular | null> {
    const f = await prisma.subRolEmpresa.findFirst({
      where: { idSubRolEmpresa, estado: 'activo', descuento: { is: { estado: 'activo' } } },
      select: SELECCION,
    });
    const fila = f === null ? null : aFila(f);
    return fila === null
      ? null
      : {
          idSubRolEmpresa: fila.idSubRolEmpresa,
          nombre: fila.nombre,
          porcentaje: fila.porcentaje,
          montoMinimoCompra: fila.montoMinimoCompra,
          tope: fila.tope,
        };
  }

  async nombreEnUso(nombre: string, exceptoId?: number): Promise<boolean> {
    const buscado = nombre.trim().toLowerCase();
    const filas = await prisma.subRolEmpresa.findMany({ select: { idSubRolEmpresa: true, nombre: true } });
    return filas.some((f) => f.idSubRolEmpresa !== exceptoId && f.nombre.trim().toLowerCase() === buscado);
  }

  async crear(datos: DatosTipoCliente): Promise<number | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const descuento = await tx.descuento.create({
          data: {
            porcentajeDescuento: datos.porcentaje,
            tope: datos.tope,
            montoMinimoCompra: datos.montoMinimoCompra,
            estado: 'activo',
          },
        });
        const sub = await tx.subRolEmpresa.create({
          data: { nombre: datos.nombre.trim(), idDescuento: descuento.idDescuento, estado: 'activo' },
        });
        return sub.idSubRolEmpresa;
      });
    } catch (e: unknown) {
      if (esViolacionDeUnicidad(e)) return null;
      throw e;
    }
  }

  async actualizar(idSubRolEmpresa: number, datos: DatosTipoCliente): Promise<'ok' | 'no_existe' | 'nombre_repetido'> {
    try {
      return await prisma.$transaction(async (tx) => {
        const actual = await tx.subRolEmpresa.findUnique({ where: { idSubRolEmpresa } });
        if (actual === null || actual.idDescuento === null) return 'no_existe' as const;
        await tx.descuento.update({
          where: { idDescuento: actual.idDescuento },
          data: { porcentajeDescuento: datos.porcentaje, tope: datos.tope, montoMinimoCompra: datos.montoMinimoCompra },
        });
        await tx.subRolEmpresa.update({ where: { idSubRolEmpresa }, data: { nombre: datos.nombre.trim() } });
        return 'ok' as const;
      });
    } catch (e: unknown) {
      if (esViolacionDeUnicidad(e)) return 'nombre_repetido';
      throw e;
    }
  }

  async cambiarEstado(idSubRolEmpresa: number, estado: Estado): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const actual = await tx.subRolEmpresa.findUnique({ where: { idSubRolEmpresa } });
      if (actual === null || actual.idDescuento === null) return false;
      await tx.subRolEmpresa.update({ where: { idSubRolEmpresa }, data: { estado } });
      await tx.descuento.update({ where: { idDescuento: actual.idDescuento }, data: { estado } });
      return true;
    });
  }
}
