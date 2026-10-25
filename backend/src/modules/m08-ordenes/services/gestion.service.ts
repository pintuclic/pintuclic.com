import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import {
  ESTADOS_FINALIZADOS,
  ESTADOS_ORDEN,
  type CambiarEstadoRequest,
  type EstadoOrden,
  type ListarGestionRequest,
  type OrdenDetalleGestion,
  type OrdenFilaBandeja,
  type Paginacion,
} from '../dtos/m08-ordenes.dto';
import type { CatalogoDisponibilidadPort } from '../interfaces/consulta-cliente.interface';
import type {
  DetalleGestionDatos,
  FilaBandejaDatos,
  FiltroGestion,
  GestionRepository,
} from '../interfaces/gestion.interface';
import type { RelojPort } from '../interfaces/reloj.port';
import { ConsultaOrdenError } from './consulta-cliente.service';
import type { EstadosService } from './estados.service';
import { transicionesDisponibles } from './reglas-estado';

/** Estados que esperan atención: los que el contador de la navegación y la bandeja agrupada muestran. */
export const ESTADOS_EN_CURSO: readonly EstadoOrden[] = ESTADOS_ORDEN.filter((e) => !ESTADOS_FINALIZADOS.includes(e));

export interface GrupoBandeja {
  estado: EstadoOrden;
  ordenes: OrdenFilaBandeja[];
}

export interface BandejaPaginada {
  filas: OrdenFilaBandeja[];
  paginacion: Paginacion;
}

/** HU-ORD-05, 08, 09 y 11: lo que el personal ve y hace sobre las órdenes. */
export class GestionService {
  constructor(
    private readonly repo: GestionRepository,
    private readonly estados: EstadosService,
    private readonly catalogo: CatalogoDisponibilidadPort,
    private readonly reloj: RelojPort,
  ) {}

  /** RF-ORD-05-04: órdenes en curso agrupadas por estado, la que más lleva esperando primero. */
  async bandejaAgrupada(consulta: ListarGestionRequest): Promise<GrupoBandeja[]> {
    const estados = consulta.estado === undefined ? ESTADOS_EN_CURSO : [consulta.estado];
    const { filas } = await this.repo.listar({ ...this.filtroBase(consulta), estados, orden: 'antiguedad' });

    const ordenes = filas.map((fila) => this.aFilaBandeja(fila));
    return estados.map((estado) => ({ estado, ordenes: ordenes.filter((o) => o.estado === estado) }));
  }

  async bandejaPaginada(consulta: ListarGestionRequest): Promise<BandejaPaginada> {
    const { filas, total } = await this.repo.listar({
      ...this.filtroBase(consulta),
      ...(consulta.estado === undefined ? {} : { estados: [consulta.estado] }),
      orden: consulta.orden,
      pagina: consulta.pagina,
      limite: consulta.limite,
    });
    return {
      filas: filas.map((fila) => this.aFilaBandeja(fila)),
      paginacion: this.paginacion(consulta.pagina, consulta.limite, total),
    };
  }

  /** Contador de la navegación: todos los estados en curso, aunque no haya ninguna orden. */
  async resumen(): Promise<Array<{ estado: EstadoOrden; cantidad: number }>> {
    const cuentas = new Map((await this.repo.contarPorEstado()).map((c) => [c.estado, c.cantidad]));
    return ESTADOS_EN_CURSO.map((estado) => ({ estado, cantidad: cuentas.get(estado) ?? 0 }));
  }

  async detalle(codigo: string): Promise<OrdenDetalleGestion> {
    const datos = await this.repo.buscarDetalle(codigo);
    if (!datos) throw new ConsultaOrdenError();
    return this.presentar(datos);
  }

  /** HU-ORD-11: todas las compras del cliente titular de la orden, de la más reciente a la más antigua. */
  async historialCliente(codigo: string, pagina: number, limite: number): Promise<BandejaPaginada> {
    const idCliente = await this.repo.buscarIdCliente(codigo);
    if (idCliente === null) throw new ConsultaOrdenError();

    const { filas, total } = await this.repo.listar({ cliente: idCliente, orden: 'reciente', pagina, limite });
    return { filas: filas.map((fila) => this.aFilaBandeja(fila)), paginacion: this.paginacion(pagina, limite, total) };
  }

