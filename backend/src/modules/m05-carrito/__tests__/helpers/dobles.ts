import type {
  CatalogoParaCompraPort,
  LineaConsultaCompra,
  LineaParaCompra,
} from '../../../m01-catalogo/dtos/m01-catalogo-entrega3.dto';
import type {
  AvisoCalculo,
  Calculo,
  CalculoEntrada,
  DescuentoAplicado,
  LineaCalculada,
} from '../../../m06-precios/dtos/m06-precios.dto';
import type { PreciosCarritoPort } from '../../dtos/m05-carrito.dto';
import type {
  CarritoGuardado,
  CarritoRepositoryPort,
  DuenoCarrito,
  LineaAcordadaNueva,
  LineaNueva,
  PlanUnion,
} from '../../interfaces/carrito.interface';

/* ── Catálogo de ejemplo (M01) ───────────────────────────────────────────── */

export interface VarianteEjemplo {
  precioBase: number;
  vendible?: boolean;
  esCombo?: boolean;
  topeUnidades?: number | null;
  /** % del evento de ejemplo; 0 = sin evento. */
  evento?: number;
}

/** Variantes del ejemplo: 1 vinilo con evento 10 %, 2 esmalte, 3 combo con tope 5, 4 retirada. */
export const VARIANTES: Record<number, VarianteEjemplo> = {
  1: { precioBase: 100_000, evento: 10 },
  2: { precioBase: 45_000 },
  3: { precioBase: 80_000, esCombo: true, topeUnidades: 5 },
  4: { precioBase: 30_000, vendible: false },
};

export class CatalogoEjemplo implements CatalogoParaCompraPort {
  readonly variantes: Record<number, VarianteEjemplo> = structuredClone(VARIANTES);

  consultarLineas(consultas: readonly LineaConsultaCompra[]): Promise<LineaParaCompra[]> {
    return Promise.resolve(
      consultas.map((c) => {
        const v = this.variantes[c.idVariante];
        const idColor = c.idColor ?? null;
        if (v === undefined) {
          return {
            idVariante: c.idVariante,
            idColor,
            idProducto: null,
            vendible: false,
            motivoNoVendible: 'variante_no_existe',
            esCombo: false,
            topeUnidades: null,
            precioBase: null,
            excluidoDeDescuentos: false,
            disponibilidad: null,
            nombreProducto: null,
            marca: null,
            medida: null,
            sku: null,
            color: null,
            idImagenPrincipal: null,
          };
        }
        const vendible = v.vendible ?? true;
        return {
          idVariante: c.idVariante,
          idColor,
          idProducto: c.idVariante * 10,
          vendible,
          motivoNoVendible: vendible ? null : 'producto_no_disponible',
          esCombo: v.esCombo ?? false,
          topeUnidades: v.topeUnidades ?? null,
          precioBase: v.precioBase,
          excluidoDeDescuentos: v.esCombo ?? false,
          disponibilidad: 'disponible',
          nombreProducto: `Producto ${c.idVariante}`,
          marca: 'Pintuco',
          medida: 'Galón',
          sku: `SKU-${c.idVariante}`,
          color: idColor === null ? null : { idColor, nombre: `Color ${idColor}`, codigo: null, hexadecimal: '#FFCC00' },
          idImagenPrincipal: null,
        };
      }),
    );
  }
}

/* ── Precios de ejemplo (doble de M06) ───────────────────────────────────── */

const redondear = (v: number): number => Math.round(v * 100) / 100;

/** Cuenta empresa del ejemplo: "Proveedor" 15 % con mínimo de 1 000 000. */
export const ID_USUARIO_EMPRESA = 50;
/** Cliente particular del ejemplo: recibe la invitación a cuenta empresa desde 500 000. */
export const ID_USUARIO_PARTICULAR = 60;
export const CUPON_VALIDO = 'BIENVENIDA10';

/**
 * Doble de `PreciosPort.calcular` con cálculos de ejemplo que respetan `calculoSchema`:
 * evento, aviso de empresa, invitación a cuenta empresa, cupón aceptado o rechazado y línea no vendible.
 */
export class PreciosEjemplo implements PreciosCarritoPort {
  readonly llamadas: CalculoEntrada[] = [];
  fallar = false;

