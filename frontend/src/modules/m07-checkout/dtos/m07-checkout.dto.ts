import { z } from 'zod';
import { idSchema, paginacionQuerySchema, respuestaPaginada, respuestaUno } from '@/modules/m01-catalogo/dtos/m01-catalogo.dto';
import { nombreSchema, telefonoSchema } from '@/modules/m04-cuentas/dtos/m04-cuentas.dto';
import type { Carrito, Revalidacion, RevalidarRequest } from '@/modules/m05-carrito/dtos/m05-carrito.dto';
import { carritoSchema, revalidacionSchema, revalidarRequestSchema } from '@/modules/m05-carrito/dtos/m05-carrito.dto';
import type { PreciosPort } from '@/modules/m06-precios/dtos/m06-precios.dto';
import {
  CANTIDAD_MAXIMA_LINEA,
  cantidadSchema,
  codigoCuponEntradaSchema,
  dineroSchema,
  fechaHoraSchema,
  resumenCalculoSchema,
} from '@/modules/m06-precios/dtos/m06-precios.dto';
import type { SolicitudPagadaInput } from '@/modules/m08-ordenes/dtos/m08-ordenes.dto';

/**
 * Espejo fiel de `contracts/m07-checkout.contract.ts` para ejecución en el frontend
 * (el contrato vive fuera de `frontend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `tests/contrato-espejo.test.ts` falla si ambos difieren.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const PERMISOS_PAGOS = {
  ver: 'ventas.ver',
  gestionar: 'ventas.gestionar',
} as const;

/** R3 / D4 */
export const VIGENCIA_SOLICITUD_MINUTOS = 30;
/** R4 / D4 */
export const MAXIMO_INTENTOS_PAGO = 3;
/** R5: cada cuánto, como mucho, la consulta de la pantalla pregunta a Wompi. */
export const INTERVALO_CONSULTA_WOMPI_SEGUNDOS = 5;
/** Pantalla /checkout/:codigo: cada cuánto consulta la solicitud. */
export const INTERVALO_CONSULTA_PANTALLA_SEGUNDOS = 3;
/** R6: espera antes de cada reintento de crear la orden; agotados, la solicitud queda en revisión. */
export const REINTENTOS_ORDEN_MINUTOS = [1, 5, 15, 60, 180, 720] as const;

/** R10: parámetros de M17 y su valor si no se pueden leer (son también sus valores en el seed). */
export const CLAVE_COSTO_ENVIO_BASE = 'comercial.costo_envio_base';
export const CLAVE_UMBRAL_ENVIO_GRATIS = 'comercial.umbral_envio_gratis';
export const COSTO_ENVIO_BASE = 15_000;
export const UMBRAL_ENVIO_GRATIS = 200_000;

/** Nombre de la fila de `consecutivo` para las solicitudes (P1). */
export const CONSECUTIVO_SOLICITUD = 'solicitud';
/** El mismo patrón que valida M08 al recibirla. */
export const CODIGO_SOLICITUD_PATRON = /^SOL-\d{4}-\d{5,}$/;
export const codigoSolicitudSchema = z.string().trim().regex(CODIGO_SOLICITUD_PATRON, 'Use el formato SOL-AAAA-NNNNN');

export const codigoSolicitudParamsSchema = z.object({ codigo: codigoSolicitudSchema });
export type CodigoSolicitudParams = z.infer<typeof codigoSolicitudParamsSchema>;

export const estadoSolicitudSchema = z.enum([
  'en_pago',
  'rechazada',
  'pagada',
  'completada',
  'en_revision',
  'vencida',
  'cancelada',
]);
export type EstadoSolicitud = z.infer<typeof estadoSolicitudSchema>;
/** R2 c: estados que cuentan como "abierta" para el cliente. */
export const ESTADOS_ABIERTOS: readonly EstadoSolicitud[] = ['en_pago', 'rechazada'];

export const modoEntregaSchema = z.enum(['domicilio', 'recogida']);
export type ModoEntrega = z.infer<typeof modoEntregaSchema>;

export const origenSolicitudSchema = z.enum(['carrito', 'cotizacion']);
export type OrigenSolicitud = z.infer<typeof origenSolicitudSchema>;

/** Estados de una transacción en Wompi. VOIDED solo aplica a tarjetas, pero se acepta por si llega. */
export const estadoWompiSchema = z.enum(['PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED']);
export type EstadoWompi = z.infer<typeof estadoWompiSchema>;

