import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M17. Administración · RESUMEN DEL PANEL (dashboard)
 * ============================================================================
 * Scope: m17-permisos · Resumen del panel
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 *
 * QUÉ ES. La pantalla de inicio del panel (`/admin`) deja de ser una maqueta con cifras escritas a mano y pasa a mostrar
 * lo que de verdad pasa en la tienda: cuánto se está cotizando, qué está esperando una respuesta, cómo va el inventario
 * y la publicidad, y atajos a lo que cada persona puede hacer. Todo sale de la base de datos, en una sola consulta.
 *
 * QUÉ NO ES.
 *  · No hay ventas por pedido: la orden de compra es M08 y los reportes de venta son M19, que no existen todavía. Mientras
 *    tanto, «negocio» se mide con lo que sí existe: cotizaciones (M21), carritos activos (M05) y descuentos (M06).
 *    Cuando exista M08, M19 agrega su bloque de ventas aquí sin romper nada (los bloques son opcionales).
 *  · No exporta ni guarda nada; es de solo lectura.
 *  · No duplica reglas: solo cuenta y suma lo que otros módulos ya guardan (lectura directa de sus tablas, como hace M02).
 *
 * REGLAS
 *  R1  PERMISOS POR BLOQUE. La ruta exige sesión. Cada bloque se incluye SOLO si la persona tiene el permiso de lo que
 *      muestra (resuelto en el servidor, en esta petición); los bloques sin permiso llegan en `null`. Si no tiene permiso
 *      para ningún bloque, la ruta responde 404 RECURSO_NO_DISPONIBLE (ADR-003). Permisos: `negocio` y `carritos` ← `ventas.ver`;
 *      `catalogo` y `descuentos` ← `catalogo.ver`; `personas` ← `personal.ver`; `patrocinios` ← `patrocinios.ver`.
 *  R2  PERIODO. `dias` (7, 30 o 90; por defecto 30) define el periodo de las cifras que son de «flujo» (cotizaciones,
 *      cupones, impresiones). Se compara con el periodo inmediatamente anterior de la misma duración. Las cifras de
 *      «estado actual» (cuántos productos hay, qué está pendiente) no dependen del periodo. Los días son de calendario en
 *      hora de Colombia (UTC-5, sin horario de verano).
 *  R3  COTIZACIONES (`negocio`). Se cuentan las CREADAS en el periodo. `valorCotizado` suma `totalReferencia`;
 *      `valorAprobado` suma `totalAcordado` de las aprobadas (si una aprobada no tiene total acordado, cuenta su
 *      referencia). `tasaAprobacion` = aprobadas ÷ (aprobadas + rechazadas + vencidas) × 100, con un decimal; null si
 *      todavía no hay ninguna resuelta. `porEstado` trae los seis estados siempre (con 0 si no hay).
 *  R4  SERIE. Un punto por día del periodo (sin huecos: los días sin cotizaciones valen 0), del más viejo al de hoy.
 *  R5  MÁS COTIZADOS. Los TOP_PRODUCTOS_PANEL productos con más unidades en cotizaciones del periodo, agrupados por
 *      nombre y marca (la línea guarda una copia del nombre, así que no se pierde si el producto cambia).
 *  R6  CARRITOS. Carritos con al menos una línea y actividad en los últimos 7 días, y las unidades que suman: demanda que
 *      todavía no es cotización ni compra. Es una foto de hoy, no depende de `dias`.
 *  R7  CATÁLOGO. Productos y variantes activos; variantes AGOTADAS (existencia referencial 0) y con EXISTENCIA BAJA (1 a
 *      EXISTENCIA_BAJA_MAXIMA). La existencia es solo referencial (M13).
 *  R8  DESCUENTOS. Eventos vigentes hoy y cupones activos vigentes; usos de cupón del periodo (sin los liberados) y el
 *      descuento que suman. El permiso es `catalogo.ver`, el mismo de M06.
 *  R9  PERSONAS. Clientes activos (naturales y empresa) y colaboradores activos. No hay fecha de alta de cuenta, así que
 *      no se muestra evolución, solo el total de hoy.
 *  R10 PATROCINIOS. Campañas vigentes hoy, anuncios activos, y las impresiones y clics del periodo con su CTR
 *      (clics ÷ impresiones × 100, un decimal; null si no hay impresiones).
 *  R11 PENDIENTES. Lista de lo que espera a una persona del equipo, solo con lo que tiene total > 0 y para lo que la
 *      persona tiene permiso. Cada uno lleva el enlace a su pantalla, ya filtrada cuando la pantalla lo permite (los
 *      filtros viajan en la URL). Orden: primero los de prioridad `alta`. Claves y permisos:
 *        cotizaciones_por_responder  estado «solicitada» (nadie las ha tomado todavía)         ventas.ver      alta
 *        cotizaciones_por_vencer     «enviada» que vence en DIAS_VENCIMIENTO_CERCANO días o menos  ventas.ver  alta
 *        solicitudes_contacto        solicitudes de contacto «en revisión»                    atencion.ver    normal
 *        solicitudes_empresa         solicitudes de cuenta empresa «pendiente»                empresas.validar normal
 *        solicitudes_nit             solicitudes de cambio de NIT «pendiente»                 empresas.validar normal
 *        variantes_agotadas          variantes activas con existencia 0                       catalogo.ver    normal
 *  R12 ACCESOS. Atajos a las pantallas a las que la persona tiene acceso (máximo ACCESOS_PANEL_MAXIMO), en un orden
 *      fijo de importancia. El servidor decide cuáles ve; el cliente solo los pinta. Cada atajo lleva su permiso aquí:
 *        responder_cotizaciones  ventas.ver · crear_producto  catalogo.crear · ajustar_inventario  catalogo.ver ·
 *        crear_promocion  catalogo.ver · gestionar_campanias  patrocinios.ver · atender_solicitudes  atencion.ver ·
 *        validar_empresas  empresas.validar · ver_clientes  personal.ver · gestionar_colaboradores  personal.ver
 *  R13 SIN IDENTIDAD AJENA. No devuelve datos personales de clientes (ni nombres ni correos): solo totales y productos.
 *  R14 RENDIMIENTO. Una sola petición; cada bloque se calcula con consultas agregadas (conteos y sumas en la base), sin
 *      traer filas para sumarlas en memoria, salvo la serie diaria, que acota a MAXIMO_FILAS_SERIE.
 *
 * PREGUNTAS ABIERTAS (no frenan la construcción)
 *  Q1  Cuando exista M08, ¿«ventas» reemplaza al bloque de cotizaciones o conviven? (hoy conviven: se agrega un bloque).
 *  Q2  ¿Hace falta que `tasaAprobacion` use un plazo mínimo (p. ej. solo cotizaciones con más de 7 días)? Hoy no.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const PERIODOS_PANEL_DIAS = [7, 30, 90] as const;
