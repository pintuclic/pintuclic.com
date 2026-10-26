import { z } from 'zod';

/**
 * Espejo fiel de `contracts/m02-busqueda.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`).
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y SCHEMAS BASE
 * ─────────────────────────────────────────────────────────────────────────── */

export const idSchema = z.number().int().positive();
export const disponibilidadSchema = z.enum(['disponible', 'agotado']);
export const ambienteSchema = z.enum(['interior', 'exterior']);
export const referenciaSchema = z.object({
  id: idSchema,
  nombre: z.string(),
});

export const ofertaPublicaSchema = z.object({
  nombre: z.string(),
  porcentaje: z.number().gt(0).max(100),
  precioAntes: z.number().nonnegative(),
  precioConOferta: z.number().nonnegative(),
});
export type OfertaListado = z.infer<typeof ofertaPublicaSchema>;

export const productoPublicoTarjetaSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  marca: z.string(),
  linea: z.string().nullable(),
  categoria: z.string(),
  subcategoria: z.string(),
  precioDesde: z.number().nonnegative().nullable(),
  tieneColor: z.boolean(),
  disponibilidad: disponibilidadSchema,
  idImagenPrincipal: idSchema.nullable(),
  esCombo: z.boolean(),
  compraBloqueada: z.boolean(),
  oferta: ofertaPublicaSchema.nullable(),
});
export type ProductoPublicoTarjeta = z.infer<typeof productoPublicoTarjetaSchema>;

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});

export function respuestaUno<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: itemSchema,
  });
}

export function respuestaPaginada<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: paginacionSchema,
  });
}

/* ───────────────────────────────────────────────────────────────────────────
 * 2. CONSTANTES DE M02
 * ─────────────────────────────────────────────────────────────────────────── */

export const TERMINO_MAXIMO = 100;
export const VALORES_MAXIMOS_POR_FILTRO = 20;
export const LIMITE_POR_DEFECTO = 12;
export const LIMITE_MAXIMO = 48;
export const RETENCION_DIAS_POR_DEFECTO = 365;
export const PRECIO_MAXIMO = 1_000_000_000;

export const CRITERIOS_ORDEN = ['relevancia', 'precio_asc', 'precio_desc', 'novedad'] as const;
export const ordenResultadosSchema = z.enum(CRITERIOS_ORDEN);
export type OrdenResultados = z.infer<typeof ordenResultadosSchema>;
export const ORDEN_POR_DEFECTO: OrdenResultados = 'relevancia';

export const PESOS_RELEVANCIA = {
  nombre: 5,
  marca: 4,
  linea: 3,
  color: 2,
  descripcion: 1,
} as const;
export const FACTOR_COINCIDENCIA_EXACTA = 2;

export const PERIODOS_ESTADISTICA = ['diario', 'semanal', 'mensual', 'anual'] as const;
export const periodoEstadisticaSchema = z.enum(PERIODOS_ESTADISTICA);
export type PeriodoEstadistica = z.infer<typeof periodoEstadisticaSchema>;

export const PERMISO_CONSULTAR_ESTADISTICAS = 'estadisticas.consultar';

export const terminoSchema = z.string().trim().max(TERMINO_MAXIMO);

const listaIdsSchema = z.preprocess((valor) => {
  if (valor === undefined || valor === '') return undefined;
  const lista = Array.isArray(valor) ? valor : [valor];
  return lista.flatMap((v) => (typeof v === 'string' ? v.split(',') : [v])).filter((v) => v !== '');
}, z.array(z.coerce.number().int().positive()).max(VALORES_MAXIMOS_POR_FILTRO).optional());

const precioSchema = z.coerce.number().min(0).max(PRECIO_MAXIMO);

const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

const MENSAJE_RANGO_PRECIO = 'El precio mínimo no puede ser mayor que el máximo.';

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

export const filtrosBusquedaBaseSchema = z.object({
  q: terminoSchema.optional(),
  idCategoria: listaIdsSchema,
  idSubcategoria: listaIdsSchema,
  idMarca: listaIdsSchema,
  idLinea: listaIdsSchema,
  idTipoResina: listaIdsSchema,
  idFamiliaColor: listaIdsSchema,
  idColor: listaIdsSchema,
  idMedida: listaIdsSchema,
  idSuperficie: listaIdsSchema,
  ambiente: ambienteSchema.optional(),
  precioMin: precioSchema.optional(),
  precioMax: precioSchema.optional(),
  enOferta: booleanoQuerySchema.optional(),
});
export type FiltrosBusquedaBase = z.infer<typeof filtrosBusquedaBaseSchema>;

const rangoPrecioValido = (v: {
  precioMin?: number | undefined;
  precioMax?: number | undefined;
}): boolean =>
  v.precioMin === undefined || v.precioMax === undefined || v.precioMin <= v.precioMax;

export const buscarProductosRequestSchema = filtrosBusquedaBaseSchema
  .extend({
    ordenar: ordenResultadosSchema.default(ORDEN_POR_DEFECTO),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
  })
  .refine(rangoPrecioValido, { message: MENSAJE_RANGO_PRECIO, path: ['precioMin'] });
