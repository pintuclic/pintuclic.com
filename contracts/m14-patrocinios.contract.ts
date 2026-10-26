import { z } from 'zod';
import { idSchema, respuestaPaginada, respuestaUno } from './m01-catalogo.contract';
import { productoPublicoTarjetaSchema } from './m01-catalogo-productos.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M14. Patrocinios y campañas
 * ============================================================================
 * Scope: m14-patrocinios · Ola 7 (valor añadido) · Prefijo de historias: PAT · BORRADOR para el Tech Lead.
 * Base de datos: tablas nuevas `campania_patrocinio`, `campania_producto` y `campania_espacio`
 * (+ enum `enum_espacio_promocional`). No toca ninguna tabla existente.
 * Depende de M01 (marcas y productos) y M17 (permisos). Lo consumen M02 (desempate en resultados),
 * M01 (complementarios) y las pantallas del inicio y del catálogo.
 *
 * FUENTE: «Pintu Clic — Documento de Historias de Usuario v5.2» (14 oct 2026), HU-PAT-01 a HU-PAT-04, y
 * las decisiones de Pintuco del 12 oct 2026 que cita su capítulo 7. Ese documento remite los requisitos
 * (RF-PAT-01-xx, RF-PAT-02-xx, RF-BUS-04-02/03) a la «Tanda 4B», que NO está en este repositorio. Este contrato
 * infiere de las HU lo que esos requisitos dirían; lo que no se pudo inferir está en «Preguntas abiertas».
 * Si la Tanda 4B dice otra cosa, manda la Tanda 4B y se ajusta este contrato antes de programar.
 *
 * ── Qué es M14 ──────────────────────────────────────────────────────────────
 *  El modelo de ingresos complementario de Pintu Clic: campañas temporales acordadas con una marca, que dan
 *  visibilidad a un conjunto de sus productos en espacios concretos del sitio, sin degradar la pertinencia de la
 *  búsqueda (HU-PAT-01, 02, 03).
 *   1. CAMPAÑA (HU-PAT-01): la crea el responsable comercial desde el panel con nombre, MARCA, PRODUCTOS de esa
 *      marca, VIGENCIA (fecha de inicio y de fin) y PRIORIDAD. Caduca sola al terminar: no hay nadie que la apague.
 *   2. ESPACIOS PROMOCIONALES (HU-PAT-02): cada campaña elige en cuáles de los espacios del sitio aparece. Los
 *      espacios son un conjunto cerrado (ESPACIOS_PROMOCIONALES). El responsable comercial los asigna sin
 *      intervención del equipo de desarrollo.
 *   3. EFECTO EN LA BÚSQUEDA (HU-PAT-03): el patrocinio nunca mete a un producto que no es pertinente; solo
 *      desempata entre resultados igual de pertinentes (R9).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · NO mide campañas (HU-PAT-04 está BLOQUEADA en el documento de HU, cap. 7: espera la decisión de analítica
 *    propia o servicio externo, la misma de HU-RPT-06). No cuenta impresiones ni clics, y por eso M14 ya no
 *    depende de M19 (la ruta v2 lo ponía como dependencia de construcción). Cuando se decida, se añade a este
 *    contrato.
 *  · NO guarda contratos, montos ni cobros al patrocinador: la campaña no lleva dinero (el modelo de cobro es
 *    comercial, fuera del sistema).
 *  · NO tiene contenido gráfico propio (banner, imagen, texto): muestra productos del catálogo con la tarjeta
 *    normal. El banner del inicio es de M16 / FP-01 (HU-CNT-03). Ver Q4.
 *  · NO edita productos, marcas ni precios. Lee el catálogo de M01 (solo lectura) y no escribe nada fuera de
 *    sus tablas.
 *  · NO cambia el orden de la búsqueda por precio ni por novedad, ni los filtros, ni los totales (R9).
 *  · NO borra: una campaña se desactiva (estado `inactivo`), no hay DELETE.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R1  VIGENCIA. Una campaña está vigente cuando su estado es `activo`, su marca está activa (R7) y la fecha de
 *      hoy, en hora de Colombia (America/Bogota), está entre `fechaInicio` y `fechaFin`, ambas inclusive.
 *      `fechaFin` es OBLIGATORIA: toda campaña caduca. No hay horas ni días de la semana (a diferencia de los
 *      eventos de M06): una campaña es de fecha a fecha.
 *  R2  CADUCIDAD AUTOMÁTICA. La situación se calcula al consultar comparando fechas; no hay tarea programada
 *      que cambie estados. El día siguiente a `fechaFin` la campaña deja de mostrarse sola.
 *  R3  PRIORIDAD. Entero de 0 a 100 (0 por defecto); el MAYOR va primero. Es el único criterio entre campañas
 *      (RF-PAT-01-01 según el documento de HU).
 *  R4  UN PRODUCTO EN VARIAS CAMPAÑAS. Aparece una sola vez en cada espacio, con la prioridad MÁS ALTA entre las
 *      campañas vigentes que lo cubren en ese espacio.
 *  R5  ALCANCE. Todos los productos de una campaña deben ser de la marca de la campaña (409
 *      PRODUCTO_DE_OTRA_MARCA). Entre 1 y MAXIMO_PRODUCTOS_CAMPANIA, sin repetidos. La marca NO se puede cambiar
 *      después de crear la campaña (un acuerdo es con una marca): hay que crear otra campaña.
 *  R6  SOLO LO VISIBLE. Un producto inactivo, no publicado o con marca, línea o subcategoría inactivas (la regla de
 *      visibilidad de M01) no se muestra aunque esté en una campaña vigente. El panel sí lo lista, con
 *      `visible: false`, para que el responsable sepa por qué no sale.
 *  R7  MARCA INACTIVA. Si la marca se desactiva (HU-CAT-04, RF-CAT-04-03 de M01), sus campañas dejan de estar
 *      vigentes (situación `marca_inactiva`). No se tocan sus datos: al reactivar la marca, la campaña vuelve sola
 *      si todavía está dentro de sus fechas.
 *  R8  ESPACIOS. Una campaña tiene al menos un espacio y como máximo todos. Los espacios son:
 *        inicio           sección «Productos patrocinados» de la página de inicio
 *        catalogo         bloque «Productos patrocinados» del catálogo (UI Spec 4.3.4)
 *        busqueda         desempate dentro de los resultados pertinentes de M02 (R9)
 *        complementarios  prioridad en «Completa tu trabajo con» de la ficha (HU-CAT-08)
 *      Agregar un espacio nuevo es un cambio de este contrato (y de la pantalla que lo pinta), no un dato.
 *  R9  PERTINENCIA EN LA BÚSQUEDA (HU-PAT-03; HU-BUS-04, RF-BUS-04-02/03 de M02). Con el espacio `busqueda`, M02
 *      ordena como siempre por relevancia y, SOLO entre productos con la misma relevancia, pone primero a los
 *      patrocinados, por prioridad. Nunca entra un producto con relevancia 0 (CA-BUS-03-04), no cambia el total ni
 *      los filtros, y no actúa con `ordenar=precio_asc|precio_desc|novedad`. Sin término de búsqueda no hay
 *      pertinencia que degradar: el desempate se aplica sobre el orden por nombre de la vista de catálogo.
 *  R10 TRANSPARENCIA. Todo producto que se muestra posicionado por un patrocinio lleva la etiqueta visible
 *      «Patrocinado» (UI Spec 4.3.4: `bg-highlight`, texto negro). Aplica a los bloques de `inicio` y `catalogo`, a
 *      los resultados de `busqueda` y a `complementarios`.
 *  R11 BLOQUES. `GET /patrocinios/:espacio/productos` (solo `inicio` y `catalogo`) devuelve las tarjetas de M01
 *      de los productos visibles de las campañas vigentes de ese espacio, por prioridad descendente y, entre la
 *      misma prioridad, en orden aleatorio en cada consulta (reparto equitativo entre marcas; igual que HU-CAT-08).
 *      Sin campañas vigentes responde una lista vacía y la pantalla oculta el bloque.
 *  R12 COMPLEMENTARIOS. Con el espacio `complementarios`, M01 pone primero los productos de campañas vigentes (por
 *      prioridad) y luego el resto, como hoy con `producto.patrocinado` (RF-CAT-08-02). Ver Q5 sobre ese campo.
 *  R13 PERMISOS. Toda la administración exige sesión y permiso (ver mapa de rutas); un acceso denegado responde
 *      404 RECURSO_NO_DISPONIBLE y se audita, como en el resto de paneles. Las rutas públicas no exigen sesión.
 *  R14 NOMBRE. Único por marca, sin distinguir mayúsculas (409 NOMBRE_CAMPANIA_DUPLICADO).
 *  R15 SIN IDENTIDAD. Ninguna ruta pública guarda ni usa quién consulta (M20).
 *
 * ── Piezas en otros módulos (cada una es un PR aparte, con tu visto bueno) ──
 *  · BD / Prisma (archivos compartidos): las tres tablas y el enum. Va primero, como en M06.
 *  · M01: implementa `TarjetasPublicasPort` (las tarjetas de una lista de productos, con su oferta); en la ficha,
 *    los complementarios usan `PatrocinioPort` además del campo `patrocinado` (Q5).
 *  · M02: desempate de R9 con `PatrocinioPort`, campo `patrocinado` en cada resultado, y su spec/contrato: la
 *    versión 5.2 de las HU ya NO dice que HU-BUS-04 esté descartada (el repositorio aún dice «Bloqueada / Descartada»).
 *  · Inicio y catálogo: los dos bloques «Productos patrocinados» (frontend público; el inicio es de FP-01).
 *  · M17 (solo si se elige Q2): los permisos nuevos.
 *
 * ── Preguntas abiertas (para el Tech Lead / cliente) ────────────────────────
 *  Q1  La Tanda 4B (RF-PAT-01-xx, RF-PAT-02-xx, RF-BUS-04-xx) no está en el repositorio. ¿Existe? Hay que
 *      contrastar este contrato con ella antes de aprobarlo: sobre todo el número y la forma de los «espacios
 *      promocionales» (HU-PAT-02, 8 requisitos) y los campos de la campaña (HU-PAT-01, 9 requisitos).
 *  Q2  Permisos. Se asume `catalogo.ver` / `catalogo.editar` (como M06), sin tocar M17. La HU habla de un
 *      «responsable comercial»: si debe ser un rol con permisos propios, hay que añadir `patrocinios.ver` y
 *      `patrocinios.editar` (cambio de archivos compartidos: seed y contrato de M17).
 *  Q3  Espacios (R8): se asumen cuatro, deducidos del UI Spec (4.3.4 y 4.1), de HU-BUS-04 y de HU-CAT-08. ¿Hay más
 *      (banner, ficha, carrito) o sobra alguno?
 *  Q4  ¿La campaña lleva contenido propio (imagen, título, enlace)? Se asume que no: solo productos. Si lo lleva,
 *      se solapa con los banners de FP-01 y hay que decidir quién gobierna cada espacio.
 *  Q5  `producto.patrocinado` (M01) es hoy un interruptor manual. Con M14 debería derivarse de las campañas. Se
 *      propone que el campo siga existiendo y siga contando en complementarios (sin romper nada) hasta que M01 lo
 *      retire de su panel en un PR aparte. ¿Se retira?
 *  Q6  Entre campañas de la misma prioridad se asume orden aleatorio (R11). ¿O fijo, por fecha de inicio?
 *  Q7  Prioridad de 0 a 100 con 100 la mayor (R3). ¿Basta, o se prefiere una escala corta (alta / media / baja)?
 *  Q8  Los productos se eligen uno a uno (R5). ¿Hace falta «toda la marca» o «toda una línea» como atajo? Hoy es
 *      un atajo de pantalla, no un modo del contrato (máximo MAXIMO_PRODUCTOS_CAMPANIA).
 *  Q9  Auditoría (M20): crear, editar y cambiar el estado de una campaña se registran con las mismas acciones
 *      genéricas de los demás paneles; falta confirmar que el catálogo de acciones auditables de M17 las cubre.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const ZONA_HORARIA = 'America/Bogota';
