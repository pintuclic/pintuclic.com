import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import {
  CLAVE_COSTO_ENVIO_BASE,
  CLAVE_UMBRAL_ENVIO_GRATIS,
  COSTO_ENVIO_BASE,
  INTERVALO_CONSULTA_WOMPI_SEGUNDOS,
  MAXIMO_INTENTOS_PAGO,
  UMBRAL_ENVIO_GRATIS,
  VIGENCIA_SOLICITUD_MINUTOS,
  eventoWompiInputSchema,
  type AceptacionesWompi,
  type CarritoCheckoutPort,
  type CompraDirecta,
  type CrearSolicitudRequest,
  type ListarSolicitudesAdminRequest,
  type OrdenesCheckoutPort,
  type ParametrosCheckoutPort,
  type PasarelaPagoPort,
  type PerfilCheckoutPort,
  type PrepararCheckout,
  type PreciosCheckoutPort,
  type ReintentarPagoRequest,
  type Solicitud,
  type SolicitudAdmin,
  type TerminosWompi,
} from '../dtos/m07-checkout.dto';
import type { CheckoutRepositoryPort, IntentoGuardado, Pagina, SolicitudGuardada } from '../interfaces/checkout.interface';
import { errores, OrdenDefinitivaError, PasarelaNoDisponibleError } from './checkout-error';
import {
  aCentavos,
  anioColombia,
  aSolicitud,
  celularNequiDe,
  congelarLineas,
  costoEnvio,
  debeVencer,
  enmascararCelular,
  mensajeIntento,
  origenDeLineas,
  proximoReintento,
  redondear2,
  referenciaIntento,
  solicitudPagada,
  textoDireccion,
} from './reglas-checkout';

const MS_POR_MINUTO = 60_000;
/** Cuántas solicitudes atiende cada pasada de la tarea periódica. */
const LOTE_TAREA = 50;

export interface DependenciasCheckout {
  repo: CheckoutRepositoryPort;
  carrito: CarritoCheckoutPort;
  precios: PreciosCheckoutPort;
  ordenes: OrdenesCheckoutPort;
  pasarela: PasarelaPagoPort;
  perfil: PerfilCheckoutPort;
  parametros?: ParametrosCheckoutPort;
  auditoria?: AuditoriaPort;
  reloj?: () => Date;
}

/** Resultado de Wompi de una transacción, ya leído por el adaptador. */
type Transaccion = Awaited<ReturnType<PasarelaPagoPort['consultarTransaccion']>>;

/** Reglas R1–R16 del contrato de M07. No calcula precios: congela los de M06 que trae la revalidación de M05. */
export class CheckoutService {
  private readonly reloj: () => Date;

  constructor(private readonly dep: DependenciasCheckout) {
    this.reloj = dep.reloj ?? (() => new Date());
  }

  /* ── Cliente ──────────────────────────────────────────────────────────── */

  /** Con `directa`, la pantalla prepara solo esa línea (R17); sin ella, el carrito de la cuenta. */
  async preparar(idUsuario: number, codigoCupon?: string, directa?: CompraDirecta): Promise<PrepararCheckout> {
    const [carrito, envio, perfil, terminos, abierta] = await Promise.all([
      directa === undefined
        ? this.dep.carrito.carritoDeCuenta(idUsuario, codigoCupon)
        : this.dep.carrito.carritoDirecto(idUsuario, directa),
      this.parametrosEnvio(),
      this.dep.perfil.datosDeEntrega(idUsuario),
      this.terminos(),
      this.dep.repo.abiertaDelUsuario(idUsuario),
    ]);
    const totalMercancia = carrito.calculo?.resumen.total ?? 0;
    const enCurso = abierta !== null && abierta.estado === 'en_pago' && abierta.intentos.at(-1)?.estado === 'PENDING';
    return {
      carrito,
      envio: {
        domicilio: costoEnvio('domicilio', totalMercancia, envio.base, envio.umbral),
        recogida: 0,
        umbralEnvioGratis: envio.umbral,
      },
      direccionPerfil: perfil.direccion,
      celularSugerido: celularNequiDe(perfil.telefonoPerfil) ?? celularNequiDe(perfil.direccion?.telefonoRecibe),
      terminos,
      solicitudEnCurso: enCurso ? abierta.codigo : null,
    };
  }

