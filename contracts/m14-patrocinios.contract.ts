import { z } from 'zod';
import {
  idSchema,
  LOGOTIPO_MAXIMO_BASE64,
  respuestaPaginada,
  respuestaUno,
  tipoMimeLogotipoSchema,
} from './m01-catalogo.contract';
import { productoPublicoTarjetaSchema } from './m01-catalogo-productos.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M14. Patrocinios y publicidad
 * ============================================================================
 * Scope: m14-patrocinios · Ola 7 (valor añadido) · Prefijo de historias: PAT · BORRADOR v2 para el Tech Lead.
 * Base de datos: tablas nuevas `campania_patrocinio`, `campania_objetivo` y `anuncio_publicitario`
 * (+ enums `enum_ubicacion_patrocinio`, `enum_tipo_objetivo_patrocinio`, `enum_espacio_publicitario`) y se RETIRA la
 * columna `producto.patrocinado` (A13). Todo en un PR de BD aparte, antes del módulo.
 * Depende de M01 (marcas, líneas y productos) y M17 (permisos nuevos `patrocinios.ver` / `patrocinios.editar`).
 * Lo consumen M02 (listado), M01 (complementarios) y las vistas del cliente (inicio, catálogo y ficha).
 *
 * FUENTE: «Pintu Clic — Documento de Historias de Usuario v5.2» (14 oct 2026), HU-PAT-01 a HU-PAT-04, y las
 * decisiones del Tech Lead de esta revisión (el cliente quiere patrocinar PRODUCTOS y poner PUBLICIDAD con imagen y
 * enlace). Las «tandas» de requisitos no se usan. Lo que no se pudo resolver está en «Preguntas abiertas».
 *
 * ── Qué es M14 ──────────────────────────────────────────────────────────────
 *  El modelo de ingresos complementario de Pintu Clic. Son DOS funciones con un mismo panel (`/admin/patrocinios`),
 *  los mismos permisos y una misma idea: una marca paga por visibilidad.
 *
 *  A. PATROCINIO DE PRODUCTOS (HU-PAT-01, 03). Una campaña con vigencia pone a unos productos por delante en el
 *     sitio, con la etiqueta «Patrocinado». Se patrocina por PRODUCTO, por LÍNEA o por MARCA (o una mezcla): un
 *     objetivo de tipo línea o marca cubre todos sus productos, también los que se creen después. Caduca sola.
 *     Aparece de primero en el listado del catálogo y de la búsqueda, en un bloque del inicio y en los
 *     complementarios de la ficha (UBICACIONES_PATROCINIO).
 *
 *  B. ESPACIOS PUBLICITARIOS (HU-PAT-02). Huecos fijos y cuidados en tres vistas del cliente (inicio, catálogo y
 *     ficha de producto) donde se muestra un slider de anuncios: una IMAGEN con un ENLACE «invisible» (la
 *     imagen entera es el enlace) que lleva al anunciante. Los sube el administrador o un empleado con el permiso
 *     `patrocinios.editar`, desde el panel, sin intervención del equipo de desarrollo. Pintu Clic solo ofrece el
 *     ESPACIO: los acuerdos y los cobros con los anunciantes se hacen fuera del sistema. Cada anuncio tiene vigencia, orden y su espacio.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · NO mide (HU-PAT-04 está BLOQUEADA en el documento de HU, cap. 7: espera la decisión de analítica propia o
 *    servicio externo, la misma de HU-RPT-06). Ni cuenta impresiones ni clics, y el enlace del anuncio va DIRECTO al
 *    anunciante, sin redirección por Pintu Clic. Por eso M14 ya no depende de M19.
 *  · NO guarda contratos, montos ni cobros: el modelo de cobro es comercial y está fuera del sistema.
 *  · NO tiene cuentas de anunciante: los anuncios los sube solo el administrador o un empleado con permiso.
 *  · NO pone publicidad en el carrito ni en el pago: distrae de la compra (decisión del Tech Lead).
 *  · NO sustituye al banner principal del inicio (M16 / FP-01, HU-CNT-03): ese es contenido propio de Pintu Clic;
 *    los anuncios son de terceros y llevan la etiqueta «Publicidad».
 *  · NO edita productos, marcas ni precios (solo lee el catálogo de M01), y no cambia el orden por precio o novedad
 *    de M02, ni sus filtros ni sus totales.
 *  · NO borra: campañas y anuncios se desactivan (estado `inactivo`); no hay DELETE.
 *
 * ── A. Reglas del patrocinio de productos ───────────────────────────────────
 *  A1  VIGENCIA. Una campaña está vigente cuando su estado es `activo` y hoy, en hora de Colombia (America/Bogota),
 *      está entre `fechaInicio` y `fechaFin`, ambas inclusive. `fechaFin` es OBLIGATORIA: toda campaña caduca.
 *      No hay horas ni días de la semana (a diferencia de los eventos de M06).
 *  A2  CADUCIDAD AUTOMÁTICA. La situación se calcula al consultar comparando fechas; no hay tarea programada. El día
 *      siguiente a `fechaFin` la campaña deja de mostrarse sola.
 *  A3  OBJETIVOS. Una campaña tiene entre 1 y MAXIMO_OBJETIVOS_CAMPANIA objetivos, sin repetidos: `producto`, `linea`
 *      o `marca` con su id. Se resuelven AL CONSULTAR, no al guardar: si luego se crea un producto de esa marca, entra
 *      solo. Un objetivo que ya no existe en M01 se ignora y el panel lo marca (`existe: false`).
 *  A4  PRIORIDAD. Entero de 0 a 100 (0 por defecto); el MAYOR va primero. Es el único criterio entre campañas.
 *  A5  UN PRODUCTO EN VARIAS CAMPAÑAS. Aparece una sola vez en cada ubicación, con la prioridad MÁS ALTA entre las
 *      campañas vigentes que lo cubren en esa ubicación.
 *  A6  SOLO LO VISIBLE. Un producto inactivo, no publicado o con marca, línea o subcategoría inactivas (la regla de
 *      visibilidad de M01) no se muestra aunque su campaña esté vigente. Así, desactivar una marca en M01 retira sus
 *      patrocinios sin tocarlos (y reactivarla los devuelve). El panel cuenta cuántos productos se mostrarían.
 *  A7  UBICACIONES. La campaña elige una o más:
 *        listado          primero en el catálogo y en los resultados de la búsqueda (A8)
 *        inicio           bloque «Productos patrocinados» de la página de inicio (A10)
 *        complementarios  primero en «Completa tu trabajo con» de la ficha (HU-CAT-08, RF-CAT-08-02)
 *  A8  LISTADO (M02, `ordenar=relevancia`, que es el orden por defecto).
 *        · Sin texto de búsqueda: los patrocinados van primero, por prioridad; el resto sigue su orden normal.
 *        · Con texto: se ordena por relevancia y SOLO entre productos con la misma relevancia van primero los
 *          patrocinados (HU-BUS-04). Nunca entra un producto con relevancia 0 (CA-BUS-03-04).
 *        · Con `precio_asc`, `precio_desc` o `novedad` el patrocinio no actúa.
 *        · CUPO: como mucho CUPO_PATROCINADOS_LISTADO productos patrocinados pasan por delante; si hay más, el resto se
 *          ordena como uno normal. Así una campaña grande no llena la primera página.
 *        · No cambia el total, los filtros ni sus conteos; un producto aparece una sola vez.
 *  A9  TRANSPARENCIA. Todo producto que se muestra por patrocinio lleva la etiqueta visible «Patrocinado» (UI Spec
 *      4.3.4: `bg-highlight`, texto negro): en el listado cuando el patrocinio lo adelantó, en el bloque del inicio y
 *      en los complementarios. M02 lo informa en el campo `patrocinado` de cada resultado.
 *  A10 BLOQUE DEL INICIO. `GET /patrocinios/productos` devuelve las tarjetas de M01 de los productos visibles de las
 *      campañas vigentes con la ubicación `inicio`, por prioridad descendente y, entre la misma prioridad, en orden
 *      aleatorio en cada consulta (reparto equitativo entre marcas). Sin campañas vigentes responde una lista vacía
 *      y la pantalla oculta el bloque.
 *  A11 NOMBRE. Único entre campañas, sin distinguir mayúsculas (409 NOMBRE_CAMPANIA_DUPLICADO).
 *  A12 VISTA PREVIA. Antes de guardar, el panel puede preguntar cuántos y cuáles productos cubrirían unos objetivos
 *      (`POST /campanias/vista-previa`), como el panel de eventos de M06. No escribe nada.
 *  A13 SE RETIRA EL INTERRUPTOR `producto.patrocinado` de M01 (formulario de producto y de combo, DTO y columna).
 *      Nunca funcionó como patrocinio real: no tenía vigencia ni prioridad ni lugar. Orden de entrega para no romper
 *      los complementarios: primero M14 (backend), luego M01 pasa a leer `PatrocinioPort` y deja de usar el campo, y
 *      por último la columna se elimina en la BD. Ver «Piezas en otros módulos».
 *
 * ── B. Reglas de los espacios publicitarios ─────────────────────────────────
 *  B1  ESPACIOS. Conjunto cerrado (ESPACIOS_PUBLICITARIOS) con su tamaño (DEFINICION_ESPACIOS):
 *        inicio    franja bajo el banner principal del inicio
 *        catalogo  franja sobre el listado del catálogo y de la búsqueda
 *        ficha     franja bajo los datos del producto, antes de los complementarios
 *      Agregar un espacio es un cambio de este contrato y de la pantalla que lo pinta, no un dato.
 *  B2  UN ANUNCIO, UN ESPACIO. Un anuncio vive en un solo espacio y tiene la forma de ese espacio. Para el mismo
 *      anunciante en dos espacios se crean dos anuncios (cada imagen se prepara para su tamaño).
 *  B3  VIGENCIA. Igual que A1: activo y entre `fechaInicio` y `fechaFin` (inclusive, hora de Colombia, obligatoria).
 *  B4  SLIDER. El espacio muestra los anuncios vigentes ordenados por `orden` (ascendente) y luego por id, hasta
 *      MAXIMO_ANUNCIOS_VISIBLES. Con uno, es una imagen fija; con varios, rota cada SEGUNDOS_ROTACION_ANUNCIO segundos,
 *      se detiene al pasar el cursor o al enfocarlo, ofrece puntos para elegir y NO se anima si la persona pidió
 *      menos movimiento (`prefers-reduced-motion`). Sin anuncios vigentes el espacio NO se pinta: no deja un hueco
 *      vacío ni desplaza el resto de la página.
 *  B5  ESTÉTICA. El espacio reserva su proporción (DEFINICION_ESPACIOS) antes de cargar la imagen, para que la
 *      página no salte (CLS); se adapta al ancho de pantalla sin scroll horizontal; lleva la etiqueta «Publicidad»
 *      en una esquina, con texto legible sobre cualquier imagen; y respeta el contenedor y el radio del resto del
 *      sitio. En móvil usa la imagen móvil si el anuncio la trae y, si no, la de escritorio ajustada.
 *  B6  ENLACE «INVISIBLE». Toda la imagen es el enlace. Si `enlace` es `https://…` abre en una pestaña nueva con
 *      `rel="sponsored noopener noreferrer"`; si es una ruta interna (`/productos/5`) abre en la misma. Sin enlace, la
 *      imagen no es clicable. Solo se admiten `https://` y rutas que empiezan por `/` (nunca `javascript:`, `data:`
 *      ni `http://`). Es alcanzable con teclado y su nombre accesible es el `textoAlternativo`.
 *  B7  IMÁGENES. Las sube el panel en base64 dentro del JSON, como M01 (D2): JPEG, PNG o WEBP de hasta 5 MB
 *      (IMAGEN_MAXIMO_BYTES), nunca SVG (puede ejecutar código). Se guardan en la base de datos y las sirve Pintu
 *      Clic: la página nunca pide una imagen a un tercero (no hay rastreadores ni filtración de la IP del cliente, M20).
 *  B8  PROPORCIÓN. La imagen de escritorio debe tener la proporción del espacio con un margen de
 *      TOLERANCIA_PROPORCION (10 %), y la móvil, la de PROPORCION_MOVIL (4:3). Si no, 400 IMAGEN_PROPORCION_INVALIDA
 *      con el tamaño recomendado: así nadie sube una imagen que se vea deformada o recortada.
 *  B9  ACCESIBILIDAD. `textoAlternativo` es OBLIGATORIO (3 a 150 caracteres).
 *
 * ── Reglas comunes ──────────────────────────────────────────────────────────
 *  C1  PERMISOS PROPIOS. Toda la administración exige sesión y uno de dos permisos nuevos de M17: `patrocinios.ver`
 *      (consultar) y `patrocinios.editar` (crear, editar, cambiar estado y subir imágenes). Quien tiene `editar`
 *      recibe `ver` automáticamente (RN-ADM-07). Un acceso denegado responde 404 RECURSO_NO_DISPONIBLE y se audita.
 *      `catalogo.*` NO sirve aquí. Las rutas públicas no exigen sesión.
 *  C2  SIN IDENTIDAD. Ninguna ruta pública guarda ni usa quién consulta (M20).
 *  C3  Zona horaria America/Bogota para todas las fechas.
 *
 * ── Piezas en otros módulos (cada una es un PR aparte, con tu visto bueno) ──
 *  · M17 (compartido, primero): permisos 27 y 28 en `seed_pintuclic.sql` (asignados al administrador), en
 *    `CODIGOS_PERMISO` de su contrato y espejos, y `patrocinios.editar` → `patrocinios.ver` en `permisos.service.ts`.
 *  · BD / Prisma (compartido, primero): tablas y enums nuevos; la columna `producto.patrocinado` se elimina al FINAL.
 *  · M01: implementa `TarjetasPublicasPort`; los complementarios y el panel de combos y productos dejan de usar
 *    `patrocinado` (A13).
 *  · M02: `PatrocinioPort` en el listado (A8), campo `patrocinado` en cada resultado, y su spec y contrato: la v5.2
 *    de las HU ya NO dice que HU-BUS-04 esté descartada (el repositorio aún dice «Bloqueada / Descartada»).
 *  · Vistas del cliente: el componente `EspacioPublicitario` y el bloque de productos patrocinados los entrega M14.
 *    Montarlos en el inicio (FP-01), el catálogo (M02) y la ficha (M01) es una línea en cada vista.
 *  · Entrega en dos fases, como M01: E1 = patrocinio de productos (A) con el retiro del interruptor; E2 = espacios
 *    publicitarios (B). Se pueden aprobar juntos y construir por separado.
 *
 * ── Preguntas abiertas (para el Tech Lead / cliente) ────────────────────────
 *  Q1  RESUELTA: los anuncios los sube el administrador o un empleado con `patrocinios.editar`; los negocios con
 *      los anunciantes se hacen fuera del sistema.
 *  Q2  Medir (clics, impresiones) está bloqueado (HU-PAT-04). Con el enlace directo no se puede contar. Si el
 *      cliente exige reporte a los anunciantes, la salida es una redirección propia (`/patrocinios/anuncios/:id/ir`)
 *      que cuente y reenvíe; el contrato la admitiría sin cambiar lo demás. ¿La dejamos prevista?
 *  Q3  Tamaños de los espacios (DEFINICION_ESPACIOS): son propuesta. ¿Hay un tamaño que Pintuco ya tenga para sus
 *      anuncios?
 *  Q4  RESUELTA: no hay espacio en el carrito ni en el pago.
 *  Q5  Cupo (A8): 8 productos patrocinados por delante en el listado. ¿Basta? Si debe poder cambiarse sin código, es
 *      un parámetro de M17 (cambio compartido).
 *  Q6  Entre campañas de la misma prioridad el orden es aleatorio (A10). ¿O fijo, por fecha de inicio?
 *  Q7  Patrocinio por MARCA: si una marca tiene 300 productos, el cupo (A8) limita cuántos van delante, pero ¿cuáles?
 *      Se asume los de mejor relevancia/nombre dentro de la campaña. ¿Basta, o se elige una muestra al azar para
 *      repartir la visibilidad?
 *  Q8  Auditoría (M20): crear, editar y cambiar el estado se registran con las acciones genéricas; falta confirmar que
 *      el catálogo de acciones auditables de M17 las cubre.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const ZONA_HORARIA = 'America/Bogota';