export type BuscarProductosRequest = z.infer<typeof buscarProductosRequestSchema>;

export const opcionesFiltroRequestSchema = filtrosBusquedaBaseSchema.refine(rangoPrecioValido, {
  message: MENSAJE_RANGO_PRECIO,
  path: ['precioMin'],
});
export type OpcionesFiltroRequest = z.infer<typeof opcionesFiltroRequestSchema>;

export const buscarColoresRequestSchema = z.object({
  q: terminoSchema.min(1),
  idFamiliaColor: listaIdsSchema,
  idMarca: listaIdsSchema,
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
});
export type BuscarColoresRequest = z.infer<typeof buscarColoresRequestSchema>;

export const listarSinResultadoRequestSchema = z.object({
  periodo: periodoEstadisticaSchema.default('mensual'),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListarSinResultadoRequest = z.infer<typeof listarSinResultadoRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const resultadoBusquedaSchema = productoPublicoTarjetaSchema.extend({
  coincidenciaColor: z.string().nullable(),
});
export type ResultadoBusqueda = z.infer<typeof resultadoBusquedaSchema>;

export const buscarProductosResponseEnvelopeSchema = respuestaPaginada(resultadoBusquedaSchema);
export type BuscarProductosResponseEnvelope = z.infer<typeof buscarProductosResponseEnvelopeSchema>;

export const opcionFiltroSchema = referenciaSchema.extend({
  total: z.number().int().positive(),
});
export type OpcionFiltro = z.infer<typeof opcionFiltroSchema>;

export const opcionSubcategoriaSchema = opcionFiltroSchema.extend({ idCategoria: idSchema });
export type OpcionSubcategoria = z.infer<typeof opcionSubcategoriaSchema>;

export const opcionLineaSchema = opcionFiltroSchema.extend({ idMarca: idSchema });
export type OpcionLinea = z.infer<typeof opcionLineaSchema>;

export const opcionFamiliaColorSchema = opcionFiltroSchema.extend({
  hexadecimal: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export type OpcionFamiliaColor = z.infer<typeof opcionFamiliaColorSchema>;

export const opcionesFiltroSchema = z.object({
  totalResultados: z.number().int().nonnegative(),
  categorias: z.array(opcionFiltroSchema),
  subcategorias: z.array(opcionSubcategoriaSchema),
  marcas: z.array(opcionFiltroSchema),
  lineas: z.array(opcionLineaSchema),
  tiposResina: z.array(opcionFiltroSchema),
  familiasColor: z.array(opcionFamiliaColorSchema),
  presentaciones: z.array(opcionFiltroSchema),
  superficies: z.array(opcionFiltroSchema),
  precio: z.object({ minimo: z.number().nonnegative(), maximo: z.number().nonnegative() }).nullable(),
});
export type OpcionesFiltro = z.infer<typeof opcionesFiltroSchema>;

export const opcionesFiltroResponseEnvelopeSchema = respuestaUno(opcionesFiltroSchema);
export type OpcionesFiltroResponseEnvelope = z.infer<typeof opcionesFiltroResponseEnvelopeSchema>;

export const colorBuscadoSchema = z.object({
  idColor: idSchema,
  nombre: z.string(),
  codigo: z.string().nullable(),
  hexadecimal: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  marca: z.string(),
  familia: z.string().nullable(),
});
export type ColorBuscado = z.infer<typeof colorBuscadoSchema>;

export const buscarColoresResponseEnvelopeSchema = respuestaPaginada(colorBuscadoSchema);
export type BuscarColoresResponseEnvelope = z.infer<typeof buscarColoresResponseEnvelopeSchema>;

export const busquedaSinResultadoSchema = z.object({
  termino: z.string(),
  repeticiones: z.number().int().positive(),
  ultimoIntento: z.string().datetime(),
});
export type BusquedaSinResultado = z.infer<typeof busquedaSinResultadoSchema>;

export const listarSinResultadoResponseEnvelopeSchema = respuestaPaginada(busquedaSinResultadoSchema);
export type ListarSinResultadoResponseEnvelope = z.infer<typeof listarSinResultadoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_BUSQUEDA = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'ERROR_INTERNO',
] as const;

export const errorBusquedaEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_BUSQUEDA),
    message: z.string(),
    details: z.null(),
  }),
});
export type ErrorBusquedaEnvelope = z.infer<typeof errorBusquedaEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. PUERTOS (ADR-009)
 * ─────────────────────────────────────────────────────────────────────────── */

export interface ContextoPrecio {
  readonly idUsuario: number | null;
}

export interface OfertasListadoPort {
  idsProductosEnOferta(): Promise<number[]>;
  ofertasDeProductos(
    idsProducto: readonly number[],
  ): Promise<ReadonlyArray<{ idProducto: number; oferta: OfertaListado | null }>>;
}

export interface PrecioFinalPort {
  preciosFinales(
    idsVariante: readonly number[],
    contexto: ContextoPrecio,
  ): Promise<ReadonlyMap<number, number>>;
}