  /** R2, en su orden. */
  async crear(idUsuario: number, req: CrearSolicitudRequest): Promise<Solicitud> {
    // a) Revalidación con lo que el cliente tenía en pantalla (C11 de M05); R17: solo la línea de la ficha.
    const directa = req.directa;
    const revalidacion =
      directa === undefined
        ? await this.dep.carrito.revalidar(idUsuario, req.pantalla)
        : await this.dep.carrito.revalidarDirecta(idUsuario, directa, req.pantalla);
    const carrito = revalidacion.carrito;
    if (carrito.lineas.length === 0) throw errores.carritoVacio();
    const producto = carrito.lineas[0]?.producto;
    if (directa !== undefined && producto?.esCombo === true && producto.topeUnidades !== null && directa.cantidad > producto.topeUnidades) {
      throw errores.productoNoDisponible(producto.topeUnidades);
    }
    if (!revalidacion.puedeContinuar || carrito.calculo === null) throw errores.carritoCambio(revalidacion);

    // b) R9
    const origen = origenDeLineas(carrito.lineas);
    if (origen === 'varias') throw errores.variasCotizaciones();

    // c) Una sola compra abierta por cliente.
    const abierta = await this.dep.repo.abiertaDelUsuario(idUsuario);
    if (abierta !== null) {
      const actual = await this.refrescar(abierta, true);
      if (actual.estado === 'en_pago' && actual.intentos.at(-1)?.estado === 'PENDING') throw errores.pagoEnCurso(actual.codigo);
      if (actual.estado === 'en_pago' || actual.estado === 'rechazada') await this.cerrar(actual, 'cancelada');
    }

    // d) Envío y congelado.
    const resumen = carrito.calculo.resumen;
    const envio = await this.parametrosEnvio();
    const costoEntrega = costoEnvio(req.modoEntrega, resumen.total, envio.base, envio.umbral);
    const cupon = carrito.calculo.cupon;
    const cuponAplicado = cupon !== null && cupon.aplicado && cupon.idCupon !== null ? cupon : null;
    const ahora = this.reloj();
    const solicitud = await this.dep.repo.crear(
      {
        idUsuario,
        origen: origen.origen,
        idCotizacion: origen.idCotizacion,
        modoEntrega: req.modoEntrega,
        direccion: req.modoEntrega === 'domicilio' && req.direccion !== null ? textoDireccion(req.direccion) : null,
        costoEntrega,
        subTotal: resumen.subtotalInicial,
        descuento: resumen.descuentoTotal,
        descuentoEventos: resumen.descuentoEventos,
        descuentoEmpresa: resumen.descuentoEmpresa,
        totalMercancia: resumen.total,
        total: redondear2(resumen.total + costoEntrega),
        baseSinImpuesto: resumen.baseSinImpuesto,
        importeIva: resumen.importeIva,
        tasaIva: resumen.tasaIva,
        idCupon: cuponAplicado?.idCupon ?? null,
        importeCupon: resumen.descuentoCupon,
        venceEn: new Date(ahora.getTime() + VIGENCIA_SOLICITUD_MINUTOS * MS_POR_MINUTO),
        compraDirecta: directa !== undefined,
        lineas: congelarLineas(carrito),
      },
      anioColombia(ahora),
    );

    // e) El cupón queda registrado en M06 con la referencia de la solicitud (R15 de M06).
    if (cuponAplicado !== null && cuponAplicado.idCupon !== null) {
      const uso = await this.dep.precios.registrarUsoCupon({
        idCupon: cuponAplicado.idCupon,
        idUsuario,
        referencia: solicitud.codigo,
        importeDescuento: cuponAplicado.descuento,
      });
      if (!uso.registrado) {
        await this.dep.repo.actualizar(solicitud.idSolicitud, { estado: 'cancelada' });
        throw errores.cupon(uso.motivoRechazo);
      }
      await this.dep.repo.actualizar(solicitud.idSolicitud, { cuponRegistrado: true });
      solicitud.cuponRegistrado = true;
    }

    // f) Intento 1 en Wompi.
    await this.cobrar(solicitud, 1, req.celularNequi, req.aceptaciones);
    return aSolicitud(await this.recargar(solicitud.codigo));
  }

