import { PrismaClient } from '@prisma/client';
import type { OrdenesPortM11 } from '../interfaces/postventa.interface';

export class PrismaOrdenesAdapterM11 implements OrdenesPortM11 {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerOrdenParaPostventa(codigoOrden: string) {
    const orden = await this.prisma.orden.findUnique({
      where: { codigoVisible: codigoOrden },
      include: {
        lineas: true,
      },
    });

    if (!orden) return null;

    return {
      idOrden: orden.idOrden,
      codigoVisible: orden.codigoVisible,
      idUsuario: orden.idUsuario,
      estado: orden.estado,
      fecha: orden.fecha,
      total: Number(orden.total),
      lineas: orden.lineas.map((l) => ({
        idLineaOrden: l.idLineaOrden,
        nombreProducto: l.nombreProducto,
        varianteCopia: l.varianteCopia,
        cantidad: l.cantidad,
        precioAplicado: Number(l.precioAplicado),
        esEntonado: l.esEntonado,
        skuVendido: l.skuVendido,
        colorSolicitado: l.colorSolicitado,
      })),
    };
  }

  async actualizarEstadoOrden(
    codigoOrden: string,
    estadoActual: string,
    estadoNuevo: 'cancelado' | 'devuelto',
    motivo: string,
    idUsuarioAutor: number
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findUnique({
        where: { codigoVisible: codigoOrden },
      });

      if (!orden) return;

      await tx.orden.update({
        where: { codigoVisible: codigoOrden },
        data: {
          estado: estadoNuevo,
        },
      });

      await tx.historialEstadoOrden.create({
        data: {
          idOrden: orden.idOrden,
          estadoAnterior: orden.estado,
          estadoNuevo,
          idUsuarioAutor,
          motivo,
        },
      });
    });
  }
}
