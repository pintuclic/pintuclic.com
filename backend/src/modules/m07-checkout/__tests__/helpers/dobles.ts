import type { Carrito, LineaCarrito, Revalidacion } from '../../../m05-carrito/dtos/m05-carrito.dto';
import type { SolicitudPagadaInput } from '../../../m08-ordenes/dtos/m08-ordenes.dto';
import type {
  CarritoCheckoutPort,
  EstadoWompi,
  ListarSolicitudesAdminRequest,
  OrdenesCheckoutPort,
  PasarelaPagoPort,
  PerfilCheckoutPort,
  PreciosCheckoutPort,
  TerminosWompi,
} from '../../dtos/m07-checkout.dto';
import type {
  CambiosIntento,
  CambiosSolicitud,
  CheckoutRepositoryPort,
  IntentoGuardado,
  IntentoNuevo,
  Pagina,
  SolicitudGuardada,
  SolicitudNueva,
} from '../../interfaces/checkout.interface';
import { PasarelaNoDisponibleError } from '../../services/checkout-error';
import { formatearCodigo } from '../../services/reglas-checkout';

export function lineaCarrito(cambios: Partial<LineaCarrito> & { subtotal?: number } = {}): LineaCarrito {
  const { subtotal = 100_000, ...resto } = cambios;
  const idLinea = resto.idLinea ?? 1;
  return {
    idLinea,
    idVariante: 10 + idLinea,
    idColor: 8,
    cantidad: 2,
    producto: {
      idProducto: 1,
      nombre: 'Viniltex Ultralavable',
      marca: 'Pintuco',
      medida: 'Galón',
      sku: 'VIN-GAL',
      color: { idColor: 8, nombre: 'Amarillo Sol', codigo: null, hexadecimal: '#F7C600' },
      idImagenPrincipal: null,
      esCombo: false,
      topeUnidades: null,
      disponibilidad: 'disponible',
    },
    precio: {
      indice: 0,
      idVariante: 10 + idLinea,
      idColor: 8,
      cantidad: 2,
      vendible: true,
      motivoNoVendible: null,
      excluidoDeDescuentos: false,
      precioAcordado: false,
      precioInicial: 55_000,
      subtotalInicial: 110_000,
      descuentos: [{ ordenAplicacion: 1, tipoOrigen: 'evento', idRegla: 3, origen: 'Mes del color', porcentaje: 10, importe: 10_000 }],
      descuentoTotal: 10_000,
      subtotal,
      precioUnitarioFinal: subtotal / 2,
    },
    idCotizacion: null,
    precioAcordado: null,
    ...resto,
  };
}

export function carrito(lineas: LineaCarrito[] = [lineaCarrito()], cupon: { idCupon: number; descuento: number } | null = null): Carrito {
  const total = lineas.reduce((s, l) => s + (l.precio?.subtotal ?? 0), 0) - (cupon?.descuento ?? 0);
  return {
    lineas,
    cantidadItems: lineas.reduce((s, l) => s + l.cantidad, 0),
    union: null,
    calculo:
      lineas.length === 0
        ? null
        : {
            lineas: lineas.flatMap((l) => (l.precio === null ? [] : [l.precio])),
            cupon:
              cupon === null
                ? null
                : { codigo: 'PINTA10', aplicado: true, motivoRechazo: null, montoMinimo: null, descuento: cupon.descuento, idCupon: cupon.idCupon },
            empresa: null,
            avisos: [],
            resumen: {
              subtotalInicial: 110_000 * lineas.length,
              descuentoEventos: 10_000 * lineas.length,
              descuentoEmpresa: 0,
              descuentoCupon: cupon?.descuento ?? 0,
              descuentoTotal: 10_000 * lineas.length + (cupon?.descuento ?? 0),
              total,
              tasaIva: 19,
              baseSinImpuesto: Math.round((total / 1.19) * 100) / 100,
              importeIva: Math.round((total - total / 1.19) * 100) / 100,
            },
            perfil: { tipo: 'particular', idSubRolEmpresa: null },
            calculadoEn: '2026-10-27T15:00:00.000Z',
          },
  };
}