export const MAXIMO_OBJETIVOS_CAMPANIA = 50;
export const PRIORIDAD_MINIMA = 0;
export const PRIORIDAD_MAXIMA = 100;
export const PRIORIDAD_POR_DEFECTO = 0;
export const CUPO_PATROCINADOS_LISTADO = 8;
export const LIMITE_BLOQUE_POR_DEFECTO = 8;
export const LIMITE_BLOQUE_MAXIMO = 24;

export const MAXIMO_ANUNCIOS_VISIBLES = 10;
export const SEGUNDOS_ROTACION_ANUNCIO = 6;
export const IMAGEN_MAXIMO_BYTES = 5 * 1024 * 1024;
export const IMAGEN_MAXIMO_BASE64 = LOGOTIPO_MAXIMO_BASE64;
export const TOLERANCIA_PROPORCION = 0.1;
export const PROPORCION_MOVIL = { ancho: 4, alto: 3 } as const;

export const PERMISO_VER_PATROCINIOS = 'patrocinios.ver';
export const PERMISO_EDITAR_PATROCINIOS = 'patrocinios.editar';

export { idSchema };

export const nombreSchema = z.string().trim().min(3).max(100);
export const descripcionSchema = z.string().trim().min(1).max(500);
export const fechaHoraSchema = z.string().datetime();
/** Fecha de calendario en hora de Colombia: AAAA-MM-DD. */
export const fechaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
export const prioridadSchema = z.number().int().min(PRIORIDAD_MINIMA).max(PRIORIDAD_MAXIMA);

