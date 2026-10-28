import { z } from 'zod';
import {
  idSchema,
  respuestaPaginada,
  respuestaUno,
} from './m01-catalogo.contract';
import {
  ambienteSchema,
  ofertaPublicaSchema,
  productoPublicoTarjetaSchema,
  referenciaSchema,
} from './m01-catalogo-productos.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M02. Búsqueda, filtros y descubrimiento
 * ============================================================================
 * Scope: m02-busqueda · Ola 3 · Prefijo de historias: BUS · BORRADOR para el Tech Lead.
 * Especificación funcional: docs/02_MODULOS_FUNCIONALES/M02_ESPECIFICACION_BUSQUEDA.md
 * Diagramas de flujo: docs/assets/diagrams/M02/
 *
 * Este contrato ES la especificación del módulo. Nada se programa hasta que el Tech Lead
 * lo da por bueno. Lo que depende de una decisión suya está en "Preguntas abiertas" (Q1…Q7)
 * con la opción que se asume mientras tanto; ninguna bloquea el resto del contrato.
 *
 * Ajustes del catálogo (2026-10): tolerancia a errores sin extensiones (B11–B14, D3), tarjeta de "producto
 * en un color" (T1–T4), pantalla /productos e inicio (V1–V5) y ficha abierta en el color de la tarjeta (P2).
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────
 *  HU-BUS-01 Búsqueda de productos por texto libre, tolerante a mayúsculas, acentos, plurales y
 *            errores de escritura, sobre nombre, marca, línea, categoría, color y descripción.
 *  HU-BUS-02 Filtros combinables y de varios valores: categoría, subcategoría, marca, línea,
 *            tipo de resina, color, familia cromática, presentación y rango de precio. Cada
 *            filtro ofrece solo valores que producen resultados.
 *  HU-BUS-03 Orden: relevancia, precio ascendente, precio descendente y novedad.
 *  HU-BUS-05 Paginación en el servidor, con total de resultados.
 *  HU-BUS-06 Registro de búsquedas sin resultado, sin identidad, y su consulta por frecuencia
 *            y periodo para quien tenga el permiso `estadisticas.consultar`.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No crea, edita ni desactiva categorías, subcategorías, marcas, líneas, colores, productos
 *    ni variantes: eso es de M01. M02 solo LEE el catálogo y nunca lo escribe.
 *  · El patrocinio NO cambia qué productos aparecen ni cuántos: solo el orden (HU-BUS-04, ver O7). Las campañas son
 *    de M14 y el interruptor `producto.patrocinado` no influye en ningún orden ni filtro (CA-BUS-03-04).
 *  · No calcula descuentos ni precios de cliente empresa: los pide a M06 por un puerto (Q1).
 *  · No muestra existencias exactas ni datos internos (HU-SEG-06, U7 de M01).
 *  · No ofrece autocompletado, "¿quisiste decir…?", historial personal de búsquedas ni
 *    recomendaciones: la spec no los pide.
 *  · No modifica el código del módulo M01 ni sus tablas (regla de aislamiento de AGENTS.md).
 *
 * ── Reglas de búsqueda ──────────────────────────────────────────────────────
 *  B1  Pública: no exige sesión. Sin longitud mínima; con el texto vacío devuelve el catálogo
 *      completo (paginado) con los filtros que haya.
 *  B2  La búsqueda y los filtros se resuelven en el SERVIDOR, nunca en el navegador
 *      (RF-BUS-01-02). El frontend no filtra ni ordena por su cuenta.
 *  B3  Normalización del término: se recortan espacios, se pasa a minúsculas, se quitan
 *      acentos y se colapsan espacios repetidos. Largo máximo 100. Se compara contra el texto
 *      normalizado de cada campo.
 *  B4  Campos que se buscan: nombre del producto, marca, línea, categoría, subcategoría, nombre de
 *      color, nombre de la familia cromática y descripción. La tolerancia a errores sigue B11–B14.
 *  B5  Solo productos visibles al público, con las mismas condiciones de U1 de M01: activo,
 *      publicado y con marca, línea (si tiene), subcategoría y categoría activas. Los inactivos
 *      nunca aparecen (CA-BUS-01-03).
 *  B6  Cada producto aparece UNA sola vez aunque coincidan varias de sus variantes o colores
 *      (CA-BUS-01-06). Se devuelven productos, nunca variantes.
 *  B7  COLOR: buscar o filtrar un color de la carta devuelve los productos que PUEDEN
 *      entregarse en ese color: los que lo traen de fábrica y los entonables cuya base y acabado
 *      lo permiten (P5 de M01) (RF-BUS-01-05, RF-BUS-02-03, CA-BUS-02-08). Los entonables se
 *      encuentran por los colores de su carta (marca + base + acabado) con una consulta a la base por
 *      cada palabra, sin cargar la carta completa (D4): ahí se ignoran las mayúsculas, pero no los
 *      acentos ni los errores de escritura (D7).
 *  B8  FAMILIA CROMÁTICA: si el término coincide con el nombre de una familia (ej. "amarillo"),
 *      se devuelven los productos que pueden entregar CUALQUIER color de esa familia (Q3).
 *  B9  Un término sin resultados no produce error: se informa "sin resultados" y, si el término
 *      se escribió solo (sin filtros), se registra (HU-BUS-06, D5).
 *  B10 Si la búsqueda falla por un error del servidor, la respuesta es el error genérico
 *      ERROR_INTERNO sin detalles técnicos; el frontend informa y mantiene accesibles el inicio
 *      y el catálogo (RF-BUS-01-06).
 *
 * ── Tolerancia a errores de escritura ───────────────────────────────────────
 *  B11 PALABRAS: el término normalizado (B3) se parte en palabras. Las de menos de
 *      LARGO_MINIMO_PALABRA letras ("de", "la") se ignoran; si todas son cortas, se busca el término
 *      completo como texto.
 *  B12 TODAS LAS PALABRAS: un producto aparece solo si CADA palabra coincide con al menos un campo
 *      (B4), en el campo que sea. Así "vinilo blanco" no trae todo lo que diga "vinilo".
 *  B13 Una palabra coincide con un campo, de mayor a menor fuerza:
 *        · exacta: es igual a una palabra del campo;
 *        · contenida: aparece dentro del texto del campo ("vinil" en "viniltex");
 *        · singular o plural: coinciden al quitar la "s" o "es" final ("pinturas" → "pintura");
 *        · aproximada: a una palabra del campo le faltan, le sobran, le cambian o le invierten
 *          letras hasta ERRORES_TOLERADOS ("vinilex" → "viniltex", "barnis" → "barniz"). Las palabras
 *          de 3 letras no admiten errores, para no traer resultados sin relación.
 *  B14 La tolerancia se resuelve en el servicio, sobre los productos visibles que ya se leen para
 *      buscar (D3). No usa extensiones de la base ni cambia el esquema.
 *
 * ── Color de muestra de la tarjeta ──────────────────────────────────────────
 *  T1  Cada resultado trae `colorMuestra` (id, nombre y hexadecimal): el color en que se muestra el
 *      producto en su tarjeta y en el que se abre su ficha (V3). Es null si el producto no se vende con color
 *      (sin bases ni colores de fábrica).
 *  T2  Cuál color, en este orden:
 *        · si se filtró por un color (`idColor`) que el producto ofrece, ese color;
 *        · si el término coincidió con un color del producto, ese color;
 *        · si se filtró por una familia (`idFamiliaColor`), el primer color del producto en esa familia;
 *        · si no, el primer color que ofrece (P5 de M01: de fábrica y de su carta), por nombre y luego
 *          por id, el mismo orden de la ficha.
 *  T3  Se calcula solo para los productos de la página pedida, con una consulta, sin cargar la carta
 *      completa (U3 de M01, D4). Si esa consulta falla, los resultados salen con `colorMuestra` null:
 *      el listado no se cae por el color.
 *  T4  `totalColores`: cuántos colores ofrece el producto (P5 de M01), para decir "y 45 colores más"; 0 si
 *      no se vende con color. Se cuenta en la misma consulta de T3 y con el mismo cuidado si falla.
 *
 *  Por qué la muestra cambia con la búsqueda: cada tarjeta es el producto EN UN COLOR (como en una tienda de
 *  pinturas, donde cada color es su propia ficha). Sin búsqueda se ve el primero de la carta; al buscar "gris"
 *  se ve el gris que coincidió, y la tarjeta lleva a la ficha en ese mismo gris. Lo que se ve es lo que se abre.
 *
 * ── Pantalla /productos ─────────────────────────────────────────────────────
 *  V1  Orden del panel de filtros: Ofertas, Categorías, Ambiente, Marcas, Líneas, Familias de color,
 *      Presentación, Tipo de resina, Superficie y Rango de precio.
 *  V2  Tarjeta del producto en su color: con `colorMuestra`, un panel redondeado de ese color ocupa la
 *      mitad de abajo de la imagen y el envase queda por delante, como una muestra de pintura. La foto no se
 *      mezcla con el color (un color oscuro no debe tapar el producto); los colores muy claros llevan un
 *      borde suave. Bajo el nombre, un punto con el color, su nombre y "y N colores más" (T4). Sin color, el
 *      fondo neutro de siempre y sin esa línea.
 *  V3  Sin botón "Ver producto". El nombre y la imagen llevan a la ficha ABIERTA EN ESE COLOR:
 *      `/productos/:idProducto?color=:idColor` (U8 de m01-catalogo-productos); sin color,
 *      `/productos/:idProducto`. El botón del carrito (junto al precio) AGREGA 1 unidad del producto en su
 *      color de muestra y en la presentación del precio que muestra la tarjeta (la vendible más barata), con
 *      el servicio del carrito de M05, y abre el panel lateral del carrito (L1–L2 del contrato de M05).
 *  V4  Si no se puede agregar directo (combo agotado con `compraBloqueada`, ninguna presentación vendible, o
 *      un producto que lleva color sin `colorMuestra`), el botón del carrito lleva a la ficha en su color,
 *      que explica por qué y deja elegir.
 *  V5  INICIO: "Productos destacados" y la búsqueda de "¿Qué buscas?" usan esta misma búsqueda
 *      (GET /busqueda/productos, con su tolerancia a errores) y la misma tarjeta que /productos.
 *
 * ── Piezas fuera de M02 (cada una en su PR) ─────────────────────────────────
 *  P1  Core Kit: `ProductCard` acepta un color de muestra con su texto (V2) y la opción de no mostrar
 *      "Ver producto" (V3). Sin esas propiedades se ve igual que hoy en el resto de pantallas.
 *  P2  M01: la ficha se abre en el color de `?color=` (U8 de m01-catalogo-productos) y la carta pública de
 *      colores de un producto acepta `idColor` para traer ese color.
 *  P3  Inicio (fuera de los módulos): las tarjetas destacadas usan la búsqueda de M02 (V5).
 *
 * ── Reglas de filtros ───────────────────────────────────────────────────────
 *  F1  Los filtros se combinan con Y entre grupos y O dentro de un mismo grupo
 *      (marcas 1 y 2 = productos de cualquiera de las dos) (CA-BUS-02-03).
 *  F2  Cada filtro admite varios valores: se envían repetidos (`idMarca=1&idMarca=2`) o separados
 *      por coma (`idMarca=1,2`). Máximo 20 valores por grupo.
 *  F3  Las opciones de cada grupo se calculan aplicando TODOS los demás filtros menos el suyo, y
 *      solo incluyen valores con al menos un producto (RF-BUS-02-02). Así el usuario puede
 *      sumar valores dentro de un grupo sin quedarse sin opciones.
 *  F4  Quitar un filtro recalcula con los restantes (CA-BUS-02-05). Todo el estado de búsqueda,
 *      filtros, orden y página viaja en la URL del navegador para poder compartirla (RF-BUS-02-05).
 *  F5  Rango de precio: `precioMin` y `precioMax` sobre el PRECIO FINAL que informa M06 por el puerto:
 *      el precio de la variante con el evento en curso (IVA incluido). El descuento de empresa NO entra:
 *      depende del total del carrito y solo se ve allí (M06 · R10). Un `precioMin` mayor que `precioMax` se rechaza con
 *      400 PARAMETRO_INVALIDO (RF-BUS-02-04, CA-BUS-02-06). Un producto cumple si AL MENOS UNA de
 *      sus variantes activas queda dentro del rango.
 *  F6  Presentación = medida de una variante activa del producto.
 *  F7  Tipo de resina = el de la ficha de recubrimiento. Los productos sin ficha (herramientas)
 *      no cumplen un filtro de resina.
 *  F9  `enOferta=true`: solo productos con un evento de M06 en curso ahora mismo (menú «Ofertas»).
 *      Se combina con el resto de filtros y del orden. Si M06 no responde, el filtro falla con 500 en vez de
 *      mostrar «ninguna oferta»; sin el filtro, un fallo de M06 solo quita las etiquetas y el precio vuelve al base.
 *  F10 `conVentas=true`: solo productos con unidades vendidas en los últimos DIAS_MAS_VENDIDOS días (O8). Se combina con
 *      el resto de filtros y del orden; es lo que permite pintar «Los más vendidos» sin mostrar productos que nunca se
 *      han vendido.
 *  F11 `ids=1,2,3`: solo esos productos (hasta LIMITE_MAXIMO). Es lo que permite pintar la lista de favoritos con la misma
 *      tarjeta del catálogo (color, oferta, precio vigente). Un identificador que no existe o no está visible no devuelve nada.
 *  F8  Los filtros de M01 que ya existen (superficie, ambiente) se conservan con el mismo nombre,
 *      para no romper las direcciones actuales (`?ambiente=interior`, `?idCategoria=3`).
 *
 * ── Reglas de orden y relevancia ────────────────────────────────────────────
 *  O1  Criterios: `relevancia`, `precio_asc`, `precio_desc`, `novedad`. Por defecto `relevancia` (Q4).
 *      Sin término de búsqueda, `relevancia` equivale al orden por nombre.
 *  O2  Relevancia = suma, por cada palabra (B11) y cada campo con el que coincide, del peso del campo
 *      (PESOS_RELEVANCIA: nombre, marca, línea, categoría o subcategoría, color, descripción) por la
 *      fuerza de la coincidencia (B13): exacta × FACTOR_COINCIDENCIA_EXACTA, contenida o singular/plural
 *      × 1, aproximada × FACTOR_COINCIDENCIA_APROXIMADA. Escribir bien siempre pesa más que con errores.
 *  O3  Con término, un producto con relevancia 0 NO aparece, aunque su marca esté patrocinada
 *      (CA-BUS-03-04).
 *  O4  Desempate estable por nombre y luego por id del producto: la misma consulta devuelve el
 *      mismo orden (RF-BUS-03-03, CA-BUS-03-03, y evita saltos entre páginas).
 *  O5  Precio: se ordena por el precio final MÍNIMO de las variantes activas del producto (con el evento en
 *      curso), el mismo que usa `precioDesde` (CA-BUS-03-05). El descuento de empresa no entra (ver F5).
 *  O6  Novedad = `producto.fecha_creacion` descendente.
 *  O8  MÁS VENDIDOS (`ordenar=mas_vendidos`). Se ordena por las UNIDADES vendidas en los últimos DIAS_MAS_VENDIDOS días,
 *      de mayor a menor, contando las líneas de las órdenes de M08 que no estén canceladas ni devueltas (la línea guarda
 *      la variante vendida; la unidad se asigna al producto de esa variante). Los productos sin ventas van al final, por
 *      nombre (O4). No se publica el número de unidades, solo el orden. El patrocinio no actúa (O7 aplica solo a
 *      `relevancia`). Si la lectura de las órdenes falla, el orden cae a nombre y `conVentas` no devuelve nada.
 *  O7  PATROCINIO (HU-BUS-04; contrato M14 · A8). Solo con `ordenar=relevancia` (el orden por defecto):
 *        · Sin texto de búsqueda, los productos de campañas vigentes con la ubicación `listado` van primero, por
 *          prioridad (mayor primero); el resto sigue su orden normal.
 *        · Con texto, se ordena por relevancia y SOLO entre productos con la MISMA relevancia van primero los
 *          patrocinados. Nunca entra un producto con relevancia 0 (CA-BUS-03-04).
 *        · Con `precio_asc`, `precio_desc` o `novedad` el patrocinio no actúa.
 *        · CUPO: como mucho CUPO_PATROCINADOS_LISTADO productos patrocinados pasan por delante; si hay más, el resto
 *          se ordena como uno normal.
 *        · No cambia el total, los filtros ni sus conteos, y un producto aparece una sola vez.
 *        · Cada resultado que el patrocinio adelantó lleva `patrocinado: true` y el id de su campaña (la pantalla
 *          pone la etiqueta «Patrocinado» y mide, M14 · A9, M3). Si M14 falla, se ordena sin patrocinio.
 *
 * ── Reglas de paginación ────────────────────────────────────────────────────
 *  G1  Por página se entregan solo los resultados de esa página, con `total`, `pagina`, `limite`
 *      y `totalPaginas` (RF-BUS-05-01). Tamaño por defecto 12, máximo 48.
 *  G2  Pedir una página que excede el total responde 200 con la lista vacía, sin error
 *      (CA-BUS-05-04).
 *  G3  Los filtros y el orden se conservan al cambiar de página (CA-BUS-05-02).
 *  G4  Sin desplazamiento horizontal ni funciones distintas en móvil (RNF-BUS-05-01): es una regla
 *      de las pantallas.
 *
 * ── Reglas del registro de búsquedas sin resultado ──────────────────────────
 *  S1  Se registra una fila por evento en `busqueda_sin_resultado` (tabla ya existente): término
 *      normalizado y fecha. NUNCA identidad, sesión, IP ni agente de navegador (M20, CA-BUS-06-02),
 *      aunque la persona haya iniciado sesión.
 *  S2  Solo se registra cuando hay término, se pidió la PRIMERA página, no hay filtros aplicados y
 *      el total es 0. Pasar de página o quitar filtros no duplica el registro (D5).
 *  S3  El registro no puede hacer fallar la búsqueda: si escribir falla, se ignora y se continúa.
 *  S4  Consulta: agrupa por término con su número de repeticiones y la fecha del último intento,
 *      ordenado por frecuencia, y acotado a un periodo (diario, semanal, mensual, anual)
 *      (CA-BUS-06-01, RF-BUS-06-02). Exige `estadisticas.consultar`; sin él, 404
 *      RECURSO_NO_DISPONIBLE (CA-BUS-06-03).
 *  S5  Retención: las filas más viejas que el periodo configurado se eliminan (Q5).
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  · Rutas públicas: sin sesión. Si hay sesión, solo sirve para que M06 aplique precios de empresa.
 *  · Rutas de administración: sesión y permiso `estadisticas.consultar` (id 20 del seed) con
 *    `requirePermission`; toda denegación responde 404 opaco (ADR-003).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  El módulo vive en `m02-busqueda`, con rutas propias; el listado `GET /catalogo/productos` de
 *      M01 no se toca (ver Q2).
 *  D2  M02 lee las tablas del catálogo con sus propios repositorios y solo en lectura. No importa
 *      código de M01.
 *  D3  La tolerancia a errores y a acentos se resuelve en el servicio (B14), sobre los productos visibles
 *      que M02 ya lee para buscar: no hacen falta las extensiones `pg_trgm` ni `unaccent`, ni cambios de
 *      esquema ni de despliegue. Si el catálogo crece tanto que se vuelve lento, se pasa a la base.
 *  D4  Los colores no se cargan completos en los filtros (U3 de M01): el filtro de color elige por
 *      familia, y para un color concreto se busca por nombre con `GET /busqueda/colores`.
 *  D5  Búsqueda sin resultados con filtros NO se registra: el vacío puede deberse a los filtros y no
 *      a un faltante del catálogo.
 *  D6  Tamaño de página por defecto 12 y máximo 48 (la vitrina ya usa 12). Se puede mover a un
 *      parámetro del sistema si el Tech Lead lo pide.
 *  D7  La búsqueda de colores de la carta (B7, entonables) ignora mayúsculas, pero no acentos ni
 *      errores: hacerlo exigiría cargar la carta completa o `unaccent` en la base.
 *  D8  La tarjeta en un color (V2, V3) se usa en `/productos` y en el inicio (V5). Las demás tarjetas
 *      (vitrina de M01, "Completa tu trabajo con" y patrocinados de M14) quedan igual hasta que se pida (Q7).
 *
 * ── Preguntas abiertas (para el Tech Lead / cliente) ────────────────────────
 *  Q1  RESUELTA con M06: `PrecioFinalPort` lo implementa M06 (`preciosDeVariantes`, precio con evento, IVA
 *      incluido) y `OfertasListadoPort` aporta la etiqueta de cada tarjeta. M02 sigue filtrando y ordenando
 *      en memoria sobre ese precio (la paginación es correcta). Sin M06 conectado, el adaptador base devuelve
 *      el precio de la variante y no hay ofertas.
 *  Q2  ¿M02 REEMPLAZA el listado público de M01 (`GET /catalogo/productos`) y la página `/productos`
 *      pasa a usarlo, o conviven? Cambiarlo toca código de M01 (otro módulo, PR aparte).
 *  Q3  ¿Buscar "amarillo" debe devolver los productos que ofrecen cualquier color de la FAMILIA
 *      Amarillos? Se asume que sí (B8). Vale lo mismo para "rojo", "azul", etc.
 *  Q4  El orden por defecto es "configurable" en la spec. Se asume `relevancia` fijo (constante). Si
 *      debe ser editable por el administrador, hay que añadir un parámetro de sistema (M17), que es
 *      un cambio de archivos compartidos.
 *  Q5  Periodo de retención del registro de búsquedas sin resultado (S5): se asumen 365 días mientras
 *      el cliente no diga otro. También es un parámetro de sistema si debe ser editable.
 *  Q6  Caché: la spec habla de "paginación y caché". No se define caché de respuestas en este contrato;
 *      si se quiere, hay que decidir dónde vive y cuánto dura.
 *  Q7  ¿La tarjeta en un color debe llegar también a "Completa tu trabajo con" de la ficha y a los
 *      patrocinados? Se asume que no por ahora (D8); cada una es de otro módulo y sería un PR aparte.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. CONSTANTES Y PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const TERMINO_MAXIMO = 100;