/** R12: celular colombiano registrado en Nequi. */
export const celularNequiSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^3\d{9}$/, 'Escribe tu celular de Nequi: 10 dígitos que empiezan por 3'));

/** R14: la dirección de este pedido. */
export const direccionEntregaSchema = z.object({
  direccion: z.string().trim().min(5, 'La dirección debe tener al menos 5 caracteres').max(255),
  barrio: z.string().trim().min(2, 'El barrio debe tener al menos 2 caracteres').max(100),
  apartamentoCasa: z.string().trim().max(100).nullable(),
  nombreRecibe: nombreSchema,
  telefonoRecibe: telefonoSchema,
});
export type DireccionEntrega = z.infer<typeof direccionEntregaSchema>;

/** R13: los dos tokens de aceptación de Wompi. */
export const aceptacionesWompiSchema = z.object({
  tokenAceptacion: z.string().trim().min(1).max(2000),
  tokenDatosPersonales: z.string().trim().min(1).max(2000),
  /** La casilla marcada: el esquema solo acepta true. */
  aceptaTerminos: z.literal(true),
});
export type AceptacionesWompi = z.infer<typeof aceptacionesWompiSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** R17: la presentación, color y cantidad de una compra directa desde la ficha. */
export const compraDirectaSchema = z.object({
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  cantidad: cantidadSchema,
});
export type CompraDirecta = z.infer<typeof compraDirectaSchema>;

/** GET /checkout/preparar — con `idVariante` (y `idColor`, `cantidad`) prepara una compra directa (R17). */
export const prepararCheckoutRequestSchema = z
  .object({
    codigoCupon: codigoCuponEntradaSchema.optional(),
    idVariante: z.coerce.number().int().positive().optional(),
    idColor: z.coerce.number().int().positive().optional(),
    cantidad: z.coerce.number().int().min(1).max(CANTIDAD_MAXIMA_LINEA).optional(),
  })
  .refine((v) => v.idVariante !== undefined || (v.idColor === undefined && v.cantidad === undefined), {
    message: 'Falta la presentación del producto',
    path: ['idVariante'],
  })
  .refine((v) => v.idVariante === undefined || v.codigoCupon === undefined, {
    message: 'La compra directa no lleva cupón',
    path: ['codigoCupon'],
  });
export type PrepararCheckoutRequest = z.infer<typeof prepararCheckoutRequestSchema>;

/**
 * POST /checkout/solicitudes (R2). `pantalla` es lo mismo que recibe POST /carrito/revalidar (C11). Con
 * `directa` se paga solo esa línea (R17) y `pantalla` describe esa línea (idLinea 1).
 */
export const crearSolicitudRequestSchema = z
  .object({
    pantalla: revalidarRequestSchema,
    directa: compraDirectaSchema.optional(),
    modoEntrega: modoEntregaSchema,
    /** Obligatoria con `domicilio`; null con `recogida`. */
    direccion: direccionEntregaSchema.nullable(),
    celularNequi: celularNequiSchema,
    aceptaciones: aceptacionesWompiSchema,
  })
  .refine((v) => v.modoEntrega !== 'domicilio' || v.direccion !== null, {
    message: 'Escribe la dirección de entrega',
    path: ['direccion'],
  })
  .refine((v) => v.directa === undefined || v.pantalla.codigoCupon === undefined, {
    message: 'La compra directa no lleva cupón',
    path: ['pantalla', 'codigoCupon'],
  });
export type CrearSolicitudRequest = z.infer<typeof crearSolicitudRequestSchema>;

/** POST /checkout/solicitudes/:codigo/reintentar (R4). */
export const reintentarPagoRequestSchema = z.object({
  celularNequi: celularNequiSchema,
  aceptaciones: aceptacionesWompiSchema,
});
export type ReintentarPagoRequest = z.infer<typeof reintentarPagoRequestSchema>;

/** GET /admin/pagos */
export const listarSolicitudesAdminRequestSchema = paginacionQuerySchema.extend({
  estado: estadoSolicitudSchema.optional(),
  /** Código SOL, código de orden PC, o nombre / correo del cliente. */
  busqueda: z.string().trim().max(100).optional(),
});
export type ListarSolicitudesAdminRequest = z.infer<typeof listarSolicitudesAdminRequestSchema>;

/**
 * POST /checkout/wompi/eventos — lo que M07 lee del evento DESPUÉS de validar su firma (R5 a). Los campos
 * que no se usan se ignoran.
 */