export const estadoSchema = z.enum(['activo', 'inactivo']);
export type Estado = z.infer<typeof estadoSchema>;

/** Situación de una campaña o de un anuncio (derivada, no se guarda; A1, B3). Manda la primera que aplique. */
export const situacionSchema = z.enum(['programado', 'vigente', 'vencido', 'inactivo']);
export type Situacion = z.infer<typeof situacionSchema>;

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

const sinRepetidos = (valores: readonly (number | string)[]): boolean => new Set(valores).size === valores.length;

/** Rango de fechas ordenado; lo comparten campañas y anuncios. */
function validarFechas(v: { fechaInicio: string; fechaFin: string }, ctx: z.RefinementCtx): void {
  if (v.fechaFin < v.fechaInicio) {
    ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha fin no puede ser anterior al inicio' });
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PATROCINIO DE PRODUCTOS — PRIMITIVAS Y PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** Dónde se ve el patrocinio de productos (A7). Conjunto cerrado. */
export const UBICACIONES_PATROCINIO = ['listado', 'inicio', 'complementarios'] as const;
export const ubicacionPatrocinioSchema = z.enum(UBICACIONES_PATROCINIO);
export type UbicacionPatrocinio = z.infer<typeof ubicacionPatrocinioSchema>;

/** Qué se patrocina (A3). */
export const TIPOS_OBJETIVO_PATROCINIO = ['producto', 'linea', 'marca'] as const;
export const tipoObjetivoPatrocinioSchema = z.enum(TIPOS_OBJETIVO_PATROCINIO);
export type TipoObjetivoPatrocinio = z.infer<typeof tipoObjetivoPatrocinioSchema>;

export const objetivoPatrocinioSchema = z.object({ tipo: tipoObjetivoPatrocinioSchema, id: idSchema });
export type ObjetivoPatrocinio = z.infer<typeof objetivoPatrocinioSchema>;

const objetivosSchema = z.array(objetivoPatrocinioSchema).min(1).max(MAXIMO_OBJETIVOS_CAMPANIA);
const objetivosSinRepetir = (objetivos: readonly ObjetivoPatrocinio[]): boolean =>
  sinRepetidos(objetivos.map((o) => `${o.tipo}:${o.id}`));

/** Lo que se escribe al crear o editar una campaña. */
export const campaniaRequestSchema = z
  .object({
    nombre: nombreSchema,
    descripcion: descripcionSchema.nullable(),
    objetivos: objetivosSchema,
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema,
    prioridad: prioridadSchema.default(PRIORIDAD_POR_DEFECTO),
    ubicaciones: z.array(ubicacionPatrocinioSchema).min(1).max(UBICACIONES_PATROCINIO.length),
  })
  .superRefine((v, ctx) => {
    validarFechas(v, ctx);
    if (!objetivosSinRepetir(v.objetivos)) {
      ctx.addIssue({ code: 'custom', path: ['objetivos'], message: 'Objetivos repetidos' });
    }
    if (!sinRepetidos(v.ubicaciones)) {
      ctx.addIssue({ code: 'custom', path: ['ubicaciones'], message: 'Ubicaciones repetidas' });
    }
  });
export type CampaniaRequest = z.infer<typeof campaniaRequestSchema>;
/** POST /admin/patrocinios/campanias y PUT /admin/patrocinios/campanias/:idCampania (reemplaza todo). */
export const crearCampaniaRequestSchema = campaniaRequestSchema;
export const actualizarCampaniaRequestSchema = campaniaRequestSchema;
export type CrearCampaniaRequest = CampaniaRequest;
export type ActualizarCampaniaRequest = CampaniaRequest;

export const cambiarEstadoRequestSchema = z.object({ estado: estadoSchema });
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

export const campaniaIdParamsSchema = z.object({ idCampania: z.coerce.number().int().positive() });
export const anuncioIdParamsSchema = z.object({ idAnuncio: z.coerce.number().int().positive() });

/** GET /admin/patrocinios/campanias */
export const listarCampaniasRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  situacion: situacionSchema.optional(),
  ubicacion: ubicacionPatrocinioSchema.optional(),
});
export type ListarCampaniasRequest = z.infer<typeof listarCampaniasRequestSchema>;

