/**
 * Tipos de M05 (solo tipos: 0 código en runtime). Los esquemas HTTP están en `dtos/`.
 */

/** C1: de quién es el carrito. Del visitante se guarda solo el hash del token (C2). */
export type DuenoCarrito =
  | { readonly tipo: 'cuenta'; readonly idUsuario: number }
  | { readonly tipo: 'visitante'; readonly hashToken: string };

export interface LineaGuardada {
  readonly idLinea: number;
  readonly idVariante: number;
  readonly idColor: number | null;
  readonly cantidad: number;
  /** C15: la cotización de la que viene; null en una línea normal. */
  readonly idCotizacion: number | null;
  /** C15: precio unitario pactado; null en una línea normal. */
  readonly precioAcordado: number | null;
}

export interface CarritoGuardado {
  readonly idCarrito: number;
  readonly fechaUltimaActividad: Date;
  /** Ordenadas por `idLinea` (el orden en que se agregaron). */
  readonly lineas: readonly LineaGuardada[];
}

export interface LineaNueva {
  readonly idVariante: number;
  readonly idColor: number | null;
  readonly cantidad: number;
}

/** C15: línea que llega de una cotización aceptada, con su precio fijo. */
export interface LineaAcordadaNueva extends LineaNueva {
  readonly precioAcordado: number;
}

/** C9: lo que hay que escribir para unir el carrito del visitante al de la cuenta. */
export interface PlanUnion {
  readonly idCarritoVisitante: number;
  readonly idCarritoCuenta: number;
  readonly actualizar: ReadonlyArray<{ readonly idLinea: number; readonly cantidad: number }>;
  readonly agregar: readonly LineaNueva[];
}

/** Acceso a `carrito` y `linea_carrito`. Ninguna operación cruza carritos: siempre se pasa `idCarrito`. */
export interface CarritoRepositoryPort {
  buscar(dueno: DuenoCarrito): Promise<CarritoGuardado | null>;
  /** Crea un carrito vacío. Si otro pedido lo creó antes (mismo dueño), devuelve ese. */
  crear(dueno: DuenoCarrito): Promise<CarritoGuardado>;
  /** C3: crea la línea o, si ya existe la misma variante y color, le fija `cantidad`. */
  guardarLinea(idCarrito: number, linea: LineaNueva): Promise<void>;
  /** Devuelve false si la línea no es de ese carrito (C14). */
  cambiarCantidad(idCarrito: number, idLinea: number, cantidad: number): Promise<boolean>;
  /** Devuelve false si la línea no es de ese carrito (C14). */
  quitarLinea(idCarrito: number, idLinea: number): Promise<boolean>;
  /** C13: borra las líneas de un carrito de visitante vencido. */
  vaciar(idCarrito: number): Promise<void>;
  /** C13 */
  registrarActividad(idCarrito: number): Promise<void>;
  /** C9: la cuenta no tenía carrito; el del visitante pasa a ser suyo. */
  pasarACuenta(idCarritoVisitante: number, idUsuario: number): Promise<void>;
  /**
   * C9: en una transacción borra el carrito del visitante y aplica el plan. Devuelve false, sin escribir nada, si
   * otra petición ya lo unió (la página y la cabecera piden el carrito a la vez justo después de iniciar sesión).
   */
  unir(plan: PlanUnion): Promise<boolean>;
  /** C15: agrega o reemplaza (misma variante y color) las líneas de una cotización, en una transacción. */
  guardarLineasAcordadas(idCarrito: number, idCotizacion: number, lineas: readonly LineaAcordadaNueva[]): Promise<void>;
  /** C13: borra los carritos de VISITANTE sin actividad desde `antesDe` (con sus líneas). Devuelve cuántos. */
  borrarVisitantesVencidos(antesDe: Date): Promise<number>;
}

/** Quién pide: la sesión (si la hay) y el token crudo de la cookie `pc_cart` (si lo hay). */
export interface Solicitante {
  readonly idUsuario: number | null;
  readonly tokenVisitante: string | null;
}

/** Qué hacer con la cookie `pc_cart` después de responder. */
export type AccionCookie =
  | { readonly tipo: 'ninguna' }
  /** D4: la cookie vive los mismos días que el carrito de visitante (C13). */
  | { readonly tipo: 'fijar'; readonly token: string; readonly diasVigencia: number }
  | { readonly tipo: 'borrar' };

export interface ConCookie<T> {
  readonly datos: T;
  readonly cookie: AccionCookie;
}
