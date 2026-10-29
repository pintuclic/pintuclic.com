import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  CarritoGuardado,
  CarritoRepositoryPort,
  DuenoCarrito,
  LineaAcordadaNueva,
  LineaNueva,
  PlanUnion,
} from '../interfaces/carrito.interface';

const SELECCION_CARRITO = {
  idCarrito: true,
  fechaUltimaActividad: true,
  lineas: {
    select: { idLineaCarrito: true, idVariante: true, idColor: true, cantidad: true, idCotizacion: true, precioAcordado: true },
    orderBy: { idLineaCarrito: 'asc' },
  },
} satisfies Prisma.CarritoSelect;

type CarritoDb = Prisma.CarritoGetPayload<{ select: typeof SELECCION_CARRITO }>;

function aDominio(c: CarritoDb): CarritoGuardado {
  return {
    idCarrito: c.idCarrito,
    fechaUltimaActividad: c.fechaUltimaActividad,
    lineas: c.lineas.map((l) => ({
      idLinea: l.idLineaCarrito,
      idVariante: l.idVariante,
      idColor: l.idColor,
      cantidad: l.cantidad,
      idCotizacion: l.idCotizacion,
      precioAcordado: l.precioAcordado === null ? null : Number(l.precioAcordado),
    })),
  };
}

function filtroDueno(dueno: DuenoCarrito): Prisma.CarritoWhereUniqueInput {
  return dueno.tipo === 'cuenta' ? { idUsuario: dueno.idUsuario } : { tokenVisitante: dueno.hashToken };
}

function esConflictoUnico(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Única zona de M05 que habla con la base. */
export class CarritoRepository implements CarritoRepositoryPort {
  async buscar(dueno: DuenoCarrito): Promise<CarritoGuardado | null> {
    const c = await prisma.carrito.findUnique({ where: filtroDueno(dueno), select: SELECCION_CARRITO });
    return c === null ? null : aDominio(c);
  }

  async crear(dueno: DuenoCarrito): Promise<CarritoGuardado> {
    try {
      const c = await prisma.carrito.create({
        data: dueno.tipo === 'cuenta' ? { idUsuario: dueno.idUsuario } : { tokenVisitante: dueno.hashToken },
        select: SELECCION_CARRITO,
      });
      return aDominio(c);
    } catch (err: unknown) {
      // Dos pedidos a la vez del mismo dueño: el segundo usa el que creó el primero.
      if (!esConflictoUnico(err)) throw err;
      const existente = await this.buscar(dueno);
      if (existente === null) throw err;
      return existente;
    }
  }

  async guardarLinea(idCarrito: number, linea: LineaNueva): Promise<void> {
    const existente = await prisma.lineaCarrito.findFirst({
      where: { idCarrito, idVariante: linea.idVariante, idColor: linea.idColor },
      select: { idLineaCarrito: true },
    });
    if (existente !== null) {
      await prisma.lineaCarrito.update({
        where: { idLineaCarrito: existente.idLineaCarrito },
        data: { cantidad: linea.cantidad },
      });
      return;
    }
    try {
      await prisma.lineaCarrito.create({
        data: { idCarrito, idVariante: linea.idVariante, idColor: linea.idColor, cantidad: linea.cantidad },
      });
    } catch (err: unknown) {
      // `uq_carrito_variante_color`: otra pestaña creó la misma línea; gana la última escritura (C12).
      if (!esConflictoUnico(err)) throw err;
      await prisma.lineaCarrito.updateMany({
        where: { idCarrito, idVariante: linea.idVariante, idColor: linea.idColor },
        data: { cantidad: linea.cantidad },
      });
    }
  }

  async cambiarCantidad(idCarrito: number, idLinea: number, cantidad: number): Promise<boolean> {
    const r = await prisma.lineaCarrito.updateMany({
      where: { idLineaCarrito: idLinea, idCarrito },
      data: { cantidad },
    });
    return r.count > 0;
  }

  async quitarLinea(idCarrito: number, idLinea: number): Promise<boolean> {
    const r = await prisma.lineaCarrito.deleteMany({ where: { idLineaCarrito: idLinea, idCarrito } });
    return r.count > 0;
  }

  async vaciar(idCarrito: number): Promise<void> {
    await prisma.lineaCarrito.deleteMany({ where: { idCarrito } });
  }

  async registrarActividad(idCarrito: number): Promise<void> {
    await prisma.carrito.update({ where: { idCarrito }, data: { fechaUltimaActividad: new Date() } });
  }

  async pasarACuenta(idCarritoVisitante: number, idUsuario: number): Promise<void> {
    await prisma.carrito.update({
      where: { idCarrito: idCarritoVisitante },
      data: { idUsuario, tokenVisitante: null, fechaUltimaActividad: new Date() },
    });
  }

  async guardarLineasAcordadas(
    idCarrito: number,
    idCotizacion: number,
    lineas: readonly LineaAcordadaNueva[],
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const l of lineas) {
        const datos = { cantidad: l.cantidad, idCotizacion, precioAcordado: l.precioAcordado };
        const existente = await tx.lineaCarrito.findFirst({
          where: { idCarrito, idVariante: l.idVariante, idColor: l.idColor },
          select: { idLineaCarrito: true },
        });
        if (existente === null) {
          await tx.lineaCarrito.create({ data: { idCarrito, idVariante: l.idVariante, idColor: l.idColor, ...datos } });
        } else {
          await tx.lineaCarrito.update({ where: { idLineaCarrito: existente.idLineaCarrito }, data: datos });
        }
      }
      await tx.carrito.update({ where: { idCarrito }, data: { fechaUltimaActividad: new Date() } });
    });
  }

  async borrarVisitantesVencidos(antesDe: Date): Promise<number> {
    // Solo carritos de visitante: los de una cuenta no vencen. Las líneas caen en cascada.
    const r = await prisma.carrito.deleteMany({
      where: { idUsuario: null, tokenVisitante: { not: null }, fechaUltimaActividad: { lt: antesDe } },
    });
    return r.count;
  }

  async unir(plan: PlanUnion): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      // Se borra primero: si otra petición lo está uniendo, esta espera su bloqueo, no encuentra nada y no duplica
      // las líneas. Las líneas del visitante caen en cascada; el plan ya las trae.
      const borrado = await tx.carrito.deleteMany({ where: { idCarrito: plan.idCarritoVisitante, idUsuario: null } });
      if (borrado.count === 0) return false;
      for (const l of plan.actualizar) {
        await tx.lineaCarrito.updateMany({
          where: { idLineaCarrito: l.idLinea, idCarrito: plan.idCarritoCuenta },
          data: { cantidad: l.cantidad },
        });
      }
      if (plan.agregar.length > 0) {
        await tx.lineaCarrito.createMany({
          data: plan.agregar.map((l) => ({
            idCarrito: plan.idCarritoCuenta,
            idVariante: l.idVariante,
            idColor: l.idColor,
            cantidad: l.cantidad,
          })),
        });
      }
      await tx.carrito.update({
        where: { idCarrito: plan.idCarritoCuenta },
        data: { fechaUltimaActividad: new Date() },
      });
      return true;
    });
  }
}
