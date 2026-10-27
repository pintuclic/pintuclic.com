import type { LineaParaCompra } from '../../m01-catalogo/dtos/m01-catalogo-entrega3.dto';
import type { Calculo } from '../../m06-precios/dtos/m06-precios.dto';
import {
  CANTIDAD_MAXIMA_POR_LINEA,
  CLAVE_DIAS_VIGENCIA,
  DIAS_VIGENCIA_CARRITO_VISITANTE,
  INTERVALO_LIMPIEZA_MINUTOS,
  MAXIMO_LINEAS_CARRITO,
  diasVigenciaSchema,
  type AgregarLineaRequest,
  type CambioRevalidacion,
  type CambiarCantidadRequest,
  type Carrito,
  type CatalogoCarritoPort,
  type LineaCarrito,
  type ParametrosCarritoPort,
  type PreciosCarritoPort,
  type ProductoLinea,
  type ResumenCarrito,
  type Revalidacion,
  type RevalidarRequest,
  type UnionCarrito,
} from '../dtos/m05-carrito.dto';
import type {
  AccionCookie,
  CarritoGuardado,
  CarritoRepositoryPort,
  ConCookie,
  DuenoCarrito,
  LineaGuardada,
  LineaNueva,
  Solicitante,
} from '../interfaces/carrito.interface';
import { errores } from './carrito-error';
import { esTokenVisitanteValido, generarTokenVisitante, hashTokenVisitante } from './token-visitante';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const SIN_COOKIE: AccionCookie = { tipo: 'ninguna' };

export interface DependenciasCarrito {
  repo: CarritoRepositoryPort;
  /** M06 */
  precios: PreciosCarritoPort;
  /** M01 */
  catalogo: CatalogoCarritoPort;
  /** M17 (C13). Sin él se usan DIAS_VIGENCIA_CARRITO_VISITANTE días. */
  parametros?: ParametrosCarritoPort;
  reloj?: () => Date;
}

/** Lo que resolvió la petición: el carrito (si hay), su dueño y qué hacer con la cookie. */
interface Resolucion {
  dueno: DuenoCarrito | null;
  carrito: CarritoGuardado | null;
  cookie: AccionCookie;
  union: UnionCarrito | null;
  /** C13: días de vigencia del carrito de visitante en esta petición. */
  dias: number;
}

function mismaLinea(a: { idVariante: number; idColor: number | null }, b: LineaNueva): boolean {
  return a.idVariante === b.idVariante && a.idColor === b.idColor;
}

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

function productoDeLinea(c: LineaParaCompra | undefined): ProductoLinea {
  return {
    idProducto: c?.idProducto ?? null,
    nombre: c?.nombreProducto ?? null,
    marca: c?.marca ?? null,
    medida: c?.medida ?? null,
    sku: c?.sku ?? null,
    color: c?.color ?? null,
    idImagenPrincipal: c?.idImagenPrincipal ?? null,
    esCombo: c?.esCombo ?? false,
    topeUnidades: c?.topeUnidades ?? null,
    disponibilidad: c?.disponibilidad ?? null,
  };
}

/**
 * Reglas C1–C14 del contrato de M05. No calcula precios: los pide a M06 y los devuelve tal cual (C7).
 */
export class CarritoService {
  private readonly reloj: () => Date;
  /** C13: momento de la última limpieza de carritos vencidos (una por intervalo y por proceso). */
  private ultimaLimpieza = Number.NEGATIVE_INFINITY;

  constructor(private readonly dep: DependenciasCarrito) {
    this.reloj = dep.reloj ?? (() => new Date());
  }

  /* ── Rutas ────────────────────────────────────────────────────────────── */

  async consultar(sol: Solicitante, codigoCupon?: string): Promise<ConCookie<Carrito>> {
    const r = await this.resolver(sol);
    return { datos: await this.armar(r, sol.idUsuario, codigoCupon), cookie: r.cookie };
  }

  async resumen(sol: Solicitante): Promise<ConCookie<ResumenCarrito>> {
    const r = await this.resolver(sol);
    const carrito = await this.armar(r, sol.idUsuario);
    return {
      datos: { cantidadItems: carrito.cantidadItems, total: carrito.calculo?.resumen.total ?? 0 },
      cookie: r.cookie,
    };
  }

