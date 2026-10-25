import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';
import type { CreacionRepository, CreacionTx, OrdenCreada } from '../interfaces/ordenes.interface';

const NOMBRE_CONSECUTIVO = 'orden';

/** Otra transacción creó antes una orden con el mismo `codigo_solicitud` o `transaccion_pago_id`. */
export class UnicidadOrdenError extends Error {
  constructor() {
    super('Ya existe una orden para esta solicitud o transacción de pago.');
    this.name = 'UnicidadOrdenError';
  }
}

function aOrdenCreada(fila: { codigoVisible: string; estado: OrdenCreada['estado'] }): OrdenCreada {
  return { codigo: fila.codigoVisible, estado: fila.estado };
}

class PrismaCreacionTx implements CreacionTx {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async bloquearConsecutivo(): Promise<void> {
    // Si la fila no existe arranca después del mayor consecutivo ya usado (p. ej. órdenes del seed).
    await this.tx.$executeRaw`
      INSERT INTO consecutivo (nombre, ultimo_valor)
      SELECT ${NOMBRE_CONSECUTIVO}, COALESCE(MAX(CAST(split_part(codigo_visible, '-', 3) AS BIGINT)), 0)
      FROM orden
      WHERE codigo_visible ~ '^PC-[0-9]{4}-[0-9]+$'
      ON CONFLICT (nombre) DO NOTHING`;
    await this.tx.$queryRaw`SELECT id_consecutivo FROM consecutivo WHERE nombre = ${NOMBRE_CONSECUTIVO} FOR UPDATE`;
  }

  async buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenCreada | null> {
    const fila = await this.tx.orden.findFirst({
      where: { OR: [{ codigoSolicitud }, { transaccionPagoId }] },
      select: { codigoVisible: true, estado: true },
    });
    return fila ? aOrdenCreada(fila) : null;
  }

  async avanzarConsecutivo(): Promise<number> {
    const fila = await this.tx.consecutivo.update({
      where: { nombre: NOMBRE_CONSECUTIVO },
      data: { ultimoValor: { increment: 1 } },
      select: { ultimoValor: true },
    });
    return Number(fila.ultimoValor);
  }

  async insertarOrden(codigo: string, entrada: SolicitudPagadaInput): Promise<OrdenCreada> {
    try {
      const fila = await this.tx.orden.create({
        data: {
          codigoVisible: codigo,
          idUsuario: entrada.idUsuario,
          origen: entrada.origen,
          idCotizacion: entrada.idCotizacion,
          estado: 'orden_confirmada',
          transaccionPagoId: entrada.transaccionPagoId,
          codigoSolicitud: entrada.codigoSolicitud,
          modoEntrega: entrada.modoEntrega,
          costoEntrega: entrada.costoEntrega,
          direccion: entrada.direccion,
          subTotal: entrada.subTotal,
          descuento: entrada.descuento,
          total: entrada.total,
          baseSinImpuesto: entrada.baseSinImpuesto,
          importeIva: entrada.importeIva,
          tasaIva: entrada.tasaIva,
          observaciones: entrada.observaciones,
          lineas: {
            create: entrada.lineas.map((linea) => ({
              nombreProducto: linea.nombreProducto,
              varianteCopia: linea.varianteCopia,
              colorSolicitado: linea.colorSolicitado,
              skuVendido: linea.skuVendido,
              cantidad: linea.cantidad,
              precioInicial: linea.precioInicial,
              precioAplicado: linea.precioAplicado,
              idVarianteRef: linea.idVarianteRef,
              esEntonado: linea.esEntonado,
              baseConsumida: linea.baseConsumida,
              descuentos: {
                create: linea.descuentos.map((d) => ({
                  ordenAplicacion: d.ordenAplicacion,
                  origen: d.origen,
                  porcentaje: d.porcentaje,
                  importe: d.importe,
                })),
              },
            })),
          },
          // Historial inicial: autor null = el sistema (D01 del DDL).
          historial: { create: { estadoAnterior: null, estadoNuevo: 'orden_confirmada', idUsuarioAutor: null } },
        },
        select: { codigoVisible: true, estado: true },
      });
      return aOrdenCreada(fila);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UnicidadOrdenError();
      }
      throw error;
    }
  }
}

export class PrismaCreacionRepository implements CreacionRepository {
  async enTransaccion<T>(trabajo: (tx: CreacionTx) => Promise<T>): Promise<T> {
    return prisma.$transaction((px) => trabajo(new PrismaCreacionTx(px)));
  }

  async buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenCreada | null> {
    const fila = await prisma.orden.findFirst({
      where: { OR: [{ codigoSolicitud }, { transaccionPagoId }] },
      select: { codigoVisible: true, estado: true },
    });
    return fila ? aOrdenCreada(fila) : null;
  }
}
