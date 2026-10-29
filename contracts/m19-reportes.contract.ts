import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M19. Reportes y analítica de ventas  (PROPUESTA)
 * ============================================================================
 * Scope: m19-reportes · Ola 5 · Depende de M08 (órdenes) · Lee M01, M06, M11 y M12 (solo lectura)
 *
 * QUÉ HACE
 *  Responde, con datos reales de la base y para un rango de fechas, las preguntas que el dueño de la tienda se hace:
 *  cuánto vendí, cómo va frente al periodo anterior, qué productos, categorías, marcas y tipos de cliente venden más, cuánto
 *  descuento di y por qué, quiénes compran más, cuántas órdenes ya tienen comprobante y cuánto se devolvió. Cada reporte se
 *  ve en pantalla (tabla y gráfico) y se descarga en CSV.
 *
 * QUÉ NO HACE
 *  - No guarda nada ni modifica nada: es solo lectura. No agrega tablas ni toca el esquema (usa `orden.fecha`, ya indexada).
 *  - No es inteligencia de negocio: sin pronósticos, sin segmentación automática, sin correos programados.
 *  - No mide visitas, conversión del sitio ni el embudo de navegación (no hay analítica web en el sistema).
 *  - No reemplaza el resumen del panel `/admin` (M17): ese es un vistazo; este es el detalle. Un bloque «ventas» en el
 *    panel podría alimentarse de aquí más adelante (Q5).
 *  - No expone datos de contacto de clientes (correo, teléfono, dirección): solo el nombre para el «top de clientes» (R9).
 *
 * REGLAS
 *  R1  RANGO. `desde` y `hasta` son fechas de calendario `AAAA-MM-DD` en hora de Colombia, ambas incluidas. Sin ellas, los
 *      últimos 30 días contando hoy. `hasta` no puede ser anterior a `desde` ni el rango pasar de MAXIMO_DIAS_RANGO días:
 *      400 `RANGO_INVALIDO`. Se filtra por la fecha de la orden (`orden.fecha`, que M08 guarda ya como fecha local).
 *  R2  QUÉ ES UNA VENTA. Una orden cuenta como venta si su estado NO es `cancelado` ni `devuelto`. Las canceladas y devueltas
 *      no suman a ninguna cifra de venta, pero se cuentan aparte en `porEstado` para que se vea cuánto se pierde. Una
 *      devolución PARCIAL (M11) no baja la venta de la orden: se informa en el reporte de postventa, no se resta (Q4).
 *  R3  CIFRAS COPIADAS, NO RECALCULADAS. Importes, descuentos, envío e IVA salen tal cual los congeló M08 (M08 · R5). `ventasBrutas`
 *      = suma de `sub_total`; `descuentos` = suma de `descuento`; `totalCobrado` = suma de `total` (con envío, IVA incluido);
 *      `baseSinIva` e `iva` suman los campos congelados (las órdenes anteriores a M07 que no los traen cuentan 0 en esas dos).
 *      `ticketPromedio` = totalCobrado ÷ órdenes, sin decimales; null si no hay órdenes.
 *  R4  COMPARACIÓN. El resumen trae las mismas cifras del periodo inmediatamente anterior de igual duración y la variación en
 *      porcentaje con un decimal (`null` si el periodo anterior es 0).
 *  R5  SERIE. `agrupar` = `dia`, `semana` (lunes a domingo) o `mes`; un punto por intervalo, sin huecos (valen 0) y de más
 *      viejo a más nuevo. `periodo` es la fecha de inicio del intervalo. Máximo MAXIMO_PUNTOS_SERIE puntos: si el rango y la
 *      agrupación lo superan, 400 `RANGO_INVALIDO`.
 *  R6  VENTAS POR… Una sola ruta con `dimension`:
 *        producto       nombre del producto copiado en la línea (no se pierde si el producto se retira del catálogo)
 *        categoria      la categoría ACTUAL del producto de la línea (por su variante); sin variante o sin producto: «Sin clasificar»
 *        marca          la marca ACTUAL del producto (igual criterio)
 *        tipo_cliente   `persona` o `empresa` (según el titular de la orden)
 *        modo_entrega   `domicilio`, `recogida` o «Sin dato»
 *      Por fila: órdenes distintas, unidades y `importe` = suma de `precio_aplicado × cantidad` de las líneas (ya con los
 *      descuentos de línea). `participacion` = importe de la fila ÷ importe total de la dimensión × 100, un decimal. Orden:
 *      `orden` = `importe` (por defecto) o `unidades`, de mayor a menor; `limite` (por defecto 20, máximo 100). Un producto sin
 *      ventas en el rango no aparece.
 *  R7  DESCUENTOS. Agrupa los descuentos de línea (`linea_orden_descuento`) por su `origen` (el texto que congeló M06: evento,
 *      cupón, tipo de cliente…): líneas afectadas, órdenes distintas e importe, de mayor a menor. `totalDescuentos` es la suma.
 *  R8  POSTVENTA. Desde M11, en el rango de la fecha de solicitud: solicitudes por tipo y por estado, y el total reembolsado
 *      (suma de `total_reembolso` de las que tienen `fecha_reembolso` en el rango). No depende de R2.
 *  R9  TOP DE CLIENTES. Los `limite` titulares con más `totalCobrado` en el rango: nombre (o razón social si es empresa), tipo,
 *      órdenes, unidades y total. Sin correo, teléfono ni dirección (R13 del panel de M17 se mantiene). Es el único reporte que
 *      muestra nombres, y por eso lleva su propio permiso (R12).
 *  R10 FACTURACIÓN (M12). De las ventas del rango (R2): cuántas ya tienen comprobante de venta y cuántas no (pendientes por
 *      datos del vendedor incompletos o por un fallo de emisión), y el último número emitido.
 *  R11 EXPORTACIÓN. Cada reporte acepta `formato=csv`: mismo filtro, mismas columnas, UTF-8 con BOM, separador `;` y coma
 *      decimal (abre bien en Excel en español), una fila de encabezados y como máximo MAXIMO_FILAS_CSV filas. Un valor que
 *      empiece por `=`, `+`, `-` o `@` se antepone con una comilla simple (evita fórmulas inyectadas en la hoja). Cada
 *      exportación deja un registro de auditoría (M20): quién, qué reporte y qué rango.
 *  R12 PERMISOS (ya existen en el seed). Ver cualquier reporte: `ventas.ver`. Descargar CSV: `ventas.exportar`. El top de
 *      clientes (R9): `ventas.ver` y además `personal.ver` (el que ya protege el listado de clientes). Sin permiso, 404 opaco
 *      `RECURSO_NO_DISPONIBLE` (ADR-003), igual que un recurso inexistente. Solo sesión de PERSONAL: una sesión de cliente
 *      nunca entra, aunque su rol traiga el permiso.
 *  R13 RENDIMIENTO. Todo se calcula con agregaciones en la base (suma, conteo y agrupación), nunca trayendo filas para sumarlas
 *      en memoria. Con el rango máximo y el volumen esperado de la tienda, cada reporte responde en menos de 2 segundos.
 *
 * PANTALLA (frontend, `/admin/reportes`)
 *  Un selector de rango (7, 30, 90 días, este mes, el mes pasado o fechas libres), pestañas por reporte (Resumen, Ventas por…,
 *  Descuentos, Clientes, Postventa, Facturación), tabla con totales, gráfico de barras o línea hecho con SVG (sin librería
 *  nueva) y el botón «Descargar CSV» solo si la persona tiene `ventas.exportar`. El rango viaja en la URL.
 *
 * PREGUNTAS ABIERTAS (dependen del cliente; no frenan la construcción)
 *  Q1  ¿Qué reportes necesitan de verdad? La lista de arriba es una propuesta; se pueden quitar o agregar (por ejemplo,
 *      inventario con rotación, que hoy es de M13, o ventas por ciudad de entrega, que exigiría separar la dirección).
 *  Q2  ¿Qué día cuenta la venta: la fecha de la orden (hoy) o la del pago/despacho? Hoy: la de la orden.
 *  Q3  ¿Separador del CSV `;` (Excel en español) o `,`? Hoy `;`.
 *  Q4  ¿La devolución parcial debe restarse de la venta? Hoy no: se informa aparte.
 *  Q5  ¿El resumen del panel `/admin` debe mostrar un bloque de ventas con estas cifras? Exigiría tocar M17.
 *  Q6  ¿Quién puede ver el top de clientes? Hoy `ventas.ver` + `personal.ver`.
 *
 * FUERA DEL MÓDULO (PR pequeño aparte, con aviso al equipo)
 *  - `app.routes.ts` (montaje) y una entrada «Reportes» en el menú del panel (core). No hay cambios de BD: el índice
 *    `idx_orden_fecha` y los permisos `ventas.ver` y `ventas.exportar` ya existen.
 *
 * Rutas (montaje /api/v1/admin/reportes, todas GET, sesión de personal):
 *   /resumen                         ventas.ver       → resumenVentasResponse
 *   /serie                           ventas.ver       → serieVentasResponse
 *   /ventas-por/:dimension           ventas.ver       → ventasPorResponse
 *   /descuentos                      ventas.ver       → descuentosResponse
 *   /clientes                        ventas.ver + personal.ver → topClientesResponse
 *   /postventa                       ventas.ver       → postventaResponse
 *   /facturacion                     ventas.ver       → facturacionResponse
 *   Todas aceptan `?formato=csv` (R11), que exige además `ventas.exportar`.
 * ============================================================================
 */

