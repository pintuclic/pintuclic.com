import { z } from 'zod';

/**
 * ============================================================================
 * DTO ESPEJO — M19. Reportes y analítica de ventas
 * ============================================================================
 * Espejo exacto de `contracts/m19-reportes.contract.ts` (la prueba de espejo lo comprueba).
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
export const MAXIMO_DIAS_RANGO_SERIE = 1830;
export const MAXIMO_PUNTOS_SERIE = 400;
export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 100;
export const MAXIMO_FILAS_CSV = 50000;

export const DIMENSIONES_VENTA = ['producto', 'categoria', 'marca', 'tipo_cliente', 'modo_entrega'] as const;
export const dimensionVentaSchema = z.enum(DIMENSIONES_VENTA);
export type DimensionVenta = z.infer<typeof dimensionVentaSchema>;

export const AGRUPACIONES = ['dia', 'semana', 'mes', 'anio'] as const;
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

export const compradoresSchema = z.object({
  periodo: periodoSchema,
  compradores: enteroSchema,
  nuevos: enteroSchema,
  recurrentes: enteroSchema,
  compraronMasDeUnaVez: enteroSchema,
  ordenesPorComprador: z.number().nonnegative().nullable(),
});
export type Compradores = z.infer<typeof compradoresSchema>;

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
export const compradoresResponseEnvelopeSchema = envelope(compradoresSchema);
export const postventaResponseEnvelopeSchema = envelope(postventaReporteSchema);
export const facturacionResponseEnvelopeSchema = envelope(facturacionReporteSchema);

export const errorM19EnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});
