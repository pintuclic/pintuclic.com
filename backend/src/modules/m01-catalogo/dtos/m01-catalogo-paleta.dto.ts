import { z } from 'zod';
import {
  hexadecimalSchema,
  idSchema,
  respuestaUno,
} from './m01-catalogo.dto';

/**
 * Espejo fiel de `contracts/m01-catalogo-paleta.contract.ts` para ejecución en el backend. NO editar aquí: se cambia el
 * contrato y se copia. La prueba de espejo falla si difieren.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const LIMITE_PALETA_POR_DEFECTO = 24;
export const LIMITE_PALETA_MAXIMO = 48;
/** Láminas visibles a la vez en el abanico (P14). */
export const COLORES_EN_ABANICO = 13;
/** Láminas visibles a la vez en pantallas angostas (menos de 640 px). */
export const ABANICO_LAMINAS_MOVIL = 9;
/** ΔE (CIE76) máximo para que un color de la carta cuente como «parecido» a una muestra de armonía (P8). */
export const UMBRAL_COLOR_CERCANO = 25;
/** Hasta dónde se dice «muy parecido» y «parecido» en pantalla (P8). */
export const DELTA_E_MUY_PARECIDO = 6;
export const DELTA_E_PARECIDO = 15;
/** Por debajo de esta saturación HSL (0 a 100) un color se considera sin tono (P7). */
export const SATURACION_SIN_TONO = 8;
export const PRODUCTOS_RECOMENDADOS_MAXIMO = 10;
/** Segundos que el servidor conserva el mapa «color → productos» (P13). */
export const SEGUNDOS_CACHE_PALETA = 60;
/** Límites de luminosidad HSL (0 a 100) de las muestras de una armonía (P7). */
export const LUMINOSIDAD_MINIMA = 5;
export const LUMINOSIDAD_MAXIMA = 95;
/** Armonías de un color sin tono: cuánto se suma o resta a la luminosidad (P7). El complementario es 100 − L. */
export const DESPLAZAMIENTOS_SIN_TONO = { analogos: [-15, 15], triadico: [-30, 30] } as const;

export { idSchema, hexadecimalSchema };

/**
 * Las armonías del combinador (P7). `desplazamientos` son grados de tono HSL que se suman al del color elegido;
 * en el monocromático el tono no cambia y se usan las luminosidades de `luminosidades` (0 a 100, de oscuro a claro).
 * Los colores sin tono (P7) usan `DESPLAZAMIENTOS_SIN_TONO` sobre la luminosidad (el complementario es 100 − L).
 */
export const TIPOS_ARMONIA = ['complementario', 'analogos', 'triadico', 'monocromatico'] as const;
export const tipoArmoniaSchema = z.enum(TIPOS_ARMONIA);
export type TipoArmonia = z.infer<typeof tipoArmoniaSchema>;

export const DEFINICION_ARMONIAS: Readonly<
  Record<
    TipoArmonia,
    { etiqueta: string; descripcion: string; desplazamientos: readonly number[]; luminosidades?: readonly number[] }
  >
> = {
  complementario: {
    etiqueta: 'Complementario',
    descripcion: 'El color opuesto: máximo contraste y energía.',
    desplazamientos: [180],
  },
  analogos: {
    etiqueta: 'Análogos',
    descripcion: 'Tonos vecinos: combinación suave y armónica.',
    desplazamientos: [-30, 30],
  },
  triadico: {
    etiqueta: 'Tríadico',
    descripcion: 'Tres colores equilibrados para un look vibrante.',
    desplazamientos: [120, 240],
  },
  monocromatico: {
    etiqueta: 'Monocromático',
    descripcion: 'Variaciones de claridad del mismo tono.',
    desplazamientos: [0],
    luminosidades: [15, 30, 50, 70, 88],
  },
};

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /paleta/colores — recorrer los colores de la carta (P1 a P4). */
export const listarPaletaRequestSchema = z.object({
  familia: z.coerce.number().int().positive().optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  /** Nombre o código del color (P3). */
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_PALETA_MAXIMO).default(LIMITE_PALETA_POR_DEFECTO),
});
export type ListarPaletaRequest = z.infer<typeof listarPaletaRequestSchema>;

/** GET /paleta/colores/:idColor/armonias */
export const armoniasParamsSchema = z.object({ idColor: z.coerce.number().int().positive() });
export type ArmoniasParams = z.infer<typeof armoniasParamsSchema>;

/**
 * GET /productos/:idProducto/colores?idColor= — el filtro nuevo de P11 se agrega a `listarColoresProductoRequestSchema`
 * (contrato de la entrega 2); el resto de la petición no cambia.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Un color de la carta que algún producto visible entrega hoy (P1). Nunca lleva el CIELAB: es opcional y no se usa aquí. */
