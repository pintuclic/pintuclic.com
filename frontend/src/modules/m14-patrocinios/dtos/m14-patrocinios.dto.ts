import { z } from 'zod';
import {
  idSchema,
  LOGOTIPO_MAXIMO_BASE64,
  respuestaPaginada,
  respuestaUno,
  tipoMimeLogotipoSchema,
} from '@/modules/m01-catalogo/dtos/m01-catalogo.dto';
import { productoPublicoTarjetaSchema } from '@/modules/m01-catalogo/dtos/m01-catalogo-productos.dto';

/**
 * Espejo fiel de `contracts/m14-patrocinios.contract.ts` para ejecución en el frontend (formularios y tipos de la API).
 * NO editar aquí: se cambia el contrato y se copia. `tests/contrato-espejo.test.ts` falla si difieren.
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
/** Tamaño recomendado de la imagen móvil (4:3), en píxeles (B10, B13). */
export const TAMANO_MOVIL_RECOMENDADO = { ancho: 800, alto: 600 } as const;
export const PUNTO_QUIEBRE_MOVIL = 640;
export const ANCHO_MINIMO_ESCRITORIO = 1232;
export const ANCHO_MINIMO_MOVIL = 640;
export const ANCHO_MAXIMO_IMAGEN = 4000;
/** Anchos de las versiones reducidas que el servidor guarda (B11). */
export const ANCHO_PEQUENO = 640;
export const ANCHO_MEDIANO = 1232;

export const MAXIMO_EVENTOS_POR_AVISO = 20;
export const MAXIMO_EVENTOS_POR_MINUTO = 60;
export const DIAS_INFORME_POR_DEFECTO = 30;
export const DIAS_INFORME_MAXIMO = 366;

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
export const productoPatrocinadoSchema = productoPublicoTarjetaSchema.extend({
  patrocinado: z.literal(true),
  /** La campaña que lo puso aquí (la de mayor prioridad, A5): la pantalla la usa para medir (M3, M4). */
  idCampania: idSchema,
});
export type ProductoPatrocinado = z.infer<typeof productoPatrocinadoSchema>;
/** La tarjeta pública de M01, sin la marca de patrocinio. */
export type ProductoPublicoTarjetaPatrocinio = z.infer<typeof productoPublicoTarjetaSchema>;

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
export const TAMANOS_IMAGEN = ['pequeno', 'mediano', 'original'] as const;
export const imagenAnuncioQuerySchema = z.object({
  variante: z.enum(VARIANTES_IMAGEN).default('escritorio'),
  /** `pequeno` = 640 px, `mediano` = 1232 px de ancho (B11). */
  tamano: z.enum(TAMANOS_IMAGEN).default('mediano'),
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
  /** La redirección que cuenta el clic (M2); null si el anuncio no tiene enlace. La dirección real no se publica. */
  urlClic: z.string().nullable(),
  /** true si el enlace es externo (B6): abre en pestaña nueva. */
  abrirEnNuevaPestana: z.boolean(),
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
 * 5B. MEDICIÓN
 * ─────────────────────────────────────────────────────────────────────────── */

export const ENTIDADES_MEDICION = ['campania', 'anuncio'] as const;
export const entidadMedicionSchema = z.enum(ENTIDADES_MEDICION);
export type EntidadMedicion = z.infer<typeof entidadMedicionSchema>;

/**
 * Un aviso de la pantalla (M3, M4). El clic en un anuncio no va aquí: lo cuenta la redirección (M2).
 */
export const eventoMedicionSchema = z.discriminatedUnion('entidad', [
  z.object({ entidad: z.literal('anuncio'), tipo: z.literal('impresion'), id: idSchema }),
  z.object({
    entidad: z.literal('campania'),
    tipo: z.enum(['impresion', 'clic']),
    id: idSchema,
    ubicacion: ubicacionPatrocinioSchema,
  }),
]);
export type EventoMedicion = z.infer<typeof eventoMedicionSchema>;

/** POST /patrocinios/medicion → 204 sin cuerpo. */
export const registrarMedicionRequestSchema = z.object({
  eventos: z.array(eventoMedicionSchema).min(1).max(MAXIMO_EVENTOS_POR_AVISO),
});
export type RegistrarMedicionRequest = z.infer<typeof registrarMedicionRequestSchema>;

/** Rango del informe; sin fechas, los últimos DIAS_INFORME_POR_DEFECTO días (M8). */
const rangoInformeSchema = z.object({ desde: fechaSchema.optional(), hasta: fechaSchema.optional() });
const rangoInformeValido = (v: { desde?: string | undefined; hasta?: string | undefined }): boolean => {
  if (v.desde === undefined || v.hasta === undefined) return true;
  if (v.hasta < v.desde) return false;
  const dias = (Date.parse(`${v.hasta}T00:00:00Z`) - Date.parse(`${v.desde}T00:00:00Z`)) / 86_400_000 + 1;
  return dias <= DIAS_INFORME_MAXIMO;
};
const MENSAJE_RANGO_INFORME = `El rango debe ser válido y de máximo ${DIAS_INFORME_MAXIMO} días`;

/** GET /admin/patrocinios/medicion/resumen */
export const resumenMedicionRequestSchema = rangoInformeSchema
  .extend({ entidad: entidadMedicionSchema.optional() })
  .refine(rangoInformeValido, { message: MENSAJE_RANGO_INFORME, path: ['hasta'] });
export type ResumenMedicionRequest = z.infer<typeof resumenMedicionRequestSchema>;

/** GET /admin/patrocinios/medicion/serie */
export const serieMedicionRequestSchema = rangoInformeSchema
  .extend({ entidad: entidadMedicionSchema, id: z.coerce.number().int().positive() })
  .refine(rangoInformeValido, { message: MENSAJE_RANGO_INFORME, path: ['hasta'] });
export type SerieMedicionRequest = z.infer<typeof serieMedicionRequestSchema>;

/** GET /admin/patrocinios/medicion/exportar → CSV */
export const exportarMedicionRequestSchema = rangoInformeSchema
  .extend({ entidad: entidadMedicionSchema.optional() })
  .refine(rangoInformeValido, { message: MENSAJE_RANGO_INFORME, path: ['hasta'] });

export const filaMedicionSchema = z.object({
  entidad: entidadMedicionSchema,
  id: idSchema,
  nombre: z.string(),
  impresiones: z.number().int().nonnegative(),
  clics: z.number().int().nonnegative(),
  /** clics ÷ impresiones × 100, con 2 decimales; null si no hubo impresiones (M1). */
  ctr: z.number().nonnegative().nullable(),
});
export type FilaMedicion = z.infer<typeof filaMedicionSchema>;

export const puntoSerieMedicionSchema = z.object({
  fecha: fechaSchema,
  impresiones: z.number().int().nonnegative(),
  clics: z.number().int().nonnegative(),
});
export type PuntoSerieMedicion = z.infer<typeof puntoSerieMedicionSchema>;

/** El resumen trae el rango realmente usado, para que el panel lo muestre. */
export const resumenMedicionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    desde: fechaSchema,
    hasta: fechaSchema,
    filas: z.array(filaMedicionSchema),
  }),
});
export type ResumenMedicionResponseEnvelope = z.infer<typeof resumenMedicionResponseEnvelopeSchema>;
export const serieMedicionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ desde: fechaSchema, hasta: fechaSchema, puntos: z.array(puntoSerieMedicionSchema) }),
});
export type SerieMedicionResponseEnvelope = z.infer<typeof serieMedicionResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * 400 PARAMETRO_INVALIDO · 400 IMAGEN_INVALIDA (no es una imagen válida o no es del tipo declarado) ·
 * 400 IMAGEN_PROPORCION_INVALIDA (B8; el mensaje trae el tamaño recomendado) · 400 IMAGEN_TAMANO_INVALIDO (B13) ·
 * 404 RECURSO_NO_DISPONIBLE (no existe, no está vigente en una ruta pública, o falta el permiso: C1) ·
 * 409 NOMBRE_CAMPANIA_DUPLICADO (A11) · 409 OBJETIVO_NO_EXISTE (`details` = los objetivos que no existen).
 */