export const VALORES_MAXIMOS_POR_FILTRO = 20;
export const LIMITE_POR_DEFECTO = 12;
export const LIMITE_MAXIMO = 48;
export const RETENCION_DIAS_POR_DEFECTO = 365;
export const PRECIO_MAXIMO = 1_000_000_000;

export const CRITERIOS_ORDEN = ['relevancia', 'precio_asc', 'precio_desc', 'novedad', 'mas_vendidos'] as const;
/** Ventana, en días, de las órdenes que cuentan para «más vendidos» (O8). */
export const DIAS_MAS_VENDIDOS = 90;
export const ordenResultadosSchema = z.enum(CRITERIOS_ORDEN);
export type OrdenResultados = z.infer<typeof ordenResultadosSchema>;
export const ORDEN_POR_DEFECTO: OrdenResultados = 'relevancia';

/** Peso de cada campo en la relevancia, de mayor a menor (O2). */
export const PESOS_RELEVANCIA = {
  nombre: 5,
  marca: 4,
  linea: 3,
  categoria: 2,
  color: 2,
  descripcion: 1,
} as const;
/** Multiplicador de una coincidencia exacta frente a una contenida (O2). */
export const FACTOR_COINCIDENCIA_EXACTA = 2;
/** Multiplicador de una coincidencia con errores de escritura (O2, B13). */
export const FACTOR_COINCIDENCIA_APROXIMADA = 0.5;
/** Las palabras más cortas se ignoran al buscar (B11). */
export const LARGO_MINIMO_PALABRA = 3;
/**
 * Letras que pueden faltar, sobrar, cambiar o invertirse según el largo de la palabra buscada (B13).
 * Con 3 letras no se admiten errores.
 */