/** POST /admin/patrocinios/campanias/vista-previa — qué productos cubrirían estos objetivos (A12). */
export const vistaPreviaCampaniaRequestSchema = z.object({ objetivos: objetivosSchema });
export type VistaPreviaCampaniaRequest = z.infer<typeof vistaPreviaCampaniaRequestSchema>;
export const vistaPreviaQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});

/** GET /admin/patrocinios/referencias — para elegir productos, líneas y marcas (lista sin paginar, como M06). */
export const buscarReferenciasRequestSchema = z.object({
  tipo: tipoObjetivoPatrocinioSchema,
  busqueda: z.string().trim().max(100).default(''),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type BuscarReferenciasRequest = z.infer<typeof buscarReferenciasRequestSchema>;

/** GET /patrocinios/productos — el bloque del inicio (A10). */
export const bloqueQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(LIMITE_BLOQUE_MAXIMO).default(LIMITE_BLOQUE_POR_DEFECTO),
});
export type BloqueQuery = z.infer<typeof bloqueQuerySchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PATROCINIO DE PRODUCTOS — RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Un objetivo con su nombre para el panel; `existe: false` si ya no está en el catálogo (A3). */
export const referenciaPatrocinioSchema = z.object({
  tipo: tipoObjetivoPatrocinioSchema,
  id: idSchema,
  nombre: z.string(),
  existe: z.boolean(),
});
export type ReferenciaPatrocinio = z.infer<typeof referenciaPatrocinioSchema>;

