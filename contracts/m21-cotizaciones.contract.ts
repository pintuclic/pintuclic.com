import { z } from 'zod';
import {
  hexadecimalSchema,
  idSchema,
  paginacionQuerySchema,
  respuestaPaginada,
  respuestaUno,
} from './m01-catalogo.contract';
import type { Carrito } from './m05-carrito.contract';
import { MAXIMO_LINEAS_CARRITO } from './m05-carrito.contract';
import { cantidadSchema, dineroSchema, fechaSchema } from './m06-precios.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M21. Cotizaciones
 * ============================================================================
 * Scope: m21-cotizaciones · Ola 4 · Prefijo: COT · BORRADOR para el Tech Lead.
 * No hay documento funcional de M21 (RUTA_DEL_PROYECTO: "Sin spec"): este contrato ES la especificación.
 * Base de datos: `cotizacion` (existe, se completa), `linea_cotizacion` (nueva) y, para el carrito,
 * `linea_carrito.id_cotizacion` y `linea_carrito.precio_acordado` (nuevas).
 *
 * ── Qué es M21 ──────────────────────────────────────────────────────────────
 *  El camino formal para pedir un precio especial (RF-ATC-02-07 de M15: "el camino formal es el del
 *  carrito, abierto a cualquier cliente autenticado"):
 *   1. El cliente con sesión arma su carrito (M05) y pulsa "Solicitar cotización". Se guarda una copia de
 *      sus líneas con el precio que veía (M06).
 *   2. El equipo comercial la revisa en `/admin/cotizaciones`: ajusta precio y cantidad de cada línea,
 *      quita líneas, deja una nota y una fecha de vencimiento, y la envía o la rechaza.
 *   3. El cliente la ve en `/cotizaciones` y, si sigue vigente, la acepta o la rechaza.
 *   4. Al aceptarla, sus líneas pasan al carrito con el PRECIO ACORDADO fijo (R3 de M06, RF-CAR-05-06 de
 *      M05), listas para pagar (M07). La orden (M08) conserva ese precio (RF-ORD-02-03).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No cobra ni crea la orden (M07 y M08). No calcula envío (M12).
 *  · No calcula precios de catálogo: los toma de M06 al crear la solicitud, solo como referencia.
 *  · No edita el catálogo, el carrito de otros ni las cuentas.
 *  · No envía correos todavía: avisa por un puerto que M18 conectará (D8).
 *  · El formulario de contacto de M15 con tipo "cotización" sigue siendo solo una intención: no crea nada aquí.
 *
 * ── Estados ─────────────────────────────────────────────────────────────────
 *  solicitada ─(admin envía)→ enviada ─(cliente acepta)→ aprobada
 *      │                         ├──(cliente o admin rechaza)→ rechazada
 *      └──(admin rechaza)→ rechazada   └──(pasa la fecha)→ vencida
 *  `borrador` existe en la base por datos anteriores: se trata igual que `solicitada`.
 *  Abiertas = solicitada, borrador y enviada vigente.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R1  SOLO CON SESIÓN. Pedir, ver, aceptar y rechazar exige sesión de cliente (D1). El visitante pasa
 *      primero por iniciar sesión. Un cliente solo ve sus cotizaciones: una ajena responde 404
 *      RECURSO_NO_DISPONIBLE, igual que una que no existe (ADR-003).
 *  R2  CREAR DESDE EL CARRITO. Se toman las líneas VENDIBLES del carrito de la cuenta con el precio que
 *      calculó M06 (`precioUnitarioFinal`, incluye ofertas y descuento de empresa si aplica): ese es el
 *      `precioReferencia`. Se omiten las líneas no vendibles y las que ya vienen de una cotización. Sin
 *      ninguna línea válida responde 400 CARRITO_VACIO. Se guarda una copia del nombre, marca, medida, SKU y
 *      color de cada línea (si el catálogo cambia, la cotización se sigue leyendo igual).
 *  R3  EL CARRITO SE CONSERVA al pedir la cotización (D2).
 *  R4  LÍMITE: un cliente tiene como máximo MAXIMO_COTIZACIONES_ABIERTAS abiertas; la siguiente responde 409
 *      LIMITE_COTIZACIONES. Cada cotización tiene como máximo MAXIMO_LINEAS_COTIZACION líneas (las del carrito).
 *  R5  AJUSTE DEL ADMIN (D3), solo en solicitada/borrador: por cada línea, cantidad (1 a 9 999) y
 *      `precioAcordado` unitario (null = aún sin definir); las líneas que no envía se QUITAN (mínimo una
 *      queda); nota para el cliente y fecha de vencimiento (desde hoy hasta 365 días). No agrega productos.
 *      En otro estado responde 409 ESTADO_NO_PERMITE.
 *  R6  ENVIAR: exige que todas las líneas tengan `precioAcordado`; si no, 400 COTIZACION_INCOMPLETA. Si no
 *      tiene fecha de vencimiento, se pone hoy + el parámetro CLAVE_DIAS_VIGENCIA (D4). Queda `enviada`, con
 *      fecha de envío, quién la respondió y `totalAcordado`. Avisa al cliente (D8).
 *  R7  RECHAZO DEL ADMIN: desde solicitada, borrador o enviada, con motivo obligatorio. Avisa al cliente.
 *  R8  ACEPTAR (D5): solo `enviada` y vigente. Queda `aprobada` con fecha de respuesta, y sus líneas pasan al
 *      carrito de la cuenta con su `precioAcordado` (C15 de M05): si ya había una línea igual (variante +
 *      color), se reemplaza. Aceptar dos veces responde 409 ESTADO_NO_PERMITE.
 *  R9  RECHAZO DEL CLIENTE: solo `enviada`, con motivo opcional.
 *  R10 VENCIMIENTO: una `enviada` cuya fecha de vencimiento (hora de Colombia) ya pasó queda `vencida` en
 *      cuanto se consulta (lista o detalle, cliente o admin); aceptarla responde 409 COTIZACION_VENCIDA.
 *      No hace falta tarea programada.
 *  R11 MONTOS en pesos con 2 decimales, redondeo mitad hacia arriba. `subtotalAcordado` = precioAcordado ×
 *      cantidad; `totalAcordado` = suma de subtotales. `totalReferencia` = suma de precioReferencia × cantidad.
 *  R12 AUTORIZACIÓN EN SERVIDOR (D6): panel GET → `ventas.ver`; PUT y POST → `ventas.gestionar`. Toda
 *      denegación del panel responde 404 RECURSO_NO_DISPONIBLE. Nunca se devuelven trazas ni SQL.
 *  R13 El código visible (`COT-000123`) lo pone la base a partir del id; no se envía ni se edita.
 *
 * ── Pantallas ───────────────────────────────────────────────────────────────
 *  /carrito (M05): botón "Solicitar cotización" con comentario opcional; sin sesión lleva a iniciar sesión.
 *  /cotizaciones: "Mis cotizaciones" (lista con estado y vencimiento) y su detalle con Aceptar / Rechazar.
 *  /admin/cotizaciones: lista con filtros (estado y búsqueda por código o cliente, en la URL) y detalle con
 *  la tabla de líneas editable (cantidad, precio acordado, atajo "% de descuento" sobre la referencia),
 *  nota, fecha de vencimiento, y botones Guardar, Enviar al cliente y Rechazar.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Cotiza cualquier cliente con sesión, particular o empresa (RF-ATC-02-07).
 *  D2  Pedir la cotización no vacía el carrito.
 *  D3  El admin fija el precio unitario de cada línea (con atajo de %), cambia cantidades y quita líneas;
 *      no agrega productos.
 *  D4  Vigencia por defecto: parámetro `comercial.dias_vigencia_cotizacion` de M17 (15 días, de 1 a 90);
 *      el admin puede poner otra fecha en cada una.
 *  D5  Aceptar lleva las líneas al carrito con el precio acordado fijo.
 *  D6  Permisos existentes `ventas.ver` y `ventas.gestionar` (el seed ya dice "órdenes de venta y
 *      cotizaciones"): no hay permisos nuevos.
 *  D7  Sin monto mínimo; como máximo 5 abiertas por cliente.
 *  D8  Avisos "respondida" y "rechazada" por NotificacionesCotizacionPort; hasta que M18 lo implemente, el
 *      adaptador no envía nada. El aviso "por vencer" queda para M18 (RF-NOT-02-05 pendiente).
 *
 * ── Piezas en otros módulos (cada una en su PR pequeño) ────────────────────
 *  P1  BD / Prisma (PR general): estado `solicitada`; columnas nuevas de `cotizacion`; tabla
 *      `linea_cotizacion`; `linea_carrito.id_cotizacion` y `precio_acordado`; parámetro de vigencia en M17.
 *  P2  M05: líneas con precio acordado en el carrito (C15 de su contrato) y el puerto para M21.
 *  P3  Core Kit: entrada "Cotizaciones" en el menú del panel.
 *  P4  M18 (más adelante): implementar NotificacionesCotizacionPort.
 *  P5  M17 (más adelante): "Cotizaciones recientes" de la ficha del cliente puede leer de M21.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
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
 * 409 ESTADO_NO_PERMITE (R5, R7, R8, R9) · 409 COTIZACION_VENCIDA (R10) · 500 ERROR_INTERNO.
 */
export const CODIGOS_ERROR_COTIZACIONES = [
  'PARAMETRO_INVALIDO',
  'CARRITO_VACIO',
  'COTIZACION_INCOMPLETA',
  'RECURSO_NO_DISPONIBLE',
  'LIMITE_COTIZACIONES',
  'ESTADO_NO_PERMITE',
  'COTIZACION_VENCIDA',
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
