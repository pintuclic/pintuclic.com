import {
  CLAVE_DIAS_VIGENCIA,
  DIAS_MAXIMOS_VENCIMIENTO,
  DIAS_VIGENCIA_COTIZACION,
  ESTADOS_EDITABLES,
  MAXIMO_COTIZACIONES_ABIERTAS,
  diasVigenciaCotizacionSchema,
  type ActualizarCotizacionRequest,
  type CarritoCotizacionPort,
  type CotizacionDetalle,
  type CotizacionResumen,
  type CrearCotizacionRequest,
  type EstadoCotizacion,
  type ListarCotizacionesAdminRequest,
  type ListarMisCotizacionesRequest,
  type NotificacionesCotizacionPort,
  type ParametrosCotizacionPort,
  type RechazarAdminRequest,
  type RechazarClienteRequest,
} from '../dtos/m21-cotizaciones.dto';
import type {
  CotizacionGuardada,
  CotizacionesRepositoryPort,
  DatosLinea,
  FiltroCotizaciones,
} from '../interfaces/cotizaciones.interface';
import { CotizacionesError, errores } from './cotizaciones-error';
import { diaEnBogota, redondear, sumarDias } from './fechas';

export interface DependenciasCotizaciones {
  repo: CotizacionesRepositoryPort;
  /** M05 */
  carrito: CarritoCotizacionPort;
  /** M17 (D4). Sin él se usan DIAS_VIGENCIA_COTIZACION días. */
  parametros?: ParametrosCotizacionPort;
  /** M18 (D8). Sin él no se avisa nada. */
  notificaciones?: NotificacionesCotizacionPort;
  reloj?: () => Date;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
}

function aResumen(c: CotizacionGuardada, cantidadLineas: number, conCliente: boolean): CotizacionResumen {
  return {
    idCotizacion: c.idCotizacion,
    codigo: c.codigo,
    estado: c.estado,
    fechaCreacion: c.fechaCreacion.toISOString(),
    fechaVencimiento: c.fechaVencimiento,
    cantidadLineas,
    totalReferencia: c.totalReferencia,
    totalAcordado: c.totalAcordado,
    cliente: conCliente ? c.cliente : null,
  };
}

function aDetalle(c: CotizacionGuardada, conCliente: boolean): CotizacionDetalle {
  return {
    ...aResumen(c, c.lineas.length, conCliente),
    comentarioCliente: c.comentarioCliente,
    notaParaCliente: c.notaParaCliente,
    motivoRechazo: c.motivoRechazo,
    fechaEnvio: c.fechaEnvio?.toISOString() ?? null,
    fechaRespuesta: c.fechaRespuesta?.toISOString() ?? null,
    lineas: c.lineas.map((l) => ({
      idLinea: l.idLinea,
      idVariante: l.idVariante,
      idColor: l.idColor,
      cantidad: l.cantidad,
      producto: {
        nombre: l.nombreProducto,
        marca: l.marca,
        medida: l.medida,
        sku: l.sku,
        color:
          l.colorNombre === null || l.colorHexadecimal === null
            ? null
            : { nombre: l.colorNombre, hexadecimal: l.colorHexadecimal },
      },
      precioReferencia: l.precioReferencia,
      precioAcordado: l.precioAcordado,
      subtotalAcordado: l.precioAcordado === null ? null : redondear(l.precioAcordado * l.cantidad),
    })),
  };
}

/** Reglas R1–R13 del contrato de M21. */
export class CotizacionesService {
  private readonly reloj: () => Date;

  constructor(private readonly dep: DependenciasCotizaciones) {
    this.reloj = dep.reloj ?? (() => new Date());
  }

  private hoy(): string {
    return diaEnBogota(this.reloj());
  }

  /** R10: antes de leer, las enviadas cuyo plazo pasó quedan vencidas. */
  private async vencer(): Promise<void> {
    await this.dep.repo.vencerEnviadas(this.hoy());
  }