  /** C3, C4, C5, C6 */
  async agregar(sol: Solicitante, req: AgregarLineaRequest): Promise<ConCookie<Carrito>> {
    const nueva: LineaNueva = { idVariante: req.idVariante, idColor: req.idColor ?? null, cantidad: req.cantidad };
    const [enCatalogo] = await this.dep.catalogo.consultarLineas([
      { idVariante: nueva.idVariante, idColor: nueva.idColor },
    ]);
    if (enCatalogo === undefined || !enCatalogo.vendible) {
      throw errores.productoNoDisponible(enCatalogo?.motivoNoVendible ?? 'variante_no_existe');
    }

    const r = await this.resolver(sol);
    const existente = r.carrito?.lineas.find((l) => mismaLinea(l, nueva));
    const cantidad = (existente?.cantidad ?? 0) + nueva.cantidad;
    if (cantidad > CANTIDAD_MAXIMA_POR_LINEA) throw errores.cantidadFueraDeRango(CANTIDAD_MAXIMA_POR_LINEA);
    if (existente === undefined && (r.carrito?.lineas.length ?? 0) >= MAXIMO_LINEAS_CARRITO) {
      throw errores.limiteLineas(MAXIMO_LINEAS_CARRITO);
    }
    this.comprobarTope(enCatalogo, cantidad);

    const { carrito, cookie } = await this.asegurarCarrito(r, sol);
    await this.dep.repo.guardarLinea(carrito.idCarrito, { ...nueva, cantidad });
    await this.dep.repo.registrarActividad(carrito.idCarrito);
    return this.recargar(r, cookie, sol.idUsuario, req.codigoCupon);
  }

  /** C4, C12: fija la cantidad (no suma). */
  async cambiarCantidad(sol: Solicitante, idLinea: number, req: CambiarCantidadRequest): Promise<ConCookie<Carrito>> {
    const r = await this.resolver(sol);
    const linea = r.carrito?.lineas.find((l) => l.idLinea === idLinea);
    if (r.carrito === null || linea === undefined) throw errores.noDisponible();

    const [enCatalogo] = await this.dep.catalogo.consultarLineas([
      { idVariante: linea.idVariante, idColor: linea.idColor },
    ]);
    if (enCatalogo !== undefined) this.comprobarTope(enCatalogo, req.cantidad);

    if (!(await this.dep.repo.cambiarCantidad(r.carrito.idCarrito, idLinea, req.cantidad))) {
      throw errores.noDisponible();
    }
    await this.dep.repo.registrarActividad(r.carrito.idCarrito);
    return this.recargar(r, r.cookie, sol.idUsuario, req.codigoCupon);
  }

  async quitar(sol: Solicitante, idLinea: number, codigoCupon?: string): Promise<ConCookie<Carrito>> {
    const r = await this.resolver(sol);
    if (r.carrito === null || !(await this.dep.repo.quitarLinea(r.carrito.idCarrito, idLinea))) {
      throw errores.noDisponible();
    }
    await this.dep.repo.registrarActividad(r.carrito.idCarrito);
    return this.recargar(r, r.cookie, sol.idUsuario, codigoCupon);
  }

  /** C11 (HU-CAR-05): compara lo que el cliente tiene en pantalla con un cálculo nuevo. */
  async revalidar(sol: Solicitante, req: RevalidarRequest): Promise<ConCookie<Revalidacion>> {
    const r = await this.resolver(sol);
    const carrito = await this.armar(r, sol.idUsuario, req.codigoCupon);
    const cambios: CambioRevalidacion[] = [];

    const enPantalla = new Map(req.lineas.map((l) => [l.idLinea, l.subtotal]));
    for (const linea of carrito.lineas) {
      const precio = linea.precio;
      if (precio === null || !precio.vendible) {
        cambios.push({
          tipo: 'linea_no_vendible',
          idLinea: linea.idLinea,
          motivo: precio?.motivoNoVendible ?? 'producto_no_disponible',
        });
        continue;
      }
      if (!enPantalla.has(linea.idLinea)) {
        cambios.push({ tipo: 'linea_nueva', idLinea: linea.idLinea });
        continue;
      }
      const anterior = enPantalla.get(linea.idLinea) ?? null;
      const nuevo = precio.subtotal ?? 0;
      if (anterior === null || centavos(anterior) !== centavos(nuevo)) {
        cambios.push({ tipo: 'precio_cambio', idLinea: linea.idLinea, subtotalAnterior: anterior ?? 0, subtotalNuevo: nuevo });
      }
    }
    const idsActuales = new Set(carrito.lineas.map((l) => l.idLinea));
    for (const l of req.lineas) {
      if (!idsActuales.has(l.idLinea)) cambios.push({ tipo: 'linea_quitada', idLinea: l.idLinea });
    }

    const cupon = carrito.calculo?.cupon ?? null;
    if (cupon !== null && !cupon.aplicado && cupon.motivoRechazo !== null) {
      cambios.push({ tipo: 'cupon_no_aplica', codigo: cupon.codigo, motivo: cupon.motivoRechazo });
    }
    const totalNuevo = carrito.calculo?.resumen.total ?? 0;
    if (centavos(totalNuevo) !== centavos(req.total)) {
      cambios.push({ tipo: 'total_cambio', totalAnterior: req.total, totalNuevo });
    }

    const puedeContinuar = carrito.lineas.length > 0 && carrito.calculo !== null && cambios.length === 0;
    return { datos: { carrito, cambios, puedeContinuar }, cookie: r.cookie };
  }

