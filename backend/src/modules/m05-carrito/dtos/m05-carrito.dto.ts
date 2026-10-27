import { z } from 'zod';
import { hexadecimalSchema, idSchema, respuestaUno } from '../../m01-catalogo/dtos/m01-catalogo.dto';
import { disponibilidadSchema, existenciaSchema } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import type { CatalogoParaCompraPort } from '../../m01-catalogo/dtos/m01-catalogo-entrega3.dto';
import {
  CANTIDAD_MAXIMA_LINEA,
  MAXIMO_LINEAS_CALCULO,
  calculoSchema,
  cantidadSchema,
  codigoCuponEntradaSchema,
  dineroSchema,
  lineaCalculadaSchema,
  motivoCuponSchema,
  motivoNoVendibleSchema,
} from '../../m06-precios/dtos/m06-precios.dto';
import type { PreciosPort } from '../../m06-precios/dtos/m06-precios.dto';

/**
 * Espejo fiel de `contracts/m05-carrito.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `m05-carrito.contrato-espejo.test.ts` falla si ambos difieren.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** C5: lo que acepta un cálculo de M06. */
export const MAXIMO_LINEAS_CARRITO = MAXIMO_LINEAS_CALCULO;
/** C4 */
export const CANTIDAD_MAXIMA_POR_LINEA = CANTIDAD_MAXIMA_LINEA;
/** C13: parámetro de M17 con los días de vigencia del carrito de visitante. */
export const CLAVE_DIAS_VIGENCIA = 'comercial.dias_vigencia_carrito_visitante';
/** C13: valor si el parámetro no se puede leer (es también su valor inicial en el seed). */
export const DIAS_VIGENCIA_CARRITO_VISITANTE = 30;
/** C13: rango del parámetro (igual al de `parametro_sistema`). */
export const diasVigenciaSchema = z.number().int().min(1).max(365);
/** C13: cada cuánto, como máximo, se borran los carritos de visitante vencidos. */
export const INTERVALO_LIMPIEZA_MINUTOS = 60;

/** C2 / D4: cookie del carrito de visitante. Su vida (`maxAge`) son los días de C13. */
export const atributosCookieCarritoSchema = z.object({
  nombre: z.literal('pc_cart'),
  httpOnly: z.literal(true),
  secure: z.literal(true),
  sameSite: z.literal('lax'),
  path: z.literal('/'),
});
export type AtributosCookieCarrito = z.infer<typeof atributosCookieCarritoSchema>;