  private async diasVigencia(): Promise<number> {
    try {
      const r = diasVigenciaCotizacionSchema.safeParse(await this.dep.parametros?.obtenerNumero(CLAVE_DIAS_VIGENCIA));
      return r.success ? r.data : DIAS_VIGENCIA_COTIZACION;
    } catch {
      return DIAS_VIGENCIA_COTIZACION;
    }
  }

  private async cargar(idCotizacion: number): Promise<CotizacionGuardada> {
    const c = await this.dep.repo.obtener(idCotizacion);
    if (c === null) throw errores.noDisponible();
    return c;
  }

  /** R1: un cliente solo ve las suyas; una ajena es 404 igual que una inexistente. */
  private async cargarDelCliente(idUsuario: number, idCotizacion: number): Promise<CotizacionGuardada> {
    const c = await this.dep.repo.obtener(idCotizacion);
    if (c === null || c.idUsuario !== idUsuario) throw errores.noDisponible();
    return c;
  }

  private async listarPagina(filtro: FiltroCotizaciones, conCliente: boolean): Promise<Pagina<CotizacionResumen>> {
    await this.vencer();
    const { items, total } = await this.dep.repo.listar(filtro);
    return {
      items: items.map((c) => aResumen(c, c.cantidadLineas, conCliente)),
      total,
      pagina: filtro.pagina,
      limite: filtro.limite,
    };
  }

  /* ── Cliente ──────────────────────────────────────────────────────────── */

  /** R2, R3, R4: la cotización se arma con las líneas vendibles del carrito; el carrito no se toca. */
  async crear(idUsuario: number, req: CrearCotizacionRequest): Promise<CotizacionDetalle> {
    await this.vencer();
    if ((await this.dep.repo.contarAbiertas(idUsuario)) >= MAXIMO_COTIZACIONES_ABIERTAS) {
      throw errores.limite(MAXIMO_COTIZACIONES_ABIERTAS);
    }
    const carrito = await this.dep.carrito.carritoDeCuenta(idUsuario);
    const lineas: DatosLinea[] = [];
    let totalReferencia = 0;
    for (const l of carrito.lineas) {
      const p = l.precio;
      if (l.idCotizacion !== null || p === null || !p.vendible || p.precioUnitarioFinal === null || p.subtotal === null) {
        continue;
      }
      totalReferencia += p.subtotal;
      lineas.push({
        idVariante: l.idVariante,
        idColor: l.idColor,
        cantidad: l.cantidad,
        precioReferencia: p.precioUnitarioFinal,
        nombreProducto: l.producto.nombre ?? 'Producto',
        marca: l.producto.marca,
        medida: l.producto.medida,
        sku: l.producto.sku,
        colorNombre: l.producto.color?.nombre ?? null,
        colorHexadecimal: l.producto.color?.hexadecimal ?? null,
      });
    }
    if (lineas.length === 0) throw errores.carritoVacio();

    const id = await this.dep.repo.crear({
      idUsuario,
      comentario: req.comentario === undefined || req.comentario === '' ? null : req.comentario,
      totalReferencia: redondear(totalReferencia),
      lineas,
    });
    return aDetalle(await this.cargar(id), false);
  }

  listarMias(idUsuario: number, req: ListarMisCotizacionesRequest): Promise<Pagina<CotizacionResumen>> {
    return this.listarPagina(
      { idUsuario, pagina: req.pagina, limite: req.limite, ...(req.estado === undefined ? {} : { estado: req.estado }) },
      false,
    );
  }

  async obtenerMia(idUsuario: number, idCotizacion: number): Promise<CotizacionDetalle> {
    await this.vencer();
    return aDetalle(await this.cargarDelCliente(idUsuario, idCotizacion), false);
  }

