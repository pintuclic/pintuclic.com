import { z } from 'zod';
import {
  hexadecimalSchema,
  idSchema,
  paginacionQuerySchema,
  respuestaPaginada,
  respuestaUno,
} from '../../m01-catalogo/dtos/m01-catalogo.dto';
import type { Carrito } from '../../m05-carrito/dtos/m05-carrito.dto';
import { MAXIMO_LINEAS_CARRITO } from '../../m05-carrito/dtos/m05-carrito.dto';
import { cantidadSchema, dineroSchema, fechaSchema } from '../../m06-precios/dtos/m06-precios.dto';

/**
 * Espejo fiel de `contracts/m21-cotizaciones.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `m21-cotizaciones.contrato-espejo.test.ts` falla si ambos difieren.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const PERMISOS_COTIZACIONES = {
  ver: 'ventas.ver',
  gestionar: 'ventas.gestionar',
} as const;

/** R4 */
export const MAXIMO_COTIZACIONES_ABIERTAS = 5;
/** R4: las mismas que admite un carrito. */
export const MAXIMO_LINEAS_COTIZACION = MAXIMO_LINEAS_CARRITO;
/** D4: parámetro de M17 con los días de vigencia por defecto. */
export const CLAVE_DIAS_VIGENCIA = 'comercial.dias_vigencia_cotizacion';
/** D4: valor si el parámetro no se puede leer (es también su valor inicial en el seed). */
export const DIAS_VIGENCIA_COTIZACION = 15;
export const diasVigenciaCotizacionSchema = z.number().int().min(1).max(90);
/** R5: la fecha de vencimiento que pone el admin, como mucho a este plazo. */
export const DIAS_MAXIMOS_VENCIMIENTO = 365;

export const estadoCotizacionSchema = z.enum(['solicitada', 'borrador', 'enviada', 'aprobada', 'rechazada', 'vencida']);
export type EstadoCotizacion = z.infer<typeof estadoCotizacionSchema>;
/** Estados en los que el admin todavía puede ajustarla (R5). */
export const ESTADOS_EDITABLES: readonly EstadoCotizacion[] = ['solicitada', 'borrador'];

export const comentarioSchema = z.string().trim().max(500);
export const notaSchema = z.string().trim().max(1000);
export const motivoSchema = z.string().trim().min(3).max(500);

export const idCotizacionParamsSchema = z.object({
  idCotizacion: z.coerce.number().int().positive(),
});
export type IdCotizacionParams = z.infer<typeof idCotizacionParamsSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** POST /cotizaciones — desde el carrito de la cuenta (R2). */
export const crearCotizacionRequestSchema = z.object({
  comentario: comentarioSchema.optional(),
});
export type CrearCotizacionRequest = z.infer<typeof crearCotizacionRequestSchema>;

/** GET /cotizaciones */
export const listarMisCotizacionesRequestSchema = paginacionQuerySchema.extend({
  estado: estadoCotizacionSchema.optional(),
});
export type ListarMisCotizacionesRequest = z.infer<typeof listarMisCotizacionesRequestSchema>;

/** POST /cotizaciones/:idCotizacion/rechazar (R9). */
export const rechazarClienteRequestSchema = z.object({
  motivo: comentarioSchema.optional(),
});
export type RechazarClienteRequest = z.infer<typeof rechazarClienteRequestSchema>;

/** GET /admin/cotizaciones */
export const listarCotizacionesAdminRequestSchema = paginacionQuerySchema.extend({
  estado: estadoCotizacionSchema.optional(),
  /** Código (COT-000123) o nombre / correo del cliente. */
  busqueda: z.string().trim().max(100).optional(),
});
export type ListarCotizacionesAdminRequest = z.infer<typeof listarCotizacionesAdminRequestSchema>;