  /* ── Dueño y unión (C1, C2, C9, C13) ─────────────────────────────────── */

  private async resolver(sol: Solicitante): Promise<Resolucion> {
    const dias = await this.diasVigencia();
    this.limpiarVencidos(dias);
    const token = esTokenVisitanteValido(sol.tokenVisitante) ? sol.tokenVisitante : null;

    if (sol.idUsuario !== null) {
      const dueno: DuenoCarrito = { tipo: 'cuenta', idUsuario: sol.idUsuario };
      const cuenta = await this.dep.repo.buscar(dueno);
      if (token === null) {
        // Una cookie con otra forma se borra para no arrastrarla.
        const cookie: AccionCookie = sol.tokenVisitante === null ? SIN_COOKIE : { tipo: 'borrar' };
        return { dueno, carrito: cuenta, cookie, union: null, dias };
      }
      const visitante = await this.dep.repo.buscar({ tipo: 'visitante', hashToken: hashTokenVisitante(token) });
      if (visitante === null || this.vencido(visitante, dias) || visitante.lineas.length === 0) {
        return { dueno, carrito: cuenta, cookie: { tipo: 'borrar' }, union: null, dias };
      }
      const union = await this.unir(visitante, cuenta, sol.idUsuario);
      return { dueno, carrito: await this.dep.repo.buscar(dueno), cookie: { tipo: 'borrar' }, union, dias };
    }

    if (token === null) {
      const cookie: AccionCookie = sol.tokenVisitante === null ? SIN_COOKIE : { tipo: 'borrar' };
      return { dueno: null, carrito: null, cookie, union: null, dias };
    }
    const dueno: DuenoCarrito = { tipo: 'visitante', hashToken: hashTokenVisitante(token) };
    const carrito = await this.dep.repo.buscar(dueno);
    if (carrito !== null && this.vencido(carrito, dias)) {
      // C13: el vencido se ve vacío; se vacía al volver a agregar o lo borra la limpieza.
      return { dueno, carrito: { ...carrito, lineas: [] }, cookie: SIN_COOKIE, union: null, dias };
    }
    return { dueno, carrito, cookie: SIN_COOKIE, union: null, dias };
  }

  /** C13: días del parámetro de M17; si no se puede leer o está fuera de rango, el valor por defecto. */
  private async diasVigencia(): Promise<number> {
    try {
      const valor = await this.dep.parametros?.obtenerNumero(CLAVE_DIAS_VIGENCIA);
      const r = diasVigenciaSchema.safeParse(valor);
      return r.success ? r.data : DIAS_VIGENCIA_CARRITO_VISITANTE;
    } catch {
      return DIAS_VIGENCIA_CARRITO_VISITANTE;
    }
  }

  private vencido(c: CarritoGuardado, dias: number): boolean {
    return this.reloj().getTime() - c.fechaUltimaActividad.getTime() > dias * MS_POR_DIA;
  }

  /** C13: borra los carritos de visitante vencidos, como máximo una vez por intervalo y sin esperar. */
  private limpiarVencidos(dias: number): void {
    const ahora = this.reloj().getTime();
    if (ahora - this.ultimaLimpieza < INTERVALO_LIMPIEZA_MINUTOS * 60 * 1000) return;
    this.ultimaLimpieza = ahora;
    void this.dep.repo.borrarVisitantesVencidos(new Date(ahora - dias * MS_POR_DIA)).catch(() => {
      // Si falla, se intenta en el siguiente intervalo; la petición del cliente sigue normal.
    });
  }

