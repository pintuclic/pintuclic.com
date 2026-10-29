import type { Comprobante } from '../dtos/m12-facturacion.dto';
import type {
  AvisoComprobantePort,
  ComprobanteGuardado,
  ComprobantesRepositoryPort,
  OrdenParaFacturar,
} from '../interfaces/facturacion.interface';
import type { DatosFacturacionService } from './datos-facturacion.service';
import { FacturacionError } from './facturacion-error';

const redondear = (n: number): number => Math.round(n * 100) / 100;
const pesos = (n: number): string => `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)}`;

/** Emisión y consulta de comprobantes de venta (contracts/m12-facturacion.contract.ts · R1–R9). */
export class ComprobantesService {
  constructor(
    private readonly repo: ComprobantesRepositoryPort,
    private readonly datos: DatosFacturacionService,
    private readonly aviso?: AvisoComprobantePort,
  ) {}

  /**
   * R1, R2, R5, R6: emite el comprobante de la orden (idempotente). Lanza 404 si la orden no existe o no trae el desglose
   * de IVA, y 409 si faltan datos del vendedor.
   */
  async emitir(codigoOrden: string): Promise<ComprobanteGuardado> {
    const existente = await this.repo.buscarPorCodigoOrden(codigoOrden);
    if (existente !== null) return { ...existente, creado: false };

    const orden = await this.repo.leerOrdenParaFacturar(codigoOrden);
    if (orden === null || orden.baseSinImpuesto === null || orden.importeIva === null || orden.tasaIva === null) {
      throw FacturacionError.noDisponible();
    }
    const vendedor = await this.datos.obtener();
    if (vendedor.faltantes.length > 0) throw FacturacionError.datosVendedorIncompletos(vendedor.faltantes);
    if (vendedor.razonSocial === null || vendedor.nit === null || vendedor.direccion === null) {
      throw FacturacionError.datosVendedorIncompletos(vendedor.faltantes);
    }

    return this.repo.crear({
      idOrden: orden.idOrden,
      codigoOrden: orden.codigo,
      vendedor: {
        razonSocial: vendedor.razonSocial,
        nit: vendedor.nit,
        regimen: vendedor.regimen,
        direccion: vendedor.direccion,
        ciudad: vendedor.ciudad,
        telefono: vendedor.telefono,
        correo: vendedor.correo,
      },
      comprador: this.comprador(orden),
      lineas: orden.lineas.map((l) => {
        const inicial = l.precioInicial ?? l.precioAplicado;
        return {
          descripcion: l.nombreProducto,
          presentacion: l.varianteCopia,
          color: l.colorSolicitado,
          cantidad: l.cantidad,
          precioUnitario: inicial,
          descuentoUnitario: redondear(Math.max(0, inicial - l.precioAplicado)),
          totalLinea: redondear(l.precioAplicado * l.cantidad),
        };
      }),
      subtotal: orden.subTotal,
      descuento: orden.descuento,
      envio: orden.costoEntrega,
      baseSinIva: orden.baseSinImpuesto,
      tasaIva: orden.tasaIva,
      iva: orden.importeIva,
      total: orden.total,
      pieLegal: vendedor.pieLegal,
    });
  }

  /** R7: nombre y correo de la cuenta (razón social y NIT si es empresa) y la dirección de entrega o la recogida. */
  private comprador(orden: OrdenParaFacturar): Comprobante['comprador'] {
    return {
      nombre: orden.comprador.empresa?.nombreEmpresa ?? orden.comprador.nombre,
      documento: orden.comprador.empresa?.nit ?? null,
      correo: orden.comprador.correo,
      telefono: orden.comprador.telefono,
      direccion: orden.direccion ?? 'Recogida en almacén',
    };
  }

  /**
   * R8: el cliente solo ve el comprobante de SUS órdenes. Si todavía no existe lo emite al primer GET (R2); si por falta de
   * datos del vendedor no se puede, para él es un 404 opaco (no es asunto suyo).
   */
  async paraTitular(idUsuario: number, codigoOrden: string): Promise<Comprobante> {
    const existente = await this.repo.buscarPorCodigoOrden(codigoOrden);
    if (existente !== null) {
      if (existente.idUsuarioTitular !== idUsuario) throw FacturacionError.noDisponible();
      return existente.comprobante;
    }
    const orden = await this.repo.leerOrdenParaFacturar(codigoOrden);
    if (orden === null || orden.idUsuario !== idUsuario) throw FacturacionError.noDisponible();
    try {
      return (await this.emitir(codigoOrden)).comprobante;
    } catch (error) {
      if (error instanceof FacturacionError) throw FacturacionError.noDisponible();
      throw error;
    }
  }

  /** Personal con `ventas.ver`: cualquiera. Si faltan datos del vendedor se le dice qué completar. */
  async paraPersonal(codigoOrden: string): Promise<Comprobante> {
    return (await this.emitir(codigoOrden)).comprobante;
  }

  /** R9: avisa al cliente por correo. Un fallo no impide la emisión: se registra y se sigue. */
  async avisarAlCliente(comprobante: Comprobante): Promise<void> {
    if (this.aviso === undefined) return;
    await this.aviso.avisar(comprobante.comprador.correo, {
      nombre: comprobante.comprador.nombre,
      numero: comprobante.numero,
      total: pesos(comprobante.total),
      codigoOrden: comprobante.codigoOrden,
    });
  }

  /** `ventas.gestionar`: vuelve a enviar el aviso (emite antes el comprobante si hiciera falta). */
  async reenviar(codigoOrden: string): Promise<void> {
    await this.avisarAlCliente(await this.paraPersonal(codigoOrden));
  }
}