export const ATRIBUTOS_COOKIE_CARRITO: AtributosCookieCarrito = {
  nombre: 'pc_cart',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

/** Id de una línea del carrito en la URL (`:idLinea`). */
export const idLineaParamsSchema = z.object({
  idLinea: z.coerce.number().int().positive(),
});
export type IdLineaParams = z.infer<typeof idLineaParamsSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /carrito — el cupón lo envía la pantalla en cada consulta (C8). */
export const consultarCarritoRequestSchema = z.object({
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type ConsultarCarritoRequest = z.infer<typeof consultarCarritoRequestSchema>;

/** POST /carrito/lineas — agrega o suma (C3, C4, C6). */
export const agregarLineaRequestSchema = z.object({
  idVariante: idSchema,
  /** El color elegido; null u omitido si el producto no lleva color. */
  idColor: idSchema.nullable().optional(),
  cantidad: cantidadSchema,
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type AgregarLineaRequest = z.infer<typeof agregarLineaRequestSchema>;

/** PATCH /carrito/lineas/:idLinea — fija la cantidad (C4, C12). */
export const cambiarCantidadRequestSchema = z.object({
  cantidad: cantidadSchema,
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type CambiarCantidadRequest = z.infer<typeof cambiarCantidadRequestSchema>;

/** DELETE /carrito/lineas/:idLinea — el cupón viaja en la query para devolver el carrito calculado. */
export const quitarLineaRequestSchema = consultarCarritoRequestSchema;
export type QuitarLineaRequest = z.infer<typeof quitarLineaRequestSchema>;

/** Lo que el cliente veía de una línea al pulsar "Continuar". */
export const lineaEnPantallaSchema = z.object({
  idLinea: idSchema,
  /** Null si la línea ya se mostraba como no vendible. */
  subtotal: dineroSchema.nullable(),
});
export type LineaEnPantalla = z.infer<typeof lineaEnPantallaSchema>;

/** POST /carrito/revalidar (C11). */
export const revalidarRequestSchema = z.object({
  lineas: z.array(lineaEnPantallaSchema).max(MAXIMO_LINEAS_CARRITO),
  total: dineroSchema,
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type RevalidarRequest = z.infer<typeof revalidarRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Datos del catálogo para pintar la línea (de CatalogoParaCompraPort). */
export const productoLineaSchema = z.object({
  /** Null si la variante ya no existe. */
  idProducto: idSchema.nullable(),
  nombre: z.string().nullable(),
  marca: z.string().nullable(),
  medida: z.string().nullable(),
  sku: z.string().nullable(),
  color: z
    .object({
      idColor: idSchema,
      nombre: z.string(),
      codigo: z.string().nullable(),
      hexadecimal: hexadecimalSchema,
    })
    .nullable(),
  idImagenPrincipal: idSchema.nullable(),
  esCombo: z.boolean(),
  /** Solo combos: tope de unidades (C4). Null = sin tope. */
  topeUnidades: existenciaSchema.nullable(),
  disponibilidad: disponibilidadSchema.nullable(),
});
export type ProductoLinea = z.infer<typeof productoLineaSchema>;

export const lineaCarritoSchema = z.object({
  idLinea: idSchema,
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  cantidad: cantidadSchema,
  producto: productoLineaSchema,
  /** La línea correspondiente del cálculo de M06 (mismo orden). Null si el carrito no se pudo calcular. */
  precio: lineaCalculadaSchema.nullable(),
});
export type LineaCarrito = z.infer<typeof lineaCarritoSchema>;

/** C9: lo que pasó al unir el carrito de visitante con el de la cuenta. */
export const unionCarritoSchema = z.object({
  lineasAgregadas: z.number().int().nonnegative(),
  lineasSumadas: z.number().int().nonnegative(),
  /** Líneas que no cupieron por el límite de C5. */
  lineasDescartadas: z.number().int().nonnegative(),
  /** Líneas que quedaron en el tope de C4. */
  cantidadesAjustadas: z.number().int().nonnegative(),
});
export type UnionCarrito = z.infer<typeof unionCarritoSchema>;

export const carritoSchema = z.object({
  lineas: z.array(lineaCarritoSchema).max(MAXIMO_LINEAS_CARRITO),
  /** D7: suma de cantidades de las líneas vendibles. */
  cantidadItems: z.number().int().nonnegative(),
  /** C7: el cálculo de M06 tal cual. Null con el carrito vacío. */
  calculo: calculoSchema.nullable(),
  /** C9: solo en la respuesta que hizo la unión; null en las demás. */
  union: unionCarritoSchema.nullable(),
});
export type Carrito = z.infer<typeof carritoSchema>;
export const carritoResponseEnvelopeSchema = respuestaUno(carritoSchema);
export type CarritoResponseEnvelope = z.infer<typeof carritoResponseEnvelopeSchema>;

/** GET /carrito/resumen — para el contador del Header (P4). */
export const resumenCarritoSchema = z.object({
  cantidadItems: z.number().int().nonnegative(),
  /** `calculo.resumen.total`, sin cupón; 0 con el carrito vacío. */
  total: dineroSchema,
});
export type ResumenCarrito = z.infer<typeof resumenCarritoSchema>;
export const resumenCarritoResponseEnvelopeSchema = respuestaUno(resumenCarritoSchema);
export type ResumenCarritoResponseEnvelope = z.infer<typeof resumenCarritoResponseEnvelopeSchema>;

/** C11: lo que cambió entre la pantalla y el cálculo nuevo. */
export const cambioRevalidacionSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('precio_cambio'),
    idLinea: idSchema,
    subtotalAnterior: dineroSchema,
    subtotalNuevo: dineroSchema,
  }),
  z.object({
    tipo: z.literal('linea_no_vendible'),
    idLinea: idSchema,
    motivo: motivoNoVendibleSchema,
  }),
  z.object({
    /** La línea estaba en pantalla y ya no está en el carrito (otra pestaña la quitó). */
    tipo: z.literal('linea_quitada'),
    idLinea: idSchema,
  }),
  z.object({
    /** La línea está en el carrito y no estaba en pantalla (otra pestaña la agregó). */
    tipo: z.literal('linea_nueva'),
    idLinea: idSchema,
  }),
  z.object({
    tipo: z.literal('cupon_no_aplica'),
    codigo: z.string(),
    motivo: motivoCuponSchema,
  }),
  z.object({
    tipo: z.literal('total_cambio'),
    totalAnterior: dineroSchema,
    totalNuevo: dineroSchema,
  }),
]);
export type CambioRevalidacion = z.infer<typeof cambioRevalidacionSchema>;

export const revalidacionSchema = z.object({
  carrito: carritoSchema,
  cambios: z.array(cambioRevalidacionSchema),
  /** C11: true solo si hay líneas, todas vendibles, y `cambios` está vacío. */
  puedeContinuar: z.boolean(),
});
export type Revalidacion = z.infer<typeof revalidacionSchema>;
export const revalidacionResponseEnvelopeSchema = respuestaUno(revalidacionSchema);
export type RevalidacionResponseEnvelope = z.infer<typeof revalidacionResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Envelope global del backend: `{ success: false, error: { code, message, details } }`.
 * 400 PARAMETRO_INVALIDO · 400 CANTIDAD_FUERA_DE_RANGO (C4) · 400 LIMITE_LINEAS_ALCANZADO (C5) ·
 * 404 RECURSO_NO_DISPONIBLE (línea ajena o inexistente, C14) · 409 PRODUCTO_NO_DISPONIBLE (C6, con el
 * motivo en `details`) · 409 SIN_EXISTENCIA_SUFICIENTE (tope de combo, C4) · 500 ERROR_INTERNO (sin detalles).
 */
export const CODIGOS_ERROR_CARRITO = [
  'PARAMETRO_INVALIDO',
  'CANTIDAD_FUERA_DE_RANGO',
  'LIMITE_LINEAS_ALCANZADO',
  'RECURSO_NO_DISPONIBLE',
  'PRODUCTO_NO_DISPONIBLE',
  'SIN_EXISTENCIA_SUFICIENTE',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorCarrito = (typeof CODIGOS_ERROR_CARRITO)[number];

export const detalleNoDisponibleSchema = z.object({ motivo: motivoNoVendibleSchema });
export const detalleExistenciaSchema = z.object({ topeUnidades: existenciaSchema });
export const detalleCantidadSchema = z.object({ cantidadMaxima: z.number().int().positive() });

export const errorCarritoEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_CARRITO),
    message: z.string(),
    details: z.union([detalleNoDisponibleSchema, detalleExistenciaSchema, detalleCantidadSchema, z.null()]),
  }),
});
export type ErrorCarritoEnvelope = z.infer<typeof errorCarritoEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. PUERTOS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Lo que M05 usa de M06 (solo `calcular`, D8). */
export type PreciosCarritoPort = Pick<PreciosPort, 'calcular'>;

/** Lo que M05 usa de M01 (ya implementado). */
export type CatalogoCarritoPort = CatalogoParaCompraPort;

/** Lo que M05 usa de M17 (C13): null si el parámetro no se pudo leer. */
export interface ParametrosCarritoPort {
  obtenerNumero(clave: typeof CLAVE_DIAS_VIGENCIA): Promise<number | null>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Públicas (montaje: /api/v1/carrito) — sesión opcional; dueño por sesión o cookie `pc_cart` (C1)
 *  GET    /                  el carrito con su cálculo (?codigoCupon)            HU-CAR-01, 04
 *  GET    /resumen           cantidad y total para el contador del Header (P4)
 *  POST   /lineas            agregar o sumar una variante con su color            HU-CAR-01, 02
 *  PATCH  /lineas/:idLinea   fijar la cantidad                                    HU-CAR-02
 *  DELETE /lineas/:idLinea   quitar la línea (?codigoCupon)                       HU-CAR-02
 *  POST   /revalidar         comparar con lo que hay en pantalla antes de pagar   HU-CAR-05
 *
 *  Todas las que devuelven el carrito responden `carritoResponseEnvelopeSchema`, salvo /resumen y
 *  /revalidar. La unión de C9 ocurre dentro de cualquiera de ellas; no tiene ruta propia.
 *  Pantalla: /carrito (frontend, `frontend/src/modules/m05-carrito/`).
 * ─────────────────────────────────────────────────────────────────────────── */