/** Un producto cubierto por una campaña, con lo necesario para el panel (A6). */
export const productoCubiertoSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  marca: z.string(),
  linea: z.string().nullable(),
  subcategoria: z.string(),
  /** false = no se mostraría hoy aunque la campaña esté vigente (A6). */
  visible: z.boolean(),
});
export type ProductoCubierto = z.infer<typeof productoCubiertoSchema>;

/** Fila de la lista de campañas. */
export const campaniaResumenSchema = z.object({
  idCampania: idSchema,
  nombre: z.string(),
  estado: estadoSchema,
  situacion: situacionSchema,
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  prioridad: prioridadSchema,
  ubicaciones: z.array(ubicacionPatrocinioSchema),
  /** Cuántos productos cubre hoy y cuántos de ellos se mostrarían (A3, A6). */
  totalProductos: z.number().int().nonnegative(),
  productosVisibles: z.number().int().nonnegative(),
});
export type CampaniaResumen = z.infer<typeof campaniaResumenSchema>;

export const campaniaSchema = campaniaResumenSchema
  .omit({ totalProductos: true, productosVisibles: true })
  .extend({
    descripcion: z.string().nullable(),
    objetivos: z.array(referenciaPatrocinioSchema),
    fechaCreacion: fechaHoraSchema,
    fechaActualizacion: fechaHoraSchema,
    /** Nombre de quien la editó por última vez; null si ese usuario ya no existe. */
    actualizadoPor: z.string().nullable(),
  });