  /** R8: queda aprobada y sus líneas pasan al carrito con su precio; si el carrito no tiene espacio, se revierte. */
  async aceptar(idUsuario: number, idCotizacion: number): Promise<CotizacionDetalle> {
    await this.vencer();
    const c = await this.cargarDelCliente(idUsuario, idCotizacion);
    if (c.estado === 'vencida') throw errores.vencida();
    if (c.estado !== 'enviada') throw errores.estado('Esta cotización ya no se puede aceptar.');

    const respondida = this.reloj();
    if (!(await this.dep.repo.cambiarEstado(idCotizacion, ['enviada'], { estado: 'aprobada', fechaRespuesta: respondida }))) {
      throw errores.estado('Esta cotización ya no se puede aceptar.');
    }
    try {
      await this.dep.carrito.agregarLineasAcordadas(
        idUsuario,
        idCotizacion,
        c.lineas.map((l) => ({
          idVariante: l.idVariante,
          idColor: l.idColor,
          cantidad: l.cantidad,
          precioAcordado: l.precioAcordado ?? l.precioReferencia,
        })),
      );
    } catch (err: unknown) {
      await this.dep.repo.cambiarEstado(idCotizacion, ['aprobada'], { estado: 'enviada', fechaRespuesta: null });
      if (err instanceof Error && 'code' in err && err.code === 'LIMITE_LINEAS_ALCANZADO') throw errores.carritoLleno();
      throw err;
    }
    return aDetalle(await this.cargar(idCotizacion), false);
  }

  /** R9 */
  async rechazarComoCliente(idUsuario: number, idCotizacion: number, req: RechazarClienteRequest): Promise<CotizacionDetalle> {
    await this.vencer();
    const c = await this.cargarDelCliente(idUsuario, idCotizacion);
    if (c.estado !== 'enviada') throw errores.estado('Esta cotización ya no se puede rechazar.');
    const motivo = req.motivo === undefined || req.motivo === '' ? null : req.motivo;
    if (
      !(await this.dep.repo.cambiarEstado(idCotizacion, ['enviada'], {
        estado: 'rechazada',
        fechaRespuesta: this.reloj(),
        motivoRechazo: motivo,
      }))
    ) {
      throw errores.estado('Esta cotización ya no se puede rechazar.');
    }
    return aDetalle(await this.cargar(idCotizacion), false);
  }

  /* ── Panel ────────────────────────────────────────────────────────────── */

  listarAdmin(req: ListarCotizacionesAdminRequest): Promise<Pagina<CotizacionResumen>> {
    return this.listarPagina(
      {
        pagina: req.pagina,
        limite: req.limite,
        ...(req.estado === undefined ? {} : { estado: req.estado }),
        ...(req.busqueda === undefined || req.busqueda === '' ? {} : { busqueda: req.busqueda }),
      },
      true,
    );
  }

  async obtenerAdmin(idCotizacion: number): Promise<CotizacionDetalle> {
    await this.vencer();
    return aDetalle(await this.cargar(idCotizacion), true);
  }

  /** R5 */
  async actualizar(idCotizacion: number, req: ActualizarCotizacionRequest): Promise<CotizacionDetalle> {
    const c = await this.cargar(idCotizacion);
    if (!ESTADOS_EDITABLES.includes(c.estado)) throw errores.estado('Esta cotización ya fue respondida y no se puede editar.');

    const existentes = new Map(c.lineas.map((l) => [l.idLinea, l]));
    if (req.lineas.some((l) => !existentes.has(l.idLinea))) {
      throw errores.parametroInvalido('Alguna línea no pertenece a esta cotización.');
    }
    if (req.fechaVencimiento !== null) this.validarVencimiento(req.fechaVencimiento);

    const conservadas = new Set(req.lineas.map((l) => l.idLinea));
    const totalReferencia = redondear(
      req.lineas.reduce((s, l) => s + (existentes.get(l.idLinea)?.precioReferencia ?? 0) * l.cantidad, 0),
    );
    const guardado = await this.dep.repo.guardarAjuste(idCotizacion, ESTADOS_EDITABLES, {
      lineas: req.lineas,
      quitar: c.lineas.filter((l) => !conservadas.has(l.idLinea)).map((l) => l.idLinea),
      notaParaCliente: req.notaParaCliente === '' ? null : req.notaParaCliente,
      fechaVencimiento: req.fechaVencimiento,
      totalReferencia,
    });
    if (!guardado) throw errores.estado('Esta cotización ya fue respondida y no se puede editar.');
    return aDetalle(await this.cargar(idCotizacion), true);
  }