export const MAXIMO_PRODUCTOS_CAMPANIA = 200;
export const PRIORIDAD_MINIMA = 0;
export const PRIORIDAD_MAXIMA = 100;
export const PRIORIDAD_POR_DEFECTO = 0;
export const LIMITE_BLOQUE_POR_DEFECTO = 8;
export const LIMITE_BLOQUE_MAXIMO = 24;
export const LIMITE_PRODUCTOS_BUSQUEDA = 20;

export const PERMISO_VER_CAMPANIAS = 'catalogo.ver';
export const PERMISO_EDITAR_CAMPANIAS = 'catalogo.editar';

export { idSchema };

export const nombreSchema = z.string().trim().min(3).max(100);
export const descripcionSchema = z.string().trim().min(1).max(500);
export const fechaHoraSchema = z.string().datetime();
/** Fecha de calendario en hora de Colombia: AAAA-MM-DD. */
export const fechaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
export const prioridadSchema = z.number().int().min(PRIORIDAD_MINIMA).max(PRIORIDAD_MAXIMA);

export const estadoSchema = z.enum(['activo', 'inactivo']);
export type Estado = z.infer<typeof estadoSchema>;

/** Espacios del sitio donde puede aparecer una campaña (R8). Conjunto cerrado. */
export const ESPACIOS_PROMOCIONALES = ['inicio', 'catalogo', 'busqueda', 'complementarios'] as const;
export const espacioPromocionalSchema = z.enum(ESPACIOS_PROMOCIONALES);
export type EspacioPromocional = z.infer<typeof espacioPromocionalSchema>;