export type Campania = z.infer<typeof campaniaSchema>;

/** Tarjeta de M01 más la marca de patrocinio (A9: la pantalla muestra «Patrocinado»). */
export const productoPatrocinadoSchema = productoPublicoTarjetaSchema.extend({ patrocinado: z.literal(true) });
export type ProductoPatrocinado = z.infer<typeof productoPatrocinadoSchema>;

export const campaniaResponseEnvelopeSchema = respuestaUno(campaniaSchema);
export type CampaniaResponseEnvelope = z.infer<typeof campaniaResponseEnvelopeSchema>;
export const listarCampaniasResponseEnvelopeSchema = respuestaPaginada(campaniaResumenSchema);
export type ListarCampaniasResponseEnvelope = z.infer<typeof listarCampaniasResponseEnvelopeSchema>;
export const productosCubiertosResponseEnvelopeSchema = respuestaPaginada(productoCubiertoSchema);
export type ProductosCubiertosResponseEnvelope = z.infer<typeof productosCubiertosResponseEnvelopeSchema>;
export const referenciasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(referenciaPatrocinioSchema.omit({ existe: true })),
});
export type ReferenciasResponseEnvelope = z.infer<typeof referenciasResponseEnvelopeSchema>;
/** Sin paginar: son pocos (hasta LIMITE_BLOQUE_MAXIMO). */
export const bloqueResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(productoPatrocinadoSchema),
});
export type BloqueResponseEnvelope = z.infer<typeof bloqueResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ESPACIOS PUBLICITARIOS — PRIMITIVAS Y PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** Los espacios del sitio donde se muestran anuncios (B1). Conjunto cerrado. */
export const ESPACIOS_PUBLICITARIOS = ['inicio', 'catalogo', 'ficha'] as const;
export const espacioPublicitarioSchema = z.enum(ESPACIOS_PUBLICITARIOS);
export type EspacioPublicitario = z.infer<typeof espacioPublicitarioSchema>;

/**
 * Tamaño recomendado de la imagen de escritorio de cada espacio, en píxeles (B1, B8). Lo que cuenta es la
 * PROPORCIÓN (ancho / alto) con TOLERANCIA_PROPORCION; el tamaño sugerido es el que da buena nitidez en pantallas
 * de alta densidad. Propuesta, ver Q3.
 */
export const DEFINICION_ESPACIOS: Readonly<
  Record<EspacioPublicitario, { etiqueta: string; ancho: number; alto: number }>
> = {
  inicio: { etiqueta: 'Inicio · bajo el banner principal', ancho: 1232, alto: 280 },
  catalogo: { etiqueta: 'Catálogo · sobre el listado', ancho: 1232, alto: 200 },
  ficha: { etiqueta: 'Ficha de producto · bajo los datos', ancho: 1232, alto: 200 },
};

export const tipoMimeImagenSchema = tipoMimeLogotipoSchema;
export const imagenSubidaSchema = z.object({
  imagenBase64: z.string().min(1, 'Elija una imagen').max(IMAGEN_MAXIMO_BASE64, 'La imagen no puede superar 5 MB'),
  imagenMimeType: tipoMimeImagenSchema,
});
export type ImagenSubida = z.infer<typeof imagenSubidaSchema>;

/** Enlace de un anuncio (B6): `https://…` o una ruta interna que empieza por una sola `/`. */
export const enlaceAnuncioSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s]*$/.test(v), {
    message: 'El enlace debe empezar por https:// o por una ruta interna (/…)',
  });

/** Campos de un anuncio que no son imagen. */
const anuncioCamposSchema = z.object({
  /** Nombre interno, para reconocerlo en el panel. */
  nombre: nombreSchema,
  /** Quién paga el anuncio (texto libre; no es una marca del catálogo). */
  anunciante: z.string().trim().min(2).max(100),
  espacio: espacioPublicitarioSchema,
  textoAlternativo: z.string().trim().min(3).max(150),
  enlace: enlaceAnuncioSchema.nullable(),
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  /** Posición en el slider: el menor va primero (B4). */
  orden: z.number().int().min(0).max(999).default(0),
});

