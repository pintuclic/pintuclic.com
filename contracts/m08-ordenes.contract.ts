import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M08. Orden de venta
 * ============================================================================
 * Scope: m08-ordenes · Ola 3 · Carril Venta · BORRADOR para revisión del Tech Lead
 *
 * Este contrato ES la especificación del módulo. Spec guía:
 * docs/02_MODULOS_FUNCIONALES/M08_ESPECIFICACION_ORDEN.md (HU-ORD-01 a 11).
 * Diagrama de estados: docs/assets/diagrams/M08/Maquina_de_estados_de_la_Orden.drawio.png
 *
 * ── Qué incluye ─────────────────────────────────────────────────────────────
 *  Creación de la orden desde un pago confirmado (servicio interno, SIN ruta HTTP)
 *  · código PC-AAAA-NNNNN · copia histórica de líneas, descuentos e IVA · ciclo de
 *  estados con historial · «Mis pedidos» del cliente · bandeja, buscador, detalle,
 *  notas internas, contactos e historial de compras del cliente para el personal.
 *
 * ── Qué NO incluye ──────────────────────────────────────────────────────────
 *  Solicitud SOL, pasarela y confirmación del pago (M07) · carrito (M05) ·
 *  cotizaciones (M21) · verificación de disponibilidad por línea y paso automático
 *  a preparación (M09) · transporte (M10) · facturación (M12) · política, plazos y
 *  ejecución de cancelación, devolución y reembolso (M11) · plantillas de correo (M18).
 *
 * ── Reglas clave ────────────────────────────────────────────────────────────
 *  R1  La orden nace SOLO por `crearDesdePagoConfirmado` (llamada interna de M07).
 *      No existe POST público de órdenes. Sin pago confirmado no hay orden.
 *  R2  Idempotente por `codigoSolicitud` y por `transaccionPagoId` (ambos únicos):
 *      una confirmación repetida devuelve la orden existente, nunca crea otra.
 *  R3  Atómica: orden, líneas, descuentos, historial inicial y consecutivo en una sola
 *      transacción. Si algo falla no avanza el consecutivo (sin huecos).
 *  R4  Código `PC-AAAA-NNNNN` con el año de Colombia (America/Bogota). El consecutivo
 *      es corrido: no se reinicia con el año ni se reutiliza. La API expone solo el
 *      `codigo`, jamás la clave primaria (ADR-04).
 *  R5  Los importes, descuentos e IVA se copian de la solicitud tal cual: M08 no
 *      recalcula ni redondea (D07). Se rechaza un pago inferior al total (D06).
 *  R6  La orden es inmutable: no hay borrado físico ni PUT/DELETE de órdenes. Las líneas
 *      conservan los datos aunque el producto salga del catálogo (ADR-05, sin FK).
 *  R7  Estados y transiciones: ver TRANSICIONES_ESTADO. Todo cambio exige
 *      `ventas.gestionar`, guarda autor, motivo y momento en el historial y emite un
 *      evento (RF-ORD-03-02).
 *  R8  Concurrencia sin bloqueo ni asignación (RF-ORD-05-06): el PATCH envía
 *      `estadoActual`; si ya cambió, 409 ESTADO_CAMBIADO y no se sobrescribe.
 *  R9  Cancelar y devolver NO están habilitados: 409 OPERACION_NO_HABILITADA hasta que
 *      M11 defina la política (RF-POS-04-03). El cliente nunca cancela por sí mismo.
 *  R10 Correo al cliente solo al nacer la orden, al despacharla y al cancelarla (D05).
 *      Nunca al personal: el contador de la navegación es el único aviso (RF-ORD-05-04).
 *  R11 Las notas internas y los contactos son solo inserción: PUT/PATCH/DELETE → 405
 *      NOTA_INMUTABLE. Las notas jamás se devuelven al cliente.
 *  R12 «Finalizada» = entregado, despachado, cancelado o devuelto. El resto, «en curso».
 *  R13 Autorización siempre en servidor. Cliente: solo sus órdenes. Personal:
 *      `ventas.ver` consulta y `ventas.gestionar` opera. Orden ajena, sin permiso o
 *      inexistente → 404 RECURSO_NO_DISPONIBLE idéntico (ADR-003) y el intento se
 *      audita (M20).
 *  R14 Una línea cuyo producto ya no está en el catálogo (`productoDisponible: false`)
 *      se muestra con sus datos copiados, sin enlace y con la nota de no disponible.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Prefijo de rutas /api/v1/ordenes/... ; mis-pedidos para el cliente y gestion
 *      para el personal (spec §4).
 *  D2  `devuelto` se muestra al cliente como finalizado (pendiente P5 de la spec).
 *  D3  Medios de contacto: lista cerrada `correo` y `telefono`. Registrar el contacto
 *      NO envía el mensaje; solo deja constancia de que se inició.
 *  D4  Paginación por defecto 20, máximo 100. La bandeja agrupada por estado se obtiene
 *      con `agruparPorEstado` y devuelve todas las órdenes en curso sin paginar.
 *  D5  El correo del cliente va por un puerto (NotificacionesPort) con adaptador en
 *      memoria hasta que M18 esté en main; un fallo del correo no revierte la orden.
 *  D6  La existencia del producto en el catálogo se lee por un puerto de solo lectura
 *      sobre `id_variante_ref`; no se modifica código de M01.
 *  D7  Permisos: ya sembrados (`ventas.ver`, `ventas.gestionar`); sin tocar el seed.
 *      Se asume que el rol cliente empresa NO recibe permisos del personal.
 *
 * ── Preguntas abiertas (no bloquean) ────────────────────────────────────────
 *  Q1  P5: ¿el cliente ve «devuelto»? (D2 propone que sí).
 *  Q2  Política de M11: plazos, productos y estado exigido para cancelar y devolver.
 *  Q3  P3: pago que llega después de descartar la solicitud (M07).
 *  Q4  Redondeo: RF-PRE-05-04 («al peso superior») vs D07 («mitad hacia arriba»).
 *  Q5  ¿Se amplía la lista de medios de contacto (p. ej. whatsapp)?
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y ENUMS
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGO_ORDEN_PATRON = /^PC-\d{4}-\d{5,}$/;
export const CODIGO_SOLICITUD_PATRON = /^SOL-\d{4}-\d{5,}$/;