  constructor(private readonly catalogo: CatalogoEjemplo) {}

  calcular(entrada: CalculoEntrada): Promise<Calculo> {
    this.llamadas.push(entrada);
    if (this.fallar) return Promise.reject(new Error('M06 no responde'));

    const cupon = entrada.codigoCupon;
    const cuponValido = cupon === CUPON_VALIDO;
    const lineas: LineaCalculada[] = entrada.lineas.map((l, indice) => {
      const v = this.catalogo.variantes[l.idVariante];
      const acordado = l.precioAcordado;
      const base = {
        indice,
        idVariante: l.idVariante,
        idColor: l.idColor ?? null,
        cantidad: l.cantidad,
        precioAcordado: acordado !== undefined,
      };
      if (v === undefined || v.vendible === false) {
        return {
          ...base,
          vendible: false,
          motivoNoVendible: v === undefined ? 'variante_no_existe' : 'producto_no_disponible',
          excluidoDeDescuentos: false,
          precioInicial: null,
          subtotalInicial: null,
          descuentos: [],
          descuentoTotal: null,
          subtotal: null,
          precioUnitarioFinal: null,
        };
      }
      const precioInicial = acordado ?? v.precioBase;
      const subtotalInicial = redondear(precioInicial * l.cantidad);
      const descuentos: DescuentoAplicado[] = [];
      let subtotal = subtotalInicial;
      // R3 de M06: un precio acordado no recibe descuentos.
      const excluido = v.esCombo === true || acordado !== undefined;
      if (!excluido && (v.evento ?? 0) > 0) {
        const importe = redondear((subtotal * (v.evento ?? 0)) / 100);
        descuentos.push({ ordenAplicacion: 1, tipoOrigen: 'evento', idRegla: 7, origen: 'Miércoles de color', porcentaje: v.evento ?? 0, importe });
        subtotal = redondear(subtotal - importe);
      }
      if (!excluido && cuponValido) {
        const importe = redondear(subtotal * 0.1);
        descuentos.push({ ordenAplicacion: descuentos.length + 1, tipoOrigen: 'cupon', idRegla: 3, origen: `Cupón ${CUPON_VALIDO}`, porcentaje: 10, importe });
        subtotal = redondear(subtotal - importe);
      }
      const descuentoTotal = redondear(subtotalInicial - subtotal);
      return {
        ...base,
        vendible: true,
        motivoNoVendible: null,
        excluidoDeDescuentos: v.esCombo === true,
        precioInicial,
        subtotalInicial,
        descuentos,
        descuentoTotal,
        subtotal,
        precioUnitarioFinal: redondear(subtotal / l.cantidad),
      };
    });

    const vendibles = lineas.filter((l) => l.vendible);
    const suma = (f: (l: LineaCalculada) => number): number => redondear(vendibles.reduce((s, l) => s + f(l), 0));
    const porOrigen = (o: DescuentoAplicado['tipoOrigen']): number =>
      suma((l) => l.descuentos.filter((d) => d.tipoOrigen === o).reduce((s, d) => s + d.importe, 0));
    const total = suma((l) => l.subtotal ?? 0);
    const descuentoEventos = porOrigen('evento');
    const descuentoCupon = porOrigen('cupon');
    const baseSinImpuesto = redondear(total / 1.19);

    const esEmpresa = entrada.contexto.idUsuario === ID_USUARIO_EMPRESA;
    const totalTrasEventos = redondear(total + descuentoCupon);
    const avisos: AvisoCalculo[] = [];
    if (esEmpresa && totalTrasEventos < 1_000_000) {
      avisos.push({ tipo: 'empresa_falta_monto', tipoCliente: 'Proveedor', porcentaje: 15, montoMinimo: 1_000_000, faltante: redondear(1_000_000 - totalTrasEventos) });
    }
    if (entrada.contexto.idUsuario === ID_USUARIO_PARTICULAR && totalTrasEventos >= 500_000) {
      avisos.push({ tipo: 'sugerir_cuenta_empresa', umbral: 500_000 });
    }

    return Promise.resolve({
      lineas,
      cupon:
        cupon === undefined
          ? null
          : {
              codigo: cupon,
              aplicado: cuponValido,
              motivoRechazo: cuponValido ? null : 'cupon_no_valido',
              montoMinimo: null,
              descuento: descuentoCupon,
              idCupon: cuponValido ? 3 : null,
            },
      empresa: esEmpresa
        ? {
            idSubRolEmpresa: 1,
            tipo: 'Proveedor',
            porcentaje: 15,
            montoMinimoCompra: 1_000_000,
            totalCarrito: totalTrasEventos,
            aplicado: false,
            faltante: redondear(Math.max(0, 1_000_000 - totalTrasEventos)),
            descuento: 0,
          }
        : null,
      avisos,
      resumen: {
        subtotalInicial: suma((l) => l.subtotalInicial ?? 0),
        descuentoEventos,
        descuentoEmpresa: 0,
        descuentoCupon,
        descuentoTotal: redondear(descuentoEventos + descuentoCupon),
        total,
        tasaIva: 19,
        baseSinImpuesto,
        importeIva: redondear(total - baseSinImpuesto),
      },
      perfil: { tipo: esEmpresa ? 'empresa' : 'particular', idSubRolEmpresa: esEmpresa ? 1 : null },
      calculadoEn: '2026-10-26T15:00:00.000Z',
    });
  }
}