  /** GET de la pantalla: consulta a Wompi de respaldo y crea la orden si ya toca (R5, R6). */
  async obtenerMia(idUsuario: number, codigo: string): Promise<Solicitud> {
    const s = await this.propia(idUsuario, codigo);
    return aSolicitud(await this.refrescar(s, false));
  }

  /** R4 */
  async reintentar(idUsuario: number, codigo: string, req: ReintentarPagoRequest): Promise<Solicitud> {
    const s = await this.refrescar(await this.propia(idUsuario, codigo), true);
    if (s.estado === 'vencida') throw errores.vencida();
    if (s.estado !== 'rechazada') throw errores.estado('Esta compra no tiene un pago rechazado que reintentar.');
    if (s.intentos.length >= MAXIMO_INTENTOS_PAGO) throw errores.limiteIntentos();
    await this.dep.repo.actualizar(s.idSolicitud, { estado: 'en_pago' });
    await this.cobrar(s, s.intentos.length + 1, req.celularNequi, req.aceptaciones);
    return aSolicitud(await this.recargar(codigo));
  }

  /** R3: el cliente la cancela si no hay un pago en curso. */
  async cancelar(idUsuario: number, codigo: string): Promise<Solicitud> {
    const s = await this.refrescar(await this.propia(idUsuario, codigo), true);
    if (s.estado === 'en_pago' && s.intentos.at(-1)?.estado === 'PENDING') {
      throw errores.estado('Tienes un pago en curso en Nequi. Recházalo en la app o espera a que termine.');
    }
    if (s.estado !== 'en_pago' && s.estado !== 'rechazada') throw errores.estado('Esta compra ya no se puede cancelar.');
    await this.cerrar(s, 'cancelada');
    return aSolicitud(await this.recargar(codigo));
  }

  /* ── Wompi ────────────────────────────────────────────────────────────── */

  /** R5: evento `transaction.updated`. Con firma válida no lanza: Wompi solo necesita el 200. */
  async procesarEvento(cuerpo: unknown, checksumCabecera: string | null, ip: string | null): Promise<void> {
    if (!this.dep.pasarela.firmaValida(cuerpo, checksumCabecera)) {
      await this.auditar(null, 'checkout.wompi.evento', 'evento_wompi', null, 'fallo', ip);
      throw errores.firma();
    }
    const evento = eventoWompiInputSchema.safeParse(cuerpo);
    if (!evento.success || evento.data.event !== 'transaction.updated') return;
    const codigo = await this.dep.repo.codigoPorReferencia(evento.data.data.transaction.reference);
    if (codigo === null) return;
    const s = await this.dep.repo.buscarPorCodigo(codigo);
    if (s === null) return;
    const intento = s.intentos.find((i) => i.referencia === evento.data.data.transaction.reference);
    if (intento === undefined) return;
    // R5 b: nunca se confía solo en el evento.
    const tx = await this.dep.pasarela.consultarTransaccion(evento.data.data.transaction.id);
    await this.aplicarTransaccion(s, intento, tx);
    await this.crearOrdenSiToca(await this.recargar(codigo));
  }

  /* ── Panel ────────────────────────────────────────────────────────────── */

  async listar(filtros: ListarSolicitudesAdminRequest): Promise<Pagina<SolicitudAdmin>> {
    const p = await this.dep.repo.listar(filtros);
    return { ...p, items: p.items.map((s) => this.aAdmin(s)) };
  }

  async obtenerAdmin(codigo: string): Promise<SolicitudAdmin> {
    const s = await this.dep.repo.buscarPorCodigo(codigo);
    if (s === null) throw errores.noDisponible();
    return this.aAdmin(s);
  }

  /** R16: pide a Wompi el estado real del último intento (también de una vencida o cancelada, R8). */
  async consultarWompi(codigo: string, idActor: number, ip: string | null): Promise<SolicitudAdmin> {
    const s = await this.dep.repo.buscarPorCodigo(codigo);
    if (s === null) throw errores.noDisponible();
    const intento = s.intentos.at(-1);
    if (intento?.idTransaccion != null) {
      try {
        await this.aplicarTransaccion(s, intento, await this.dep.pasarela.consultarTransaccion(intento.idTransaccion));
      } catch (error) {
        if (error instanceof PasarelaNoDisponibleError) throw errores.pasarela();
        throw error;
      }
    }
    const actual = await this.recargar(codigo);
    await this.crearOrdenSiToca(actual);
    await this.auditar(idActor, 'checkout.pago.consultar', 'solicitud_compra', codigo, 'exito', ip);
    return this.aAdmin(await this.recargar(codigo));
  }

