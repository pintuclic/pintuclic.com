import { z } from 'zod';
import {
  hexadecimalSchema,
  idSchema,
  respuestaUno,
} from './m01-catalogo.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M01. Catálogo · ENTREGA 4: PALETA DE COLOR
 * ============================================================================
 * Scope: m01-catalogo · Entrega 4 · BORRADOR para el Tech Lead.
 * Base de datos: esquema 4.17 (sin cambios). Depende de las entregas 1 a 3 y de M02 (productos por color) y M06
 * (ofertas de las tarjetas, ya incluidas en las tarjetas de M01 y M02).
 *
 * Este contrato ES la especificación de la entrega y lo que el Tech Lead revisa antes de que se escriba el código.
 * Lo que cambie aquí cambia el módulo. NO hay una HU escrita para esta pantalla: nace de la imagen del diseño que dio el
 * Tech Lead (página «Paleta de color») y de las reglas de color ya vigentes (HU-CAT-05, HU-CAT-12, RF-CAT-05-06).
 * Si la HU existe en la v5.2 del documento de historias, hay que comparar antes de aprobar (ver Q1).
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *  Una página pública, `/paleta-de-color`, nueva entrada del menú («Paleta de color»), donde el cliente:
 *    1. Recorre los colores de la carta por FAMILIA (Amarillos, Azules…), por MARCA o buscando por nombre o código.
 *    2. Elige un color y ve CÓMO SE VERÍA en un ambiente (sala, dormitorio, cocina, fachada) y su nombre y código.
 *    3. Ve el COMBINADOR: colores que arman con el elegido (complementario, análogos, tríadico y monocromático), cada
 *       uno enlazado al color REAL de la carta más parecido, que puede elegir con un clic.
 *    4. Ve los PRODUCTOS que se pueden entregar en ese color y, abajo, productos que podrían interesarle.
 *  Es una herramienta para decidir y para llevar al cliente a la ficha con el color ya elegido; no vende por sí sola.
 *
 * ── Qué NO incluye ──────────────────────────────────────────────────────────
 *  · Administrar colores, familias o bases: es de las entregas 1 y 2 (`/admin/catalogo`). Aquí solo se LEE.
 *  · Búsqueda de texto de productos: es de M02. Los productos por color se piden a M02 (`GET /busqueda/productos`
 *    con `idColor`), que ya implementa la regla de «productos que pueden entregarse en ese color» (M02 · B7).
 *  · Asesoría de color con preguntas (wizard, UI Spec 4.5) y simulador con IA: son de M03 (sin especificación).
 *  · Subir la foto del cliente para pintarla: no está pedido.
 *  · Guardar paletas, compartirlas o descargarlas: no está pedido (ver Q7).
 *  · Los colores son REFERENCIALES: se muestran con el aviso «Los colores mostrados son referenciales y pueden variar
 *    según tu pantalla» (UI Spec 4.4). Una pantalla no reproduce la pintura real.
 *
 * ── Reglas de la paleta ─────────────────────────────────────────────────────
 *  P1  QUÉ COLORES SE MUESTRAN. Solo los colores ACTIVOS que algún producto VISIBLE puede entregar hoy: los de fábrica de
 *      un producto de colores fijos y los de la carta de un entonable (misma marca, base y acabado activos y entre los de
 *      ese producto; regla P5 de M01). Un color que nadie puede comprar no aparece: sería un callejón sin salida.
 *      `totalProductos` cuenta esos productos y siempre es 1 o más. Es el MISMO criterio de M02 · B7, no una copia
 *      distinta.
 *  P2  FAMILIAS Y MARCAS. Las pestañas de familia (y la lista de marcas) salen de los colores de P1 y cuentan cuántos hay
 *      de cada una SIN aplicar el filtro de familia (como el selector de color de la ficha), para que elegir una no vacíe
 *      las demás. Los colores sin familia solo salen en «Todas».
 *  P3  BÚSQUEDA. `q` busca en nombre y código del color (sin distinguir mayúsculas ni tildes). Con `familia` o `idMarca` se
 *      combinan con Y. Orden: por familia (según `orden` de la familia), luego por tono (de más claro a más oscuro) y
 *      luego por nombre, para que la paleta se vea ordenada como un abanico y no como una lista alfabética.
 *  P4  TOPE. Hasta LIMITE_PALETA_MAXIMO colores por página (24 por omisión). La pantalla pinta el abanico con los primeros
 *      COLORES_EN_ABANICO de la página y permite pasar de página; nunca carga «todos los colores» (miles, RF-CAT-05).
 *  P5  ELEGIR UN COLOR. El color elegido viaja en la dirección (`?color=<id>`, más `familia`, `marca` y `q`), para poder
 *      compartir el enlace y volver atrás. Un color que ya no se ofrece (404) se ignora y la página sigue sin selección.
 *  P6  AMBIENTES (AMBIENTES_PALETA). El color elegido se aplica sobre las paredes de un ambiente dibujado por Pintu Clic
 *      (sala, dormitorio, cocina, fachada); «Cambiar ambiente» pasa al siguiente. Son ilustraciones propias, sin fotos de
 *      terceros ni servicios externos. El color se tiñe sobre la pared conservando sombras y luces del dibujo (la pared
 *      oscura no queda plana). Con `prefers-reduced-motion` el cambio de color y de ambiente no se anima. Ver Q2.
 *  P7  COMBINADOR (ARMONIAS). Para el color elegido se calculan cuatro armonías, en el modelo HSL de su `hexadecimal`
 *      (DEFINICION_ARMONIAS fija las reglas exactas): complementario (tono +180°), análogos (±30°), tríadico (+120° y
 *      +240°) y monocromático (el mismo tono con otras luminosidades). Los grises y blancos (saturación menor a 8 %) no
 *      tienen tono: sus armonías cromáticas parten de la luminosidad y se avisa en pantalla («Este color casi no tiene
 *      tono: las combinaciones usan luminosidad»). La armonía es una SUGERENCIA de diseño, no una garantía de gusto.
 *  P8  COLOR REAL MÁS CERCANO. Cada muestra de una armonía se enlaza al color de la carta MÁS PARECIDO (P1), medido como
 *      distancia de color ΔE (CIE76) entre los `hexadecimal` (convertidos a CIELAB con blanco D65); no se usa el CIELAB
 *      guardado porque es opcional (RC-25). Reglas: solo colores de LA MISMA MARCA del elegido (no se puede mezclar marcas
 *      en un pedido), nunca el mismo color elegido, y solo si ΔE ≤ UMBRAL_COLOR_CERCANO; si no hay ninguno, `cercano` es
 *      null y la pantalla muestra la muestra sin enlace y con «Sin color parecido en la carta». Se informa `deltaE` (con
 *      un decimal) y la pantalla lo traduce a «muy parecido» (≤ 6), «parecido» (≤ 15) o «aproximado» (más). Ver Q3.
 *  P9  PRODUCTOS RECOMENDADOS. Los que se pueden entregar en el color elegido: `GET /busqueda/productos?idColor=…`
 *      (M02), con sus ofertas y la etiqueta «Patrocinado» como en el catálogo. Sin color elegido se muestran los del
 *      primer color de la página. Hasta 10, el título dice el color y la familia. Cada tarjeta lleva a la ficha con el
 *      color puesto (P11).
 *  P10 PRODUCTOS QUE PODRÍAN INTERESAR. Los complementarios (HU-CAT-08, X1 a X5) del primer producto recomendado: pinturas
 *      con sus brochas, rodillos, cintas. Si no hay ninguno, la sección no se pinta.
 *  P11 COLOR PUESTO EN LA FICHA. `GET /productos/:idProducto/colores` acepta un `idColor` opcional; si el color lo ofrece
 *      ese producto, responde solo ese (si no, lista vacía, sin error). La ficha lo usa al llegar con `?color=<id>` y deja
 *      el color ya elegido. Sin el parámetro no cambia nada (compatible con la entrega 2).
 *  P12 SIN IDENTIDAD. Las rutas son públicas, sin sesión, y no guardan quién consulta. No se mide nada (M14 no entra aquí).
 *  P13 RENDIMIENTO. Calcular P1 no debe leer todos los productos por cada consulta: el servidor guarda en memoria, 60 s,
 *      el mapa «color → cuántos productos lo entregan» y lo reconstruye al vencer. Un color que se apaga o un producto que
 *      se despublica tarda como máximo ese tiempo en reflejarse (lo mismo que el catálogo cacheado). Ver Q4.
 *
 * ── Preguntas abiertas (para el Tech Lead / cliente) ────────────────────────
 *  Q1  ¿Hay HU escrita para esta página en la v5.2? Si la hay, manda sobre este borrador. La imagen del diseño ya se
 *      respetó: hero, filtro por familia con buscador, paleta, combinador (4 armonías), productos recomendados y productos
 *      que podrían interesar.
 *  Q2  AMBIENTES: se proponen 4 ilustraciones dibujadas por nosotros (sala, dormitorio, cocina, fachada). ¿Prefiere fotos
 *      reales (las pone el cliente) o estas bastan? Con fotos habría que definir dónde se guardan y quién las administra.
 *  Q3  UMBRAL DE «COLOR PARECIDO»: se propone ΔE ≤ 25 (UMBRAL_COLOR_CERCANO). Con una carta chica casi nunca habrá colores
 *      muy parecidos a una armonía; con 25 se muestra el más próximo casi siempre pero se avisa cuánto se parece.
 *  Q4  CACHÉ de 60 s en el servidor (P13): ¿basta o debe verse el cambio al instante? Lo segundo exige consultar siempre.
 *  Q5  LUGAR EN EL MENÚ: el diseño original lo pone entre «Servicios» y «Sobre nosotros». El menú de hoy es Inicio,
 *      Productos, Ofertas, Ayuda y FAQ, Sobre nosotros. Se propone «Paleta de color» justo después de «Ofertas». ¿Está bien?
 *  Q6  El abanico del diseño es una ilustración de un muestrario real. Se propone dibujarlo en SVG con los colores de la
 *      página, abierto en abanico, y que al elegir uno el abanico lo destaque. ¿Se admite, o se quiere otra imagen?
 *  Q7  ¿Se necesita compartir o guardar la paleta? Hoy solo se comparte el enlace de la página (P5).
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const LIMITE_PALETA_POR_DEFECTO = 24;
export const LIMITE_PALETA_MAXIMO = 48;
/** Cuántos colores pinta el abanico a la vez (P4). */
export const COLORES_EN_ABANICO = 12;
/** ΔE (CIE76) máximo para que un color de la carta cuente como «parecido» a una muestra de armonía (P8, Q3). */
export const UMBRAL_COLOR_CERCANO = 25;
/** Hasta dónde se dice «muy parecido» y «parecido» en pantalla (P8). */
export const DELTA_E_MUY_PARECIDO = 6;
export const DELTA_E_PARECIDO = 15;
/** Por debajo de esta saturación HSL (0 a 100) un color se considera sin tono (P7). */
export const SATURACION_SIN_TONO = 8;
export const PRODUCTOS_RECOMENDADOS_MAXIMO = 10;
/** Segundos que el servidor conserva el mapa «color → productos» (P13). */
export const SEGUNDOS_CACHE_PALETA = 60;

