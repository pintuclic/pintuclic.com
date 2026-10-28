import type {
  SolicitarCancelacionRequest,
  SolicitarDevolucionRequest,
  ResolverSolicitudRequest,
  RegistrarReembolsoRequest,
  ListarMisSolicitudesRequest,
  ListarGestionPostventaRequest,
  SolicitudPostventaResumen,
  SolicitudPostventaDetalle,
  Paginacion,
  EstadoPostventa,
  DatosBancariosInput,
} from '../dtos/m11-postventa.dto';
import type {
  PostventaServicePort,
  OrdenesPortM11,
} from '../interfaces/postventa.interface';
import type {
  PostventaRepositoryPort,
  SolicitudPostventaEntidad,
} from '../repositories/postventa.repository';
import {
  ErrorPostventa,
  validarElegibilidadCancelacion,
  validarElegibilidadDevolucion,
  validarTransicionPostventa,
} from './reglas-postventa';

export class PostventaService implements PostventaServicePort {
  constructor(
    private readonly repo: PostventaRepositoryPort,
    private readonly ordenesPort: OrdenesPortM11
  ) {}

  async solicitarCancelacion(
    idUsuario: number,
    input: SolicitarCancelacionRequest
  ): Promise<SolicitudPostventaDetalle> {
    const orden = await this.ordenesPort.obtenerOrdenParaPostventa(input.codigoOrden);
    if (!orden || orden.idUsuario !== idUsuario) {
      throw new ErrorPostventa(
        'RECURSO_NO_DISPONIBLE',
        'La orden especificada no existe o no pertenece a su cuenta.',
        404
      );
    }

    validarElegibilidadCancelacion(orden.estado);

    const existente = await this.repo.buscarPorOrden(orden.idOrden);
    if (existente) {
      throw new ErrorPostventa(
        'SOLICITUD_DUPLICADA',
        `Ya existe una solicitud en trámite (${existente.codigoVisible}) para este pedido.`,
        409
      );
    }

    const codigo = await this.repo.generarSiguienteCodigo();

    const lineas = orden.lineas.map((l) => ({
      idLineaOrden: l.idLineaOrden,
      cantidad: l.cantidad,
      precioUnitario: l.precioAplicado,
      subtotal: l.precioAplicado * l.cantidad,
      motivoEspecifico: input.motivo,
    }));

    await this.repo.crearSolicitud({
      codigoVisible: codigo,
      idOrden: orden.idOrden,
      idUsuario,
      tipo: 'cancelacion',
      estado: 'solicitada',
      motivoGeneral: input.motivo,
      totalReembolso: orden.total,
      datosBancarios: input.datosReembolso,
      lineas,
    });

    return this.consultarMiSolicitud(idUsuario, codigo);
  }

  async solicitarDevolucion(
    idUsuario: number,
    input: SolicitarDevolucionRequest
  ): Promise<SolicitudPostventaDetalle> {
    const orden = await this.ordenesPort.obtenerOrdenParaPostventa(input.codigoOrden);
    if (!orden || orden.idUsuario !== idUsuario) {
      throw new ErrorPostventa(
        'RECURSO_NO_DISPONIBLE',
        'La orden especificada no existe o no pertenece a su cuenta.',
        404
      );
    }

    validarElegibilidadDevolucion(
      input.tipo,
      orden.estado,
      orden.fecha,
      input.lineas,
      orden.lineas
    );

    const existente = await this.repo.buscarPorOrden(orden.idOrden);
    if (existente) {
      throw new ErrorPostventa(
        'SOLICITUD_DUPLICADA',
        `Ya existe una solicitud en trámite (${existente.codigoVisible}) para este pedido.`,
        409
      );
    }

    const codigo = await this.repo.generarSiguienteCodigo();

    let totalReembolso = 0;
    const lineas = input.lineas.map((l) => {
      const orig = orden.lineas.find((o) => o.idLineaOrden === l.idLineaOrden)!;
      const subtotal = orig.precioAplicado * l.cantidad;
      totalReembolso += subtotal;
      return {
        idLineaOrden: l.idLineaOrden,
        cantidad: l.cantidad,
        precioUnitario: orig.precioAplicado,
        subtotal,
        motivoEspecifico: l.motivoEspecifico ?? input.motivoGeneral,
      };
    });

    await this.repo.crearSolicitud({
      codigoVisible: codigo,
      idOrden: orden.idOrden,
      idUsuario,
      tipo: input.tipo,
      estado: 'solicitada',
      motivoGeneral: input.motivoGeneral,
      totalReembolso,
      datosBancarios: input.datosReembolso,
      evidenciaUrls: input.evidenciaUrls,
      lineas,
    });

    return this.consultarMiSolicitud(idUsuario, codigo);
  }