  /** R6 */
  async enviar(idCotizacion: number, idAdmin: number): Promise<CotizacionDetalle> {
    const c = await this.cargar(idCotizacion);
    if (!ESTADOS_EDITABLES.includes(c.estado)) throw errores.estado('Esta cotización ya fue respondida.');
    if (c.lineas.length === 0 || c.lineas.some((l) => l.precioAcordado === null)) throw errores.incompleta();

    const fechaVencimiento = c.fechaVencimiento ?? sumarDias(this.hoy(), await this.diasVigencia());
    this.validarVencimiento(fechaVencimiento);
    const totalAcordado = redondear(c.lineas.reduce((s, l) => s + redondear((l.precioAcordado ?? 0) * l.cantidad), 0));
    const enviada = await this.dep.repo.cambiarEstado(idCotizacion, ESTADOS_EDITABLES, {
      estado: 'enviada',
      fechaEnvio: this.reloj(),
      fechaVencimiento,
      idUsuarioResponde: idAdmin,
      totalAcordado,
    });
    if (!enviada) throw errores.estado('Esta cotización ya fue respondida.');

    const detalle = await this.cargar(idCotizacion);
    await this.avisar(detalle, (n, e) => n.cotizacionRespondida({ ...e, totalAcordado, fechaVencimiento }));
    return aDetalle(detalle, true);
  }

  /** R7 */
  async rechazarComoAdmin(idCotizacion: number, idAdmin: number, req: RechazarAdminRequest): Promise<CotizacionDetalle> {
    const c = await this.cargar(idCotizacion);
    const desde: EstadoCotizacion[] = [...ESTADOS_EDITABLES, 'enviada'];
    if (!desde.includes(c.estado)) throw errores.estado('Esta cotización ya no se puede rechazar.');
    if (
      !(await this.dep.repo.cambiarEstado(idCotizacion, desde, {
        estado: 'rechazada',
        motivoRechazo: req.motivo,
        idUsuarioResponde: idAdmin,
      }))
    ) {
      throw errores.estado('Esta cotización ya no se puede rechazar.');
    }
    const detalle = await this.cargar(idCotizacion);
    await this.avisar(detalle, (n, e) => n.cotizacionRechazada({ ...e, motivo: req.motivo }));
    return aDetalle(detalle, true);
  }

  /** R5: desde hoy hasta DIAS_MAXIMOS_VENCIMIENTO días. */
  private validarVencimiento(fecha: string): void {
    const hoy = this.hoy();
    if (fecha < hoy) throw errores.parametroInvalido('La fecha de vencimiento no puede ser anterior a hoy.');
    if (fecha > sumarDias(hoy, DIAS_MAXIMOS_VENCIMIENTO)) {
      throw errores.parametroInvalido(`La fecha de vencimiento puede estar como máximo a ${DIAS_MAXIMOS_VENCIMIENTO} días.`);
    }
  }

  /** D8: el aviso nunca hace fallar la respuesta. */
  private async avisar(
    c: CotizacionGuardada,
    enviar: (
      n: NotificacionesCotizacionPort,
      e: { idCotizacion: number; codigo: string; correoCliente: string; nombreCliente: string },
    ) => Promise<void>,
  ): Promise<void> {
    const n = this.dep.notificaciones;
    if (n === undefined || c.cliente === null) return;
    try {
      await enviar(n, {
        idCotizacion: c.idCotizacion,
        codigo: c.codigo,
        correoCliente: c.cliente.correo,
        nombreCliente: c.cliente.nombre,
      });
    } catch {
      // El aviso es informativo: si M18 falla, la cotización ya quedó respondida.
    }
  }
}

export { CotizacionesError };