export { idSchema, hexadecimalSchema };

/** Los ambientes en que se ve el color elegido (P6). Ilustraciones propias; agregar uno es un cambio de este contrato. */
export const AMBIENTES_PALETA = [
  { id: 'sala', etiqueta: 'Sala' },
  { id: 'dormitorio', etiqueta: 'Dormitorio' },
  { id: 'cocina', etiqueta: 'Cocina' },
  { id: 'fachada', etiqueta: 'Fachada' },
] as const;
export const ambientePaletaSchema = z.enum(['sala', 'dormitorio', 'cocina', 'fachada']);
export type AmbientePaleta = z.infer<typeof ambientePaletaSchema>;

/**
 * Las armonías del combinador (P7). `desplazamientos` son grados de tono HSL que se suman al del color elegido;
 * en el monocromático el tono no cambia y se usan las luminosidades de `luminosidades` (0 a 100, de oscuro a claro,
 * con la del color elegido en su lugar natural).
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

/** GET /productos/:idProducto/colores?idColor= — el filtro nuevo de P11 (el resto de la petición no cambia). */
export const colorDeProductoQuerySchema = z.object({ idColor: z.coerce.number().int().positive().optional() });
export type ColorDeProductoQuery = z.infer<typeof colorDeProductoQuerySchema>;

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