/* ── Repositorio en memoria ──────────────────────────────────────────────── */

interface CarritoMemoria {
  idCarrito: number;
  idUsuario: number | null;
  hashToken: string | null;
  fechaUltimaActividad: Date;
}

interface LineaMemoria {
  idLinea: number;
  idCarrito: number;
  idVariante: number;
  idColor: number | null;
  cantidad: number;
  idCotizacion: number | null;
  precioAcordado: number | null;
}

export class CarritoMemoriaRepository implements CarritoRepositoryPort {
  carritos: CarritoMemoria[] = [];
  lineas: LineaMemoria[] = [];
  private siguienteCarrito = 1;
  private siguienteLinea = 1;

  constructor(private readonly reloj: () => Date = () => new Date()) {}

  private encontrar(dueno: DuenoCarrito): CarritoMemoria | undefined {
    return this.carritos.find((c) =>
      dueno.tipo === 'cuenta' ? c.idUsuario === dueno.idUsuario : c.hashToken === dueno.hashToken,
    );
  }

  private leer(c: CarritoMemoria): CarritoGuardado {
    return {
      idCarrito: c.idCarrito,
      fechaUltimaActividad: c.fechaUltimaActividad,
      lineas: this.lineas
        .filter((l) => l.idCarrito === c.idCarrito)
        .sort((a, b) => a.idLinea - b.idLinea)
        .map(({ idLinea, idVariante, idColor, cantidad, idCotizacion, precioAcordado }) => ({
          idLinea,
          idVariante,
          idColor,
          cantidad,
          idCotizacion,
          precioAcordado,
        })),
    };
  }

  buscar(dueno: DuenoCarrito): Promise<CarritoGuardado | null> {
    const c = this.encontrar(dueno);
    return Promise.resolve(c === undefined ? null : this.leer(c));
  }

  crear(dueno: DuenoCarrito): Promise<CarritoGuardado> {
    const existente = this.encontrar(dueno);
    if (existente !== undefined) return Promise.resolve(this.leer(existente));
    const c: CarritoMemoria = {
      idCarrito: this.siguienteCarrito++,
      idUsuario: dueno.tipo === 'cuenta' ? dueno.idUsuario : null,
      hashToken: dueno.tipo === 'visitante' ? dueno.hashToken : null,
      fechaUltimaActividad: this.reloj(),
    };
    this.carritos.push(c);
    return Promise.resolve(this.leer(c));
  }

  /** Para las pruebas: un carrito de visitante con sus líneas y su fecha. */
  sembrar(dueno: DuenoCarrito, lineas: readonly LineaNueva[], fecha: Date): number {
    const c: CarritoMemoria = {
      idCarrito: this.siguienteCarrito++,
      idUsuario: dueno.tipo === 'cuenta' ? dueno.idUsuario : null,
      hashToken: dueno.tipo === 'visitante' ? dueno.hashToken : null,
      fechaUltimaActividad: fecha,
    };
    this.carritos.push(c);
    for (const l of lineas) {
      this.lineas.push({ idLinea: this.siguienteLinea++, idCarrito: c.idCarrito, idCotizacion: null, precioAcordado: null, ...l });
    }
    return c.idCarrito;
  }