/** Los dos espacios que son un bloque de tarjetas con ruta pública (R11). */
export const ESPACIOS_BLOQUE = ['inicio', 'catalogo'] as const;
export const espacioBloqueSchema = z.enum(ESPACIOS_BLOQUE);
export type EspacioBloque = z.infer<typeof espacioBloqueSchema>;

/**
 * Situación de una campaña (derivada, no se guarda; R1, R7). Si hay varias razones, manda la primera:
 * `inactiva` > `marca_inactiva` > `vencida` > `programada` > `vigente`.
 */
export const situacionCampaniaSchema = z.enum(['programada', 'vigente', 'vencida', 'inactiva', 'marca_inactiva']);
export type SituacionCampania = z.infer<typeof situacionCampaniaSchema>;

/** Booleano en query string ("true"/"false"): z.coerce.boolean() trataría "false" como true. */
const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

const sinRepetidos = (valores: readonly (number | string)[]): boolean => new Set(valores).size === valores.length;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES (administración)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Lo que se escribe al editar una campaña. La marca solo se elige al crear (R5). */
const campaniaCamposSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema.nullable(),
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  prioridad: prioridadSchema.default(PRIORIDAD_POR_DEFECTO),
  idsProducto: z.array(idSchema).min(1).max(MAXIMO_PRODUCTOS_CAMPANIA),
  espacios: z.array(espacioPromocionalSchema).min(1).max(ESPACIOS_PROMOCIONALES.length),
});