export const PERMISOS_M19 = {
  ver: 'ventas.ver',
  exportar: 'ventas.exportar',
  verClientes: 'personal.ver',
} as const;

export const CODIGOS_ERROR_M19 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  RANGO_INVALIDO: 'RANGO_INVALIDO',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export const DIAS_POR_DEFECTO = 30;
export const MAXIMO_DIAS_RANGO = 366;
export const MAXIMO_PUNTOS_SERIE = 400;
export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 100;
export const MAXIMO_FILAS_CSV = 50000;

export const DIMENSIONES_VENTA = ['producto', 'categoria', 'marca', 'tipo_cliente', 'modo_entrega'] as const;
export const dimensionVentaSchema = z.enum(DIMENSIONES_VENTA);
export type DimensionVenta = z.infer<typeof dimensionVentaSchema>;

export const AGRUPACIONES = ['dia', 'semana', 'mes'] as const;
export const agrupacionSchema = z.enum(AGRUPACIONES);
export type Agrupacion = z.infer<typeof agrupacionSchema>;

export const FORMATOS = ['json', 'csv'] as const;

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use el formato AAAA-MM-DD');
const importeSchema = z.number().nonnegative();
const enteroSchema = z.number().int().nonnegative();

/* ─── Peticiones ──────────────────────────────────────────────────────────── */