export const ajusteLineaSchema = z.object({
  idLinea: idSchema,
  cantidad: cantidadSchema,
  /** Precio unitario acordado; null = todavía sin definir. */
  precioAcordado: dineroSchema.nullable(),
});
export type AjusteLinea = z.infer<typeof ajusteLineaSchema>;

/** PUT /admin/cotizaciones/:idCotizacion (R5). Las líneas que no vienen se quitan. */
export const actualizarCotizacionRequestSchema = z.object({
  lineas: z
    .array(ajusteLineaSchema)
    .min(1)
    .max(MAXIMO_LINEAS_COTIZACION)
    .refine((l) => new Set(l.map((x) => x.idLinea)).size === l.length, { message: 'Hay líneas repetidas' }),
  notaParaCliente: notaSchema.nullable(),
  /** AAAA-MM-DD en hora de Colombia; null = la pone el envío con el parámetro (R6). */
  fechaVencimiento: fechaSchema.nullable(),
});
export type ActualizarCotizacionRequest = z.infer<typeof actualizarCotizacionRequestSchema>;

/** POST /admin/cotizaciones/:idCotizacion/rechazar (R7). */
export const rechazarAdminRequestSchema = z.object({
  motivo: motivoSchema,
});
export type RechazarAdminRequest = z.infer<typeof rechazarAdminRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const lineaCotizacionSchema = z.object({
  idLinea: idSchema,
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  cantidad: cantidadSchema,
  /** Copia de cuando se pidió (R2). */
  producto: z.object({
    nombre: z.string(),
    marca: z.string().nullable(),
    medida: z.string().nullable(),
    sku: z.string().nullable(),
    color: z.object({ nombre: z.string(), hexadecimal: hexadecimalSchema }).nullable(),
  }),
  /** Precio unitario que veía el cliente al pedirla (R2). */
  precioReferencia: dineroSchema,
  precioAcordado: dineroSchema.nullable(),
  /** R11: null mientras no haya precio acordado. */
  subtotalAcordado: dineroSchema.nullable(),
});
export type LineaCotizacion = z.infer<typeof lineaCotizacionSchema>;

export const clienteCotizacionSchema = z.object({
  idUsuario: idSchema,
  nombre: z.string(),
  correo: z.string(),
  tipo: z.enum(['normal', 'empresa']),
});
export type ClienteCotizacion = z.infer<typeof clienteCotizacionSchema>;

export const cotizacionResumenSchema = z.object({
  idCotizacion: idSchema,
  codigo: z.string(),
  estado: estadoCotizacionSchema,
  fechaCreacion: z.string().datetime(),
  fechaVencimiento: fechaSchema.nullable(),
  cantidadLineas: z.number().int().nonnegative(),
  totalReferencia: dineroSchema,
  totalAcordado: dineroSchema.nullable(),
  /** Solo en el panel; null en las rutas del cliente. */
  cliente: clienteCotizacionSchema.nullable(),
});
export type CotizacionResumen = z.infer<typeof cotizacionResumenSchema>;

export const cotizacionDetalleSchema = cotizacionResumenSchema.extend({
  comentarioCliente: z.string().nullable(),
  notaParaCliente: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
  fechaEnvio: z.string().datetime().nullable(),
  fechaRespuesta: z.string().datetime().nullable(),
  lineas: z.array(lineaCotizacionSchema),
});
export type CotizacionDetalle = z.infer<typeof cotizacionDetalleSchema>;

export const cotizacionResponseEnvelopeSchema = respuestaUno(cotizacionDetalleSchema);
export type CotizacionResponseEnvelope = z.infer<typeof cotizacionResponseEnvelopeSchema>;
export const listarCotizacionesResponseEnvelopeSchema = respuestaPaginada(cotizacionResumenSchema);
export type ListarCotizacionesResponseEnvelope = z.infer<typeof listarCotizacionesResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Envelope global: `{ success: false, error: { code, message, details } }`.
 * 400 PARAMETRO_INVALIDO · 400 CARRITO_VACIO (R2) · 400 COTIZACION_INCOMPLETA (R6) ·
 * 404 RECURSO_NO_DISPONIBLE (ajena, inexistente o sin permiso) · 409 LIMITE_COTIZACIONES (R4) ·
 * 409 ESTADO_NO_PERMITE (R5, R7, R8, R9) · 409 COTIZACION_VENCIDA (R10) · 409 CARRITO_LLENO (R8) ·
 * 500 ERROR_INTERNO.
 */