/** Reglas que cruzan campos; compartidas por crear y editar. */
function validarCampania(v: z.infer<typeof campaniaCamposSchema>, ctx: z.RefinementCtx): void {
  if (v.fechaFin < v.fechaInicio) {
    ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha fin no puede ser anterior al inicio' });
  }
  if (!sinRepetidos(v.idsProducto)) {
    ctx.addIssue({ code: 'custom', path: ['idsProducto'], message: 'Productos repetidos' });
  }
  if (!sinRepetidos(v.espacios)) {
    ctx.addIssue({ code: 'custom', path: ['espacios'], message: 'Espacios repetidos' });
  }
}

/** POST /admin/patrocinios/campanias */
export const crearCampaniaRequestSchema = campaniaCamposSchema
  .extend({ idMarca: idSchema })
  .superRefine(validarCampania);
export type CrearCampaniaRequest = z.infer<typeof crearCampaniaRequestSchema>;

/** PUT /admin/patrocinios/campanias/:idCampania — reemplaza todo menos la marca. */
export const actualizarCampaniaRequestSchema = campaniaCamposSchema.superRefine(validarCampania);
export type ActualizarCampaniaRequest = z.infer<typeof actualizarCampaniaRequestSchema>;

export const cambiarEstadoRequestSchema = z.object({ estado: estadoSchema });
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

export const campaniaIdParamsSchema = z.object({ idCampania: z.coerce.number().int().positive() });

