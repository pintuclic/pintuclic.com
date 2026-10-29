import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { PREFIJO_COMPROBANTE, type Comprobante } from '../dtos/m12-facturacion.dto';
import type {
  ComprobanteGuardado,
  ComprobantesRepositoryPort,
  NuevoComprobante,
  OrdenParaFacturar,
} from '../interfaces/facturacion.interface';

/** Fila de `consecutivo` de la numeración de comprobantes (R4): distinta de la de las órdenes. */
const NOMBRE_CONSECUTIVO = 'comprobante';
const DIGITOS_NUMERO = 6;

const num = (d: Prisma.Decimal): number => Number(d);

const SELECCION_COMPROBANTE = {
  numero: true,
  fechaEmision: true,
  vendedorRazonSocial: true,
  vendedorNit: true,
  vendedorRegimen: true,
  vendedorDireccion: true,
  vendedorCiudad: true,
  vendedorTelefono: true,
  vendedorCorreo: true,
  compradorNombre: true,
  compradorDocumento: true,
  compradorCorreo: true,
  compradorTelefono: true,
  compradorDireccion: true,
  subtotal: true,
  descuento: true,
  envio: true,
  baseSinIva: true,
  tasaIva: true,
  iva: true,
  total: true,
  pieLegal: true,
  orden: { select: { codigoVisible: true, idUsuario: true } },
  lineas: { orderBy: { orden: 'asc' }, select: { descripcion: true, presentacion: true, color: true, cantidad: true, precioUnitario: true, descuentoUnitario: true, totalLinea: true } },
} satisfies Prisma.ComprobanteVentaSelect;

type FilaComprobante = Prisma.ComprobanteVentaGetPayload<{ select: typeof SELECCION_COMPROBANTE }>;

function aComprobante(f: FilaComprobante): Comprobante {
  return {
    numero: f.numero,
    codigoOrden: f.orden.codigoVisible,
    fechaEmision: f.fechaEmision.toISOString(),
    vendedor: {
      razonSocial: f.vendedorRazonSocial,
      nit: f.vendedorNit,
      regimen: f.vendedorRegimen,
      direccion: f.vendedorDireccion,
      ciudad: f.vendedorCiudad,
      telefono: f.vendedorTelefono,
      correo: f.vendedorCorreo,
    },
    comprador: {
      nombre: f.compradorNombre,
      documento: f.compradorDocumento,
      correo: f.compradorCorreo,
      telefono: f.compradorTelefono,
      direccion: f.compradorDireccion,
    },
    lineas: f.lineas.map((l) => ({
      descripcion: l.descripcion,
      presentacion: l.presentacion,
      color: l.color,
      cantidad: l.cantidad,
      precioUnitario: num(l.precioUnitario),
      descuentoUnitario: num(l.descuentoUnitario),
      totalLinea: num(l.totalLinea),
    })),
    subtotal: num(f.subtotal),
    descuento: num(f.descuento),
    envio: num(f.envio),
    baseSinIva: num(f.baseSinIva),
    tasaIva: num(f.tasaIva),
    iva: num(f.iva),
    total: num(f.total),
    pieLegal: f.pieLegal,
  };
}

export class ComprobantesRepository implements ComprobantesRepositoryPort {
  async buscarPorCodigoOrden(codigoOrden: string): Promise<Omit<ComprobanteGuardado, 'creado'> | null> {
    const fila = await prisma.comprobanteVenta.findFirst({ where: { orden: { codigoVisible: codigoOrden } }, select: SELECCION_COMPROBANTE });
    return fila === null ? null : { comprobante: aComprobante(fila), idUsuarioTitular: fila.orden.idUsuario };
  }