export const PERIODO_PANEL_POR_DEFECTO = 30;
/** Una cotización enviada «vence pronto» si le quedan estos días o menos (R11). */
export const DIAS_VENCIMIENTO_CERCANO = 3;
/** Existencia referencial de 1 hasta este valor cuenta como «baja» (R7). */
export const EXISTENCIA_BAJA_MAXIMA = 5;
export const TOP_PRODUCTOS_PANEL = 5;
export const ACCESOS_PANEL_MAXIMO = 6;
/** Tope de filas que se leen para armar la serie diaria (R14). */
export const MAXIMO_FILAS_SERIE = 20000;
/** Días de actividad con los que un carrito cuenta como «activo» (R6). */
export const DIAS_CARRITO_ACTIVO = 7;

export const ESTADOS_COTIZACION_PANEL = ['solicitada', 'borrador', 'enviada', 'aprobada', 'rechazada', 'vencida'] as const;
export const estadoCotizacionPanelSchema = z.enum(ESTADOS_COTIZACION_PANEL);
export type EstadoCotizacionPanel = z.infer<typeof estadoCotizacionPanelSchema>;

export const CLAVES_PENDIENTE_PANEL = [
  'cotizaciones_por_responder',
  'cotizaciones_por_vencer',
  'solicitudes_contacto',
  'solicitudes_empresa',
  'solicitudes_nit',
  'variantes_agotadas',
] as const;
export const clavePendientePanelSchema = z.enum(CLAVES_PENDIENTE_PANEL);
export type ClavePendientePanel = z.infer<typeof clavePendientePanelSchema>;

export const CLAVES_ACCESO_PANEL = [
  'responder_cotizaciones',
  'crear_producto',
  'ajustar_inventario',
  'crear_promocion',
  'gestionar_campanias',
  'atender_solicitudes',
  'validar_empresas',
  'ver_clientes',
  'gestionar_colaboradores',
] as const;
export const claveAccesoPanelSchema = z.enum(CLAVES_ACCESO_PANEL);
export type ClaveAccesoPanel = z.infer<typeof claveAccesoPanelSchema>;

/** Ruta interna del panel (siempre empieza por /admin). */
const rutaPanelSchema = z.string().regex(/^\/admin(\/|\?|$)/);
const enteroNoNegativoSchema = z.number().int().nonnegative();
const importeSchema = z.number().nonnegative();

/* ───────────────────────────────────────────────────────────────────────────
 * 2. SOLICITUD
 * ─────────────────────────────────────────────────────────────────────────── */

export const resumenPanelRequestSchema = z.object({
  /** R2: 7, 30 o 90; cualquier otro valor responde 400 PARAMETRO_INVALIDO. */
  dias: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .optional(),
});
export type ResumenPanelRequest = z.infer<typeof resumenPanelRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTA
 * ─────────────────────────────────────────────────────────────────────────── */

/** Una cifra del periodo y la del periodo anterior, para mostrar la variación. */
export const comparacionSchema = z.object({
  actual: z.number().nonnegative(),
  anterior: z.number().nonnegative(),
});
export type Comparacion = z.infer<typeof comparacionSchema>;