export const eventoWompiInputSchema = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      id: z.string().min(1).max(100),
      status: estadoWompiSchema,
      reference: z.string().min(1).max(100),
      amount_in_cents: z.number().int().nonnegative(),
      currency: z.string(),
    }),
  }),
  signature: z.object({
    properties: z.array(z.string()).min(1),
    checksum: z.string().min(1),
  }),
  timestamp: z.number().int(),
});
export type EventoWompiInput = z.infer<typeof eventoWompiInputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const terminosWompiSchema = z.object({
  tokenAceptacion: z.string(),
  enlaceReglamento: z.string().url(),
  tokenDatosPersonales: z.string(),
  enlaceDatosPersonales: z.string().url(),
});
export type TerminosWompi = z.infer<typeof terminosWompiSchema>;

/** GET /checkout/preparar: todo lo que pinta la pantalla /checkout antes de pagar. */
export const prepararCheckoutSchema = z.object({
  /** El carrito de la cuenta con su cálculo (M05). */
  carrito: carritoSchema,
  /** R10: lo que costaría cada modo con este carrito. */
  envio: z.object({
    domicilio: dineroSchema,
    recogida: dineroSchema,
    umbralEnvioGratis: dineroSchema,
  }),
  /** R14: la dirección del perfil; null si no tiene. */
  direccionPerfil: direccionEntregaSchema.nullable(),
  /** R12: celular sugerido (del perfil o la dirección) si cumple el formato de Nequi; si no, null. */
  celularSugerido: z.string().nullable(),
  /** R13: null si Wompi no respondió; la pantalla avisa y no deja pagar. */
  terminos: terminosWompiSchema.nullable(),
  /** R2 c: la solicitud con pago en curso, para llevar al cliente a ella. */
  solicitudEnCurso: codigoSolicitudSchema.nullable(),
});
export type PrepararCheckout = z.infer<typeof prepararCheckoutSchema>;
export const prepararCheckoutResponseEnvelopeSchema = respuestaUno(prepararCheckoutSchema);
export type PrepararCheckoutResponseEnvelope = z.infer<typeof prepararCheckoutResponseEnvelopeSchema>;

export const lineaSolicitudSchema = z.object({
  nombreProducto: z.string(),
  marca: z.string().nullable(),
  medida: z.string().nullable(),
  color: z.object({ nombre: z.string(), hexadecimal: z.string() }).nullable(),
  cantidad: cantidadSchema,
  /** El subtotal de M06 (con sus descuentos), IVA incluido. */
  subtotal: dineroSchema,
  idCotizacion: idSchema.nullable(),
});
export type LineaSolicitud = z.infer<typeof lineaSolicitudSchema>;

export const intentoPagoSchema = z.object({
  numero: z.number().int().min(1).max(MAXIMO_INTENTOS_PAGO),
  estadoWompi: estadoWompiSchema,
  /** R12: `*** *** 1111`. */
  celularEnmascarado: z.string(),
  /** Mensaje en palabras simples cuando Wompi lo rechaza; null en los demás. */
  motivo: z.string().nullable(),
  fecha: fechaHoraSchema,
});
export type IntentoPago = z.infer<typeof intentoPagoSchema>;

export const solicitudSchema = z.object({
  codigo: codigoSolicitudSchema,
  estado: estadoSolicitudSchema,
  origen: origenSolicitudSchema,
  modoEntrega: modoEntregaSchema,
  /** R14: el texto con el que irá a la orden; null con recogida. */
  direccion: z.string().nullable(),
  lineas: z.array(lineaSolicitudSchema).min(1),
  /** Lo que congeló de M06. */
  resumen: resumenCalculoSchema,
  costoEnvio: dineroSchema,
  /** R10: lo que se cobra. */
  totalACobrar: dineroSchema,
  intentos: z.array(intentoPagoSchema),
  /** R3: hasta cuándo se puede pagar (sin contar un pago en curso). */
  venceEn: fechaHoraSchema,
  /** R7: el código PC-… cuando la orden existe; null antes. */
  codigoOrden: z.string().nullable(),
  /** R17: se pagó desde la ficha, sin el carrito. */
  compraDirecta: z.boolean(),
  creadaEn: fechaHoraSchema,
});
export type Solicitud = z.infer<typeof solicitudSchema>;
export const solicitudResponseEnvelopeSchema = respuestaUno(solicitudSchema);
export type SolicitudResponseEnvelope = z.infer<typeof solicitudResponseEnvelopeSchema>;