  guardarLinea(idCarrito: number, linea: LineaNueva): Promise<void> {
    const existente = this.lineas.find(
      (l) => l.idCarrito === idCarrito && l.idVariante === linea.idVariante && l.idColor === linea.idColor,
    );
    if (existente !== undefined) existente.cantidad = linea.cantidad;
    else this.lineas.push({ idLinea: this.siguienteLinea++, idCarrito, idCotizacion: null, precioAcordado: null, ...linea });
    return Promise.resolve();
  }

  guardarLineasAcordadas(idCarrito: number, idCotizacion: number, lineas: readonly LineaAcordadaNueva[]): Promise<void> {
    for (const l of lineas) {
      const existente = this.lineas.find(
        (x) => x.idCarrito === idCarrito && x.idVariante === l.idVariante && x.idColor === l.idColor,
      );
      if (existente !== undefined) {
        existente.cantidad = l.cantidad;
        existente.idCotizacion = idCotizacion;
        existente.precioAcordado = l.precioAcordado;
      } else {
        this.lineas.push({ idLinea: this.siguienteLinea++, idCarrito, ...l, idCotizacion });
      }
    }
    return Promise.resolve();
  }

  cambiarCantidad(idCarrito: number, idLinea: number, cantidad: number): Promise<boolean> {
    const l = this.lineas.find((x) => x.idLinea === idLinea && x.idCarrito === idCarrito);
    if (l !== undefined) l.cantidad = cantidad;
    return Promise.resolve(l !== undefined);
  }

  quitarLinea(idCarrito: number, idLinea: number): Promise<boolean> {
    const antes = this.lineas.length;
    this.lineas = this.lineas.filter((x) => !(x.idLinea === idLinea && x.idCarrito === idCarrito));
    return Promise.resolve(this.lineas.length < antes);
  }

  vaciar(idCarrito: number): Promise<void> {
    this.lineas = this.lineas.filter((x) => x.idCarrito !== idCarrito);
    return Promise.resolve();
  }

  registrarActividad(idCarrito: number): Promise<void> {
    const c = this.carritos.find((x) => x.idCarrito === idCarrito);
    if (c !== undefined) c.fechaUltimaActividad = this.reloj();
    return Promise.resolve();
  }

  pasarACuenta(idCarritoVisitante: number, idUsuario: number): Promise<void> {
    const c = this.carritos.find((x) => x.idCarrito === idCarritoVisitante);
    if (c !== undefined) {
      c.idUsuario = idUsuario;
      c.hashToken = null;
    }
    return Promise.resolve();
  }

  /** Fechas de corte con que se pidió borrar (para comprobar el intervalo de C13). */
  readonly limpiezas: Date[] = [];

  borrarVisitantesVencidos(antesDe: Date): Promise<number> {
    this.limpiezas.push(antesDe);
    const vencidos = new Set(
      this.carritos
        .filter((c) => c.idUsuario === null && c.hashToken !== null && c.fechaUltimaActividad < antesDe)
        .map((c) => c.idCarrito),
    );
    this.carritos = this.carritos.filter((c) => !vencidos.has(c.idCarrito));
    this.lineas = this.lineas.filter((l) => !vencidos.has(l.idCarrito));
    return Promise.resolve(vencidos.size);
  }

  unir(plan: PlanUnion): Promise<void> {
    for (const a of plan.actualizar) {
      const l = this.lineas.find((x) => x.idLinea === a.idLinea && x.idCarrito === plan.idCarritoCuenta);
      if (l !== undefined) l.cantidad = a.cantidad;
    }
    for (const n of plan.agregar) {
      this.lineas.push({ idLinea: this.siguienteLinea++, idCarrito: plan.idCarritoCuenta, idCotizacion: null, precioAcordado: null, ...n });
    }
    this.lineas = this.lineas.filter((x) => x.idCarrito !== plan.idCarritoVisitante);
    this.carritos = this.carritos.filter((x) => x.idCarrito !== plan.idCarritoVisitante);
    return Promise.resolve();
  }
}