/** POST /admin/patrocinios/anuncios — la imagen de escritorio es obligatoria; la móvil, opcional. */
export const crearAnuncioRequestSchema = anuncioCamposSchema
  .extend({
    imagen: imagenSubidaSchema,
    imagenMovil: imagenSubidaSchema.nullable().default(null),
  })
  .superRefine(validarFechas);
export type CrearAnuncioRequest = z.infer<typeof crearAnuncioRequestSchema>;

/**
 * PUT /admin/patrocinios/anuncios/:idAnuncio — reemplaza los campos. Una imagen que no viene se conserva;
 * `quitarImagenMovil` borra la móvil. El espacio no se puede cambiar (B2): hay que crear otro anuncio.
 */
export const actualizarAnuncioRequestSchema = anuncioCamposSchema
  .omit({ espacio: true })
  .extend({
    imagen: imagenSubidaSchema.optional(),
    imagenMovil: imagenSubidaSchema.optional(),
    quitarImagenMovil: z.boolean().default(false),
  })
  .superRefine(validarFechas)
  .refine((v) => !(v.quitarImagenMovil && v.imagenMovil !== undefined), {
    message: 'No se puede quitar y subir la imagen móvil a la vez',
    path: ['quitarImagenMovil'],
  });
export type ActualizarAnuncioRequest = z.infer<typeof actualizarAnuncioRequestSchema>;

/** GET /admin/patrocinios/anuncios */
export const listarAnunciosRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  espacio: espacioPublicitarioSchema.optional(),
  situacion: situacionSchema.optional(),
});
export type ListarAnunciosRequest = z.infer<typeof listarAnunciosRequestSchema>;

/** GET /patrocinios/anuncios/:espacio */
export const anunciosEspacioParamsSchema = z.object({ espacio: espacioPublicitarioSchema });
/** GET …/imagenes/:idAnuncio?variante= */
export const VARIANTES_IMAGEN = ['escritorio', 'movil'] as const;
export const imagenAnuncioQuerySchema = z.object({
  variante: z.enum(VARIANTES_IMAGEN).default('escritorio'),
});
export type ImagenAnuncioQuery = z.infer<typeof imagenAnuncioQuerySchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ESPACIOS PUBLICITARIOS — RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Fila de la lista y detalle del anuncio, para el panel. */
export const anuncioSchema = z.object({
  idAnuncio: idSchema,
  nombre: z.string(),
  anunciante: z.string(),
  espacio: espacioPublicitarioSchema,
  textoAlternativo: z.string(),
  enlace: z.string().nullable(),
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  orden: z.number().int(),
  estado: estadoSchema,
  situacion: situacionSchema,
  tieneImagenMovil: z.boolean(),
  /** Vista previa para el panel (sirve aunque el anuncio no esté vigente). */
  urlImagen: z.string(),
  urlImagenMovil: z.string().nullable(),
  fechaCreacion: fechaHoraSchema,
  fechaActualizacion: fechaHoraSchema,
  actualizadoPor: z.string().nullable(),
});
export type Anuncio = z.infer<typeof anuncioSchema>;

/** Lo que recibe la vista pública: solo lo necesario para pintar el slider (B4–B6). */
export const anuncioPublicoSchema = z.object({
  idAnuncio: idSchema,
  textoAlternativo: z.string(),
  enlace: z.string().nullable(),
  urlImagen: z.string(),
  urlImagenMovil: z.string().nullable(),
});
export type AnuncioPublico = z.infer<typeof anuncioPublicoSchema>;

export const anuncioResponseEnvelopeSchema = respuestaUno(anuncioSchema);
export type AnuncioResponseEnvelope = z.infer<typeof anuncioResponseEnvelopeSchema>;
export const listarAnunciosResponseEnvelopeSchema = respuestaPaginada(anuncioSchema);
export type ListarAnunciosResponseEnvelope = z.infer<typeof listarAnunciosResponseEnvelopeSchema>;
/** Sin paginar: hasta MAXIMO_ANUNCIOS_VISIBLES. Lista vacía = la pantalla no pinta el espacio (B4). */
export const anunciosEspacioResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(anuncioPublicoSchema),
});
export type AnunciosEspacioResponseEnvelope = z.infer<typeof anunciosEspacioResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * 400 PARAMETRO_INVALIDO · 400 IMAGEN_INVALIDA (no es una imagen válida o no es del tipo declarado) ·
 * 400 IMAGEN_PROPORCION_INVALIDA (B8; el mensaje trae el tamaño recomendado) ·
 * 404 RECURSO_NO_DISPONIBLE (no existe, no está vigente en una ruta pública, o falta el permiso: C1) ·
 * 409 NOMBRE_CAMPANIA_DUPLICADO (A11) · 409 OBJETIVO_NO_EXISTE (`details` = los objetivos que no existen).
 */