export const colorPaletaSchema = z.object({
  idColor: idSchema,
  nombre: z.string(),
  codigo: z.string().nullable(),
  hexadecimal: hexadecimalSchema,
  idMarca: idSchema,
  marca: z.string(),
  idFamiliaColor: idSchema.nullable(),
  familia: z.string().nullable(),
  acabado: z.string(),
  /** Cuántos productos visibles lo pueden entregar (P1); 1 o más. */
  totalProductos: z.number().int().min(1),
});
export type ColorPaleta = z.infer<typeof colorPaletaSchema>;

export const familiaPaletaSchema = z.object({
  idFamiliaColor: idSchema,
  nombre: z.string(),
  /** Muestra de la familia, para pintar la pestaña. */
  hexadecimal: hexadecimalSchema,
  /** Cuántos colores de P1 tiene (sin el filtro de familia, P2). */
  total: z.number().int().min(1),
});
export type FamiliaPaleta = z.infer<typeof familiaPaletaSchema>;

export const marcaPaletaSchema = z.object({
  idMarca: idSchema,
  nombre: z.string(),
  total: z.number().int().min(1),
});
export type MarcaPaleta = z.infer<typeof marcaPaletaSchema>;

export const paletaSchema = z.object({
  colores: z.array(colorPaletaSchema),
  familias: z.array(familiaPaletaSchema),
  marcas: z.array(marcaPaletaSchema),
});
export type Paleta = z.infer<typeof paletaSchema>;

/** Respuesta paginada con listas de apoyo; `pagination` como en el resto de la API. */
export const paletaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: paletaSchema,
  pagination: z.object({
    pagina: z.number().int().min(1),
    limite: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPaginas: z.number().int().nonnegative(),
  }),
});
export type PaletaResponseEnvelope = z.infer<typeof paletaResponseEnvelopeSchema>;

/** El color real que más se parece a una muestra de armonía (P8). */
export const colorCercanoSchema = colorPaletaSchema.extend({
  /** ΔE (CIE76) entre la muestra y este color, con un decimal; siempre ≤ UMBRAL_COLOR_CERCANO. */
  deltaE: z.number().nonnegative(),
});
export type ColorCercano = z.infer<typeof colorCercanoSchema>;

export const muestraArmoniaSchema = z.object({
  /** El color que sale de la regla de la armonía (P7), tal cual, sin buscarle pareja. */
  hexadecimal: hexadecimalSchema,
  /** El color de la carta más parecido, o null si ninguno pasa el umbral (P8). */
  cercano: colorCercanoSchema.nullable(),
});
export type MuestraArmonia = z.infer<typeof muestraArmoniaSchema>;

export const armoniaSchema = z.object({
  tipo: tipoArmoniaSchema,
  muestras: z.array(muestraArmoniaSchema).min(1),
});
export type Armonia = z.infer<typeof armoniaSchema>;

export const armoniasColorSchema = z.object({
  color: colorPaletaSchema,
  /** true si el color casi no tiene tono (P7): las armonías usan luminosidad. */
  sinTono: z.boolean(),
  /** Siempre las cuatro, en el orden de TIPOS_ARMONIA. */
  armonias: z.array(armoniaSchema).length(TIPOS_ARMONIA.length),
});
export type ArmoniasColor = z.infer<typeof armoniasColorSchema>;
export const armoniasResponseEnvelopeSchema = respuestaUno(armoniasColorSchema);
export type ArmoniasResponseEnvelope = z.infer<typeof armoniasResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * 400 PARAMETRO_INVALIDO · 404 RECURSO_NO_DISPONIBLE (el color no existe, está inactivo o ningún producto visible lo
 * entrega: P1). Es el mismo envelope de error del catálogo (`errorCatalogoEnvelopeSchema`).
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 5. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  PÚBLICAS (montaje: /api/v1/catalogo) — sin sesión
 *   GET /paleta/colores                      → paletaResponseEnvelope        (P1 a P4)
 *   GET /paleta/colores/:idColor/armonias    → armoniasResponseEnvelope      (P7, P8)
 *   GET /productos/:idProducto/colores       (ya existe) + `idColor` opcional (P11)
 *  DE OTROS MÓDULOS, que la página usa sin cambios
 *   GET /busqueda/productos?idColor=…        (M02) → productos recomendados (P9)
 *   GET /catalogo/productos/:id/complementarios (M01) → productos que podrían interesar (P10)
 *
 *  Página: /paleta-de-color (pública). Menú: «Paleta de color» (Q5). Sin cambios en la base de datos.
 * ─────────────────────────────────────────────────────────────────────────── */