/** Filtro común de todos los reportes (R1). El servidor completa los valores que falten y valida el rango. */
export const consultaRangoSchema = z.object({
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
  formato: z.enum(FORMATOS).default('json'),
});
export type ConsultaRango = z.infer<typeof consultaRangoSchema>;

export const consultaSerieSchema = consultaRangoSchema.extend({ agrupar: agrupacionSchema.default('dia') });
export type ConsultaSerie = z.infer<typeof consultaSerieSchema>;

export const consultaVentasPorSchema = consultaRangoSchema.extend({
  orden: z.enum(['importe', 'unidades']).default('importe'),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
});
export type ConsultaVentasPor = z.infer<typeof consultaVentasPorSchema>;

export const consultaLimiteSchema = consultaRangoSchema.extend({
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
});
export type ConsultaLimite = z.infer<typeof consultaLimiteSchema>;

export const dimensionParamSchema = z.object({ dimension: dimensionVentaSchema });

/* ─── Respuestas ──────────────────────────────────────────────────────────── */

/** El rango ya resuelto (R1), tal como se usó. */
export const periodoSchema = z.object({ desde: fechaSchema, hasta: fechaSchema, dias: z.number().int().positive() });
export type Periodo = z.infer<typeof periodoSchema>;

export const cifrasVentaSchema = z.object({
  ordenes: enteroSchema,
  unidades: enteroSchema,
  ventasBrutas: importeSchema,
  descuentos: importeSchema,
  envio: importeSchema,
  baseSinIva: importeSchema,
  iva: importeSchema,
  totalCobrado: importeSchema,
  ticketPromedio: importeSchema.nullable(),
});
export type CifrasVenta = z.infer<typeof cifrasVentaSchema>;

/** Variación en % con un decimal frente al periodo anterior; null si el anterior vale 0 (R4). */
const variacionSchema = z.number().nullable();