export const CODIGOS_ERROR_COTIZACIONES = [
  'PARAMETRO_INVALIDO',
  'CARRITO_VACIO',
  'COTIZACION_INCOMPLETA',
  'RECURSO_NO_DISPONIBLE',
  'LIMITE_COTIZACIONES',
  'ESTADO_NO_PERMITE',
  'COTIZACION_VENCIDA',
  'CARRITO_LLENO',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorCotizaciones = (typeof CODIGOS_ERROR_COTIZACIONES)[number];

export const errorCotizacionesEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_COTIZACIONES),
    message: z.string(),
    details: z.null(),
  }),
});
export type ErrorCotizacionesEnvelope = z.infer<typeof errorCotizacionesEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. PUERTOS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Una línea que pasa al carrito con precio fijo (R8, C15 de M05). */
export interface LineaAcordada {
  readonly idVariante: number;
  readonly idColor: number | null;
  readonly cantidad: number;
  readonly precioAcordado: number;
}

/** Lo que M21 usa de M05 (P2). */
export interface CarritoCotizacionPort {
  /** El carrito calculado de la cuenta (R2). */
  carritoDeCuenta(idUsuario: number): Promise<Carrito>;
  /** R8: agrega o reemplaza las líneas con su precio acordado. */
  agregarLineasAcordadas(idUsuario: number, idCotizacion: number, lineas: readonly LineaAcordada[]): Promise<void>;
}

/** Lo que M21 usa de M17 (D4): null si el parámetro no se pudo leer. */
export interface ParametrosCotizacionPort {
  obtenerNumero(clave: typeof CLAVE_DIAS_VIGENCIA): Promise<number | null>;
}

export interface EventoCotizacion {
  readonly idCotizacion: number;
  readonly codigo: string;
  readonly correoCliente: string;
  readonly nombreCliente: string;
}

/** D8: lo implementará M18; mientras tanto, un adaptador que no envía nada. */
export interface NotificacionesCotizacionPort {
  cotizacionRespondida(evento: EventoCotizacion & { readonly totalAcordado: number; readonly fechaVencimiento: string }): Promise<void>;
  cotizacionRechazada(evento: EventoCotizacion & { readonly motivo: string }): Promise<void>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Cliente (montaje: /api/v1/cotizaciones) — exige sesión (R1)
 *  POST /                          pedir cotización desde el carrito (R2–R4)
 *  GET  /                          mis cotizaciones, paginadas (?estado)
 *  GET  /:idCotizacion             detalle de una mía
 *  POST /:idCotizacion/aceptar     aceptar (R8): las líneas pasan al carrito
 *  POST /:idCotizacion/rechazar    rechazar (R9)
 *
 *  Panel (montaje: /api/v1/admin/cotizaciones) — sesión + permiso (R12)
 *  GET  /                          lista (?estado, ?busqueda)                ventas.ver
 *  GET  /:idCotizacion             detalle con el cliente                    ventas.ver
 *  PUT  /:idCotizacion             ajustar líneas, nota y vencimiento (R5)    ventas.gestionar
 *  POST /:idCotizacion/enviar      enviar al cliente (R6)                    ventas.gestionar
 *  POST /:idCotizacion/rechazar    rechazar con motivo (R7)                  ventas.gestionar
 *
 *  Todas devuelven `cotizacionResponseEnvelopeSchema`, salvo las listas (`listarCotizacionesResponseEnvelopeSchema`).
 * ─────────────────────────────────────────────────────────────────────────── */