  /** R16: vuelve a encolar la orden de una solicitud con pago aprobado. */
  async reintentarOrden(codigo: string, idActor: number, ip: string | null): Promise<SolicitudAdmin> {
    const s = await this.dep.repo.buscarPorCodigo(codigo);
    if (s === null) throw errores.noDisponible();
    if (s.transaccionPagoId === null || (s.estado !== 'en_revision' && s.estado !== 'pagada')) {
      throw errores.estado('Solo se reintenta el pedido de una compra con pago aprobado y sin pedido.');
    }
    await this.dep.repo.actualizar(s.idSolicitud, {
      estado: 'pagada',
      reintentosOrden: 0,
      proximoIntentoOrden: this.reloj(),
      ultimoError: null,
    });
    await this.crearOrdenSiToca(await this.recargar(codigo));
    await this.auditar(idActor, 'checkout.orden.reintentar', 'solicitud_compra', codigo, 'exito', ip);
    return this.aAdmin(await this.recargar(codigo));
  }

  /* ── Tarea periódica (R3, R5, R6) ─────────────────────────────────────── */

  async procesarPendientes(): Promise<void> {
    for (const s of await this.dep.repo.pendientesDeOrden(this.reloj(), LOTE_TAREA)) {
      await this.crearOrdenSiToca(s);
    }
    for (const s of await this.dep.repo.abiertasParaRevisar(LOTE_TAREA)) {
      await this.refrescar(s, false);
    }
  }

  /* ── Internos ─────────────────────────────────────────────────────────── */

  private async propia(idUsuario: number, codigo: string): Promise<SolicitudGuardada> {
    const s = await this.dep.repo.buscarPorCodigo(codigo);
    if (s === null || s.idUsuario !== idUsuario) throw errores.noDisponible();
    return s;
  }

  private async recargar(codigo: string): Promise<SolicitudGuardada> {
    const s = await this.dep.repo.buscarPorCodigo(codigo);
    if (s === null) throw errores.noDisponible();
    return s;
  }

  private async parametrosEnvio(): Promise<{ base: number; umbral: number }> {
    const leer = async (clave: typeof CLAVE_COSTO_ENVIO_BASE | typeof CLAVE_UMBRAL_ENVIO_GRATIS): Promise<number | null> => {
      try {
        const v = (await this.dep.parametros?.obtenerNumero(clave)) ?? null;
        return v !== null && Number.isFinite(v) && v >= 0 ? v : null;
      } catch {
        return null;
      }
    };
    const [base, umbral] = await Promise.all([leer(CLAVE_COSTO_ENVIO_BASE), leer(CLAVE_UMBRAL_ENVIO_GRATIS)]);
    return { base: base ?? COSTO_ENVIO_BASE, umbral: umbral ?? UMBRAL_ENVIO_GRATIS };
  }

  private async terminos(): Promise<TerminosWompi | null> {
    try {
      return await this.dep.pasarela.terminos();
    } catch {
      return null;
    }
  }

  /** R2 f, R4: crea el intento y la transacción NEQUI. Si Wompi no responde, la solicitud queda rechazada. */
  private async cobrar(s: SolicitudGuardada, numero: number, celular: string, aceptaciones: AceptacionesWompi): Promise<void> {
    const montoCentavos = aCentavos(s.total);
    const intento = await this.dep.repo.agregarIntento(s.idSolicitud, {
      numero,
      referencia: referenciaIntento(s.codigo, numero),
      montoCentavos,
      celularEnmascarado: enmascararCelular(celular),
    });
    try {
      const tx = await this.dep.pasarela.crearTransaccionNequi({
        referencia: intento.referencia,
        montoEnCentavos: montoCentavos,
        celular,
        correo: s.cliente.correo,
        tokenAceptacion: aceptaciones.tokenAceptacion,
        tokenDatosPersonales: aceptaciones.tokenDatosPersonales,
      });
      await this.dep.repo.actualizarIntento(intento.idIntento, {
        idTransaccion: tx.idTransaccion,
        estado: tx.estado,
        mensaje: mensajeIntento(tx.estado),
        ultimaConsulta: this.reloj(),
      });
      if (tx.estado === 'DECLINED' || tx.estado === 'ERROR' || tx.estado === 'VOIDED') {
        await this.dep.repo.actualizar(s.idSolicitud, { estado: 'rechazada' });
      }
    } catch (error) {
      await this.dep.repo.actualizarIntento(intento.idIntento, {
        estado: 'ERROR',
        mensaje: 'No pudimos conectar con Nequi. Inténtalo de nuevo en unos minutos.',
      });
      await this.dep.repo.actualizar(s.idSolicitud, { estado: 'rechazada' });
      if (error instanceof PasarelaNoDisponibleError) throw errores.pasarela();
      throw error;
    }
  }