export const codigoOrdenSchema = z.string().regex(CODIGO_ORDEN_PATRON, 'Use el formato PC-AAAA-NNNNN');
export const codigoSolicitudSchema = z.string().regex(CODIGO_SOLICITUD_PATRON, 'Use el formato SOL-AAAA-NNNNN');
/** Importe en pesos con hasta dos decimales, como lo entrega la solicitud (D07). */
export const importeSchema = z.number().nonnegative();
export const porcentajeSchema = z.number().min(0).max(100);
export const fechaHoraSchema = z.string().datetime();

export const ESTADOS_ORDEN = [
  'orden_confirmada',
  'revision_disponibilidad',
  'en_preparacion',
  'preparada',
  'despachado',
  'entregado',
  'cancelado',
  'devuelto',
] as const;
export const estadoOrdenSchema = z.enum(ESTADOS_ORDEN);
export type EstadoOrden = z.infer<typeof estadoOrdenSchema>;

/** R12. */
export const ESTADOS_FINALIZADOS: readonly EstadoOrden[] = ['entregado', 'despachado', 'cancelado', 'devuelto'];

export const MODOS_ENTREGA = ['domicilio', 'recogida'] as const;
export const modoEntregaSchema = z.enum(MODOS_ENTREGA);
export type ModoEntrega = z.infer<typeof modoEntregaSchema>;

export const ORIGENES_ORDEN = ['carrito', 'cotizacion'] as const;
export const origenOrdenSchema = z.enum(ORIGENES_ORDEN);
export type OrigenOrden = z.infer<typeof origenOrdenSchema>;

export const MEDIOS_CONTACTO = ['correo', 'telefono'] as const;
export const medioContactoSchema = z.enum(MEDIOS_CONTACTO);
export type MedioContacto = z.infer<typeof medioContactoSchema>;

/**
 * R7. Transiciones permitidas. `devuelto` figura para documentar el destino, pero
 * responde 409 OPERACION_NO_HABILITADA hasta M11 (R9), igual que `cancelado`
 * (que puede partir de varios estados según la política y por eso no se lista).
 * `condicion` es lo que el servicio verifica además de la pareja desde → hacia.
 */