  async consultarMisSolicitudes(
    idUsuario: number,
    query: ListarMisSolicitudesRequest
  ): Promise<{ data: SolicitudPostventaResumen[]; pagination: Paginacion }> {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;

    const { items, total } = await this.repo.listarPorUsuario(idUsuario, {
      pagina,
      limite,
      estado: query.estado,
    });

    const data: SolicitudPostventaResumen[] = items.map((i) => ({
      idSolicitud: i.idSolicitudPostventa,
      codigo: i.codigoVisible,
      codigoOrden: i.orden.codigoVisible,
      idCliente: i.idUsuario,
      nombreCliente: i.usuario.nombre,
      tipo: i.tipo,
      estado: i.estado,
      totalReembolso: Number(i.totalReembolso),
      totalItems: i.lineas.reduce((acc: number, curr: { cantidad: number }) => acc + curr.cantidad, 0),
      fechaSolicitud: i.fechaSolicitud.toISOString(),
      fechaResolucion: i.fechaResolucion ? i.fechaResolucion.toISOString() : null,
    }));

    const totalPaginas = Math.ceil(total / limite);

    return {
      data,
      pagination: {
        pagina,
        limite,
        total,
        totalPaginas,
      },
    };
  }

  async consultarMiSolicitud(
    idUsuario: number,
    codigo: string
  ): Promise<SolicitudPostventaDetalle> {
    const raw = await this.repo.buscarPorCodigo(codigo);
    if (!raw || raw.idUsuario !== idUsuario) {
      throw new ErrorPostventa(
        'RECURSO_NO_DISPONIBLE',
        'La solicitud de postventa solicitada no existe o no pertenece a su cuenta.',
        404
      );
    }

    return this.mapearADetalle(raw);
  }

  async listarGestion(
    query: ListarGestionPostventaRequest
  ): Promise<{ data: SolicitudPostventaResumen[]; pagination: Paginacion }> {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;

    const { items, total } = await this.repo.listarGestion({
      pagina,
      limite,
      codigo: query.codigo,
      codigoOrden: query.codigoOrden,
      estado: query.estado,
      tipo: query.tipo,
      desde: query.desde,
      hasta: query.hasta,
    });

    const data: SolicitudPostventaResumen[] = items.map((i) => ({
      idSolicitud: i.idSolicitudPostventa,
      codigo: i.codigoVisible,
      codigoOrden: i.orden.codigoVisible,
      idCliente: i.idUsuario,
      nombreCliente: i.usuario.nombre,
      tipo: i.tipo,
      estado: i.estado,
      totalReembolso: Number(i.totalReembolso),
      totalItems: i.lineas.reduce((acc: number, curr: { cantidad: number }) => acc + curr.cantidad, 0),
      fechaSolicitud: i.fechaSolicitud.toISOString(),
      fechaResolucion: i.fechaResolucion ? i.fechaResolucion.toISOString() : null,
    }));

    const totalPaginas = Math.ceil(total / limite);

    return {
      data,
      pagination: {
        pagina,
        limite,
        total,
        totalPaginas,
      },
    };
  }

  async obtenerResumenGestion(): Promise<Array<{ estado: EstadoPostventa; cantidad: number }>> {
    return this.repo.contarPorEstado();
  }

  async consultarGestionPorCodigo(codigo: string): Promise<SolicitudPostventaDetalle> {
    const raw = await this.repo.buscarPorCodigo(codigo);
    if (!raw) {
      throw new ErrorPostventa(
        'RECURSO_NO_DISPONIBLE',
        'La solicitud de postventa solicitada no existe.',
        404
      );
    }

    return this.mapearADetalle(raw);
  }