export const CODIGOS_ERROR_PATROCINIOS = [
  'PARAMETRO_INVALIDO',
  'IMAGEN_INVALIDA',
  'IMAGEN_PROPORCION_INVALIDA',
  'RECURSO_NO_DISPONIBLE',
  'NOMBRE_CAMPANIA_DUPLICADO',
  'OBJETIVO_NO_EXISTE',
] as const;

export const errorPatrociniosEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_PATROCINIOS),
    message: z.string(),
    /** OBJETIVO_NO_EXISTE → los objetivos; el resto → null. */
    details: z.array(objetivoPatrocinioSchema).nullable(),
  }),
});
export type ErrorPatrociniosEnvelope = z.infer<typeof errorPatrociniosEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. PUERTOS (ADR-009)
 * ─────────────────────────────────────────────────────────────────────────── */

export interface PrioridadProducto {
  idProducto: number;
  /** La más alta entre las campañas vigentes que lo cubren en esa ubicación (A5). */
  prioridad: number;
}

/**
 * Lo que M14 ofrece a otros módulos (servicio interno, sin HTTP). Implementado por M14; los consumidores (M02, M01)
 * definen su propia copia estructural de la interfaz y no importan M14.
 */
export interface PatrocinioPort {
  /**
   * Los productos cubiertos por campañas vigentes en esa ubicación, con su prioridad (A1, A3, A5). No filtra por
   * visibilidad del producto: cada consumidor la cruza con la suya (A6). `momento` (ISO) fija «ahora» en pruebas.
   */
  prioridadesDeProductos(ubicacion: UbicacionPatrocinio, momento?: string): Promise<PrioridadProducto[]>;
}

/**
 * Lo que M14 necesita de M01 (lo implementa M01; PR aparte). Devuelve las tarjetas públicas, con su oferta de M06,
 * de los productos VISIBLES (A6) de la lista, en el mismo orden; los que no se muestran se omiten.
 */
export interface TarjetasPublicasPort {
  tarjetasPublicas(idsProducto: readonly number[]): Promise<z.infer<typeof productoPublicoTarjetaSchema>[]>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 8. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  PÚBLICAS (montaje: /api/v1/patrocinios) — sin sesión
 *   GET  /productos                          → bloqueResponseEnvelope        (bloque del inicio, A10)
 *   GET  /anuncios/:espacio                  → anunciosEspacioResponseEnvelope (slider de un espacio, B4)
 *   GET  /anuncios/imagenes/:idAnuncio       imagen binaria (?variante=escritorio|movil); solo anuncios vigentes
 *
 *  ADMINISTRACIÓN (montaje: /api/v1/admin/patrocinios) — sesión + permisos de M17
 *   GET   /campanias                         patrocinios.ver    → listarCampanias (paginado)
 *   POST  /campanias                         patrocinios.editar → crearCampania
 *   POST  /campanias/vista-previa            patrocinios.ver    → productos que cubrirían (paginado; no escribe, A12)
 *   GET   /campanias/:idCampania             patrocinios.ver    → campaniaResponseEnvelope
 *   PUT   /campanias/:idCampania             patrocinios.editar → actualizarCampania
 *   PATCH /campanias/:idCampania/estado      patrocinios.editar → cambiarEstado
 *   GET   /campanias/:idCampania/productos   patrocinios.ver    → productos que cubre hoy (paginado)
 *   GET   /referencias                       patrocinios.ver    → productos, líneas o marcas para elegir (sin paginar)
 *   GET   /anuncios                          patrocinios.ver    → listarAnuncios (paginado)
 *   POST  /anuncios                          patrocinios.editar → crearAnuncio (con las imágenes)
 *   GET   /anuncios/:idAnuncio               patrocinios.ver    → anuncioResponseEnvelope
 *   PUT   /anuncios/:idAnuncio               patrocinios.editar → actualizarAnuncio
 *   PATCH /anuncios/:idAnuncio/estado        patrocinios.editar → cambiarEstado
 *   GET   /anuncios/:idAnuncio/imagen        patrocinios.ver    → imagen binaria para la vista previa (?variante=)
 *
 *  Panel: /admin/patrocinios, con dos pestañas: «Campañas de productos» y «Anuncios».
 *  Vistas del cliente: bloque «Productos patrocinados» (inicio), etiqueta «Patrocinado» (listado y ficha) y
 *  componente `EspacioPublicitario` (inicio, catálogo y ficha).
 *
 *  INTERNO (sin HTTP): PatrocinioPort (de M14) · TarjetasPublicasPort (de M01).
 * ─────────────────────────────────────────────────────────────────────────── */