export const TRANSICIONES_ESTADO = [
  { desde: 'orden_confirmada', hacia: 'revision_disponibilidad', condicion: null },
  { desde: 'revision_disponibilidad', hacia: 'en_preparacion', condicion: 'Hoy lo registra el personal; con M09 será automático (RF-CUM-03-10)' },
  { desde: 'en_preparacion', hacia: 'preparada', condicion: null },
  { desde: 'preparada', hacia: 'en_preparacion', condicion: 'Exige motivo; no se retrocede a revision_disponibilidad (RF-CUM-05-05)' },
  { desde: 'preparada', hacia: 'despachado', condicion: 'Solo modoEntrega = domicilio, o sin modo (orden anterior a la copia histórica)' },
  { desde: 'preparada', hacia: 'entregado', condicion: 'Solo modoEntrega = recogida, o sin modo' },
  { desde: 'despachado', hacia: 'entregado', condicion: 'Opcional: el personal confirma la llegada' },
  { desde: 'entregado', hacia: 'devuelto', condicion: 'NO HABILITADO hasta M11; no aplica a líneas entonadas a medida' },
] as const;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. CREACIÓN INTERNA (M07 → M08, sin ruta HTTP)
 * ─────────────────────────────────────────────────────────────────────────── */

export const descuentoSolicitudInputSchema = z.object({
  ordenAplicacion: z.number().int().positive(),
  origen: z.string().trim().min(1).max(150),
  porcentaje: porcentajeSchema.nullable(),
  importe: importeSchema,
});
export type DescuentoSolicitudInput = z.infer<typeof descuentoSolicitudInputSchema>;

export const lineaSolicitudInputSchema = z.object({
  nombreProducto: z.string().trim().min(1).max(150),
  varianteCopia: z.string().trim().min(1).max(150),
  colorSolicitado: z.string().trim().max(150).nullable(),
  skuVendido: z.string().trim().max(100).nullable(),
  cantidad: z.number().int().positive(),
  precioInicial: importeSchema,
  precioAplicado: importeSchema,
  idVarianteRef: z.number().int().positive().nullable(),
  esEntonado: z.boolean(),
  baseConsumida: z.string().trim().max(150).nullable(),
  descuentos: z.array(descuentoSolicitudInputSchema),
});
export type LineaSolicitudInput = z.infer<typeof lineaSolicitudInputSchema>;

/** Entrada de `serviciosOrdenes.creacion.crearDesdePagoConfirmado()`. */
export const solicitudPagadaInputSchema = z
  .object({
    codigoSolicitud: codigoSolicitudSchema,
    transaccionPagoId: z.string().trim().min(1).max(100),
    idUsuario: z.number().int().positive(),
    origen: origenOrdenSchema,
    idCotizacion: z.number().int().positive().nullable(),
    modoEntrega: modoEntregaSchema,
    direccion: z.string().trim().min(1).nullable(),
    costoEntrega: importeSchema,
    subTotal: importeSchema,
    descuento: importeSchema,
    total: importeSchema,
    baseSinImpuesto: importeSchema,
    importeIva: importeSchema,
    tasaIva: porcentajeSchema,
    /** Importe efectivamente confirmado por la pasarela o el empleado (D06). */
    montoPagado: importeSchema,
    observaciones: z.string().trim().max(1000).nullable(),
    lineas: z.array(lineaSolicitudInputSchema).min(1),
  })
  .refine((v) => v.origen !== 'cotizacion' || v.idCotizacion !== null, {
    message: 'Una orden de cotización exige idCotizacion',
    path: ['idCotizacion'],
  })
  .refine((v) => v.modoEntrega !== 'domicilio' || v.direccion !== null, {
    message: 'El envío a domicilio exige dirección',
    path: ['direccion'],
  });
export type SolicitudPagadaInput = z.infer<typeof solicitudPagadaInputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. ENTIDADES DE SALIDA
 * ─────────────────────────────────────────────────────────────────────────── */

export const descuentoOrdenSchema = z.object({
  ordenAplicacion: z.number().int().positive(),
  origen: z.string(),
  porcentaje: porcentajeSchema.nullable(),
  importe: importeSchema,
});
export type DescuentoOrden = z.infer<typeof descuentoOrdenSchema>;