export class CarritoFalso implements CarritoCheckoutPort {
  revalidacion: Revalidacion = { carrito: carrito(), cambios: [], puedeContinuar: true };
  quitados: { idVariante: number; idColor: number | null }[] = [];
  async carritoDeCuenta(): Promise<Carrito> {
    return this.revalidacion.carrito;
  }
  async revalidar(): Promise<Revalidacion> {
    return this.revalidacion;
  }
  async quitarComprado(_idUsuario: number, lineas: readonly { idVariante: number; idColor: number | null }[]): Promise<void> {
    this.quitados.push(...lineas);
  }
}

export class PreciosFalso implements PreciosCheckoutPort {
  registrados = new Map<string, number>();
  agotado = false;
  liberados: string[] = [];
  async registrarUsoCupon(entrada: { idCupon: number; referencia: string }): Promise<{ registrado: boolean; motivoRechazo: 'cupon_agotado' | null }> {
    if (this.agotado) return { registrado: false, motivoRechazo: 'cupon_agotado' };
    this.registrados.set(entrada.referencia, entrada.idCupon);
    return { registrado: true, motivoRechazo: null };
  }
  async liberarUsoCupon(referencia: string): Promise<void> {
    this.liberados.push(referencia);
    this.registrados.delete(referencia);
  }
}

export class OrdenesFalsas implements OrdenesCheckoutPort {
  recibidas: SolicitudPagadaInput[] = [];
  falla: Error | null = null;
  async crearDesdePagoConfirmado(entrada: SolicitudPagadaInput): Promise<{ codigo: string; creada: boolean }> {
    if (this.falla !== null) throw this.falla;
    this.recibidas.push(entrada);
    return { codigo: 'PC-2026-00001', creada: true };
  }
}

interface TransaccionFalsa {
  idTransaccion: string;
  estado: EstadoWompi;
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
}

export class PasarelaFalsa implements PasarelaPagoPort {
  caida = false;
  firmaOk = true;
  transacciones = new Map<string, TransaccionFalsa>();
  celulares: string[] = [];
  private siguiente = 1;
  /** Un prefijo distinto por corrida evita chocar con transacciones de corridas anteriores en una base real. */
  constructor(private readonly prefijo = 'tx') {}
  async terminos(): Promise<TerminosWompi> {
    if (this.caida) throw new PasarelaNoDisponibleError();
    return { tokenAceptacion: 'acc', enlaceReglamento: 'https://wompi.co/r', tokenDatosPersonales: 'pd', enlaceDatosPersonales: 'https://wompi.co/d' };
  }
  async crearTransaccionNequi(e: { referencia: string; montoEnCentavos: number; celular: string }): Promise<{ idTransaccion: string; estado: EstadoWompi }> {
    if (this.caida) throw new PasarelaNoDisponibleError();
    this.celulares.push(e.celular);
    const id = `${this.prefijo}-${this.siguiente++}`;
    this.transacciones.set(id, { idTransaccion: id, estado: 'PENDING', referencia: e.referencia, montoEnCentavos: e.montoEnCentavos, moneda: 'COP' });
    return { idTransaccion: id, estado: 'PENDING' };
  }
  async consultarTransaccion(id: string): Promise<TransaccionFalsa & { mensaje: string | null }> {
    if (this.caida) throw new PasarelaNoDisponibleError();
    const t = this.transacciones.get(id);
    if (t === undefined) throw new PasarelaNoDisponibleError();
    return { ...t, mensaje: null };
  }
  /** Simula lo que el cliente hace en la app de Nequi. */
  resolver(id: string, estado: EstadoWompi, cambios: Partial<TransaccionFalsa> = {}): void {
    const t = this.transacciones.get(id);
    if (t !== undefined) this.transacciones.set(id, { ...t, ...cambios, estado });
  }
  firmaValida(): boolean {
    return this.firmaOk;
  }
}

export const perfilFalso: PerfilCheckoutPort = {
  async datosDeEntrega() {
    return { correo: 'cliente@pintuclic.co', telefonoPerfil: '300 123 4567', direccion: null };
  },
};

/** Repositorio en memoria con la misma semántica que el de Prisma. */
export class RepoMemoria implements CheckoutRepositoryPort {
  solicitudes: SolicitudGuardada[] = [];
  private consecutivo = 0;
  private idIntento = 0;

