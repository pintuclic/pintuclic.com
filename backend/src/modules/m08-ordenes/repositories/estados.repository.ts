import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { EstadoOrden } from '../dtos/m08-ordenes.dto';
import type {
  EstadosRepository,
  EstadosTx,
  FilaHistorialEstado,
  OrdenParaEstado,
} from '../interfaces/estados.interface';

class PrismaEstadosTx implements EstadosTx {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async buscarOrden(codigo: string): Promise<OrdenParaEstado | null> {
    const fila = await this.tx.orden.findUnique({
      where: { codigoVisible: codigo },
      select: { codigoVisible: true, estado: true, modoEntrega: true, idUsuario: true },
    });
    if (!fila) return null;
    return { codigo: fila.codigoVisible, estado: fila.estado, modoEntrega: fila.modoEntrega, idUsuario: fila.idUsuario };
  }

  async actualizarEstadoSiCoincide(codigo: string, desde: EstadoOrden, hacia: EstadoOrden): Promise<boolean> {
    // El filtro por estado hace de candado optimista: si otro lo cambió, no actualiza nada.
    const resultado = await this.tx.orden.updateMany({
      where: { codigoVisible: codigo, estado: desde },
      data: { estado: hacia },
    });
    return resultado.count === 1;
  }

  async registrarHistorial(fila: FilaHistorialEstado): Promise<void> {
    await this.tx.historialEstadoOrden.create({
      data: {
        orden: { connect: { codigoVisible: fila.codigo } },
        estadoAnterior: fila.estadoAnterior,
        estadoNuevo: fila.estadoNuevo,
        autor: { connect: { idUsuario: fila.idUsuarioAutor } },
        motivo: fila.motivo,
      },
    });
  }

  async reiniciarMarcasPreparadas(codigo: string, idUsuarioAutor: number): Promise<void> {
    const lineas = await this.tx.lineaOrden.findMany({
      where: { orden: { codigoVisible: codigo } },
      select: {
        idLineaOrden: true,
        verificaciones: { orderBy: { idVerificacionLineaOrden: 'desc' }, take: 1, select: { estado: true } },
      },
    });
    const preparadas = lineas.filter((l) => l.verificaciones[0]?.estado === 'preparada');
    if (preparadas.length === 0) return;
    await this.tx.verificacionLineaOrden.createMany({
      data: preparadas.map((l) => ({ idLineaOrden: l.idLineaOrden, estado: 'disponible' as const, idUsuarioAutor })),
    });
  }
}

/** Para quien ya abrió su propia transacción (M11 al aprobar una postventa). */
export function estadosTxDe(tx: Prisma.TransactionClient): EstadosTx {
  return new PrismaEstadosTx(tx);
}

export class PrismaEstadosRepository implements EstadosRepository {
  async enTransaccion<T>(trabajo: (tx: EstadosTx) => Promise<T>): Promise<T> {
    return prisma.$transaction((px) => trabajo(new PrismaEstadosTx(px)));
  }
}