export const lineaOrdenSchema = z.object({
  nombreProducto: z.string(),
  varianteCopia: z.string(),
  colorSolicitado: z.string().nullable(),
  skuVendido: z.string().nullable(),
  cantidad: z.number().int().positive(),
  precioInicial: importeSchema.nullable(),
  precioAplicado: importeSchema,
  descuentos: z.array(descuentoOrdenSchema),
  /** R14. false → sin enlace a la ficha y con la nota de no disponible. */
  productoDisponible: z.boolean(),
});
export type LineaOrden = z.infer<typeof lineaOrdenSchema>;

/** Línea con lo que solo ve el personal (RF-ORD-09-01). */
export const lineaOrdenGestionSchema = lineaOrdenSchema.extend({
  esEntonado: z.boolean(),
  baseConsumida: z.string().nullable(),
});
export type LineaOrdenGestion = z.infer<typeof lineaOrdenGestionSchema>;

export const ordenResumenSchema = z.object({
  codigo: codigoOrdenSchema,
  fecha: fechaHoraSchema,
  total: importeSchema,
  estado: estadoOrdenSchema,
  modoEntrega: modoEntregaSchema.nullable(),
});
export type OrdenResumen = z.infer<typeof ordenResumenSchema>;

export const historialEstadoClienteSchema = z.object({
  estadoAnterior: estadoOrdenSchema.nullable(),
  estadoNuevo: estadoOrdenSchema,
  fecha: fechaHoraSchema,
});

export const historialEstadoGestionSchema = historialEstadoClienteSchema.extend({
  autor: z.string().nullable().describe('Nombre del empleado; null = transición automática del sistema'),
  motivo: z.string().nullable(),
});
export type HistorialEstadoGestion = z.infer<typeof historialEstadoGestionSchema>;

const ordenDetalleBaseSchema = ordenResumenSchema.extend({
  origen: origenOrdenSchema,
  subTotal: importeSchema,
  descuento: importeSchema,
  costoEntrega: importeSchema,
  baseSinImpuesto: importeSchema.nullable(),
  importeIva: importeSchema.nullable(),
  tasaIva: porcentajeSchema.nullable(),
});

export const ordenDetalleClienteSchema = ordenDetalleBaseSchema.extend({
  lineas: z.array(lineaOrdenSchema),
  historial: z.array(historialEstadoClienteSchema),
});
export type OrdenDetalleCliente = z.infer<typeof ordenDetalleClienteSchema>;

export const notaOrdenSchema = z.object({
  idNota: z.number().int().positive(),
  texto: z.string(),
  autor: z.string(),
  fecha: fechaHoraSchema,
});
export type NotaOrden = z.infer<typeof notaOrdenSchema>;

export const contactoOrdenSchema = z.object({
  idContacto: z.number().int().positive(),
  medio: medioContactoSchema,
  detalle: z.string().nullable(),
  autor: z.string(),
  fecha: fechaHoraSchema,
});
export type ContactoOrden = z.infer<typeof contactoOrdenSchema>;

export const clienteOrdenSchema = z.object({
  idUsuario: z.number().int().positive(),
  nombre: z.string(),
  correo: z.string().email(),
  telefono: z.string().nullable(),
});
export type ClienteOrden = z.infer<typeof clienteOrdenSchema>;

export const ordenDetalleGestionSchema = ordenDetalleBaseSchema.extend({
  cliente: clienteOrdenSchema,
  direccion: z.string().nullable().describe('Solo cuando modoEntrega = domicilio'),
  codigoSolicitud: codigoSolicitudSchema.nullable(),
  idCotizacion: z.number().int().positive().nullable(),
  observaciones: z.string().nullable(),
  lineas: z.array(lineaOrdenGestionSchema),
  historial: z.array(historialEstadoGestionSchema),
  notas: z.array(notaOrdenSchema),
  contactos: z.array(contactoOrdenSchema),
  transicionesPermitidas: z.array(estadoOrdenSchema).describe('Estados a los que el personal puede pasarla hoy'),
});
export type OrdenDetalleGestion = z.infer<typeof ordenDetalleGestionSchema>;

export const ordenFilaBandejaSchema = ordenResumenSchema.extend({
  cliente: z.string(),
  segundosEnEstado: z.number().int().nonnegative(),
});
export type OrdenFilaBandeja = z.infer<typeof ordenFilaBandejaSchema>;

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. PETICIONES (query, params y body)
 * ─────────────────────────────────────────────────────────────────────────── */