export const ESTADOS_ORDEN_REPORTE = [
  'orden_confirmada',
  'revision_disponibilidad',
  'en_preparacion',
  'preparada',
  'despachado',
  'entregado',
  'cancelado',
  'devuelto',
] as const;

export const resumenVentasSchema = z.object({
  periodo: periodoSchema,
  periodoAnterior: periodoSchema,
  actual: cifrasVentaSchema,
  anterior: cifrasVentaSchema,
  variacion: z.object({
    ordenes: variacionSchema,
    unidades: variacionSchema,
    totalCobrado: variacionSchema,
    ticketPromedio: variacionSchema,
  }),
  /** Los ocho estados siempre (con 0), contando TODAS las órdenes del rango, también canceladas y devueltas (R2). */
  porEstado: z.array(z.object({ estado: z.enum(ESTADOS_ORDEN_REPORTE), ordenes: enteroSchema, total: importeSchema })),
});
export type ResumenVentas = z.infer<typeof resumenVentasSchema>;

export const puntoSerieSchema = z.object({ periodo: fechaSchema, ordenes: enteroSchema, unidades: enteroSchema, totalCobrado: importeSchema });
export const serieVentasSchema = z.object({ periodo: periodoSchema, agrupar: agrupacionSchema, puntos: z.array(puntoSerieSchema) });
export type SerieVentas = z.infer<typeof serieVentasSchema>;

export const filaVentaPorSchema = z.object({
  clave: z.string(),
  etiqueta: z.string(),
  ordenes: enteroSchema,
  unidades: enteroSchema,
  importe: importeSchema,
  participacion: z.number().min(0).max(100),
});
export const ventasPorSchema = z.object({
  periodo: periodoSchema,
  dimension: dimensionVentaSchema,
  total: z.object({ ordenes: enteroSchema, unidades: enteroSchema, importe: importeSchema }),
  filas: z.array(filaVentaPorSchema),
});
export type VentasPor = z.infer<typeof ventasPorSchema>;

export const descuentosSchema = z.object({
  periodo: periodoSchema,
  totalDescuentos: importeSchema,
  filas: z.array(z.object({ origen: z.string(), lineasAfectadas: enteroSchema, ordenes: enteroSchema, importe: importeSchema })),
});
export type ReporteDescuentos = z.infer<typeof descuentosSchema>;

export const topClientesSchema = z.object({
  periodo: periodoSchema,
  filas: z.array(
    z.object({
      posicion: z.number().int().positive(),
      nombre: z.string(),
      tipo: z.enum(['persona', 'empresa']),
      ordenes: enteroSchema,
      unidades: enteroSchema,
      totalCobrado: importeSchema,
    }),
  ),
});
export type TopClientes = z.infer<typeof topClientesSchema>;

export const postventaReporteSchema = z.object({
  periodo: periodoSchema,
  solicitudes: z.number().int().nonnegative(),
  porTipo: z.array(z.object({ tipo: z.string(), solicitudes: enteroSchema })),
  porEstado: z.array(z.object({ estado: z.string(), solicitudes: enteroSchema })),
  reembolsos: z.object({ cantidad: enteroSchema, totalReembolsado: importeSchema }),
});
export type PostventaReporte = z.infer<typeof postventaReporteSchema>;

export const facturacionReporteSchema = z.object({
  periodo: periodoSchema,
  ventas: enteroSchema,
  conComprobante: enteroSchema,
  sinComprobante: enteroSchema,
  ultimoNumero: z.string().nullable(),
});
export type FacturacionReporte = z.infer<typeof facturacionReporteSchema>;

const envelope = <T extends z.ZodTypeAny>(data: T) => z.object({ success: z.literal(true), data });
export const resumenVentasResponseEnvelopeSchema = envelope(resumenVentasSchema);
export const serieVentasResponseEnvelopeSchema = envelope(serieVentasSchema);
export const ventasPorResponseEnvelopeSchema = envelope(ventasPorSchema);
export const descuentosResponseEnvelopeSchema = envelope(descuentosSchema);
export const topClientesResponseEnvelopeSchema = envelope(topClientesSchema);
export const postventaResponseEnvelopeSchema = envelope(postventaReporteSchema);
export const facturacionResponseEnvelopeSchema = envelope(facturacionReporteSchema);

export const errorM19EnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});
