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
  /** C9: en una transacción aplica el plan y borra el carrito del visitante. */
  unir(plan: PlanUnion): Promise<void>;
}

/** Quién pide: la sesión (si la hay) y el token crudo de la cookie `pc_cart` (si lo hay). */
export interface Solicitante {
  readonly idUsuario: number | null;
  readonly tokenVisitante: string | null;
}

/** Qué hacer con la cookie `pc_cart` después de responder. */
export type AccionCookie = { readonly tipo: 'ninguna' } | { readonly tipo: 'fijar'; readonly token: string } | { readonly tipo: 'borrar' };

export interface ConCookie<T> {
  readonly datos: T;
  readonly cookie: AccionCookie;
}
