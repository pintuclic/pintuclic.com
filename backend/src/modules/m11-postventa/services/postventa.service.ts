import type { Prisma } from '@prisma/client';
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
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import type { NotificacionesOrdenPort } from '../../m08-ordenes/interfaces/notificaciones-orden.port';
import {
  ErrorPostventa,
  validarElegibilidadCancelacion,
  validarElegibilidadDevolucion,
  validarTransicionPostventa,
} from './reglas-postventa';

function noDisponible(mensaje: string): ErrorPostventa {
  return new ErrorPostventa('RECURSO_NO_DISPONIBLE', mensaje, 404);
}

function estadoCambiado(): ErrorPostventa {
  return new ErrorPostventa(
    'ESTADO_CAMBIADO',
    'La solicitud cambió de estado mientras la gestionaba. Recargue y vuelva a intentarlo.',
    409
  );
}

function sumarCantidades(lineas: ReadonlyArray<{ cantidad: number }>): number {
  return lineas.reduce((acc, l) => acc + l.cantidad, 0);
}

export class PostventaService implements PostventaServicePort {
  constructor(
    private readonly repo: PostventaRepositoryPort,
    private readonly ordenesPort: OrdenesPortM11,
    private readonly auditoria?: AuditoriaPort,
    private readonly reloj: () => Date = () => new Date(),
    /** R-POS-B: por dónde se avisa al cliente cuando se aprueba una cancelación. Sin esto, no se avisa. */
    private readonly avisos?: Pick<NotificacionesOrdenPort, 'notificarOrdenCancelada'>
  ) {}

  async solicitarCancelacion(
    idUsuario: number,
    input: SolicitarCancelacionRequest
  ): Promise<SolicitudPostventaDetalle> {
    const orden = await this.ordenesPort.obtenerOrdenParaPostventa(input.codigoOrden);
    if (!orden || orden.idUsuario !== idUsuario) {
      throw noDisponible('La orden especificada no existe o no pertenece a su cuenta.');
    }

    const codigo = await this.radicarCancelacion(orden, input.motivo, input.datosReembolso, undefined);
    return this.consultarMiSolicitud(idUsuario, codigo);
  }

  async solicitarCancelacionPorTienda(
    idEmpleado: number,
    codigoOrden: string,
    motivo: string
  ): Promise<SolicitudPostventaDetalle> {
    const orden = await this.ordenesPort.obtenerOrdenParaPostventa(codigoOrden);
    if (!orden) {
      throw noDisponible('La orden especificada no existe.');
    }

    const codigo = await this.radicarCancelacion(orden, motivo, undefined, idEmpleado);
    return this.consultarGestionPorCodigo(codigo);
  }

  /** La cancelación del cliente y la de la tienda comparten reglas; solo cambia quién la abre (R-POS-A). */
  private async radicarCancelacion(
    orden: NonNullable<Awaited<ReturnType<OrdenesPortM11['obtenerOrdenParaPostventa']>>>,
    motivo: string,
    datosReembolso: DatosBancariosInput | undefined,
    idEmpleadoInicia: number | undefined
  ): Promise<string> {
    validarElegibilidadCancelacion(orden.estado);

    return this.repo.enTransaccion(async (tx) => {
      await this.repo.bloquearOrden(orden.idOrden, tx);
      await this.exigirSinSolicitudActiva(orden.idOrden, tx);

      const codigo = await this.repo.generarSiguienteCodigo(tx);
      await this.repo.crearSolicitud(
        {
          codigoVisible: codigo,
          idOrden: orden.idOrden,
          // Siempre el dueño del pedido: es quien la ve en «Mis solicitudes» y quien recibe el aviso.
          idUsuario: orden.idUsuario,
          tipo: 'cancelacion',
          estado: 'solicitada',
          motivoGeneral: motivo,
          totalReembolso: orden.total,
          datosBancarios: datosReembolso,
          idEmpleadoInicia,
          lineas: orden.lineas.map((l) => ({
            idLineaOrden: l.idLineaOrden,
            cantidad: l.cantidad,
            precioUnitario: l.precioAplicado,
            subtotal: l.precioAplicado * l.cantidad,
            motivoEspecifico: motivo,
          })),
        },
        tx
      );
      return codigo;
    });
  }

