import { PrismaClient, type Prisma } from '@prisma/client';
import { estadosTxDe } from '../../m08-ordenes/repositories/estados.repository';
import { cambiarEstadoPorPostventa } from '../../m08-ordenes/services/estados.service';
import type { OrdenesPortM11 } from '../interfaces/postventa.interface';
import { ErrorPostventa } from '../services/reglas-postventa';

export class PrismaOrdenesAdapterM11 implements OrdenesPortM11 {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerOrdenParaPostventa(codigoOrden: string) {
    const orden = await this.prisma.orden.findUnique({
      where: { codigoVisible: codigoOrden },
      include: {
        lineas: true,
        // La última entrega (o despacho) registrada en el historial de M08 fija desde cuándo corren los plazos.
        historial: {
          where: { estadoNuevo: { in: ['entregado', 'despachado'] } },
          orderBy: { fecha: 'desc' },
          select: { estadoNuevo: true, fecha: true },
        },
      },
    });

    if (!orden) return null;

    const entrega =
      orden.historial.find((h) => h.estadoNuevo === 'entregado') ?? orden.historial[0] ?? null;

    return {
      idOrden: orden.idOrden,
      codigoVisible: orden.codigoVisible,
      idUsuario: orden.idUsuario,
      estado: orden.estado,
      fecha: orden.fecha,
      fechaEntrega: entrega?.fecha ?? null,
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

  /** RF-POS-05-03 y RF-POS-05-04: la regla, el candado y el historial son los de M08. */
  async cambiarEstadoOrden(
    tx: Prisma.TransactionClient,
    codigoOrden: string,
    estadoNuevo: 'cancelado' | 'devuelto',
    motivo: string,
    idUsuarioAutor: number
  ): Promise<void> {
    const r = await cambiarEstadoPorPostventa(estadosTxDe(tx), codigoOrden, estadoNuevo, motivo, idUsuarioAutor);
    if (r.ok) return;
    if (r.razon === 'NO_EXISTE') {
      throw new ErrorPostventa('RECURSO_NO_DISPONIBLE', 'La orden asociada ya no existe.', 404);
    }
    if (r.razon === 'ESTADO_CAMBIADO') {
      throw new ErrorPostventa(
        'ESTADO_CAMBIADO',
        'El pedido cambió de estado mientras se resolvía la solicitud. Recargue y vuelva a intentarlo.',
        409
      );
    }
    throw new ErrorPostventa(
      'ORDEN_NO_ELEGIBLE',
      estadoNuevo === 'cancelado'
        ? `El pedido ya está en "${r.estadoActual}" y no se puede cancelar. Rechace la solicitud e indique al cliente que pida una devolución al recibirlo.`
        : `El pedido está en "${r.estadoActual}" y no se puede marcar como devuelto.`,
      409
    );
  }
}