export const ERRORES_TOLERADOS = [
  { desdeLetras: 8, errores: 2 },
  { desdeLetras: 4, errores: 1 },
] as const;
/** Cuántos productos patrocinados pueden pasar por delante en el listado (M14 · A8; mismo valor que allí). */
export const CUPO_PATROCINADOS_LISTADO = 8;

export const PERIODOS_ESTADISTICA = ['diario', 'semanal', 'mensual', 'anual'] as const;
export const periodoEstadisticaSchema = z.enum(PERIODOS_ESTADISTICA);
export type PeriodoEstadistica = z.infer<typeof periodoEstadisticaSchema>;

export const PERMISO_CONSULTAR_ESTADISTICAS = 'estadisticas.consultar';

/** Término de búsqueda: se recorta y se limita. Vacío equivale a "sin término" (B1). */
export const terminoSchema = z.string().trim().max(TERMINO_MAXIMO);

/**
 * Filtro de varios valores (F2): `?idMarca=1&idMarca=2` o `?idMarca=1,2`.
 * Admite el valor suelto, la lista repetida o la lista separada por comas.
 */
const listaIdsSchema = z.preprocess((valor) => {
  if (valor === undefined || valor === '') return undefined;
  const lista = Array.isArray(valor) ? valor : [valor];
  return lista.flatMap((v) => (typeof v === 'string' ? v.split(',') : [v])).filter((v) => v !== '');
}, z.array(z.coerce.number().int().positive()).max(VALORES_MAXIMOS_POR_FILTRO).optional());

