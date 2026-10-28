import type { Carrito, LineaCarrito } from '../../../m05-carrito/dtos/m05-carrito.dto';
import type {
  CarritoCotizacionPort,
  ClienteCotizacion,
  EstadoCotizacion,
  EventoCotizacion,
  LineaAcordada,
  NotificacionesCotizacionPort,
} from '../../dtos/m21-cotizaciones.dto';
import type {
  AjusteGuardado,
  CambioEstado,
  CotizacionGuardada,
  CotizacionesRepositoryPort,
  FiltroCotizaciones,
  LineaGuardada,
  NuevaCotizacion,
} from '../../interfaces/cotizaciones.interface';

/* ── Carrito de ejemplo (doble de M05) ───────────────────────────────────── */

export interface LineaEjemplo {
  idVariante: number;
  idColor?: number | null;
  cantidad: number;
  precio: number;
  vendible?: boolean;
  idCotizacion?: number | null;
}

export function lineaCarrito(l: LineaEjemplo, i: number): LineaCarrito {
  const vendible = l.vendible ?? true;
  const subtotal = l.precio * l.cantidad;
  const idColor = l.idColor ?? null;
  return {
    idLinea: i + 1,
    idVariante: l.idVariante,
    idColor,
    cantidad: l.cantidad,
    producto: {
      idProducto: l.idVariante * 10,
      nombre: `Producto ${l.idVariante}`,
      marca: 'Pintuco',
      medida: 'Galón',
      sku: `SKU-${l.idVariante}`,
      color: idColor === null ? null : { idColor, nombre: `Color ${idColor}`, codigo: null, hexadecimal: '#FFCC00' },
      idImagenPrincipal: null,
      esCombo: false,
      topeUnidades: null,
      disponibilidad: 'disponible',
    },
    precio: {
      indice: i,
      idVariante: l.idVariante,
      idColor,
      cantidad: l.cantidad,
      vendible,
      motivoNoVendible: vendible ? null : 'producto_no_disponible',
      excluidoDeDescuentos: false,
      precioAcordado: (l.idCotizacion ?? null) !== null,
      precioInicial: vendible ? l.precio : null,
      subtotalInicial: vendible ? subtotal : null,
      descuentos: [],
      descuentoTotal: vendible ? 0 : null,
      subtotal: vendible ? subtotal : null,
      precioUnitarioFinal: vendible ? l.precio : null,
    },
    idCotizacion: l.idCotizacion ?? null,
    precioAcordado: (l.idCotizacion ?? null) === null ? null : l.precio,
  };
}

export class CarritoEjemplo implements CarritoCotizacionPort {
  lineas: LineaEjemplo[] = [];
  readonly agregadas: Array<{ idUsuario: number; idCotizacion: number; lineas: readonly LineaAcordada[] }> = [];
  fallo: Error | null = null;

  carritoDeCuenta(): Promise<Carrito> {
    const lineas = this.lineas.map(lineaCarrito);
    return Promise.resolve({ lineas, cantidadItems: lineas.length, calculo: null, union: null });
  }

  agregarLineasAcordadas(idUsuario: number, idCotizacion: number, lineas: readonly LineaAcordada[]): Promise<void> {
    if (this.fallo !== null) return Promise.reject(this.fallo);
    this.agregadas.push({ idUsuario, idCotizacion, lineas });
    return Promise.resolve();
  }
}

export class NotificacionesEjemplo implements NotificacionesCotizacionPort {
  readonly avisos: Array<{ tipo: 'respondida' | 'rechazada'; evento: EventoCotizacion }> = [];
  fallar = false;

  cotizacionRespondida(evento: EventoCotizacion): Promise<void> {
    if (this.fallar) return Promise.reject(new Error('M18 no responde'));
    this.avisos.push({ tipo: 'respondida', evento });
    return Promise.resolve();
  }

  cotizacionRechazada(evento: EventoCotizacion): Promise<void> {
    this.avisos.push({ tipo: 'rechazada', evento });
    return Promise.resolve();
  }
}

/* ── Repositorio en memoria ──────────────────────────────────────────────── */

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Fila = Mutable<Omit<CotizacionGuardada, 'lineas'>> & { lineas: Array<Mutable<LineaGuardada>> };

export const CLIENTES: Record<number, ClienteCotizacion> = {
  50: { idUsuario: 50, nombre: 'Ana Pérez', correo: 'ana@cliente.co', tipo: 'normal' },
  60: { idUsuario: 60, nombre: 'Constructora Sol', correo: 'compras@sol.co', tipo: 'empresa' },
};

export class CotizacionesMemoriaRepository implements CotizacionesRepositoryPort {
  filas: Fila[] = [];
  private siguiente = 1;
  private siguienteLinea = 1;