  /** C9: une el carrito del visitante al de la cuenta (o se lo pasa si la cuenta no tenía). */
  private async unir(visitante: CarritoGuardado, cuenta: CarritoGuardado | null, idUsuario: number): Promise<UnionCarrito> {
    if (cuenta === null) {
      await this.dep.repo.pasarACuenta(visitante.idCarrito, idUsuario);
      return { lineasAgregadas: visitante.lineas.length, lineasSumadas: 0, lineasDescartadas: 0, cantidadesAjustadas: 0 };
    }

    const actualizar: Array<{ idLinea: number; cantidad: number }> = [];
    const agregar: LineaNueva[] = [];
    let lineasDescartadas = 0;
    let cantidadesAjustadas = 0;
    for (const v of visitante.lineas) {
      const igual = cuenta.lineas.find((l) => mismaLinea(l, v));
      if (igual !== undefined) {
        const suma = igual.cantidad + v.cantidad;
        if (suma > CANTIDAD_MAXIMA_POR_LINEA) cantidadesAjustadas += 1;
        actualizar.push({ idLinea: igual.idLinea, cantidad: Math.min(suma, CANTIDAD_MAXIMA_POR_LINEA) });
      } else if (cuenta.lineas.length + agregar.length < MAXIMO_LINEAS_CARRITO) {
        agregar.push({ idVariante: v.idVariante, idColor: v.idColor, cantidad: v.cantidad });
      } else {
        lineasDescartadas += 1;
      }
    }
    await this.dep.repo.unir({
      idCarritoVisitante: visitante.idCarrito,
      idCarritoCuenta: cuenta.idCarrito,
      actualizar,
      agregar,
    });
    return { lineasAgregadas: agregar.length, lineasSumadas: actualizar.length, lineasDescartadas, cantidadesAjustadas };
  }

  /** C2: crea el carrito en la primera escritura; al visitante le da su token. */
  private async asegurarCarrito(
    r: Resolucion,
    sol: Solicitante,
  ): Promise<{ carrito: CarritoGuardado; cookie: AccionCookie }> {
    if (r.carrito !== null) {
      if (r.carrito.lineas.length === 0 && r.dueno?.tipo === 'visitante') {
        // Puede ser un vencido que se ve vacío (C13).
        await this.dep.repo.vaciar(r.carrito.idCarrito);
      }
      return { carrito: r.carrito, cookie: r.cookie };
    }
    if (sol.idUsuario !== null) {
      return { carrito: await this.dep.repo.crear({ tipo: 'cuenta', idUsuario: sol.idUsuario }), cookie: r.cookie };
    }
    const token = generarTokenVisitante();
    const carrito = await this.dep.repo.crear({ tipo: 'visitante', hashToken: hashTokenVisitante(token) });
    return { carrito, cookie: { tipo: 'fijar', token, diasVigencia: r.dias } };
  }

  private comprobarTope(enCatalogo: LineaParaCompra, cantidad: number): void {
    if (enCatalogo.esCombo && enCatalogo.topeUnidades !== null && cantidad > enCatalogo.topeUnidades) {
      throw errores.sinExistencia(enCatalogo.topeUnidades);
    }
  }

  /* ── Vista (C7) ───────────────────────────────────────────────────────── */

  private async recargar(
    r: Resolucion,
    cookie: AccionCookie,
    idUsuario: number | null,
    codigoCupon?: string,
  ): Promise<ConCookie<Carrito>> {
    const dueno: DuenoCarrito | null =
      cookie.tipo === 'fijar' ? { tipo: 'visitante', hashToken: hashTokenVisitante(cookie.token) } : r.dueno;
    const carrito = dueno === null ? null : await this.dep.repo.buscar(dueno);
    return { datos: await this.armar({ ...r, carrito }, idUsuario, codigoCupon), cookie };
  }

  private async armar(r: Resolucion, idUsuario: number | null, codigoCupon?: string): Promise<Carrito> {
    const lineas: readonly LineaGuardada[] = r.carrito?.lineas ?? [];
    if (lineas.length === 0) return { lineas: [], cantidadItems: 0, calculo: null, union: r.union };

    const consultas = lineas.map((l) => ({ idVariante: l.idVariante, idColor: l.idColor }));
    const [enCatalogo, calculo] = await Promise.all([
      this.dep.catalogo.consultarLineas(consultas),
      this.calcular(lineas, idUsuario, codigoCupon),
    ]);

    const vista: LineaCarrito[] = lineas.map((l, i) => ({
      idLinea: l.idLinea,
      idVariante: l.idVariante,
      idColor: l.idColor,
      cantidad: l.cantidad,
      producto: productoDeLinea(enCatalogo[i]),
      precio: calculo?.lineas.find((p) => p.indice === i) ?? null,
    }));
    const cantidadItems = vista.reduce((suma, l) => (l.precio?.vendible === true ? suma + l.cantidad : suma), 0);
    return { lineas: vista, cantidadItems, calculo, union: r.union };
  }

  /** Si M06 falla, el carrito se muestra sin precios y no deja continuar (C11), en vez de no mostrarse. */
  private async calcular(
    lineas: readonly LineaGuardada[],
    idUsuario: number | null,
    codigoCupon?: string,
  ): Promise<Calculo | null> {
    try {
      return await this.dep.precios.calcular({
        lineas: lineas.map((l) => ({ idVariante: l.idVariante, idColor: l.idColor, cantidad: l.cantidad })),
        ...(codigoCupon === undefined ? {} : { codigoCupon }),
        contexto: { idUsuario },
      });
    } catch {
      return null;
    }
  }
}