  async crear(nueva: SolicitudNueva, anio: number): Promise<SolicitudGuardada> {
    this.consecutivo += 1;
    const s: SolicitudGuardada = {
      ...nueva,
      idSolicitud: this.consecutivo,
      codigo: formatearCodigo(anio, this.consecutivo),
      estado: 'en_pago',
      cuponRegistrado: false,
      observaciones: null,
      transaccionPagoId: null,
      montoPagado: null,
      codigoOrden: null,
      reintentosOrden: 0,
      proximoIntentoOrden: null,
      ultimoError: null,
      fechaCreacion: new Date('2026-10-27T15:00:00Z'),
      intentos: [],
      cliente: { nombre: 'Cliente Activo', correo: 'cliente@pintuclic.co' },
    };
    this.solicitudes.push(s);
    return structuredClone(s);
  }
  private porId(id: number): SolicitudGuardada {
    const s = this.solicitudes.find((x) => x.idSolicitud === id);
    if (s === undefined) throw new Error('no existe');
    return s;
  }
  async buscarPorCodigo(codigo: string): Promise<SolicitudGuardada | null> {
    const s = this.solicitudes.find((x) => x.codigo === codigo);
    return s === undefined ? null : structuredClone(s);
  }
  async abiertaDelUsuario(idUsuario: number): Promise<SolicitudGuardada | null> {
    const s = [...this.solicitudes].reverse().find((x) => x.idUsuario === idUsuario && (x.estado === 'en_pago' || x.estado === 'rechazada'));
    return s === undefined ? null : structuredClone(s);
  }
  async codigoPorReferencia(referencia: string): Promise<string | null> {
    return this.solicitudes.find((s) => s.intentos.some((i) => i.referencia === referencia))?.codigo ?? null;
  }
  async agregarIntento(idSolicitud: number, intento: IntentoNuevo): Promise<IntentoGuardado> {
    this.idIntento += 1;
    const nuevo: IntentoGuardado = {
      ...intento,
      idIntento: this.idIntento,
      idTransaccion: null,
      estado: 'PENDING',
      mensaje: null,
      ultimaConsulta: null,
      fechaCreacion: new Date('2026-10-27T15:00:00Z'),
    };
    this.porId(idSolicitud).intentos.push(nuevo);
    return structuredClone(nuevo);
  }
  async actualizarIntento(idIntento: number, cambios: CambiosIntento): Promise<void> {
    for (const s of this.solicitudes) {
      const i = s.intentos.find((x) => x.idIntento === idIntento);
      if (i !== undefined) Object.assign(i, cambios);
    }
  }
  async actualizar(idSolicitud: number, cambios: CambiosSolicitud): Promise<void> {
    Object.assign(this.porId(idSolicitud), cambios);
  }
  async registrarAprobacion(
    idSolicitud: number,
    idIntento: number,
    datos: { transaccionPagoId: string; montoPagado: number; observaciones: string | null; ahora: Date },
  ): Promise<boolean> {
    const s = this.porId(idSolicitud);
    if (s.transaccionPagoId !== null || ['pagada', 'completada', 'en_revision'].includes(s.estado)) return false;
    Object.assign(s, {
      estado: 'pagada',
      transaccionPagoId: datos.transaccionPagoId,
      montoPagado: datos.montoPagado,
      observaciones: datos.observaciones,
      reintentosOrden: 0,
      proximoIntentoOrden: datos.ahora,
      ultimoError: null,
    });
    await this.actualizarIntento(idIntento, { estado: 'APPROVED', idTransaccion: datos.transaccionPagoId, ultimaConsulta: datos.ahora });
    return true;
  }
  async pendientesDeOrden(ahora: Date): Promise<SolicitudGuardada[]> {
    return structuredClone(
      this.solicitudes.filter((s) => s.estado === 'pagada' && s.proximoIntentoOrden !== null && s.proximoIntentoOrden <= ahora),
    );
  }
  async abiertasParaRevisar(): Promise<SolicitudGuardada[]> {
    return structuredClone(this.solicitudes.filter((s) => s.estado === 'en_pago' || s.estado === 'rechazada'));
  }
  async listar(f: ListarSolicitudesAdminRequest): Promise<Pagina<SolicitudGuardada>> {
    const items = this.solicitudes.filter((s) => f.estado === undefined || s.estado === f.estado);
    return { items: structuredClone(items), pagina: f.pagina, limite: f.limite, total: items.length };
  }
}
