import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';
import type { CreacionRepository, CreacionTx, OrdenCreada, OrdenExistente } from '../interfaces/ordenes.interface';

const NOMBRE_CONSECUTIVO = 'orden';
/** La orden nace ya en revisión de disponibilidad: es donde el personal confirma que hay producto (HU-ORD-03). */
const ESTADO_INICIAL = 'revision_disponibilidad' as const;
const LIMITES_TRANSACCION = { esperaConexionMs: 5_000, duracionMs: 15_000 } as const;

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

const SELECCION_EXISTENTE = {
  codigoVisible: true,
  estado: true,
  codigoSolicitud: true,
  transaccionPagoId: true,
  idUsuario: true,
} satisfies Prisma.OrdenSelect;

function aOrdenExistente(fila: Prisma.OrdenGetPayload<{ select: typeof SELECCION_EXISTENTE }>): OrdenExistente {
  return {
    ...aOrdenCreada(fila),
    codigoSolicitud: fila.codigoSolicitud,
    transaccionPagoId: fila.transaccionPagoId,
    idUsuario: fila.idUsuario,
  };
}

class PrismaCreacionTx implements CreacionTx {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async bloquearConsecutivo(): Promise<void> {
    // Si otra creación tiene el bloqueo más de ESPERA_BLOQUEO, falla en vez de encolar ventas sin límite:
    // la cola de M07 (ADR-03) reintenta. `SET LOCAL` vale solo para esta transacción.
    await this.tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

    // Caso normal: la fila ya existe. Se bloquea sin leer la tabla `orden`.
    const bloqueadas = await this.tx.$queryRaw<Array<{ id_consecutivo: number }>>`
      SELECT id_consecutivo FROM consecutivo WHERE nombre = ${NOMBRE_CONSECUTIVO} FOR UPDATE`;
    if (bloqueadas.length > 0) return;

    // Primera creación: arranca después del mayor consecutivo ya usado (p. ej. órdenes del seed). Es la
    // única vez que se recorre `orden`; el INSERT espera a otro que lo haga a la vez y no duplica.
    await this.tx.$executeRaw`
      INSERT INTO consecutivo (nombre, ultimo_valor)
      SELECT ${NOMBRE_CONSECUTIVO}, COALESCE(MAX(CAST(split_part(codigo_visible, '-', 3) AS BIGINT)), 0)
      FROM orden
      WHERE codigo_visible ~ '^PC-[0-9]{4}-[0-9]+$'
      ON CONFLICT (nombre) DO NOTHING`;
    await this.tx.$queryRaw`SELECT id_consecutivo FROM consecutivo WHERE nombre = ${NOMBRE_CONSECUTIVO} FOR UPDATE`;
  }

  async buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenExistente | null> {
    const fila = await this.tx.orden.findFirst({
      where: { OR: [{ codigoSolicitud }, { transaccionPagoId }] },
      select: SELECCION_EXISTENTE,
    });
    return fila ? aOrdenExistente(fila) : null;
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
          estado: ESTADO_INICIAL,
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
          historial: { create: { estadoAnterior: null, estadoNuevo: ESTADO_INICIAL, idUsuarioAutor: null } },
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
    // Todas las creaciones se serializan por el bloqueo del consecutivo (numeración sin huecos): la
    // transacción debe ser corta y tener tope, para que una colgada no detenga las ventas.
    return prisma.$transaction((px) => trabajo(new PrismaCreacionTx(px)), {
      maxWait: LIMITES_TRANSACCION.esperaConexionMs,
      timeout: LIMITES_TRANSACCION.duracionMs,
    });
  }

  async buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenExistente | null> {
    const fila = await prisma.orden.findFirst({
      where: { OR: [{ codigoSolicitud }, { transaccionPagoId }] },
      select: SELECCION_EXISTENTE,
    });
    return fila ? aOrdenExistente(fila) : null;
  }
}