  async leerOrdenParaFacturar(codigoOrden: string): Promise<OrdenParaFacturar | null> {
    const o = await prisma.orden.findUnique({
      where: { codigoVisible: codigoOrden },
      select: {
        idOrden: true,
        codigoVisible: true,
        idUsuario: true,
        direccion: true,
        costoEntrega: true,
        subTotal: true,
        descuento: true,
        total: true,
        baseSinImpuesto: true,
        importeIva: true,
        tasaIva: true,
        usuario: { select: { nombre: true, correo: true, telefono: true, cuentaEmpresa: { select: { nit: true, nombreEmpresa: true } } } },
        lineas: { orderBy: { idLineaOrden: 'asc' }, select: { nombreProducto: true, varianteCopia: true, colorSolicitado: true, cantidad: true, precioAplicado: true, precioInicial: true } },
      },
    });
    if (o === null || o.lineas.length === 0) return null;
    return {
      idOrden: o.idOrden,
      codigo: o.codigoVisible,
      idUsuario: o.idUsuario,
      direccion: o.direccion,
      costoEntrega: num(o.costoEntrega),
      subTotal: num(o.subTotal),
      descuento: num(o.descuento),
      total: num(o.total),
      baseSinImpuesto: o.baseSinImpuesto === null ? null : num(o.baseSinImpuesto),
      importeIva: o.importeIva === null ? null : num(o.importeIva),
      tasaIva: o.tasaIva === null ? null : num(o.tasaIva),
      comprador: {
        nombre: o.usuario.nombre,
        correo: o.usuario.correo,
        telefono: o.usuario.telefono,
        empresa: o.usuario.cuentaEmpresa === null ? null : { nit: o.usuario.cuentaEmpresa.nit, nombreEmpresa: o.usuario.cuentaEmpresa.nombreEmpresa },
      },
      lineas: o.lineas.map((l) => ({
        nombreProducto: l.nombreProducto,
        varianteCopia: l.varianteCopia,
        colorSolicitado: l.colorSolicitado,
        cantidad: l.cantidad,
        precioAplicado: num(l.precioAplicado),
        precioInicial: l.precioInicial === null ? null : num(l.precioInicial),
      })),
    };
  }

  async crear(nuevo: NuevoComprobante): Promise<ComprobanteGuardado> {
    try {
      const id = await prisma.$transaction(
        async (tx) => {
          // R4: el número sale de `consecutivo` con su fila bloqueada, en la misma transacción que el comprobante: sin
          // saltos aunque algo falle, y sin dos comprobantes con el mismo número.
          await tx.$executeRaw`INSERT INTO consecutivo (nombre, ultimo_valor) VALUES (${NOMBRE_CONSECUTIVO}, 0) ON CONFLICT (nombre) DO NOTHING`;
          const fila = await tx.consecutivo.update({
            where: { nombre: NOMBRE_CONSECUTIVO },
            data: { ultimoValor: { increment: 1 } },
            select: { ultimoValor: true },
          });
          const numero = `${PREFIJO_COMPROBANTE}-${String(fila.ultimoValor).padStart(DIGITOS_NUMERO, '0')}`;
          const creado = await tx.comprobanteVenta.create({
            data: {
              numero,
              idOrden: nuevo.idOrden,
              vendedorRazonSocial: nuevo.vendedor.razonSocial,
              vendedorNit: nuevo.vendedor.nit,
              vendedorRegimen: nuevo.vendedor.regimen,
              vendedorDireccion: nuevo.vendedor.direccion,
              vendedorCiudad: nuevo.vendedor.ciudad,
              vendedorTelefono: nuevo.vendedor.telefono,
              vendedorCorreo: nuevo.vendedor.correo,
              compradorNombre: nuevo.comprador.nombre,
              compradorDocumento: nuevo.comprador.documento,
              compradorCorreo: nuevo.comprador.correo,
              compradorTelefono: nuevo.comprador.telefono,
              compradorDireccion: nuevo.comprador.direccion,
              subtotal: nuevo.subtotal,
              descuento: nuevo.descuento,
              envio: nuevo.envio,
              baseSinIva: nuevo.baseSinIva,
              tasaIva: nuevo.tasaIva,
              iva: nuevo.iva,
              total: nuevo.total,
              pieLegal: nuevo.pieLegal,
              lineas: {
                create: nuevo.lineas.map((l, i) => ({
                  orden: i + 1,
                  descripcion: l.descripcion,
                  presentacion: l.presentacion,
                  color: l.color,
                  cantidad: l.cantidad,
                  precioUnitario: l.precioUnitario,
                  descuentoUnitario: l.descuentoUnitario,
                  totalLinea: l.totalLinea,
                })),
              },
            },
            select: { idComprobante: true },
          });
          return creado.idComprobante;
        },
        { maxWait: 5000, timeout: 10000 },
      );
      const guardado = await prisma.comprobanteVenta.findUniqueOrThrow({ where: { idComprobante: id }, select: SELECCION_COMPROBANTE });
      return { comprobante: aComprobante(guardado), idUsuarioTitular: guardado.orden.idUsuario, creado: true };
    } catch (error) {
      // R1: otro intento emitió el comprobante de esta orden a la vez (id_orden único): se devuelve ese, sin número gastado.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existente = await this.buscarPorCodigoOrden(nuevo.codigoOrden);
        if (existente !== null) return { ...existente, creado: false };
      }
      throw error;
    }
  }
}