  constructor(private readonly reloj: () => Date) {}

  private copia(f: Fila): CotizacionGuardada {
    return { ...f, lineas: f.lineas.map((l) => ({ ...l })) };
  }

  crear(n: NuevaCotizacion): Promise<number> {
    const id = this.siguiente++;
    this.filas.push({
      idCotizacion: id,
      codigo: `COT-${String(id).padStart(6, '0')}`,
      idUsuario: n.idUsuario,
      estado: 'solicitada',
      fechaCreacion: this.reloj(),
      comentarioCliente: n.comentario,
      notaParaCliente: null,
      motivoRechazo: null,
      fechaEnvio: null,
      fechaVencimiento: null,
      fechaRespuesta: null,
      totalReferencia: n.totalReferencia,
      totalAcordado: null,
      cliente: CLIENTES[n.idUsuario] ?? null,
      lineas: n.lineas.map((l) => ({ ...l, idLinea: this.siguienteLinea++, precioAcordado: null })),
    });
    return Promise.resolve(id);
  }

  obtener(id: number): Promise<CotizacionGuardada | null> {
    const f = this.filas.find((x) => x.idCotizacion === id);
    return Promise.resolve(f === undefined ? null : this.copia(f));
  }

  listar(f: FiltroCotizaciones): Promise<{ items: Array<CotizacionGuardada & { cantidadLineas: number }>; total: number }> {
    const filtradas = this.filas
      .filter((x) => f.idUsuario === undefined || x.idUsuario === f.idUsuario)
      .filter((x) => f.estado === undefined || x.estado === f.estado || (f.estado === 'solicitada' && x.estado === 'borrador'))
      .filter(
        (x) =>
          f.busqueda === undefined ||
          x.codigo.toLowerCase().includes(f.busqueda.toLowerCase()) ||
          (x.cliente?.nombre.toLowerCase().includes(f.busqueda.toLowerCase()) ?? false),
      )
      .sort((a, b) => b.idCotizacion - a.idCotizacion);
    const items = filtradas
      .slice((f.pagina - 1) * f.limite, f.pagina * f.limite)
      .map((x) => ({ ...this.copia(x), lineas: [], cantidadLineas: x.lineas.length }));
    return Promise.resolve({ items, total: filtradas.length });
  }

  contarAbiertas(idUsuario: number): Promise<number> {
    const abiertos: EstadoCotizacion[] = ['solicitada', 'borrador', 'enviada'];
    return Promise.resolve(this.filas.filter((x) => x.idUsuario === idUsuario && abiertos.includes(x.estado)).length);
  }

  vencerEnviadas(hoy: string): Promise<number> {
    let n = 0;
    for (const f of this.filas) {
      if (f.estado === 'enviada' && f.fechaVencimiento !== null && f.fechaVencimiento < hoy) {
        f.estado = 'vencida';
        n += 1;
      }
    }
    return Promise.resolve(n);
  }

  guardarAjuste(id: number, desde: readonly EstadoCotizacion[], a: AjusteGuardado): Promise<boolean> {
    const f = this.filas.find((x) => x.idCotizacion === id);
    if (f === undefined || !desde.includes(f.estado)) return Promise.resolve(false);
    f.lineas = f.lineas.filter((l) => !a.quitar.includes(l.idLinea));
    for (const l of a.lineas) {
      const linea = f.lineas.find((x) => x.idLinea === l.idLinea);
      if (linea !== undefined) {
        linea.cantidad = l.cantidad;
        linea.precioAcordado = l.precioAcordado;
      }
    }
    f.notaParaCliente = a.notaParaCliente;
    f.fechaVencimiento = a.fechaVencimiento;
    f.totalReferencia = a.totalReferencia;
    return Promise.resolve(true);
  }

  cambiarEstado(id: number, desde: readonly EstadoCotizacion[], c: CambioEstado): Promise<boolean> {
    const f = this.filas.find((x) => x.idCotizacion === id);
    if (f === undefined || !desde.includes(f.estado)) return Promise.resolve(false);
    f.estado = c.estado;
    if (c.fechaEnvio !== undefined) f.fechaEnvio = c.fechaEnvio;
    if (c.fechaRespuesta !== undefined) f.fechaRespuesta = c.fechaRespuesta;
    if (c.fechaVencimiento !== undefined) f.fechaVencimiento = c.fechaVencimiento;
    if (c.totalAcordado !== undefined) f.totalAcordado = c.totalAcordado;
    if (c.motivoRechazo !== undefined) f.motivoRechazo = c.motivoRechazo;
    return Promise.resolve(true);
  }
}