export const codigoOrdenParamsSchema = z.object({ codigo: codigoOrdenSchema });

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /ordenes/mis-pedidos (HU-ORD-07). */
export const listarMisPedidosRequestSchema = paginacionQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
});
export type ListarMisPedidosRequest = z.infer<typeof listarMisPedidosRequestSchema>;

/** GET /ordenes/gestion (HU-ORD-05, 08, 11). `cliente` es el id de la ficha del cliente. */
export const listarGestionRequestSchema = paginacionQuerySchema
  .extend({
    codigo: z.string().trim().max(20).optional(),
    estado: estadoOrdenSchema.optional(),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
    cliente: z.coerce.number().int().positive().optional(),
    correo: z.string().trim().max(150).optional(),
    telefono: z.string().trim().max(20).optional(),
    orden: z.enum(['antiguedad', 'reciente']).default('antiguedad'),
    diasEsperando: z.coerce.number().int().min(0).optional(),
    agruparPorEstado: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  })
  .refine((v) => !v.desde || !v.hasta || v.desde <= v.hasta, {
    message: '`desde` no puede ser posterior a `hasta`',
    path: ['desde'],
  });
export type ListarGestionRequest = z.infer<typeof listarGestionRequestSchema>;

/** PATCH /ordenes/gestion/:codigo/estado (HU-ORD-03). */
export const cambiarEstadoRequestSchema = z
  .object({
    estadoActual: estadoOrdenSchema,
    estadoNuevo: estadoOrdenSchema,
    motivo: z.string().trim().min(1).max(500).optional(),
  })
  .refine((v) => v.estadoActual !== v.estadoNuevo, {
    message: 'El estado nuevo debe ser distinto del actual',
    path: ['estadoNuevo'],
  })
  .refine((v) => !(v.estadoActual === 'preparada' && v.estadoNuevo === 'en_preparacion') || !!v.motivo, {
    message: 'Volver de preparada a en preparación exige motivo',
    path: ['motivo'],
  });
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

/** POST /ordenes/gestion/:codigo/notas (HU-ORD-10). */
export const crearNotaRequestSchema = z.object({ texto: z.string().trim().min(1).max(2000) });
export type CrearNotaRequest = z.infer<typeof crearNotaRequestSchema>;

/** POST /ordenes/gestion/:codigo/contactos (HU-ORD-09-02). */
export const crearContactoRequestSchema = z.object({
  medio: medioContactoSchema,
  detalle: z.string().trim().max(500).optional(),
});
export type CrearContactoRequest = z.infer<typeof crearContactoRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M08 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  TRANSICION_NO_PERMITIDA: 'TRANSICION_NO_PERMITIDA',
  MOTIVO_REQUERIDO: 'MOTIVO_REQUERIDO',
  ESTADO_CAMBIADO: 'ESTADO_CAMBIADO',
  OPERACION_NO_HABILITADA: 'OPERACION_NO_HABILITADA',
  NOTA_INMUTABLE: 'NOTA_INMUTABLE',
  PAGO_NO_CONFIRMADO: 'PAGO_NO_CONFIRMADO',
  PAGO_INSUFICIENTE: 'PAGO_INSUFICIENTE',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;
export const codigoErrorM08Schema = z.enum([
  CODIGOS_ERROR_M08.RECURSO_NO_DISPONIBLE,
  CODIGOS_ERROR_M08.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M08.TRANSICION_NO_PERMITIDA,
  CODIGOS_ERROR_M08.MOTIVO_REQUERIDO,
  CODIGOS_ERROR_M08.ESTADO_CAMBIADO,
  CODIGOS_ERROR_M08.OPERACION_NO_HABILITADA,
  CODIGOS_ERROR_M08.NOTA_INMUTABLE,
  CODIGOS_ERROR_M08.PAGO_NO_CONFIRMADO,
  CODIGOS_ERROR_M08.PAGO_INSUFICIENTE,
  CODIGOS_ERROR_M08.ERROR_INTERNO,
]);

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorM08Schema,
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/**
 * Códigos HTTP por error:
 *  404 RECURSO_NO_DISPONIBLE (ajena, inexistente o sin permiso) · 400 PARAMETRO_INVALIDO
 *  409 TRANSICION_NO_PERMITIDA, ESTADO_CAMBIADO, OPERACION_NO_HABILITADA
 *  422 MOTIVO_REQUERIDO · 405 NOTA_INMUTABLE · 500 ERROR_INTERNO
 *  PAGO_NO_CONFIRMADO y PAGO_INSUFICIENTE solo los lanza el servicio interno (sin HTTP).
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 6. RESPUESTAS (envelopes)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Resultado del servicio interno de creación. `creada: false` = ya existía (R2). */
export const crearOrdenResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ codigo: codigoOrdenSchema, creada: z.boolean(), estado: estadoOrdenSchema }),
});
export type CrearOrdenResponseEnvelope = z.infer<typeof crearOrdenResponseEnvelopeSchema>;