/** GET /admin/patrocinios/campanias */
export const listarCampaniasRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  situacion: situacionCampaniaSchema.optional(),
  espacio: espacioPromocionalSchema.optional(),
});
export type ListarCampaniasRequest = z.infer<typeof listarCampaniasRequestSchema>;

/** GET /admin/patrocinios/productos — los productos de una marca, para elegir los de la campaña. */
export const buscarProductosMarcaRequestSchema = z.object({
  idMarca: z.coerce.number().int().positive(),
  busqueda: z.string().trim().max(100).optional(),
  /** Solo los que hoy se mostrarían (R6). */
  soloVisibles: booleanoQuerySchema.optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type BuscarProductosMarcaRequest = z.infer<typeof buscarProductosMarcaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES (públicas)
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /patrocinios/:espacio/productos */
export const bloqueParamsSchema = z.object({ espacio: espacioBloqueSchema });
export const bloqueQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(LIMITE_BLOQUE_MAXIMO).default(LIMITE_BLOQUE_POR_DEFECTO),
});
export type BloqueQuery = z.infer<typeof bloqueQuerySchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Un producto de una campaña, con lo necesario para el panel (R6). */
export const productoCampaniaSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  linea: z.string().nullable(),
  subcategoria: z.string(),
  /** false = no se mostraría hoy aunque la campaña esté vigente (R6). */
  visible: z.boolean(),
});
export type ProductoCampania = z.infer<typeof productoCampaniaSchema>;

export const marcaCampaniaSchema = z.object({
  idMarca: idSchema,
  nombre: z.string(),
  activa: z.boolean(),
});
export type MarcaCampania = z.infer<typeof marcaCampaniaSchema>;

/** Fila de la lista de campañas. */
export const campaniaResumenSchema = z.object({
  idCampania: idSchema,
  nombre: z.string(),
  marca: marcaCampaniaSchema,
  estado: estadoSchema,
  situacion: situacionCampaniaSchema,
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  prioridad: prioridadSchema,
  espacios: z.array(espacioPromocionalSchema),
  totalProductos: z.number().int().nonnegative(),
  /** Cuántos de esos productos se mostrarían hoy (R6). */
  productosVisibles: z.number().int().nonnegative(),
});
export type CampaniaResumen = z.infer<typeof campaniaResumenSchema>;

export const campaniaSchema = campaniaResumenSchema
  .omit({ totalProductos: true, productosVisibles: true })
  .extend({
    descripcion: z.string().nullable(),
    productos: z.array(productoCampaniaSchema),
    fechaCreacion: fechaHoraSchema,
    fechaActualizacion: fechaHoraSchema,
    /** Nombre de quien la editó por última vez; null si ese usuario ya no existe. */
    actualizadoPor: z.string().nullable(),
  });
export type Campania = z.infer<typeof campaniaSchema>;

/** Producto de una marca, en el selector del editor. */
export const productoDeMarcaSchema = productoCampaniaSchema.extend({
  /** Cuántas campañas vigentes ya lo incluyen (informativo: R4 lo permite). */
  enCampaniasVigentes: z.number().int().nonnegative(),
});
export type ProductoDeMarca = z.infer<typeof productoDeMarcaSchema>;

/** Tarjeta de M01 más la marca de patrocinio (R10: la pantalla muestra «Patrocinado»). */
export const productoPatrocinadoSchema = productoPublicoTarjetaSchema.extend({
  patrocinado: z.literal(true),
});
export type ProductoPatrocinado = z.infer<typeof productoPatrocinadoSchema>;