  /**
   * R5 de respaldo, R3 y R6 en una sola pasada: pregunta a Wompi si el último intento sigue pendiente (como mucho
   * cada INTERVALO_CONSULTA_WOMPI_SEGUNDOS, salvo `forzar`), vence la solicitud si toca y crea la orden si ya está
   * pagada. Un fallo de Wompi aquí no rompe la consulta: la pantalla vuelve a preguntar.
   */
  private async refrescar(s: SolicitudGuardada, forzar: boolean): Promise<SolicitudGuardada> {
    const ahora = this.reloj();
    const intento = s.intentos.at(-1);
    if (s.estado === 'en_pago' && intento?.estado === 'PENDING' && intento.idTransaccion !== null) {
      const ultima = intento.ultimaConsulta?.getTime() ?? 0;
      if (forzar || ahora.getTime() - ultima >= INTERVALO_CONSULTA_WOMPI_SEGUNDOS * 1000) {
        try {
          await this.aplicarTransaccion(s, intento, await this.dep.pasarela.consultarTransaccion(intento.idTransaccion));
        } catch (error) {
          if (!(error instanceof PasarelaNoDisponibleError)) throw error;
        }
        s = await this.recargar(s.codigo);
      }
    }
    if (debeVencer(s, ahora)) {
      await this.cerrar(s, 'vencida');
      s = await this.recargar(s.codigo);
    }
    if (s.estado === 'pagada') {
      await this.crearOrdenSiToca(s);
      s = await this.recargar(s.codigo);
    }
    return s;
  }

  /** R5 b, R6, R8: aplica lo que Wompi dice de una transacción. */
  private async aplicarTransaccion(s: SolicitudGuardada, intento: IntentoGuardado, tx: Transaccion): Promise<void> {
    const ahora = this.reloj();
    if (tx.estado === 'PENDING') {
      await this.dep.repo.actualizarIntento(intento.idIntento, { ultimaConsulta: ahora });
      return;
    }
    if (tx.estado !== 'APPROVED') {
      await this.dep.repo.actualizarIntento(intento.idIntento, {
        estado: tx.estado,
        idTransaccion: tx.idTransaccion,
        mensaje: mensajeIntento(tx.estado),
        ultimaConsulta: ahora,
      });
      const esElUltimo = s.intentos.at(-1)?.idIntento === intento.idIntento;
      if (s.estado === 'en_pago' && esElUltimo) await this.dep.repo.actualizar(s.idSolicitud, { estado: 'rechazada' });
      return;
    }

    // Aprobado. Repetido (mismo id) → nada que hacer.
    if (s.transaccionPagoId === tx.idTransaccion) return;
    const coincide =
      tx.referencia === intento.referencia &&
      tx.moneda === 'COP' &&
      tx.montoEnCentavos === intento.montoCentavos &&
      tx.montoEnCentavos === aCentavos(s.total);
    if (!coincide || s.transaccionPagoId !== null) {
      await this.dep.repo.actualizarIntento(intento.idIntento, {
        estado: 'APPROVED',
        idTransaccion: tx.idTransaccion,
        ultimaConsulta: ahora,
      });
      await this.dep.repo.actualizar(s.idSolicitud, {
        estado: 'en_revision',
        ultimoError: s.transaccionPagoId !== null
          ? `Llegó un segundo pago aprobado (${tx.idTransaccion}) para una compra que ya tenía uno.`
          : `El pago aprobado no coincide con la compra (referencia, moneda o monto). Transacción ${tx.idTransaccion}.`,
        proximoIntentoOrden: null,
      });
      return;
    }

    // R8: un pago tardío se respeta; el cupón se vuelve a registrar.
    let observaciones = s.observaciones;
    if ((s.estado === 'vencida' || s.estado === 'cancelada') && s.idCupon !== null && !s.cuponRegistrado) {
      const uso = await this.dep.precios.registrarUsoCupon({
        idCupon: s.idCupon,
        idUsuario: s.idUsuario,
        referencia: s.codigo,
        importeDescuento: s.importeCupon,
      });
      if (uso.registrado) {
        await this.dep.repo.actualizar(s.idSolicitud, { cuponRegistrado: true });
      } else {
        observaciones = [observaciones, 'El pago llegó después de vencer la compra y el cupón ya no estaba disponible; se respetó el precio pagado.']
          .filter((t): t is string => t !== null)
          .join(' ');
      }
    }
    await this.dep.repo.registrarAprobacion(s.idSolicitud, intento.idIntento, {
      transaccionPagoId: tx.idTransaccion,
      montoPagado: tx.montoEnCentavos / 100,
      observaciones,
      ahora,
    });
  }