/** Panel: la solicitud con su cliente y el último error de la cola. */
export const solicitudAdminSchema = solicitudSchema.extend({
  cliente: z.object({ idUsuario: idSchema, nombre: z.string(), correo: z.string() }),
  /** Id de la transacción aprobada en Wompi; null si no la hay. */
  transaccionPagoId: z.string().nullable(),
  /** R6: por qué quedó en revisión o falló el último intento de crear la orden. */
  ultimoError: z.string().nullable(),
  reintentosOrden: z.number().int().nonnegative(),
});
export type SolicitudAdmin = z.infer<typeof solicitudAdminSchema>;
export const solicitudAdminResponseEnvelopeSchema = respuestaUno(solicitudAdminSchema);
export type SolicitudAdminResponseEnvelope = z.infer<typeof solicitudAdminResponseEnvelopeSchema>;
export const listarSolicitudesResponseEnvelopeSchema = respuestaPaginada(solicitudAdminSchema);
export type ListarSolicitudesResponseEnvelope = z.infer<typeof listarSolicitudesResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Envelope global: `{ success: false, error: { code, message, details } }`.
 * 400 PARAMETRO_INVALIDO · 400 CARRITO_VACIO (R2 a) · 401 FIRMA_INVALIDA (R5 a) ·
 * 404 RECURSO_NO_DISPONIBLE (ajena, inexistente o sin permiso) · 409 CARRITO_CAMBIO (R2 a, con la
 * revalidación) · 409 VARIAS_COTIZACIONES (R2 b) · 409 PAGO_EN_CURSO (R2 c, con el código) ·
 * 409 CUPON_NO_DISPONIBLE (R2 e, con el motivo) · 409 ESTADO_NO_PERMITE · 409 SOLICITUD_VENCIDA (R3) ·
 * 409 LIMITE_INTENTOS (R4) · 409 PRODUCTO_NO_DISPONIBLE (R17, con el motivo) · 503 PASARELA_NO_DISPONIBLE
 * (R2 f) · 500 ERROR_INTERNO.
 */
export const CODIGOS_ERROR_CHECKOUT = [
  'PARAMETRO_INVALIDO',
  'CARRITO_VACIO',
  'FIRMA_INVALIDA',
  'RECURSO_NO_DISPONIBLE',
  'CARRITO_CAMBIO',
  'VARIAS_COTIZACIONES',
  'PAGO_EN_CURSO',
  'CUPON_NO_DISPONIBLE',
  'ESTADO_NO_PERMITE',
  'SOLICITUD_VENCIDA',
  'LIMITE_INTENTOS',
  'PRODUCTO_NO_DISPONIBLE',
  'PASARELA_NO_DISPONIBLE',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorCheckout = (typeof CODIGOS_ERROR_CHECKOUT)[number];

export const detalleCarritoCambioSchema = revalidacionSchema;
export const detallePagoEnCursoSchema = z.object({ codigo: codigoSolicitudSchema });
export const detalleCuponSchema = z.object({ motivo: z.string() });

export const errorCheckoutEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_CHECKOUT),
    message: z.string(),
    details: z.union([detalleCarritoCambioSchema, detallePagoEnCursoSchema, detalleCuponSchema, z.null()]),
  }),
});
export type ErrorCheckoutEnvelope = z.infer<typeof errorCheckoutEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. PUERTOS QUE M07 USA
 * ─────────────────────────────────────────────────────────────────────────── */

/** Lo que M07 usa de M05 (P3). */
export interface CarritoCheckoutPort {
  /** El carrito calculado de la cuenta, con el cupón que envía la pantalla (C7, C8). */
  carritoDeCuenta(idUsuario: number, codigoCupon?: string): Promise<Carrito>;
  /** C11 con el dueño ya resuelto. */
  revalidar(idUsuario: number, pantalla: RevalidarRequest): Promise<Revalidacion>;
  /** R17: una sola línea calculada como un carrito (idLinea 1), sin guardarla ni tocar el carrito. */
  carritoDirecto(idUsuario: number, linea: CompraDirecta): Promise<Carrito>;
  /** R17: C11 sobre esa línea. */
  revalidarDirecta(idUsuario: number, linea: CompraDirecta, pantalla: RevalidarRequest): Promise<Revalidacion>;
  /** R7: quita las líneas con esa variante y color; las que ya no estén se ignoran. */
  quitarComprado(idUsuario: number, lineas: readonly { idVariante: number; idColor: number | null }[]): Promise<void>;
}