export const campaniaResponseEnvelopeSchema = respuestaUno(campaniaSchema);
export type CampaniaResponseEnvelope = z.infer<typeof campaniaResponseEnvelopeSchema>;
export const listarCampaniasResponseEnvelopeSchema = respuestaPaginada(campaniaResumenSchema);
export type ListarCampaniasResponseEnvelope = z.infer<typeof listarCampaniasResponseEnvelopeSchema>;
export const buscarProductosMarcaResponseEnvelopeSchema = respuestaPaginada(productoDeMarcaSchema);
export type BuscarProductosMarcaResponseEnvelope = z.infer<typeof buscarProductosMarcaResponseEnvelopeSchema>;
/** Sin paginar: son pocos (hasta LIMITE_BLOQUE_MAXIMO). */
export const bloqueResponseEnvelopeSchema = z.object({ success: z.literal(true), data: z.array(productoPatrocinadoSchema) });
export type BloqueResponseEnvelope = z.infer<typeof bloqueResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * 400 PARAMETRO_INVALIDO · 404 RECURSO_NO_DISPONIBLE (no existe, o falta el permiso: R13) ·
 * 409 NOMBRE_CAMPANIA_DUPLICADO (R14) · 409 PRODUCTO_DE_OTRA_MARCA (R5; `details` = ids) ·
 * 409 PRODUCTO_NO_EXISTE (`details` = ids) · 409 MARCA_NO_DISPONIBLE (la marca no existe o está inactiva al crear).
 */
export const CODIGOS_ERROR_PATROCINIOS = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'NOMBRE_CAMPANIA_DUPLICADO',
  'PRODUCTO_DE_OTRA_MARCA',
  'PRODUCTO_NO_EXISTE',
  'MARCA_NO_DISPONIBLE',
] as const;

export const errorPatrociniosEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_PATROCINIOS),
    message: z.string(),
    /** PRODUCTO_DE_OTRA_MARCA y PRODUCTO_NO_EXISTE → los ids; el resto → null. */
    details: z.array(idSchema).nullable(),
  }),
});
export type ErrorPatrociniosEnvelope = z.infer<typeof errorPatrociniosEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. PUERTOS (ADR-009)
 * ─────────────────────────────────────────────────────────────────────────── */

export interface PrioridadProducto {
  idProducto: number;
  /** La más alta entre las campañas vigentes que lo cubren en ese espacio (R4). */
  prioridad: number;
}

/**
 * Lo que M14 ofrece a otros módulos (servicio interno, sin HTTP). Implementado por M14; los consumidores (M02, M01)
 * definen su propia copia estructural de la interfaz y no importan M14.
 */
export interface PatrocinioPort {
  /**
   * Los productos de campañas vigentes en ese espacio, con su prioridad (R1, R4, R7). No filtra por visibilidad
   * del producto: cada consumidor la cruza con la suya (R6). `momento` (ISO) permite fijar «ahora» en pruebas.
   */
  prioridadesDeProductos(espacio: EspacioPromocional, momento?: string): Promise<PrioridadProducto[]>;
}

/**
 * Lo que M14 necesita de M01 (lo implementa M01; PR aparte). Devuelve las tarjetas públicas, con su oferta de
 * M06, de los productos VISIBLES (R6) de la lista, en el mismo orden; los que no se muestran se omiten.
 */
export interface TarjetasPublicasPort {
  tarjetasPublicas(idsProducto: readonly number[]): Promise<z.infer<typeof productoPublicoTarjetaSchema>[]>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 7. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  PÚBLICAS (montaje: /api/v1/patrocinios) — sin sesión
 *   GET  /:espacio/productos             → bloqueResponseEnvelope   (:espacio = inicio | catalogo; R11)
 *
 *  ADMINISTRACIÓN (montaje: /api/v1/admin/patrocinios) — sesión + permisos de M17
 *   GET   /campanias                     catalogo.ver     → listarCampanias (paginado)
 *   POST  /campanias                     catalogo.editar  → crearCampania
 *   GET   /campanias/:idCampania         catalogo.ver     → campaniaResponseEnvelope
 *   PUT   /campanias/:idCampania         catalogo.editar  → actualizarCampania (sin cambiar la marca)
 *   PATCH /campanias/:idCampania/estado  catalogo.editar  → cambiarEstado
 *   GET   /productos                     catalogo.ver     → buscarProductosMarca (paginado; para el editor)
 *
 *  Panel: /admin/patrocinios (lista con situación y filtros, y editor con marca, productos, vigencia, prioridad y
 *  espacios). Bloques públicos: «Productos patrocinados» en el inicio y en el catálogo.
 *
 *  INTERNO (sin HTTP): PatrocinioPort (de M14) · TarjetasPublicasPort (de M01).
 * ─────────────────────────────────────────────────────────────────────────── */