/** Los productos pedidos por identificador (F11): hasta una página completa. */
const listaIdsProductoSchema = z.preprocess((valor) => {
  if (valor === undefined || valor === '') return undefined;
  const lista = Array.isArray(valor) ? valor : [valor];
  return lista.flatMap((v) => (typeof v === 'string' ? v.split(',') : [v])).filter((v) => v !== '');
}, z.array(z.coerce.number().int().positive()).max(LIMITE_MAXIMO).optional());

const precioSchema = z.coerce.number().min(0).max(PRECIO_MAXIMO);

const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

const MENSAJE_RANGO_PRECIO = 'El precio mínimo no puede ser mayor que el máximo.';

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** Filtros compartidos por el listado y por las opciones de filtro (F1–F8). */
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
  /** Solo productos con un evento de M06 en curso (F9). */
  enOferta: booleanoQuerySchema.optional(),
  /** Solo productos con unidades vendidas en la ventana de «más vendidos» (F10). */
  conVentas: booleanoQuerySchema.optional(),
  /** Solo estos productos (F11): la lista de favoritos. Se combina con el resto de filtros y del orden. */
  ids: listaIdsProductoSchema,
});
export type FiltrosBusquedaBase = z.infer<typeof filtrosBusquedaBaseSchema>;

const rangoPrecioValido = (v: { precioMin?: number; precioMax?: number }): boolean =>
  v.precioMin === undefined || v.precioMax === undefined || v.precioMin <= v.precioMax;