  /** R6, R7: llama a M08 y, con la orden creada, quita del carrito lo comprado. */
  private async crearOrdenSiToca(s: SolicitudGuardada): Promise<void> {
    const ahora = this.reloj();
    if (s.estado !== 'pagada' || s.proximoIntentoOrden === null || s.proximoIntentoOrden.getTime() > ahora.getTime()) return;
    try {
      const orden = await this.dep.ordenes.crearDesdePagoConfirmado(solicitudPagada(s));
      await this.dep.repo.actualizar(s.idSolicitud, {
        estado: 'completada',
        codigoOrden: orden.codigo,
        proximoIntentoOrden: null,
        ultimoError: null,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido al crear el pedido.';
      const reintentos = s.reintentosOrden + 1;
      const proximo = error instanceof OrdenDefinitivaError ? null : proximoReintento(reintentos, ahora);
      await this.dep.repo.actualizar(s.idSolicitud, {
        estado: proximo === null ? 'en_revision' : 'pagada',
        reintentosOrden: reintentos,
        proximoIntentoOrden: proximo,
        ultimoError: mensaje.slice(0, 1000),
      });
      return;
    }
    // R17: la compra directa no pasó por el carrito.
    if (s.compraDirecta) return;
    try {
      await this.dep.carrito.quitarComprado(
        s.idUsuario,
        s.lineas.map((l) => ({ idVariante: l.idVariante, idColor: l.idColor })),
      );
    } catch (error) {
      // R7: la orden ya existe; no se revierte nada por el carrito.
      console.error(`[M07] No se pudo quitar del carrito lo comprado en ${s.codigo}:`, error instanceof Error ? error.message : error);
    }
  }

  /** R3: vencer o cancelar libera el cupón. */
  private async cerrar(s: SolicitudGuardada, estado: 'vencida' | 'cancelada'): Promise<void> {
    if (s.cuponRegistrado) {
      try {
        await this.dep.precios.liberarUsoCupon(s.codigo);
        await this.dep.repo.actualizar(s.idSolicitud, { estado, cuponRegistrado: false });
        return;
      } catch (error) {
        console.error(`[M07] No se pudo liberar el cupón de ${s.codigo}:`, error instanceof Error ? error.message : error);
      }
    }
    await this.dep.repo.actualizar(s.idSolicitud, { estado });
  }

  private aAdmin(s: SolicitudGuardada): SolicitudAdmin {
    return {
      ...aSolicitud(s),
      cliente: { idUsuario: s.idUsuario, nombre: s.cliente.nombre, correo: s.cliente.correo },
      transaccionPagoId: s.transaccionPagoId,
      ultimoError: s.ultimoError,
      reintentosOrden: s.reintentosOrden,
    };
  }

  /** M20: un fallo de auditoría no deshace la operación. */
  private async auditar(
    idUsuario: number | null,
    accion: string,
    entidad: string,
    idEntidad: string | null,
    resultado: 'exito' | 'fallo',
    ip: string | null,
  ): Promise<void> {
    try {
      await this.dep.auditoria?.registrarAccion?.({
        idUsuario,
        actor: null,
        accion,
        entidad,
        idEntidad,
        valorAnterior: null,
        valorNuevo: null,
        resultado,
        fecha: this.reloj(),
        ipOrigen: ip,
      });
    } catch {
      // Sin efecto en la operación.
    }
  }
}