export const CODIGOS_ERROR_PATROCINIOS = [
  'PARAMETRO_INVALIDO',
  'IMAGEN_INVALIDA',
  'IMAGEN_PROPORCION_INVALIDA',
  'IMAGEN_TAMANO_INVALIDO',
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
  /** La campaña de esa prioridad (en un empate, la de fecha de inicio más antigua), para medir (M3, M4). */
  idCampania: number;
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
  tarjetasPublicas(idsProducto: readonly number[]): Promise<ProductoPublicoTarjetaPatrocinio[]>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 8. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  PÚBLICAS (montaje: /api/v1/patrocinios) — sin sesión
 *   GET  /productos                          → bloqueResponseEnvelope        (bloque del inicio, A10)
 *   GET  /anuncios/:espacio                  → anunciosEspacioResponseEnvelope (slider de un espacio, B4)
 *   GET  /anuncios/imagenes/:idAnuncio       imagen binaria (?variante=escritorio|movil&tamano=pequeno|mediano|original); solo vigentes
 *   GET  /anuncios/:idAnuncio/ir             suma un clic y responde 302 a la dirección real (o al inicio si no está vigente, M2)
 *   POST /medicion                           registrarMedicion → 204 (impresiones de anuncios y de productos, clics de productos)
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
 *   GET   /medicion/resumen                  patrocinios.ver    → resumenMedicion (por campaña y por anuncio, M8)
 *   GET   /medicion/serie                    patrocinios.ver    → serieMedicion (por día, de una campaña o un anuncio)
 *   GET   /medicion/exportar                 patrocinios.ver    → CSV del resumen por día (M8)
 *
 *  Panel: /admin/patrocinios, con tres pestañas: «Campañas de productos», «Anuncios» y «Medición».
 *  Vistas del cliente: bloque «Productos patrocinados» (inicio), etiqueta «Patrocinado» (listado y ficha) y
 *  componente `EspacioPublicitario` (inicio, catálogo y ficha).
 *
 *  INTERNO (sin HTTP): PatrocinioPort (de M14) · TarjetasPublicasPort (de M01).
 * ─────────────────────────────────────────────────────────────────────────── */
