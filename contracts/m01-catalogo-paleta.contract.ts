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
 * Scope: m01-catalogo · Entrega 4 · REVISADO con las decisiones del Tech Lead (v2).
 * Base de datos: esquema 4.17 (sin cambios). Depende de las entregas 1 a 3 y de M02 (productos por color) y M06
 * (ofertas de las tarjetas, ya incluidas en las tarjetas de M02).
 *
 * Este contrato ES la especificación de la entrega y lo que el Tech Lead revisa antes de que se escriba el código.
 * Lo que cambie aquí cambia el módulo. La HU escrita es básica: manda lo que la pantalla HACE (sus funciones); el
 * mockup sirve de guía de funciones, no de títulos ni imágenes.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *  Una página pública, `/paleta-de-color`, nueva entrada del menú («Paleta de color», con un botón más llamativo que
 *  los demás enlaces), donde el cliente:
 *    1. Recorre la TABLA DE COLORES hecha ABANICO, filtrada por familia (Amarillos, Azules…), por marca o buscando por
 *       nombre o código. El abanico es lo más importante de la página: grande, deslizable y que se ve en toda la altura
 *       de la pantalla.
 *    2. Elige un color en el abanico: aparece una ONDA llamativa abajo que lo invita a ver los productos que se
 *       entregan en ese color.
 *    3. Ve el COMBINADOR (complementario, análogos, tríadico y monocromático), cada muestra enlazada al color REAL de la
 *       carta más parecido, que puede elegir con un clic. Junto a él queda la pestaña «En tu espacio», reservada para
 *       la visualización en ambientes que construye M03 (ver P6).
 *    4. Ve los PRODUCTOS RECOMENDADOS (los que se entregan en ese color) y los que podrían interesarle.
 *  Es una herramienta para decidir y para llevar al cliente a la ficha con el color ya elegido; no vende por sí sola.
 *
 * ── Qué NO incluye ──────────────────────────────────────────────────────────
 *  · Administrar colores, familias o bases: es de las entregas 1 y 2 (`/admin/catalogo`). Aquí solo se LEE.
 *  · Búsqueda de texto de productos: es de M02. Los productos por color se piden a M02 (`GET /busqueda/productos`
 *    con `idColor`), que ya implementa la regla de «productos que pueden entregarse en ese color» (M02 · B7).
 *  · Visualizar el color en ambientes (habitaciones, fachadas) y la asesoría con IA: son de M03, que los construye en
 *    otra rama. Esta entrega solo deja la pestaña y el contenedor (P6).
 *  · La TARJETA del producto: otra rama de M01 está cambiando la tarjeta para mostrar una variante real con su color.
 *    La página usa la tarjeta estándar del catálogo y la recibirá sin cambios cuando esa rama la entregue (P9).
 *  · Guardar o compartir paletas: solo se comparte el enlace de la página (P5).
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
 *      de cada una SIN aplicar su propio filtro (la de familia sin el filtro de familia, la de marca sin el de marca),
 *      para que elegir una no vacíe las demás. Los colores sin familia solo salen en «Todas».
 *  P3  BÚSQUEDA Y ORDEN. `q` busca en nombre y código del color (sin distinguir mayúsculas ni tildes). `familia`, `idMarca`
 *      y `q` se combinan con Y. Orden: por familia (según `orden` de la familia; sin familia al final), luego de más claro
 *      a más oscuro (luminosidad HSL descendente) y luego por nombre, para que el abanico se vea ordenado como un
 *      muestrario y no como una lista alfabética.
 *  P4  PÁGINAS DEL ABANICO. El servidor entrega hasta LIMITE_PALETA_MAXIMO colores por página (24 por omisión). El abanico
 *      (P14) pide la siguiente página cuando el cliente se acerca al final de lo cargado: nunca carga «todos los colores»
 *      de una vez (miles, RF-CAT-05).
 *  P5  ELEGIR UN COLOR. El color elegido y los filtros viajan en la dirección (`?color=<id>&familia=<id>&marca=<id>&q=`),
 *      para poder compartir el enlace y volver atrás. Un color que ya no se ofrece (404) se ignora y la página sigue sin
 *      selección.
 *  P6  PESTAÑA «EN TU ESPACIO» (reservada para M03). Junto al combinador hay dos pestañas: «Combinador» (por omisión) y
 *      «En tu espacio». Esta última muestra un aviso («Muy pronto podrás ver este color en tus espacios») y es un
 *      componente propio (`AmbientesColor`) que recibe el color elegido: M03 lo reemplaza por su visualizador sin tocar
 *      el resto de la página. M01 NO dibuja ambientes.
 *      ACTUALIZADO 2026-10-29: M03 ya lo reemplazó (M03 · HU-ASE-03, reglas S1-S11). `AmbientesColor` dejó de existir y la
 *      pestaña monta `SimuladorColor`, que recibe el color elegido y nada más. El aviso «Muy pronto…» ya no se muestra.
 *  P7  COMBINADOR (ARMONIAS). Para el color elegido se calculan cuatro armonías, en el modelo HSL de su `hexadecimal`
 *      (DEFINICION_ARMONIAS fija las reglas exactas): complementario (tono +180°), análogos (±30°), tríadico (+120° y
 *      +240°) y monocromático (el mismo tono y saturación con otras luminosidades). Los grises y blancos (saturación
 *      HSL menor a SATURACION_SIN_TONO) no tienen tono: `sinTono` es true y las armonías cromáticas parten de la
 *      luminosidad (complementario: 100 − L; análogos: L − 15 y L + 15; tríadico: L − 30 y L + 30; siempre entre 5 y 95),
 *      y la pantalla avisa «Este color casi no tiene tono: las combinaciones usan claridad». La armonía es una
 *      SUGERENCIA de diseño, no una garantía de gusto.
 *  P8  COLOR REAL MÁS CERCANO. Cada muestra de una armonía se enlaza al color de la carta MÁS PARECIDO (P1), medido como
 *      distancia de color ΔE (CIE76) entre los `hexadecimal` (convertidos a CIELAB con blanco D65); no se usa el CIELAB
 *      guardado porque es opcional (RC-25). Reglas: solo colores de LA MISMA MARCA del elegido (no se puede mezclar marcas
 *      en un pedido), nunca el mismo color elegido, y solo si ΔE ≤ UMBRAL_COLOR_CERCANO (25, aceptado por el Tech Lead);
 *      si no hay ninguno, `cercano` es null y la pantalla muestra la muestra sin enlace y con «Sin color parecido en la
 *      carta». Se informa `deltaE` (con un decimal) y la pantalla lo traduce a «muy parecido» (≤ 6), «parecido» (≤ 15) o
 *      «aproximado» (más). En empate de distancia gana el de menor id.
 *  P9  PRODUCTOS DEL COLOR. Los que se pueden entregar en el color elegido: `GET /busqueda/productos?idColor=…`
 *      (M02), con sus ofertas y la etiqueta «Patrocinado» como en el catálogo. Hasta PRODUCTOS_RECOMENDADOS_MAXIMO. La
 *      sección se titula «Productos en <color>». Cada tarjeta lleva a la ficha con el color puesto (P11). La
 *      página solo CONSUME la tarjeta de M02: cuando la otra rama de M01 la cambie a «variante real con su color», este
 *      listado la mostrará sin cambios aquí. Sin color elegido la sección pide que elija uno en el abanico.
 *  P10 PRODUCTOS RECOMENDADOS. Son los que el sistema sugiere APARTE de las pinturas para incitar a más compras (el Tech
 *      Lead lo aclaró): los complementarios (HU-CAT-08, X1 a X5) de los tres primeros productos del color —brochas,
 *      rodillos, cintas—, sin repetir y hasta 4. La sección se titula «Recomendados para tu proyecto»; si no hay ninguno,
 *      no se pinta.
 *  P11 COLOR PUESTO EN LA FICHA. `GET /productos/:idProducto/colores` acepta un `idColor` opcional; si el color lo ofrece
 *      ese producto, responde solo ese (si no, lista vacía, sin error). La ficha lo usa al llegar con `?color=<id>` y deja
 *      el color ya elegido. Sin el parámetro no cambia nada (compatible con la entrega 2).
 *  P12 SIN IDENTIDAD. Las rutas son públicas, sin sesión, y no guardan quién consulta. No se mide nada (M14 no entra aquí).
 *  P13 RENDIMIENTO. Calcular P1 no debe leer todos los productos por cada consulta: el servidor guarda en memoria, durante
 *      SEGUNDOS_CACHE_PALETA, el resultado de «qué colores entrega cada producto visible» y lo reconstruye al vencer. Un
 *      color que se apaga o un producto que se despublica puede tardar hasta ese tiempo en reflejarse en esta página (la
 *      ficha y el carrito siempre consultan en vivo y no dependen de esto).
 *  P14 EL ABANICO. Es la pieza central y debe verse como un muestrario real de pintura abierto en abanico:
 *      a) Cada lámina es un color de P1 (con su nombre y código a la vista y el nombre accesible completo); las láminas
 *         salen de un mismo punto inferior y se abren en arco.
 *      b) Muestra a la vez como máximo COLORES_EN_ABANICO láminas (menos en pantallas angostas: ABANICO_LAMINAS_MOVIL);
 *         el resto se alcanza DESLIZANDO: arrastrar con el dedo o el cursor, flechas anterior/siguiente (zona táctil de al
 *         menos 44×44 px), teclas ← → (también Inicio y Fin) y la rueda horizontal. El deslizado tiene inercia leve y
 *         siempre queda una lámina centrada; con `prefers-reduced-motion` no hay inercia ni animación de transición.
 *      c) Es GRANDE: la sección ocupa el alto visible de la pantalla (menos la cabecera) y el abanico llena ese alto; el
 *         combinador y lo demás quedan debajo y más pequeños. Nunca desborda horizontalmente.
 *      d) Respeta el filtro: al cambiar de familia, marca o texto el abanico vuelve a empezar con los colores del filtro.
 *      e) Elegir una lámina (clic, toque, Enter o Espacio) la centra, la levanta y la deja marcada; la pantalla anuncia el
 *         color elegido (nombre y código) en una región `aria-live`. Es un grupo de opciones (`radiogroup`): una sola
 *         lámina en el orden de tabulación y las flechas recorren las demás.
 *      f) Sin colores (filtro vacío) muestra «No hay colores con ese filtro» y un botón para limpiar el filtro.
 *  P15 LA ONDA. Al elegir un color aparece, en la parte inferior de la sección del abanico, una onda llamativa pintada con
 *      ese color, con su nombre, su código y un botón «Ver productos en <color>» que baja suavemente a P9 (instantáneo con
 *      `prefers-reduced-motion`). El texto de la onda se escribe en blanco o negro según el contraste con el color (mínimo
 *      4,5:1). La onda se anima despacio (movimiento horizontal) salvo con `prefers-reduced-motion`. Sin color elegido no
 *      hay onda. Cambiar de color cambia la onda sin recargar.
 *  P16 MENÚ. «Paleta de color» va justo después de «Ofertas» en el menú principal y en el menú móvil, como un botón más
 *      llamativo que los enlaces (degradado de la marca con ícono de paleta; el de «Ofertas» sigue siendo la insignia
 *      roja). Cambio compartido de la cabecera (`core`): ver «Cambios en piezas compartidas».
 *
 * ── Cambios en piezas compartidas (decididos por el Tech Lead, van en el mismo PR) ─
 *  · CABECERA FIJA (todas las páginas públicas): la cabecera queda siempre en la parte de arriba de la pantalla
 *    (`position: fixed`). La franja azul con la información básica (Topbar) se ESCONDE al bajar (scroll) y VUELVE a
 *    aparecer al subir; la cabecera principal no se mueve. El contenido no salta (se reserva su alto). Con
 *    `prefers-reduced-motion` el cambio es inmediato. Con un menú o modal abierto la cabecera no se oculta.
 *  · M01 (ficha): lee `?color=<id>` (P11).
 *
 * ── Decisiones del Tech Lead que cierran las preguntas del borrador ─────────
 *  · HU básica: se confía más en el mockup para las FUNCIONES que para títulos e imágenes.
 *  · Ambientes: los hace M03; aquí solo la pestaña y el espacio (P6).
 *  · Umbral de color parecido: ΔE ≤ 25 (P8). Lugar en el menú: después de «Ofertas», con botón llamativo (P16).
 *  · Abanico: deslizable, grande y con onda al elegir (P14, P15). Debe sentirse fluido: el arrastre no puede depender de
 *    volver a pintar el componente en cada movimiento.
 *  · Productos recomendados = los complementarios que no son pintura (P10); los productos del color son otra sección (P9).
 *  · Combinador compacto (P7): las cuatro armonías en una fila con su muestra y el color real más parecido como punto.
 *  · Las pestañas de familia llevan un tinte suave de su propio color (P3).
 *  · Caché de 60 s (P13): es solo una memoria del servidor para no recalcular en cada visita; no afecta a la compra.
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
