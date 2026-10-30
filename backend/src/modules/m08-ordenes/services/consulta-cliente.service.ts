import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { AutorizacionService, ContextoDenegacion } from '../../m20-seguridad/services/autorizacion.service';
import {
  ESTADOS_FINALIZADOS,
  type ListarMisPedidosRequest,
  type OrdenDetalleCliente,
  type OrdenResumen,
  type Paginacion,
} from '../dtos/m08-ordenes.dto';
import type {
  CatalogoDisponibilidadPort,
  ConsultaClienteRepository,
  DetalleOrdenDatos,
  FilaResumenOrden,
} from '../interfaces/consulta-cliente.interface';

/** ADR-003: ajena, inexistente o sin permiso son la misma respuesta (404 opaco). */
export class ConsultaOrdenError extends Error {
  readonly codigo = 'RECURSO_NO_DISPONIBLE' as const;
  readonly statusCode = 404;

  constructor() {
    super('El recurso solicitado no está disponible.');
    this.name = 'ConsultaOrdenError';
  }
}

export interface MisPedidosResultado {
  enCurso: OrdenResumen[];
  finalizados: OrdenResumen[];
  paginacion: Paginacion;
}

function aResumen(fila: FilaResumenOrden): OrdenResumen {
  return {
    codigo: fila.codigo,
    fecha: fila.fecha.toISOString(),
    total: fila.total,
    estado: fila.estado,
    modoEntrega: fila.modoEntrega,
  };
}

/** HU-ORD-04 y HU-ORD-07: lo que el cliente titular ve de sus propios pedidos. */
export class ConsultaClienteService {
  constructor(
    private readonly repo: ConsultaClienteRepository,
    private readonly catalogo: CatalogoDisponibilidadPort,
    private readonly autorizacion: AutorizacionService,
  ) {}

  /**
   * La paginación recorre todos los pedidos del cliente, del más reciente al más antiguo,
   * y cada página se reparte entre en curso y finalizados (R12 del contrato).
   */
  async listar(actor: Actor, consulta: ListarMisPedidosRequest): Promise<MisPedidosResultado> {
    const { filas, total } = await this.repo.listarPorUsuario(actor.idUsuario, {
      ...(consulta.q === undefined || consulta.q === '' ? {} : { q: consulta.q }),
      pagina: consulta.pagina,
      limite: consulta.limite,
    });

    const resumenes = filas.map((fila) => ({ resumen: aResumen(fila), estado: fila.estado }));
    return {
      enCurso: resumenes.filter((r) => !ESTADOS_FINALIZADOS.includes(r.estado)).map((r) => r.resumen),
      finalizados: resumenes.filter((r) => ESTADOS_FINALIZADOS.includes(r.estado)).map((r) => r.resumen),
      paginacion: {
        pagina: consulta.pagina,
        limite: consulta.limite,
        total,
        totalPaginas: Math.ceil(total / consulta.limite),
      },
    };
  }

  async detalle(actor: Actor, codigo: string, contexto: ContextoDenegacion): Promise<OrdenDetalleCliente> {
    const datos = await this.repo.buscarDetalle(codigo);
    if (!datos) throw new ConsultaOrdenError();

    // Anti-IDOR: se compara contra el actor de la sesión; una orden ajena deja rastro (M20).
    const esTitular = await this.autorizacion.exigirTitularidad(actor, datos.idUsuario, contexto);
    if (!esTitular) throw new ConsultaOrdenError();

    return this.presentar(datos);
  }

  private async presentar(datos: DetalleOrdenDatos): Promise<OrdenDetalleCliente> {
    const referencias = datos.lineas.flatMap((l) => (l.idVarianteRef === null ? [] : [l.idVarianteRef]));
    const disponibles = referencias.length > 0 ? await this.catalogo.variantesDisponibles(referencias) : new Map<number, number>();

    return {
      ...aResumen(datos),
      origen: datos.origen,
      subTotal: datos.subTotal,
      descuento: datos.descuento,
      costoEntrega: datos.costoEntrega,
      baseSinImpuesto: datos.baseSinImpuesto,
      importeIva: datos.importeIva,
      tasaIva: datos.tasaIva,
      lineas: datos.lineas.map((linea) => ({
        nombreProducto: linea.nombreProducto,
        varianteCopia: linea.varianteCopia,
        colorSolicitado: linea.colorSolicitado,
        skuVendido: linea.skuVendido,
        cantidad: linea.cantidad,
        precioInicial: linea.precioInicial,
        precioAplicado: linea.precioAplicado,
        descuentos: [...linea.descuentos].sort((a, b) => a.ordenAplicacion - b.ordenAplicacion),
        // R14: sin referencia al catálogo no hay ficha a la que enlazar.
        productoDisponible: linea.idVarianteRef !== null && disponibles.has(linea.idVarianteRef),
        idProducto: linea.idVarianteRef === null ? null : (disponibles.get(linea.idVarianteRef) ?? null),
      })),
      historial: [...datos.historial]
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
        .map((h) => ({ estadoAnterior: h.estadoAnterior, estadoNuevo: h.estadoNuevo, fecha: h.fecha.toISOString() })),
    };
  }
}