  async resolverSolicitud(
    idEmpleado: number,
    codigo: string,
    input: ResolverSolicitudRequest
  ): Promise<SolicitudPostventaDetalle> {
    const actual = await this.repo.buscarPorCodigo(codigo);
    if (!actual) {
      throw new ErrorPostventa(
        'RECURSO_NO_DISPONIBLE',
        'La solicitud de postventa solicitada no existe.',
        404
      );
    }

    const estadoNuevo: EstadoPostventa = input.accion === 'aprobar' ? 'aprobada' : 'rechazada';
    validarTransicionPostventa(actual.estado, estadoNuevo);

    if (input.accion === 'aprobar') {
      if (actual.tipo === 'cancelacion') {
        await this.ordenesPort.actualizarEstadoOrden(
          actual.orden.codigoVisible,
          actual.orden.estado,
          'cancelado',
          `Cancelación aprobada por postventa (${codigo}): ${input.observaciones ?? 'Sin observaciones'}`,
          idEmpleado
        );
      } else if (actual.tipo === 'devolucion') {
        const ordenCompleta = await this.ordenesPort.obtenerOrdenParaPostventa(actual.orden.codigoVisible);
        if (ordenCompleta) {
          const totalCantOrden = ordenCompleta.lineas.reduce((acc, l) => acc + l.cantidad, 0);
          const totalCantDev = actual.lineas.reduce((acc: number, l: { cantidad: number }) => acc + l.cantidad, 0);
          if (totalCantDev >= totalCantOrden) {
            await this.ordenesPort.actualizarEstadoOrden(
              actual.orden.codigoVisible,
              actual.orden.estado,
              'devuelto',
              `Devolución total aprobada (${codigo}): ${input.observaciones ?? 'Sin observaciones'}`,
              idEmpleado
            );
          }
        }
      }
    }

    const actualizado = await this.repo.actualizarResolucion(codigo, {
      estado: estadoNuevo,
      idEmpleadoResuelve: idEmpleado,
      observacionesResolucion: input.observaciones,
      motivoRechazo: input.motivoRechazo,
    });

    return this.mapearADetalle(actualizado);
  }

  async registrarReembolso(
    idEmpleado: number,
    codigo: string,
    input: RegistrarReembolsoRequest
  ): Promise<SolicitudPostventaDetalle> {
    const actual = await this.repo.buscarPorCodigo(codigo);
    if (!actual) {
      throw new ErrorPostventa(
        'RECURSO_NO_DISPONIBLE',
        'La solicitud de postventa solicitada no existe.',
        404
      );
    }

    if (actual.estado !== 'aprobada') {
      throw new ErrorPostventa(
        'TRANSICION_NO_PERMITIDA',
        `Solo solicitudes en estado "aprobada" admiten registro de reembolso (estado actual: ${actual.estado}).`,
        409
      );
    }

    const actualizado = await this.repo.registrarReembolso(codigo, {
      metodoReembolso: input.metodo,
      montoReembolsado: input.montoReembolsado,
      referenciaReembolso: input.referenciaTransaccion,
      comprobanteUrl: input.comprobanteUrl,
      notas: input.notas,
      idEmpleado,
    });

    return this.mapearADetalle(actualizado);
  }

  private mapearADetalle(raw: SolicitudPostventaEntidad): SolicitudPostventaDetalle {
    return {
      idSolicitud: raw.idSolicitudPostventa,
      codigo: raw.codigoVisible,
      codigoOrden: raw.orden.codigoVisible,
      idCliente: raw.idUsuario,
      nombreCliente: raw.usuario.nombre,
      tipo: raw.tipo,
      estado: raw.estado,
      totalReembolso: Number(raw.totalReembolso),
      totalItems: raw.lineas.reduce((acc: number, l) => acc + l.cantidad, 0),
      fechaSolicitud: raw.fechaSolicitud.toISOString(),
      fechaResolucion: raw.fechaResolucion ? raw.fechaResolucion.toISOString() : null,
      motivoGeneral: raw.motivoGeneral,
      observacionesResolucion: raw.observacionesResolucion,
      nombreEmpleadoResuelve: raw.empleadoResuelve?.nombre ?? null,
      metodoReembolso: raw.metodoReembolso ?? null,
      referenciaReembolso: raw.referenciaReembolso ?? null,
      comprobanteUrl: raw.comprobanteUrl ?? null,
      fechaReembolso: raw.fechaReembolso ? raw.fechaReembolso.toISOString() : null,
      datosBancarios: (raw.datosBancarios as unknown as DatosBancariosInput) ?? null,
      lineas: raw.lineas.map((l) => ({
        idLineaPostventa: l.idLineaSolicitudPostventa,
        idLineaOrden: l.idLineaOrden,
        nombreProducto: l.lineaOrden.nombreProducto,
        varianteCopia: l.lineaOrden.varianteCopia,
        skuVendido: l.lineaOrden.skuVendido,
        colorSolicitado: l.lineaOrden.colorSolicitado,
        esEntonado: l.lineaOrden.esEntonado,
        cantidad: l.cantidad,
        precioUnitario: Number(l.precioUnitario),
        subTotal: Number(l.subtotal),
        motivoEspecifico: l.motivoEspecifico,
      })),
      historial: raw.historial.map((h) => ({
        idHistorial: h.idHistorialEstadoPostventa,
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        motivo: h.motivo,
        nombreAutor: h.autor?.nombre ?? null,
        fecha: h.fecha.toISOString(),
      })),
    };
  }
}