export const puntoSerieSchema = z.object({
  /** Día de calendario en Colombia, AAAA-MM-DD. */
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cotizaciones: enteroNoNegativoSchema,
  valor: importeSchema,
});
export type PuntoSerie = z.infer<typeof puntoSerieSchema>;

export const productoCotizadoSchema = z.object({
  nombre: z.string(),
  marca: z.string().nullable(),
  unidades: enteroNoNegativoSchema,
  cotizaciones: enteroNoNegativoSchema,
});
export type ProductoCotizado = z.infer<typeof productoCotizadoSchema>;

export const negocioSchema = z.object({
  cotizaciones: comparacionSchema,
  valorCotizado: comparacionSchema,
  valorAprobado: comparacionSchema,
  /** Porcentaje de 0 a 100 con un decimal; null si todavía no hay cotizaciones resueltas (R3). */
  tasaAprobacion: z.number().min(0).max(100).nullable(),
  porEstado: z.array(z.object({ estado: estadoCotizacionPanelSchema, total: enteroNoNegativoSchema })).length(ESTADOS_COTIZACION_PANEL.length),
  serie: z.array(puntoSerieSchema),
  topProductos: z.array(productoCotizadoSchema).max(TOP_PRODUCTOS_PANEL),
});
export type NegocioPanel = z.infer<typeof negocioSchema>;

export const carritosSchema = z.object({
  activos: enteroNoNegativoSchema,
  unidades: enteroNoNegativoSchema,
});
export type CarritosPanel = z.infer<typeof carritosSchema>;

export const catalogoPanelSchema = z.object({
  productosActivos: enteroNoNegativoSchema,
  variantesActivas: enteroNoNegativoSchema,
  variantesAgotadas: enteroNoNegativoSchema,
  variantesExistenciaBaja: enteroNoNegativoSchema,
});
export type CatalogoPanel = z.infer<typeof catalogoPanelSchema>;

export const descuentosPanelSchema = z.object({
  eventosVigentes: enteroNoNegativoSchema,
  cuponesVigentes: enteroNoNegativoSchema,
  usosCupon: comparacionSchema,
  descuentoOtorgado: comparacionSchema,
});
export type DescuentosPanel = z.infer<typeof descuentosPanelSchema>;

export const personasPanelSchema = z.object({
  clientesNaturales: enteroNoNegativoSchema,
  clientesEmpresa: enteroNoNegativoSchema,
  colaboradores: enteroNoNegativoSchema,
});
export type PersonasPanel = z.infer<typeof personasPanelSchema>;

export const patrociniosPanelSchema = z.object({
  campaniasVigentes: enteroNoNegativoSchema,
  anunciosActivos: enteroNoNegativoSchema,
  impresiones: comparacionSchema,
  clics: comparacionSchema,
  /** Porcentaje con un decimal; null si no hubo impresiones en el periodo (R10). */
  ctr: z.number().min(0).nullable(),
});
export type PatrociniosPanel = z.infer<typeof patrociniosPanelSchema>;

export const pendientePanelSchema = z.object({
  clave: clavePendientePanelSchema,
  etiqueta: z.string(),
  total: z.number().int().positive(),
  prioridad: z.enum(['alta', 'normal']),
  ruta: rutaPanelSchema,
});
export type PendientePanel = z.infer<typeof pendientePanelSchema>;

export const accesoPanelSchema = z.object({
  clave: claveAccesoPanelSchema,
  etiqueta: z.string(),
  descripcion: z.string(),
  ruta: rutaPanelSchema,
});
export type AccesoPanel = z.infer<typeof accesoPanelSchema>;

export const resumenPanelSchema = z.object({
  dias: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  /** Instante en que se calculó (ISO 8601). */
  generadoEn: z.string(),
  /** Bloques por permiso (R1): null = la persona no tiene permiso para verlo. */
  negocio: negocioSchema.nullable(),
  carritos: carritosSchema.nullable(),
  catalogo: catalogoPanelSchema.nullable(),
  descuentos: descuentosPanelSchema.nullable(),
  personas: personasPanelSchema.nullable(),
  patrocinios: patrociniosPanelSchema.nullable(),
  pendientes: z.array(pendientePanelSchema),
  accesos: z.array(accesoPanelSchema).max(ACCESOS_PANEL_MAXIMO),
});
export type ResumenPanel = z.infer<typeof resumenPanelSchema>;

export const resumenPanelResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: resumenPanelSchema,
});
export type ResumenPanelResponseEnvelope = z.infer<typeof resumenPanelResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * 400 PARAMETRO_INVALIDO (`dias` fuera de 7, 30, 90) · 401 sin sesión · 404 RECURSO_NO_DISPONIBLE (sin permiso para ningún
 * bloque, R1; idéntico al de un recurso inexistente, ADR-003).
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 5. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  MONTAJE: /api/v1/admin (router de M17), detrás de la sesión.
 *   GET /resumen?dias=7|30|90   → resumenPanelResponseEnvelope   (R1 a R14)
 */
