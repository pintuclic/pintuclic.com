import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  ConsultaClienteRepository,
  DetalleOrdenDatos,
  FilaResumenOrden,
  FiltroMisPedidos,
} from '../interfaces/consulta-cliente.interface';

const SELECCION_RESUMEN = {
  codigoVisible: true,
  fecha: true,
  total: true,
  estado: true,
  modoEntrega: true,
} satisfies Prisma.OrdenSelect;

function aFilaResumen(fila: Prisma.OrdenGetPayload<{ select: typeof SELECCION_RESUMEN }>): FilaResumenOrden {
  return {
    codigo: fila.codigoVisible,
    fecha: fila.fecha,
    total: fila.total.toNumber(),
    estado: fila.estado,
    modoEntrega: fila.modoEntrega,
  };
}

export class PrismaConsultaClienteRepository implements ConsultaClienteRepository {
  async listarPorUsuario(
    idUsuario: number,
    filtro: FiltroMisPedidos,
  ): Promise<{ filas: FilaResumenOrden[]; total: number }> {
    const where: Prisma.OrdenWhereInput = {
      idUsuario,
      ...(filtro.q === undefined
        ? {}
        : {
            OR: [
              { codigoVisible: { contains: filtro.q, mode: 'insensitive' } },
              { lineas: { some: { nombreProducto: { contains: filtro.q, mode: 'insensitive' } } } },
            ],
          }),
    };

    const [filas, total] = await prisma.$transaction([
      prisma.orden.findMany({
        where,
        select: SELECCION_RESUMEN,
        orderBy: [{ fecha: 'desc' }, { idOrden: 'desc' }],
        skip: (filtro.pagina - 1) * filtro.limite,
        take: filtro.limite,
      }),
      prisma.orden.count({ where }),
    ]);
    return { filas: filas.map(aFilaResumen), total };
  }

  async buscarDetalle(codigo: string): Promise<DetalleOrdenDatos | null> {
    const fila = await prisma.orden.findUnique({
      where: { codigoVisible: codigo },
      include: {
        lineas: {
          orderBy: { idLineaOrden: 'asc' },
          include: {
            descuentos: true,
            // R15: solo importa la última marca de M09.
            verificaciones: { orderBy: { idVerificacionLineaOrden: 'desc' }, take: 1, select: { estado: true } },
          },
        },
        historial: { orderBy: [{ fecha: 'asc' }, { idHistorialEstadoOrden: 'asc' }] },
      },
    });
    if (!fila) return null;

    return {
      ...aFilaResumen(fila),
      idUsuario: fila.idUsuario,
      origen: fila.origen,
      subTotal: fila.subTotal.toNumber(),
      descuento: fila.descuento.toNumber(),
      costoEntrega: fila.costoEntrega.toNumber(),
      baseSinImpuesto: fila.baseSinImpuesto?.toNumber() ?? null,
      importeIva: fila.importeIva?.toNumber() ?? null,
      tasaIva: fila.tasaIva?.toNumber() ?? null,
      lineas: fila.lineas.map((linea) => ({
        nombreProducto: linea.nombreProducto,
        varianteCopia: linea.varianteCopia,
        colorSolicitado: linea.colorSolicitado,
        skuVendido: linea.skuVendido,
        cantidad: linea.cantidad,
        precioInicial: linea.precioInicial?.toNumber() ?? null,
        precioAplicado: linea.precioAplicado.toNumber(),
        idVarianteRef: linea.idVarianteRef,
        ultimaMarca: linea.verificaciones[0]?.estado ?? null,
        descuentos: linea.descuentos.map((d) => ({
          ordenAplicacion: d.ordenAplicacion,
          origen: d.origen,
          porcentaje: d.porcentaje?.toNumber() ?? null,
          importe: d.importe.toNumber(),
        })),
      })),
      historial: fila.historial.map((h) => ({
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        fecha: h.fecha,
      })),
    };
  }
}