  async cambiarEstado(codigo: string, cambio: CambiarEstadoRequest, actor: Actor): Promise<OrdenDetalleGestion> {
    await this.estados.cambiarEstado(codigo, cambio, { idUsuario: actor.idUsuario });
    return this.detalle(codigo);
  }

  private filtroBase(consulta: ListarGestionRequest): Omit<FiltroGestion, 'orden'> {
    return {
      ...(consulta.codigo === undefined ? {} : { codigo: consulta.codigo }),
      ...(consulta.desde === undefined ? {} : { desde: consulta.desde }),
      ...(consulta.hasta === undefined ? {} : { hasta: consulta.hasta }),
      ...(consulta.cliente === undefined ? {} : { cliente: consulta.cliente }),
      ...(consulta.correo === undefined ? {} : { correo: consulta.correo }),
      ...(consulta.telefono === undefined ? {} : { telefono: consulta.telefono }),
      ...(consulta.diasEsperando === undefined ? {} : { diasEsperando: consulta.diasEsperando }),
    };
  }

  private paginacion(pagina: number, limite: number, total: number): Paginacion {
    return { pagina, limite, total, totalPaginas: Math.ceil(total / limite) };
  }

  private aFilaBandeja(fila: FilaBandejaDatos): OrdenFilaBandeja {
    const segundos = Math.floor((this.reloj.ahora().getTime() - fila.entradaEstado.getTime()) / 1000);
    return {
      codigo: fila.codigo,
      fecha: fila.fecha.toISOString(),
      total: fila.total,
      estado: fila.estado,
      modoEntrega: fila.modoEntrega,
      cliente: fila.cliente,
      segundosEnEstado: Math.max(0, segundos),
    };
  }

  private async presentar(datos: DetalleGestionDatos): Promise<OrdenDetalleGestion> {
    const referencias = datos.lineas.flatMap((l) => (l.idVarianteRef === null ? [] : [l.idVarianteRef]));
    const disponibles = referencias.length > 0 ? await this.catalogo.variantesDisponibles(referencias) : new Set<number>();

    return {
      codigo: datos.codigo,
      fecha: datos.fecha.toISOString(),
      total: datos.total,
      estado: datos.estado,
      modoEntrega: datos.modoEntrega,
      origen: datos.origen,
      subTotal: datos.subTotal,
      descuento: datos.descuento,
      costoEntrega: datos.costoEntrega,
      baseSinImpuesto: datos.baseSinImpuesto,
      importeIva: datos.importeIva,
      tasaIva: datos.tasaIva,
      cliente: datos.cliente,
      // RF-ORD-09-01: la dirección solo existe y se muestra cuando el pedido se envía.
      direccion: datos.modoEntrega === 'domicilio' ? datos.direccion : null,
      codigoSolicitud: datos.codigoSolicitud,
      idCotizacion: datos.idCotizacion,
      observaciones: datos.observaciones,
      lineas: datos.lineas.map((linea) => ({
        nombreProducto: linea.nombreProducto,
        varianteCopia: linea.varianteCopia,
        colorSolicitado: linea.colorSolicitado,
        skuVendido: linea.skuVendido,
        cantidad: linea.cantidad,
        precioInicial: linea.precioInicial,
        precioAplicado: linea.precioAplicado,
        descuentos: [...linea.descuentos].sort((a, b) => a.ordenAplicacion - b.ordenAplicacion),
        productoDisponible: linea.idVarianteRef !== null && disponibles.has(linea.idVarianteRef),
        esEntonado: linea.esEntonado,
        baseConsumida: linea.baseConsumida,
      })),
      historial: [...datos.historial]
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
        .map((h) => ({
          estadoAnterior: h.estadoAnterior,
          estadoNuevo: h.estadoNuevo,
          fecha: h.fecha.toISOString(),
          autor: h.autor,
          motivo: h.motivo,
        })),
      notas: datos.notas.map((n) => ({ idNota: n.idNota, texto: n.texto, autor: n.autor, fecha: n.fecha.toISOString() })),
      contactos: datos.contactos.map((c) => ({
        idContacto: c.idContacto,
        medio: c.medio,
        detalle: c.detalle,
        autor: c.autor,
        fecha: c.fecha.toISOString(),
      })),
      transicionesPermitidas: transicionesDisponibles(datos.estado, datos.modoEntrega),
    };
  }
}