  async solicitarDevolucion(
    idUsuario: number,
    input: SolicitarDevolucionRequest
  ): Promise<SolicitudPostventaDetalle> {
    const orden = await this.ordenesPort.obtenerOrdenParaPostventa(input.codigoOrden);
    if (!orden || orden.idUsuario !== idUsuario) {
      throw noDisponible('La orden especificada no existe o no pertenece a su cuenta.');
    }

    const codigo = await this.repo.enTransaccion(async (tx) => {
      await this.repo.bloquearOrden(orden.idOrden, tx);

      validarElegibilidadDevolucion(
        input.tipo,
        orden.estado,
        orden.fechaEntrega ?? orden.fecha,
        input.lineas,
        orden.lineas,
        this.reloj(),
        await this.repo.cantidadesDevueltas(orden.idOrden, tx)
      );
      await this.exigirSinSolicitudActiva(orden.idOrden, tx);

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

      const codigo = await this.repo.generarSiguienteCodigo(tx);
      await this.repo.crearSolicitud(
        {
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
        },
        tx
      );
      return codigo;
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
      iniciadaPor: i.idEmpleadoInicia ? 'tienda' : 'cliente',
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
      throw noDisponible('La solicitud de postventa solicitada no existe o no pertenece a su cuenta.');
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
      iniciadaPor: i.idEmpleadoInicia ? 'tienda' : 'cliente',
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
      throw noDisponible('La solicitud de postventa solicitada no existe.');
    }

    return this.mapearADetalle(raw);
  }

  /** HU-POS-05: el cambio del pedido (M08) y el de la solicitud se confirman juntos o ninguno. */
  async resolverSolicitud(
    idEmpleado: number,
    codigo: string,
    input: ResolverSolicitudRequest,
    ip: string | null = null
  ): Promise<SolicitudPostventaDetalle> {
    const estadoNuevo: EstadoPostventa = input.accion === 'aprobar' ? 'aprobada' : 'rechazada';

    const { anterior, actualizado } = await this.repo.enTransaccion(async (tx) => {
      const actual = await this.repo.buscarPorCodigo(codigo, tx);
      if (!actual) {
        throw noDisponible('La solicitud de postventa solicitada no existe.');
      }
      validarTransicionPostventa(actual.estado, estadoNuevo);

      if (input.accion === 'aprobar') {
        await this.aplicarEnPedido(actual, input.observaciones, idEmpleado, tx);
      }

      const actualizado = await this.repo.actualizarResolucion(
        codigo,
        {
          estadoEsperado: actual.estado,
          estado: estadoNuevo,
          idEmpleadoResuelve: idEmpleado,
          observacionesResolucion: input.observaciones,
          motivoRechazo: input.motivoRechazo,
        },
        tx
      );
      if (!actualizado) throw estadoCambiado();
      return { anterior: actual.estado, actualizado };
    });

    await this.auditar(idEmpleado, `postventa.solicitud.${input.accion}`, codigo, anterior, estadoNuevo, ip);
    if (input.accion === 'aprobar') await this.avisarCancelacion(actualizado);
    return this.mapearADetalle(actualizado);
  }

  /** HU-POS-06 */
  async registrarReembolso(
    idEmpleado: number,
    codigo: string,
    input: RegistrarReembolsoRequest,
    ip: string | null = null
  ): Promise<SolicitudPostventaDetalle> {
    const actual = await this.repo.buscarPorCodigo(codigo);
    if (!actual) {
      throw noDisponible('La solicitud de postventa solicitada no existe.');
    }

    if (actual.estado !== 'aprobada') {
      throw new ErrorPostventa(
        'TRANSICION_NO_PERMITIDA',
        `Solo solicitudes en estado "aprobada" admiten registro de reembolso (estado actual: ${actual.estado}).`,
        409
      );
    }

    const total = Number(actual.totalReembolso);
    if (input.montoReembolsado > total) {
      throw new ErrorPostventa(
        'PARAMETRO_INVALIDO',
        `El monto reembolsado (${input.montoReembolsado}) supera el total de la solicitud (${total}).`,
        400
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
    if (!actualizado) throw estadoCambiado();

    await this.auditar(idEmpleado, 'postventa.reembolso.registrar', codigo, 'aprobada', 'reembolsada', ip);
    return this.mapearADetalle(actualizado);
  }

  /** R-POS-B: ya con la transacción confirmada, el cliente se entera de por qué se canceló su pedido. Un fallo no la deshace. */
  private async avisarCancelacion(solicitud: SolicitudPostventaEntidad): Promise<void> {
    if (solicitud.tipo !== 'cancelacion' || !this.avisos?.notificarOrdenCancelada) return;
    try {
      await this.avisos.notificarOrdenCancelada({
        codigo: solicitud.orden.codigoVisible,
        idUsuario: solicitud.idUsuario,
        motivo: solicitud.motivoGeneral,
        origen: solicitud.idEmpleadoInicia ? 'tienda' : 'cliente',
      });
    } catch (error) {
      console.error(
        `[M11] No se pudo avisar la cancelación de ${solicitud.orden.codigoVisible}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /** RF-POS-01-04: una sola solicitud en trámite por pedido. */
  private async exigirSinSolicitudActiva(idOrden: number, tx: Prisma.TransactionClient): Promise<void> {
    const existente = await this.repo.buscarPorOrden(idOrden, tx);
    if (existente) {
      throw new ErrorPostventa(
        'SOLICITUD_DUPLICADA',
        `Ya existe una solicitud en trámite (${existente.codigoVisible}) para este pedido.`,
        409
      );
    }
  }

  /**
   * RF-POS-05-03: una cancelación aprobada cancela el pedido.
   * RF-POS-05-04: una devolución que, sumada a las anteriores, cubre todas las unidades lo deja devuelto.
   */
  private async aplicarEnPedido(
    solicitud: SolicitudPostventaEntidad,
    observaciones: string | undefined,
    idEmpleado: number,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const codigoOrden = solicitud.orden.codigoVisible;
    const nota = observaciones ?? 'Sin observaciones';

    if (solicitud.tipo === 'cancelacion') {
      await this.ordenesPort.cambiarEstadoOrden(
        tx,
        codigoOrden,
        'cancelado',
        `Cancelación aprobada por postventa (${solicitud.codigoVisible}): ${nota}`,
        idEmpleado
      );
      return;
    }
    if (solicitud.tipo !== 'devolucion') return;

    const orden = await this.ordenesPort.obtenerOrdenParaPostventa(codigoOrden);
    if (!orden) return;
    const yaDevueltas = [...(await this.repo.cantidadesDevueltas(orden.idOrden, tx)).values()].reduce((a, b) => a + b, 0);
    if (yaDevueltas + sumarCantidades(solicitud.lineas) >= sumarCantidades(orden.lineas)) {
      await this.ordenesPort.cambiarEstadoOrden(
        tx,
        codigoOrden,
        'devuelto',
        `Devolución total aprobada (${solicitud.codigoVisible}): ${nota}`,
        idEmpleado
      );
    }
  }

  /** M20 (HU-SEG-04): un fallo al auditar no deshace la operación. */
  private async auditar(
    idUsuario: number,
    accion: string,
    codigo: string,
    valorAnterior: EstadoPostventa,
    valorNuevo: EstadoPostventa,
    ip: string | null
  ): Promise<void> {
    try {
      await this.auditoria?.registrarAccion?.({
        idUsuario,
        actor: null,
        accion,
        entidad: 'solicitud_postventa',
        idEntidad: codigo,
        valorAnterior,
        valorNuevo,
        resultado: 'exito',
        fecha: this.reloj(),
        ipOrigen: ip,
      });
    } catch {
      // Sin efecto en la operación.
    }
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
      iniciadaPor: raw.idEmpleadoInicia ? 'tienda' : 'cliente',
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