/** GET /busqueda/productos */
export const buscarProductosRequestSchema = filtrosBusquedaBaseSchema
  .extend({
    ordenar: ordenResultadosSchema.default(ORDEN_POR_DEFECTO),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
  })
  .refine(rangoPrecioValido, { message: MENSAJE_RANGO_PRECIO, path: ['precioMin'] });
export type BuscarProductosRequest = z.infer<typeof buscarProductosRequestSchema>;

/** GET /busqueda/filtros — mismos filtros que el listado, sin orden ni página. */
export const opcionesFiltroRequestSchema = filtrosBusquedaBaseSchema.refine(rangoPrecioValido, {
  message: MENSAJE_RANGO_PRECIO,
  path: ['precioMin'],
});
export type OpcionesFiltroRequest = z.infer<typeof opcionesFiltroRequestSchema>;

/** GET /busqueda/colores — buscar un color de la carta por nombre o código (D4). */
export const buscarColoresRequestSchema = z.object({
  q: terminoSchema.min(1),
  idFamiliaColor: listaIdsSchema,
  idMarca: listaIdsSchema,
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
});
export type BuscarColoresRequest = z.infer<typeof buscarColoresRequestSchema>;

/** GET /admin/busqueda/sin-resultado */
export const listarSinResultadoRequestSchema = z.object({
  periodo: periodoEstadisticaSchema.default('mensual'),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListarSinResultadoRequest = z.infer<typeof listarSinResultadoRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Color con el que se pinta el fondo de la imagen de la tarjeta (T1, T2). */
export const colorMuestraSchema = z.object({
  idColor: idSchema,
  nombre: z.string(),
  hexadecimal: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export type ColorMuestra = z.infer<typeof colorMuestraSchema>;

/**
 * Tarjeta de resultado: la misma de M01 (`precioDesde`, disponibilidad, imagen) más el motivo de la
 * coincidencia de color, para poder mostrar "Disponible en Amarillo Sol" (B7, B8).
 */
export const resultadoBusquedaSchema = productoPublicoTarjetaSchema.extend({
  /** Fondo de la imagen (T1–T3); null si el producto no se vende con color o no se pudo calcular. */
  colorMuestra: colorMuestraSchema.nullable(),
  /** Cuántos colores ofrece el producto (T4); 0 si no se vende con color. */
  totalColores: z.number().int().nonnegative(),
  /** Nombre del color o de la familia que coincidió con el término; null si no fue por color. */
  coincidenciaColor: z.string().nullable(),
  /** true si el patrocinio de una campaña de M14 lo adelantó en este resultado (O7). */
  patrocinado: z.boolean(),
  /** La campaña que lo adelantó, para medir (M14 · M3, M4); null si `patrocinado` es false. */
  idCampania: idSchema.nullable(),
});
export type ResultadoBusqueda = z.infer<typeof resultadoBusquedaSchema>;

export const buscarProductosResponseEnvelopeSchema = respuestaPaginada(resultadoBusquedaSchema);
export type BuscarProductosResponseEnvelope = z.infer<typeof buscarProductosResponseEnvelopeSchema>;

/** Una opción de filtro con cuántos productos produce (F3). */
export const opcionFiltroSchema = referenciaSchema.extend({
  total: z.number().int().positive(),
});
export type OpcionFiltro = z.infer<typeof opcionFiltroSchema>;

export const opcionSubcategoriaSchema = opcionFiltroSchema.extend({ idCategoria: idSchema });
export const opcionLineaSchema = opcionFiltroSchema.extend({ idMarca: idSchema });
export const opcionFamiliaColorSchema = opcionFiltroSchema.extend({
  /** Muestra de la familia, para pintar el selector. */
  hexadecimal: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

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
  /** Precio final mínimo y máximo entre los resultados; null si no hay resultados. */
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

/** Una fila del informe de búsquedas sin resultado. NUNCA lleva identidad (S1). */
export const busquedaSinResultadoSchema = z.object({
  termino: z.string(),
  repeticiones: z.number().int().positive(),
  ultimoIntento: z.string().datetime(),
});
export type BusquedaSinResultado = z.infer<typeof busquedaSinResultadoSchema>;
export const listarSinResultadoResponseEnvelopeSchema = respuestaPaginada(busquedaSinResultadoSchema);
export type ListarSinResultadoResponseEnvelope = z.infer<typeof listarSinResultadoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Envelope global del backend: `{ success: false, error: { code, message, details } }`.
 * Estados: 400 PARAMETRO_INVALIDO (incluye precioMin > precioMax y listas con demasiados valores) ·
 * 404 RECURSO_NO_DISPONIBLE (opaco, también para toda denegación) · 500 ERROR_INTERNO (sin detalles).
 */
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
 * 5. PUERTOS (ADR-009)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Quién consulta: null si es anónimo. Los listados no llevan el descuento de empresa (F5): se reserva. */
export interface ContextoPrecio {
  readonly idUsuario: number | null;
}

/**
 * Precio final por variante, con el evento en curso e IVA incluido (F5, O5, CA-BUS-02-07, CA-BUS-03-05).
 * Lo implementa M06 (Q1). Sin M06 conectado, el adaptador por defecto devuelve el precio base de la
 * variante. Recibe y devuelve LISTAS para no consultar de a una variante; una variante que el puerto
 * no devuelve conserva su precio base.
 */
export interface PrecioFinalPort {
  preciosFinales(
    idsVariante: readonly number[],
    contexto: ContextoPrecio,
  ): Promise<ReadonlyMap<number, number>>;
}

/** Oferta de un producto para su tarjeta (la misma forma que M01: `ofertaPublicaSchema`). */
export type OfertaListado = z.infer<typeof ofertaPublicaSchema>;

/**
 * Ofertas de los eventos de M06 para el listado: qué productos están en oferta ahora (F9) y la oferta de
 * cada tarjeta de la página. Lo implementa M06; sin M06 no hay ofertas.
 */
export interface OfertasListadoPort {
  /** Ids de los productos con un evento en curso ahora. */
  idsProductosEnOferta(): Promise<number[]>;
  /** Hasta 100 productos (una página); una respuesta por producto. */
  ofertasDeProductos(
    idsProducto: readonly number[],
  ): Promise<ReadonlyArray<{ idProducto: number; oferta: OfertaListado | null }>>;
}

/**
 * Campañas de patrocinio de M14 para el listado (O7): los productos de campañas vigentes con la ubicación `listado`
 * y su prioridad. Lo implementa M14; sin M14 no hay patrocinio.
 */
export interface PatrocinioListadoPort {
  prioridadesDeProductos(
    ubicacion: 'listado',
  ): Promise<ReadonlyArray<{ idProducto: number; prioridad: number; idCampania: number }>>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Públicas (montaje: /api/v1/busqueda) — sin autenticación
 *  GET /productos   resultados paginados de búsqueda, filtros y orden (HU-BUS-01, 02, 03, 05)
 *  GET /filtros     opciones de cada filtro con su total, según la búsqueda actual (HU-BUS-02)
 *  GET /colores     buscar un color de la carta por nombre o código, paginado
 *
 *  Administración (montaje: /api/v1/admin/busqueda) — sesión + `estadisticas.consultar`
 *  GET /sin-resultado   términos sin resultado por frecuencia y periodo (HU-BUS-06)
 *
 *  El registro de una búsqueda sin resultado NO tiene ruta: lo hace GET /productos por dentro (S2).
 * ─────────────────────────────────────────────────────────────────────────── */