/** GET /ordenes/mis-pedidos */
export const misPedidosResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    enCurso: z.array(ordenResumenSchema),
    finalizados: z.array(ordenResumenSchema),
  }),
  pagination: paginacionSchema,
});
export type MisPedidosResponseEnvelope = z.infer<typeof misPedidosResponseEnvelopeSchema>;

/** GET /ordenes/mis-pedidos/:codigo */
export const ordenClienteResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: ordenDetalleClienteSchema,
});
export type OrdenClienteResponseEnvelope = z.infer<typeof ordenClienteResponseEnvelopeSchema>;

/** GET /ordenes/gestion y GET /ordenes/gestion/:codigo/historial-cliente */
export const bandejaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(ordenFilaBandejaSchema),
  pagination: paginacionSchema,
});
export type BandejaResponseEnvelope = z.infer<typeof bandejaResponseEnvelopeSchema>;

/** GET /ordenes/gestion con agruparPorEstado=true */
export const bandejaAgrupadaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ estado: estadoOrdenSchema, ordenes: z.array(ordenFilaBandejaSchema) })),
});
export type BandejaAgrupadaResponseEnvelope = z.infer<typeof bandejaAgrupadaResponseEnvelopeSchema>;

/** GET /ordenes/gestion/resumen: contador de la navegación (RF-ORD-05-04). */
export const resumenGestionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ estado: estadoOrdenSchema, cantidad: z.number().int().nonnegative() })),
});
export type ResumenGestionResponseEnvelope = z.infer<typeof resumenGestionResponseEnvelopeSchema>;

/** GET /ordenes/gestion/:codigo y PATCH .../estado */
export const ordenGestionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: ordenDetalleGestionSchema,
});
export type OrdenGestionResponseEnvelope = z.infer<typeof ordenGestionResponseEnvelopeSchema>;

/** POST .../notas */
export const notaResponseEnvelopeSchema = z.object({ success: z.literal(true), data: notaOrdenSchema });
export type NotaResponseEnvelope = z.infer<typeof notaResponseEnvelopeSchema>;

/** POST .../contactos */
export const contactoResponseEnvelopeSchema = z.object({ success: z.literal(true), data: contactoOrdenSchema });
export type ContactoResponseEnvelope = z.infer<typeof contactoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. ENDPOINTS (referencia; prefijo /api/v1)
 * ─────────────────────────────────────────────────────────────────────────── */

export const ENDPOINTS_M08 = [
  { metodo: 'GET', ruta: '/ordenes/mis-pedidos', acceso: 'cliente titular', hu: 'HU-ORD-07' },
  { metodo: 'GET', ruta: '/ordenes/mis-pedidos/:codigo', acceso: 'cliente titular', hu: 'HU-ORD-04' },
  { metodo: 'GET', ruta: '/ordenes/gestion', acceso: 'ventas.ver', hu: 'HU-ORD-05, 08, 11' },
  { metodo: 'GET', ruta: '/ordenes/gestion/resumen', acceso: 'ventas.ver', hu: 'HU-ORD-05' },
  { metodo: 'GET', ruta: '/ordenes/gestion/:codigo', acceso: 'ventas.ver', hu: 'HU-ORD-09' },
  { metodo: 'GET', ruta: '/ordenes/gestion/:codigo/historial-cliente', acceso: 'ventas.ver', hu: 'HU-ORD-11' },
  { metodo: 'PATCH', ruta: '/ordenes/gestion/:codigo/estado', acceso: 'ventas.gestionar', hu: 'HU-ORD-03' },
  { metodo: 'POST', ruta: '/ordenes/gestion/:codigo/notas', acceso: 'ventas.gestionar', hu: 'HU-ORD-10' },
  { metodo: 'POST', ruta: '/ordenes/gestion/:codigo/contactos', acceso: 'ventas.gestionar', hu: 'HU-ORD-09' },
] as const;