/**
 * Lo que M07 usa de M06 (guía §7). El recálculo llega dentro de la revalidación de M05, que ya trae el
 * cálculo nuevo y los datos de M01 de cada línea; aquí solo se registra o libera el cupón.
 */
export type PreciosCheckoutPort = Pick<PreciosPort, 'registrarUsoCupon' | 'liberarUsoCupon'>;

/** Lo que M07 usa de M17 (R10): null si el parámetro no se pudo leer. */
export interface ParametrosCheckoutPort {
  obtenerNumero(clave: typeof CLAVE_COSTO_ENVIO_BASE | typeof CLAVE_UMBRAL_ENVIO_GRATIS): Promise<number | null>;
}

/** Lo que M07 usa de M04 (R12, R14). */
export interface PerfilCheckoutPort {
  datosDeEntrega(idUsuario: number): Promise<{
    correo: string;
    telefonoPerfil: string | null;
    direccion: DireccionEntrega | null;
  }>;
}

/**
 * Lo que M07 usa de M08 (P4). Mapeo desde la solicitud: codigoSolicitud ← código SOL · transaccionPagoId ← id
 * de Wompi aprobado · origen e idCotizacion ← R9 · modoEntrega, direccion ← R14 · costoEntrega ← R10 ·
 * subTotal ← resumen.subtotalInicial · descuento ← resumen.descuentoTotal · total ← totalACobrar ·
 * baseSinImpuesto, importeIva, tasaIva ← resumen · montoPagado ← amount_in_cents / 100 · por línea:
 * nombreProducto, varianteCopia (medida), colorSolicitado, skuVendido ← M01 (vía M05); precioInicial,
 * precioAplicado (precioUnitarioFinal) y descuentos ← M06; idVarianteRef ← idVariante; esEntonado y
 * baseConsumida ← D8.
 */
export interface OrdenesCheckoutPort {
  crearDesdePagoConfirmado(entrada: SolicitudPagadaInput): Promise<{ codigo: string; creada: boolean }>;
}

/** Cliente de Wompi (adaptador del módulo; en pruebas, uno en memoria). */
export interface PasarelaPagoPort {
  terminos(): Promise<TerminosWompi>;
  crearTransaccionNequi(entrada: {
    referencia: string;
    montoEnCentavos: number;
    celular: string;
    correo: string;
    tokenAceptacion: string;
    tokenDatosPersonales: string;
  }): Promise<{ idTransaccion: string; estado: EstadoWompi }>;
  consultarTransaccion(idTransaccion: string): Promise<{
    idTransaccion: string;
    estado: EstadoWompi;
    referencia: string;
    montoEnCentavos: number;
    moneda: string;
    mensaje: string | null;
  }>;
  /** R5 a: valida el checksum del evento sobre el cuerpo recibido, antes de Zod. */
  firmaValida(cuerpo: unknown, checksumCabecera: string | null): boolean;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Cliente (montaje: /api/v1/checkout) — exige sesión de cliente (R1)
 *  GET  /preparar                        datos de la pantalla /checkout (?codigoCupon)
 *  POST /solicitudes                     iniciar el pago (R2)                     → 201 solicitud
 *  GET  /solicitudes/:codigo             estado de una mía (R5, consulta a Wompi de respaldo)
 *  POST /solicitudes/:codigo/reintentar  nuevo intento con Nequi (R4)
 *  POST /solicitudes/:codigo/cancelar    cancelar si no hay pago en curso (R3)
 *
 *  Wompi (montaje: /api/v1/checkout/wompi) — sin sesión; firma del evento (R5)
 *  POST /eventos                         evento transaction.updated → 200 vacío
 *
 *  Panel (montaje: /api/v1/admin/pagos) — sesión + permiso (R16)
 *  GET  /                                lista (?estado, ?busqueda)               ventas.ver
 *  GET  /:codigo                         detalle con intentos y cliente           ventas.ver
 *  POST /:codigo/consultar-wompi         pedir a Wompi el estado real (R5)        ventas.gestionar
 *  POST /:codigo/reintentar-orden        volver a encolar la orden (R6)           ventas.gestionar
 *
 *  Cliente: `solicitudResponseEnvelopeSchema`, salvo /preparar. Panel: `solicitudAdminResponseEnvelopeSchema`
 *  y `listarSolicitudesResponseEnvelopeSchema`.
 * ─────────────────────────────────────────────────────────────────────────── */
