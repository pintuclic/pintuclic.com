import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M06. Precios, promociones y descuentos
 * ============================================================================
 * Scope: m06-precios · Ola 3 · Base de datos: tablas `promocion`, `promocion_objetivo`, `cupon`,
 * `cupon_uso` (nuevas) + `descuento` y `sub_rol_empresa` (ya existen).
 * Depende de M01 (precio base, exclusiones, clasificación) y de M04 (tipo de cuenta y sub-rol empresa).
 * Lo consumen M05 (carrito), M07 (checkout), M08 (orden), M02 (precio final en filtros y orden),
 * M21 (cotizaciones) y M01 (aviso de impacto al desactivar una línea).
 *
 * Este contrato ES la especificación del módulo (no existe un documento funcional de M06) y lo que
 * el Tech Lead revisa antes de que se escriba el código. Lo que cambie aquí cambia el módulo.
 *
 * ── Qué es M06 ──────────────────────────────────────────────────────────────
 *  El único lugar donde se decide CUÁNTO CUESTA algo para un cliente concreto en un momento
 *  concreto. Parte del precio base de la variante (M01) y le aplica, en orden: la promoción
 *  vigente, el descuento de la cuenta empresa y un cupón. Devuelve el resultado con su desglose
 *  paso a paso (qué descuento, de dónde vino, cuánto restó) para que M08 lo congele en la orden.
 *  Además permite a un administrador crear y mantener promociones, cupones y las políticas de
 *  descuento de las cuentas empresa.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No cambia el precio base: eso es de M01 (el precio es de la variante, nunca del producto).
 *  · No guarda cálculos. Cada llamada recalcula; quien necesite conservar el resultado (la
 *    orden de M08) lo copia y NO lo recalcula (D07 de M08). Cambiar una regla después no toca
 *    ninguna orden ya creada.
 *  · No calcula envío ni lo exonera (M12); `total` es solo de mercancía, IVA incluido.
 *  · No crea ni asigna roles. M06 administra el sub-rol empresarial y su descuento; el vínculo
 *    rol → sub-rol y la asignación del rol a una cuenta son de M17/M04.
 *  · No lista "los productos en oferta". Informa el precio de las variantes que se le pregunten
 *    (`PreciosPort.preciosDeVariantes`); armar esa página es de M02/M01 (ver P1).
 *  · No hace descuentos por volumen, 2×1, regalos ni puntos. Solo los tres tipos de abajo.
 *  · No toca nada de otro módulo: lo que M06 necesita de ellos está en "Cambios compartidos".
 *
 * ── Tres tipos de descuento ─────────────────────────────────────────────────
 *  PROMOCIÓN  Regla comercial con vigencia (fechas y días de la semana), alcance (todo el
 *             catálogo, o marcas / líneas / categorías / productos / variantes concretos),
 *             exclusiones y audiencia (todos, particulares, empresas). Ej.: "Miércoles de color"
 *             (RC-23 de M01): miércoles, líneas de Pintuco elegidas, exclusión de la familia de
 *             color "Blancos". Sin código en duro: es una promoción más, el blanco se excluye
 *             con una exclusión `familia_color`.
 *  EMPRESA    El descuento (% y tope) del sub-rol empresarial de la cuenta (`sub_rol_empresa` →
 *             `descuento`). Se aplica solo a cuentas de tipo empresa con sub-rol activo.
 *  CUPÓN      Un código que el cliente escribe en el carrito. Descuento sobre la compra.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R1  Orden de cálculo por línea, cada paso sobre el resultado del anterior:
 *      precio base → promoción → descuento empresa → cupón. Cada paso que resta algo es una
 *      fila del desglose con su `ordenAplicacion` (1, 2, 3…, igual a `linea_orden_descuento`).
 *  R2  Producto con `excluidoDeDescuentos` (combos o los que el administrador marque en M01): no
 *      recibe NINGÚN descuento, ni promoción ni empresa ni cupón. Solo su precio base
 *      (CA-CAT-13-09). Tampoco cuenta para el monto mínimo ni para el reparto de un cupón.
 *  R3  Una línea con `precioAcordado` (cotización de M21) conserva ese precio tal cual: sin
 *      descuentos y sin revalidar el precio de M01. Solo el servicio interno lo puede enviar; el
 *      HTTP público lo rechaza.
 *  R4  Una promoción está VIGENTE si su estado es activo, `ahora` está entre `fechaInicio` y
 *      `fechaFin` (sin fin = abierta) y, si tiene `diasSemana`, hoy es uno de esos días. Fechas y
 *      días se evalúan en hora de Colombia (America/Bogota). Días en ISO: 1 = lunes … 7 = domingo.
 *  R5  Alcance: con `alcance = 'catalogo'` la promoción cubre todo; con `'seleccion'` cubre la
 *      línea si coincide con CUALQUIER objetivo (variante, producto, línea comercial, marca,
 *      subcategoría o categoría). Una coincidencia con cualquier EXCLUSIÓN (los mismos tipos más
 *      `familia_color`, que se compara con el color elegido) saca la línea de la promoción.
 *  R6  Audiencia: `todos`; `particular` (incluye a quien no ha iniciado sesión); `empresa`
 *      (cuenta empresa con sesión).
 *  R7  Entre varias promociones vigentes que cubren una línea NO se suman: gana la que más
 *      ahorra a esa línea (empate: la de menor id). Una promoción es `porcentaje` (1–100 %) o
 *      `importe_fijo` (por unidad; nunca deja la unidad por debajo de 0).
 *  R8  Descuento empresa: porcentaje del `descuento` del sub-rol, sobre el subtotal ya
 *      promocionado. El `tope` (monto máximo de ahorro por EMPRESA en TODA la compra; 0 = sin
 *      tope) se reparte entre las líneas en proporción a su ahorro (R13). Cuenta empresa sin
 *      sub-rol, sub-rol inactivo o descuento inactivo = sin descuento.
 *  R9  Promoción con `acumulableConEmpresa = false`: en las líneas que cubre, a una cuenta
 *      empresa se le aplica solo lo que más ahorre entre esa promoción y su descuento de empresa,
 *      ambos sobre el precio base (empate: la promoción). Con `true` (por defecto) se acumulan (R1).
 *  R10 Cupón: uno por compra. Se aplica sobre el subtotal ya rebajado de las líneas elegibles
 *      (R2). `porcentaje` descuenta ese % de cada línea; `importe_fijo` descuenta el valor
 *      repartido entre las líneas en proporción a su subtotal (R13), sin pasar de lo que valen.
 *      Un cupón que no aplica NO rompe el cálculo: se informa con su motivo y el resto sigue.
 *  R11 Un cupón es válido si: está activo, vigente (fechas), no agotó `usosMaximos`, el usuario
 *      no agotó `usosPorUsuario`, la audiencia coincide y el subtotal elegible alcanza
 *      `montoMinimoCompra`. `usosPorUsuario` exige sesión; sin ella el motivo es `requiere_sesion`.
 *      El código es único sin distinguir mayúsculas y no se puede cambiar una vez creado.
 *  R12 Un código inexistente o inactivo responde igual (`cupon_no_valido`): no se revela cuáles
 *      códigos existen. Los códigos se crean de 6 a 30 caracteres.
 *  R13 Todo se calcula en pesos con 2 decimales, redondeo "mitad hacia arriba", POR LÍNEA: el
 *      importe de cada paso es sobre el subtotal de la línea (precio × cantidad), no por unidad.
 *      Para repartir un monto entre líneas (tope, cupón fijo): cada una recibe su parte truncada a
 *      centavos y el sobrante de centavos va a la línea de mayor ahorro (o subtotal); así la suma
 *      del reparto es exacta.
 *  R14 El subtotal de la línea es la verdad; `precioUnitarioFinal` es subtotal / cantidad
 *      redondeado a 2 decimales y solo informa (D5).
 *  R15 IVA: los precios de M01 YA incluyen IVA. `baseSinImpuesto` = total / (1 + tasa) redondeado
 *      a 2 decimales; `importeIva` = total − base. La tasa es el parámetro `comercial.iva_porcentaje`
 *      de M17 (19 % por defecto) y viaja en el resultado para que M08 la congele (CA-ORD-02-05).
 *  R16 Una línea no vendible según M01 (variante inactiva, producto retirado, color no ofrecido,
 *      combo agotado) NO se precia ni suma a los totales: vuelve con `vendible: false` y su motivo.
 *      El cálculo nunca falla por una línea no vendible.
 *  R17 Usar un cupón queda registrado solo cuando la orden se crea: `registrarUsoCupon` (lo invoca
 *      quien crea la orden) es atómico —nunca supera `usosMaximos`—, idempotente por `referencia` y
 *      se revierte con `liberarUsoCupon` al cancelarse la orden. Calcular NO reserva el cupón.
 *  R18 Promociones, cupones y políticas no se borran: se desactivan. Editar una regla en vigor es
 *      válido y aplica desde ese instante; las órdenes ya creadas no cambian.
 *  R19 Al guardar una promoción cada objetivo y exclusión debe existir en el catálogo; si no,
 *      400 OBJETIVO_NO_EXISTE con la lista de los inválidos (sin guardar nada).
 *  R20 Autorización siempre en servidor. La administración responde 404 RECURSO_NO_DISPONIBLE a
 *      toda denegación (sin sesión o sin permiso). El cálculo y las promociones vigentes son
 *      públicos (la sesión es opcional y solo sirve para el perfil del cliente).
 *
 * ── Pantallas ───────────────────────────────────────────────────────────────
 *  Administración `/admin/precios`, cuatro pestañas: Promociones (lista con estado de vigencia,
 *  crear/editar, activar/desactivar) · Cupones (lista, crear/editar, usos) · Descuentos empresa
 *  (sub-roles con % y tope) · Simulador (elegir variantes, cantidad, tipo de cliente, fecha y
 *  cupón → ver el desglose; sirve para comprobar una regla antes de publicarla).
 *  Lo público (campo de cupón del carrito, precio tachado y badge "OFERTA" `#E63946`) lo pintan
 *  M05 y M01/M02 con `PreciosPort` o con `POST /precios/calcular`; M06 no tiene pantalla pública.
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  Administración: GET → catalogo.ver · POST, PUT y PATCH → catalogo.editar.
 *  `POST /admin/precios/simular` → catalogo.ver (no escribe nada).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Se reutilizan `catalogo.ver` y `catalogo.editar` (la segunda ya se describe como "Editar
 *      productos, precios e imágenes"): sin permisos nuevos ni tocar M17. Alternativa si
 *      se quiere que quien edita el catálogo no edite precios: `precios.ver` / `precios.editar`
 *      (dos filas de seed y un cambio en M17).
 *  D2  Las promociones NO se suman entre sí (R7) pero sí con el descuento de empresa (R1) salvo que la
 *      promoción diga lo contrario (R9). El cupón se suma sobre todo lo anterior. Alternativa más
 *      estricta: "solo lo que más ahorre" entre todos; se cambia solo la regla R1.
 *  D3  El `tope` del sub-rol es por compra completa (no por unidad ni por mes) y `tope = 0` significa
 *      "sin tope" (así lo deja el esquema como valor por defecto).
 *  D4  Los cupones aplican a toda la compra elegible: no tienen alcance por producto (si luego hace
 *      falta, se agregan objetivos como en las promociones). Un cupón por compra.
 *  D5  El cálculo es por línea y el subtotal es la verdad (R13, R14). `linea_orden.precio_aplicado`
 *      (unitario) puede diferir por centavos de subtotal / cantidad. M08 debe copiar el subtotal de la
 *      línea y no recomputarlo desde el unitario.
 *  D6  Los precios de la variante incluyen IVA (R15), lo cual cuadra con RF-BUS-02-04 (filtro "IVA
 *      incluido") y con las columnas `base_sin_impuesto` / `importe_iva` de la orden. Si en realidad
 *      los precios fueran SIN IVA hay que decirlo antes de programar: cambia R15.
 *  D7  M06 lee, solo lectura, las tablas `usuario`, `rol` y `cuenta_empresa` para saber si el cliente
 *      es empresa y cuál es su sub-rol (no hay puerto de M04 para eso, y M08 ya hace lo mismo con el
 *      catálogo). M06 es dueño de escribir `sub_rol_empresa` y `descuento` (R8). No se toca M04.
 *  D8  M06 administra el sub-rol empresarial (crear, renombrar, cambiar % y tope, desactivar). No
 *      administra qué rol usa qué sub-rol ni a quién se le da ese rol (M17/M04).
 *  D9  Los objetivos y exclusiones de una promoción no llevan clave foránea (el id apunta a seis
 *      tablas distintas): la integridad la valida el servicio al guardar (R19). Como el catálogo no
 *      borra filas (solo desactiva), no quedan ids colgantes.
 *  D10 El `nombre` de la promoción se muestra al cliente y se congela como `origen` del descuento en la
 *      orden. Hay que ponerle un nombre que el cliente entienda ("Miércoles de color").
 *  D11 PROPUESTA incluida: el simulador del administrador (`/simular`). No es necesario para que el
 *      módulo funcione; se puede quitar sin afectar el resto.
 *
 * ── Preguntas abiertas para otros módulos (no bloquean este contrato) ───────
 *  P1  M02 (filtro y orden por precio final, RF-BUS-02-04). Con promociones el precio final ya no
 *      está en una columna: M02 tendría que pedir `preciosDeVariantes` por lotes de hasta 500 y
 *      filtrar/ordenar en memoria (el catálogo es pequeño) o M06 guardar un precio calculado.
 *      Decidirlo al hacer el contrato de M02 de la ola 3; el puerto ya sirve para lo primero.
 *  P2  M05 aún no está hecho: el carrito debe llamar `calcular` en cada cambio y antes de pagar
 *      (RF-CAR-05-01); el campo de cupón sale de aquí.
 *  P3  M07 debe llamar `registrarUsoCupon` ANTES de crear la orden y, si falla (cupón agotado
 *      entre medias), recalcular y avisar. M08 (orden) solo recibe el cálculo congelado.
 *
 * ── Cambios compartidos que este módulo necesita (PRs aparte, antes del código) ──
 *  C1  BD (PR general): tablas `promocion`, `promocion_objetivo`, `cupon`, `cupon_uso`; enums
 *      `enum_tipo_valor_descuento` y `enum_audiencia_descuento`; Prisma y seed de ejemplo
 *      ("Miércoles de color" inactiva, un cupón de prueba).
 *  C2  M01 (otro módulo; requiere visto bueno del Tech Lead): ampliar `LineaParaCompra` con
 *      `idMarca`, `idLinea`, `idSubcategoria`, `idCategoria` e `idFamiliaColor` (del color elegido),
 *      porque las promociones se filtran por esos datos. Es un cambio solo aditivo.
 *  C3  M01 (otro módulo; mismo visto bueno): `reglasComerciales` del impacto de desactivación hoy es
 *      0 fijo; pasaría a usar `ImpactoReglasPort` (sección 7).
 *  C4  Ninguno en `core/`, `app.routes.ts` aparte del montaje de las rutas de M06, ni en M17.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const MAXIMO_LINEAS_CALCULO = 100;
export const MAXIMO_VARIANTES_PRECIO = 500;
export const MAXIMO_OBJETIVOS_PROMOCION = 200;
export const CANTIDAD_MAXIMA_LINEA = 9_999;
export const IMPORTE_MAXIMO = 9_999_999_999.99;
export const ZONA_HORARIA = 'America/Bogota';

export const idSchema = z.number().int().positive();
/** Dinero en pesos con hasta 2 decimales (el redondeo lo hace el servicio, R13). */
export const dineroSchema = z.number().min(0).max(IMPORTE_MAXIMO);
export const porcentajeSchema = z.number().gt(0).max(100);
export const cantidadSchema = z.number().int().min(1).max(CANTIDAD_MAXIMA_LINEA);
export const nombreReglaSchema = z.string().trim().min(3).max(100);
export const descripcionSchema = z.string().trim().min(1).max(500);
export const fechaHoraSchema = z.string().datetime();

export const estadoSchema = z.enum(['activo', 'inactivo']);
export type Estado = z.infer<typeof estadoSchema>;

export const tipoValorSchema = z.enum(['porcentaje', 'importe_fijo']);
export type TipoValor = z.infer<typeof tipoValorSchema>;

export const audienciaSchema = z.enum(['todos', 'particular', 'empresa']);
export type Audiencia = z.infer<typeof audienciaSchema>;

export const alcanceSchema = z.enum(['catalogo', 'seleccion']);
export type Alcance = z.infer<typeof alcanceSchema>;

/** Qué parte del catálogo cubre (o excluye) una promoción (R5). */
export const tipoObjetivoSchema = z.enum(['variante', 'producto', 'linea', 'marca', 'subcategoria', 'categoria']);
export type TipoObjetivo = z.infer<typeof tipoObjetivoSchema>;

export const tipoExclusionSchema = z.enum([...tipoObjetivoSchema.options, 'familia_color']);
export type TipoExclusion = z.infer<typeof tipoExclusionSchema>;

export const objetivoSchema = z.object({ tipo: tipoObjetivoSchema, id: idSchema });
export type Objetivo = z.infer<typeof objetivoSchema>;

export const exclusionSchema = z.object({ tipo: tipoExclusionSchema, id: idSchema });
export type Exclusion = z.infer<typeof exclusionSchema>;

/** Día ISO: 1 = lunes … 7 = domingo (R4). */
export const diaSemanaSchema = z.number().int().min(1).max(7);

export const vigenciaSchema = z.enum(['programada', 'vigente', 'vencida', 'inactiva']);
export type Vigencia = z.infer<typeof vigenciaSchema>;

/** Filtro de la lista de promociones por su situación. */
export const filtroVigenciaSchema = vigenciaSchema;

/** Código del cupón: mayúsculas, números, guion y guion bajo (R11, R12). */
export const codigoCuponSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{6,30}$/);

/** Booleano en query string ("true"/"false"): z.coerce.boolean() trataría "false" como true. */
const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES DE ADMINISTRACIÓN
 * ─────────────────────────────────────────────────────────────────────────── */

const unicos = <T extends number>(valores: readonly T[]) => new Set(valores).size === valores.length;

/** Campos que se escriben al crear o editar una promoción (R4–R7, R9, R19). */
const promocionCamposSchema = z.object({
  nombre: nombreReglaSchema,
  descripcion: descripcionSchema.nullable(),
  tipoValor: tipoValorSchema,
  valor: z.number().gt(0).max(IMPORTE_MAXIMO),
  alcance: alcanceSchema,
  objetivos: z.array(objetivoSchema).max(MAXIMO_OBJETIVOS_PROMOCION),
  exclusiones: z.array(exclusionSchema).max(MAXIMO_OBJETIVOS_PROMOCION),
  audiencia: audienciaSchema,
  /** R9. */
  acumulableConEmpresa: z.boolean(),
  fechaInicio: fechaHoraSchema,
  /** Null = sin fin. */
  fechaFin: fechaHoraSchema.nullable(),
  /** Vacío = todos los días. */
  diasSemana: z.array(diaSemanaSchema).max(7),
});

/** Reglas que cruzan campos; compartidas por crear y editar. */
function validarPromocion(v: z.infer<typeof promocionCamposSchema>, ctx: z.RefinementCtx): void {
  if (v.tipoValor === 'porcentaje' && v.valor > 100) {
    ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Un porcentaje no puede pasar de 100' });
  }
  if (v.alcance === 'catalogo' && v.objetivos.length > 0) {
    ctx.addIssue({ code: 'custom', path: ['objetivos'], message: 'Con alcance "catalogo" no se eligen objetivos' });
  }
  if (v.alcance === 'seleccion' && v.objetivos.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['objetivos'],
      message: 'Con alcance "seleccion" hay que elegir al menos uno',
    });
  }
  if (v.fechaFin !== null && v.fechaFin <= v.fechaInicio) {
    ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha fin debe ser posterior al inicio' });
  }
  if (!unicos(v.diasSemana)) {
    ctx.addIssue({ code: 'custom', path: ['diasSemana'], message: 'Días repetidos' });
  }
}

export const promocionSchema = promocionCamposSchema.extend({
  idPromocion: idSchema,
  estado: estadoSchema,
  /** Derivada de estado + fechas + hoy (R4); no se guarda. */
  vigencia: vigenciaSchema,
  /** Para mostrar nombres en vez de ids en la lista de objetivos. */
  objetivosDetalle: z.array(z.object({ tipo: tipoExclusionSchema, id: idSchema, nombre: z.string() })),
  fechaCreacion: fechaHoraSchema,
  fechaActualizacion: fechaHoraSchema,
  /** Nombre de quien la editó por última vez; null si ese usuario ya no existe. */
  actualizadoPor: z.string().nullable(),
});
export type Promocion = z.infer<typeof promocionSchema>;

/** Campos que se escriben al crear o editar un cupón (R10, R11). */
const cuponCamposSchema = z.object({
  nombre: nombreReglaSchema,
  descripcion: descripcionSchema.nullable(),
  tipoValor: tipoValorSchema,
  valor: z.number().gt(0).max(IMPORTE_MAXIMO),
  /** Subtotal elegible mínimo para poder usarlo; null = sin mínimo. */
  montoMinimoCompra: dineroSchema.nullable(),
  /** Veces que se puede usar en total; null = sin límite. */
  usosMaximos: z.number().int().min(1).nullable(),
  /** Veces que lo puede usar una misma persona; null = sin límite (si es un número exige sesión). */
  usosPorUsuario: z.number().int().min(1).nullable(),
  audiencia: audienciaSchema,
  fechaInicio: fechaHoraSchema,
  fechaFin: fechaHoraSchema.nullable(),
});

function validarCupon(v: z.infer<typeof cuponCamposSchema>, ctx: z.RefinementCtx): void {
  if (v.tipoValor === 'porcentaje' && v.valor > 100) {
    ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Un porcentaje no puede pasar de 100' });
  }
  if (v.fechaFin !== null && v.fechaFin <= v.fechaInicio) {
    ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha fin debe ser posterior al inicio' });
  }
}

export const cuponSchema = cuponCamposSchema.extend({
  idCupon: idSchema,
  codigo: codigoCuponSchema,
  estado: estadoSchema,
  vigencia: vigenciaSchema,
  /** Usos registrados y no liberados (R17). */
  usosActuales: z.number().int().nonnegative(),
  fechaCreacion: fechaHoraSchema,
  fechaActualizacion: fechaHoraSchema,
  actualizadoPor: z.string().nullable(),
});
export type Cupon = z.infer<typeof cuponSchema>;

/** Un uso de un cupón (R17). */
export const usoCuponSchema = z.object({
  idCuponUso: idSchema,
  idCupon: idSchema,
  idUsuario: idSchema.nullable(),
  /** Nombre del usuario; null si ya no existe. */
  usuario: z.string().nullable(),
  /** Identificador de la orden (o del intento) que lo usó. */
  referencia: z.string(),
  importeDescuento: dineroSchema,
  fecha: fechaHoraSchema,
  /** Fecha en que se liberó (orden cancelada); null si sigue vigente. */
  liberadoEn: fechaHoraSchema.nullable(),
});
export type UsoCupon = z.infer<typeof usoCuponSchema>;

/**
 * Política de descuento de un sub-rol empresarial (R8, D8). `descuento` y `sub_rol_empresa` son
 * 1 a 1 para M06: el servicio los escribe juntos en una transacción.
 */
const politicaCamposSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  porcentaje: z.number().min(0).max(100),
  /** Monto máximo de ahorro por compra; 0 = sin tope (D3). */
  tope: dineroSchema,
});

export const politicaEmpresaSchema = politicaCamposSchema.extend({
  idSubRolEmpresa: idSchema,
  idDescuento: idSchema.nullable(),
  estado: estadoSchema,
  /** Cuántos roles usan este sub-rol (informativo; el vínculo es de M17). */
  rolesAsociados: z.number().int().nonnegative(),
});
export type PoliticaEmpresa = z.infer<typeof politicaEmpresaSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES DE ADMINISTRACIÓN
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /promociones */
export const listarPromocionesRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  vigencia: filtroVigenciaSchema.optional(),
  audiencia: audienciaSchema.optional(),
});
export type ListarPromocionesRequest = z.infer<typeof listarPromocionesRequestSchema>;

/** POST /promociones — nace activa. */
export const crearPromocionRequestSchema = promocionCamposSchema.superRefine(validarPromocion);
export type CrearPromocionRequest = z.infer<typeof crearPromocionRequestSchema>;

/** PUT /promociones/:idPromocion — reemplaza todos los campos (R18). */
export const actualizarPromocionRequestSchema = crearPromocionRequestSchema;
export type ActualizarPromocionRequest = z.infer<typeof actualizarPromocionRequestSchema>;

/** PATCH …/estado (promociones, cupones y políticas). */
export const cambiarEstadoRequestSchema = z.object({ estado: estadoSchema });
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

/** GET /cupones */
export const listarCuponesRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  vigencia: filtroVigenciaSchema.optional(),
});
export type ListarCuponesRequest = z.infer<typeof listarCuponesRequestSchema>;

/** POST /cupones — nace activo. */
export const crearCuponRequestSchema = cuponCamposSchema
  .extend({ codigo: codigoCuponSchema })
  .superRefine(validarCupon);
export type CrearCuponRequest = z.infer<typeof crearCuponRequestSchema>;

/** PUT /cupones/:idCupon — el código no se cambia (R11). */
export const actualizarCuponRequestSchema = cuponCamposSchema.superRefine(validarCupon);
export type ActualizarCuponRequest = z.infer<typeof actualizarCuponRequestSchema>;

/** GET /cupones/:idCupon/usos */
export const listarUsosCuponRequestSchema = paginacionQuerySchema.extend({
  incluirLiberados: booleanoQuerySchema.optional(),
});
export type ListarUsosCuponRequest = z.infer<typeof listarUsosCuponRequestSchema>;

/** POST /politicas-empresa — nace activa. */
export const crearPoliticaEmpresaRequestSchema = politicaCamposSchema;
export type CrearPoliticaEmpresaRequest = z.infer<typeof crearPoliticaEmpresaRequestSchema>;

/** PUT /politicas-empresa/:idSubRolEmpresa */
export const actualizarPoliticaEmpresaRequestSchema = politicaCamposSchema;
export type ActualizarPoliticaEmpresaRequest = z.infer<typeof actualizarPoliticaEmpresaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. CÁLCULO (lo central del módulo)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Perfil comercial del cliente. Se resuelve por la sesión (D7); el simulador lo fija a mano. */
export const perfilComercialSchema = z.object({
  tipo: z.enum(['particular', 'empresa']),
  /** Solo para `empresa`; null = sin sub-rol, por tanto sin descuento (R8). */
  idSubRolEmpresa: idSchema.nullable(),
});
export type PerfilComercial = z.infer<typeof perfilComercialSchema>;

/** Línea que se quiere preciar. */
export const lineaCalculoSchema = z.object({
  idVariante: idSchema,
  /** El color que eligió el cliente; null si el producto no tiene color. */
  idColor: idSchema.nullable().optional(),
  cantidad: cantidadSchema,
});
export type LineaCalculo = z.infer<typeof lineaCalculoSchema>;

/** Línea del servicio interno: puede traer un precio acordado (R3). */
export const lineaCalculoInternaSchema = lineaCalculoSchema.extend({
  /** Precio unitario pactado en una cotización (M21); se respeta tal cual. */
  precioAcordado: dineroSchema.optional(),
});
export type LineaCalculoInterna = z.infer<typeof lineaCalculoInternaSchema>;

/** POST /precios/calcular (público; usa la sesión si hay una). No admite precioAcordado (R3). */
export const calcularRequestSchema = z.object({
  lineas: z.array(lineaCalculoSchema).min(1).max(MAXIMO_LINEAS_CALCULO),
  /** El código que escribió el cliente; se normaliza (R11). */
  codigoCupon: codigoCuponSchema.optional(),
});
export type CalcularRequest = z.infer<typeof calcularRequestSchema>;

/** POST /admin/precios/simular — igual, más cliente y momento simulados. */
export const simularRequestSchema = calcularRequestSchema.extend({
  perfil: perfilComercialSchema,
  /** Fecha y hora a simular; por defecto, ahora. */
  momento: fechaHoraSchema.optional(),
  /** Si se manda, el simulador comprueba los límites de uso de ese usuario. */
  idUsuario: idSchema.optional(),
});
export type SimularRequest = z.infer<typeof simularRequestSchema>;

export const tipoOrigenDescuentoSchema = z.enum(['promocion', 'empresa', 'cupon']);
export type TipoOrigenDescuento = z.infer<typeof tipoOrigenDescuentoSchema>;

/** Un descuento aplicado a una línea. Mapea 1 a 1 a una fila de `linea_orden_descuento` (R1). */
export const descuentoAplicadoSchema = z.object({
  /** 1, 2, 3… en el orden en que se aplicó (R1). */
  ordenAplicacion: z.number().int().min(1),
  tipoOrigen: tipoOrigenDescuentoSchema,
  /** Id de la promoción, del sub-rol empresarial o del cupón. */
  idRegla: idSchema,
  /** Texto que se congela en la orden (D10): nombre de la promoción, "Descuento empresa · Mayorista", "Cupón X". */
  origen: z.string().min(1).max(150),
  /** Null cuando el descuento es un importe fijo (o un cupón fijo repartido). */
  porcentaje: z.number().min(0).max(100).nullable(),
  /** Lo que resta a la LÍNEA completa (no por unidad). */
  importe: dineroSchema,
});
export type DescuentoAplicado = z.infer<typeof descuentoAplicadoSchema>;

export const motivoNoVendibleSchema = z.enum([
  'variante_no_existe',
  'variante_inactiva',
  'producto_no_disponible',
  'color_no_ofrecido',
  'combo_agotado',
]);

export const lineaCalculadaSchema = z.object({
  /** Posición de la línea en la petición (base 0). */
  indice: z.number().int().nonnegative(),
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  cantidad: cantidadSchema,
  /** R16: false = no se precia y no suma. Los campos de dinero vienen null. */
  vendible: z.boolean(),
  motivoNoVendible: motivoNoVendibleSchema.nullable(),
  /** R2 */
  excluidoDeDescuentos: z.boolean(),
  /** R3: true si el precio vino acordado. */
  precioAcordado: z.boolean(),
  /** Precio unitario de partida (el de M01, o el acordado). */
  precioInicial: dineroSchema.nullable(),
  subtotalInicial: dineroSchema.nullable(),
  descuentos: z.array(descuentoAplicadoSchema),
  descuentoTotal: dineroSchema.nullable(),
  /** Lo que se cobra por la línea, IVA incluido. Es la verdad (R14). */
  subtotal: dineroSchema.nullable(),
  /** Informativo (R14). */
  precioUnitarioFinal: dineroSchema.nullable(),
});
export type LineaCalculada = z.infer<typeof lineaCalculadaSchema>;

export const motivoCuponSchema = z.enum([
  'cupon_no_valido',
  'cupon_no_vigente',
  'cupon_agotado',
  'cupon_usado_por_usuario',
  'requiere_sesion',
  'audiencia_no_aplica',
  'monto_minimo_no_alcanzado',
  'sin_lineas_elegibles',
]);
export type MotivoCupon = z.infer<typeof motivoCuponSchema>;

export const resultadoCuponSchema = z.object({
  codigo: z.string(),
  aplicado: z.boolean(),
  motivoRechazo: motivoCuponSchema.nullable(),
  /** Solo con `monto_minimo_no_alcanzado`: el mínimo que falta alcanzar. */
  montoMinimo: dineroSchema.nullable(),
  /** Lo que resta en total; 0 si no se aplicó. */
  descuento: dineroSchema,
  /** Id del cupón aplicado (para `registrarUsoCupon`); null si no se aplicó. */
  idCupon: idSchema.nullable(),
});
export type ResultadoCupon = z.infer<typeof resultadoCuponSchema>;

export const resumenCalculoSchema = z.object({
  /** Suma de `subtotalInicial` de las líneas vendibles. Es `orden.sub_total`. */
  subtotalInicial: dineroSchema,
  descuentoPromociones: dineroSchema,
  descuentoEmpresa: dineroSchema,
  descuentoCupon: dineroSchema,
  /** Suma de los tres. Es `orden.descuento`. */
  descuentoTotal: dineroSchema,
  /** Mercancía con IVA incluido, sin envío (R15). Es `orden.total` menos el envío. */
  total: dineroSchema,
  /** Tasa vigente en porcentaje (R15). */
  tasaIva: z.number().min(0).max(100),
  baseSinImpuesto: dineroSchema,
  importeIva: dineroSchema,
});
export type ResumenCalculo = z.infer<typeof resumenCalculoSchema>;

export const calculoSchema = z.object({
  lineas: z.array(lineaCalculadaSchema),
  /** Null si no se mandó código. */
  cupon: resultadoCuponSchema.nullable(),
  resumen: resumenCalculoSchema,
  /** Perfil con el que se calculó (para que la pantalla muestre "precio empresa"). */
  perfil: perfilComercialSchema,
  /** Momento del cálculo; la orden lo puede guardar como referencia. */
  calculadoEn: fechaHoraSchema,
});
export type Calculo = z.infer<typeof calculoSchema>;

/** GET /precios/promociones-vigentes — lo que se puede mostrar al público (R20). */
export const promocionPublicaSchema = z.object({
  idPromocion: idSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  tipoValor: tipoValorSchema,
  valor: z.number(),
  alcance: alcanceSchema,
  objetivos: z.array(objetivoSchema),
  fechaFin: fechaHoraSchema.nullable(),
  diasSemana: z.array(diaSemanaSchema),
});
export type PromocionPublica = z.infer<typeof promocionPublicaSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

export const respuestaUno = <T extends z.ZodType>(item: T) => z.object({ success: z.literal(true), data: item });
export const respuestaPaginada = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item), pagination: paginacionSchema });
export const respuestaLista = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item) });

export const promocionResponseEnvelopeSchema = respuestaUno(promocionSchema);
export type PromocionResponseEnvelope = z.infer<typeof promocionResponseEnvelopeSchema>;
export const listarPromocionesResponseEnvelopeSchema = respuestaPaginada(promocionSchema);
export type ListarPromocionesResponseEnvelope = z.infer<typeof listarPromocionesResponseEnvelopeSchema>;

export const cuponResponseEnvelopeSchema = respuestaUno(cuponSchema);
export type CuponResponseEnvelope = z.infer<typeof cuponResponseEnvelopeSchema>;
export const listarCuponesResponseEnvelopeSchema = respuestaPaginada(cuponSchema);
export type ListarCuponesResponseEnvelope = z.infer<typeof listarCuponesResponseEnvelopeSchema>;
export const listarUsosCuponResponseEnvelopeSchema = respuestaPaginada(usoCuponSchema);
export type ListarUsosCuponResponseEnvelope = z.infer<typeof listarUsosCuponResponseEnvelopeSchema>;

export const politicaEmpresaResponseEnvelopeSchema = respuestaUno(politicaEmpresaSchema);
export type PoliticaEmpresaResponseEnvelope = z.infer<typeof politicaEmpresaResponseEnvelopeSchema>;
/** Pocas filas (un puñado de sub-roles): sin paginar. */
export const listarPoliticasEmpresaResponseEnvelopeSchema = respuestaLista(politicaEmpresaSchema);
export type ListarPoliticasEmpresaResponseEnvelope = z.infer<typeof listarPoliticasEmpresaResponseEnvelopeSchema>;

export const calculoResponseEnvelopeSchema = respuestaUno(calculoSchema);
export type CalculoResponseEnvelope = z.infer<typeof calculoResponseEnvelopeSchema>;

export const promocionesVigentesResponseEnvelopeSchema = respuestaLista(promocionPublicaSchema);
export type PromocionesVigentesResponseEnvelope = z.infer<typeof promocionesVigentesResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. PUERTO PreciosPort (lo implementa M06; lo consumen M05, M07, M08, M02, M21)
 * ───────────────────────────────────────────────────────────────────────────
 * Servicio interno, sin HTTP. Nunca lanza por una línea no vendible ni por un cupón que no aplica
 * (R10, R16); solo lanza ante entradas inválidas (más líneas del máximo).
 */

export const contextoPrecioSchema = z.object({
  /** Null = visitante sin sesión (perfil particular). */
  idUsuario: idSchema.nullable(),
  /** Si viene, manda sobre el perfil que se deduciría de `idUsuario` (simulador, pruebas). */
  perfil: perfilComercialSchema.optional(),
  /** Por defecto, ahora. Solo lo cambian el simulador y las pruebas. */
  momento: fechaHoraSchema.optional(),
});
export type ContextoPrecio = z.infer<typeof contextoPrecioSchema>;

export const calculoEntradaSchema = z.object({
  lineas: z.array(lineaCalculoInternaSchema).min(1).max(MAXIMO_LINEAS_CALCULO),
  codigoCupon: codigoCuponSchema.optional(),
  contexto: contextoPrecioSchema,
});
export type CalculoEntrada = z.infer<typeof calculoEntradaSchema>;

export const consultaPrecioSchema = z.object({
  idVariante: idSchema,
  idColor: idSchema.nullable().optional(),
});
export type ConsultaPrecio = z.infer<typeof consultaPrecioSchema>;

/**
 * Precio de UNA unidad de una variante para un cliente (para listados, tarjetas y filtros, P1).
 * Se calcula como una compra de 1 unidad sin cupón; el tope de empresa se evalúa sobre esa unidad.
 */
export const precioVarianteSchema = z.object({
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  vendible: z.boolean(),
  precioBase: dineroSchema.nullable(),
  /** IVA incluido, con la promoción y el descuento de empresa que correspondan. */
  precioFinal: dineroSchema.nullable(),
  /** Para pintar "precio tachado + badge OFERTA". */
  enOferta: z.boolean(),
  /** Descuentos que dieron ese precio, en orden (sin el cupón). */
  descuentos: z.array(descuentoAplicadoSchema),
});
export type PrecioVariante = z.infer<typeof precioVarianteSchema>;

export const entradaUsoCuponSchema = z.object({
  idCupon: idSchema,
  /** Null solo si el cupón no limita por usuario. */
  idUsuario: idSchema.nullable(),
  /** Identificador de la orden; hace idempotente la llamada (R17). */
  referencia: z.string().trim().min(1).max(100),
  importeDescuento: dineroSchema,
});
export type EntradaUsoCupon = z.infer<typeof entradaUsoCuponSchema>;

export const resultadoUsoCuponSchema = z.object({
  /** true también cuando la `referencia` ya estaba registrada (idempotente). */
  registrado: z.boolean(),
  motivoRechazo: motivoCuponSchema.nullable(),
});
export type ResultadoUsoCupon = z.infer<typeof resultadoUsoCuponSchema>;

export interface PreciosPort {
  calcular(entrada: CalculoEntrada): Promise<Calculo>;
  /** Hasta MAXIMO_VARIANTES_PRECIO consultas; una respuesta por consulta, en el mismo orden. */
  preciosDeVariantes(consultas: readonly ConsultaPrecio[], contexto: ContextoPrecio): Promise<PrecioVariante[]>;
  /** Atómico y todo-o-nada (R17). No lanza si el cupón se agotó: lo informa. */
  registrarUsoCupon(entrada: EntradaUsoCupon): Promise<ResultadoUsoCupon>;
  /** Libera los usos de esa `referencia`; sin usos registrados no hace nada (idempotente). */
  liberarUsoCupon(referencia: string): Promise<void>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 7. PUERTO ImpactoReglasPort (lo implementa M06; lo consume M01, cambio C3)
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Cuántas promociones NO vencidas y activas (vigentes o programadas) incluyen alguno de esos
 * objetivos. M01 lo muestra en `reglasComerciales` antes de desactivar una línea, marca o
 * producto (HU-CAT-11). No cuenta las que cubren todo el catálogo.
 */
export interface ImpactoReglasPort {
  contarPromocionesVigentes(objetivos: readonly Objetivo[]): Promise<number>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 8. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * Mismo envelope global que M01. Estados HTTP: 400 PARAMETRO_INVALIDO y OBJETIVO_NO_EXISTE ·
 * 404 RECURSO_NO_DISPONIBLE (también toda denegación, R20) · 409 CODIGO_CUPON_DUPLICADO y
 * NOMBRE_POLITICA_DUPLICADO.
 */
export const CODIGOS_ERROR_PRECIOS = [
  'PARAMETRO_INVALIDO',
  'OBJETIVO_NO_EXISTE',
  'RECURSO_NO_DISPONIBLE',
  'CODIGO_CUPON_DUPLICADO',
  'NOMBRE_POLITICA_DUPLICADO',
] as const;

export const errorPreciosEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_PRECIOS),
    message: z.string(),
    /** OBJETIVO_NO_EXISTE → los objetivos o exclusiones que no existen; el resto → null. */
    details: z.array(exclusionSchema).nullable(),
  }),
});
export type ErrorPreciosEnvelope = z.infer<typeof errorPreciosEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 9. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  PÚBLICAS (montaje: /api/v1/precios; sesión opcional)
 *   POST /calcular                         → calculoResponseEnvelope
 *   GET  /promociones-vigentes             → promocionesVigentesResponseEnvelope (según el perfil)
 *
 *  ADMINISTRACIÓN (montaje: /api/v1/admin/precios)
 *   GET   /promociones                     catalogo.ver     → listarPromociones (paginado)
 *   POST  /promociones                     catalogo.editar  → crearPromocion
 *   GET   /promociones/:idPromocion        catalogo.ver
 *   PUT   /promociones/:idPromocion        catalogo.editar  → actualizarPromocion
 *   PATCH /promociones/:idPromocion/estado catalogo.editar  → cambiarEstado
 *   GET   /cupones                         catalogo.ver     → listarCupones (paginado)
 *   POST  /cupones                         catalogo.editar  → crearCupon
 *   GET   /cupones/:idCupon                catalogo.ver
 *   PUT   /cupones/:idCupon                catalogo.editar  → actualizarCupon
 *   PATCH /cupones/:idCupon/estado         catalogo.editar  → cambiarEstado
 *   GET   /cupones/:idCupon/usos           catalogo.ver     → listarUsosCupon (paginado)
 *   GET   /politicas-empresa               catalogo.ver     → lista sin paginar
 *   POST  /politicas-empresa               catalogo.editar  → crearPoliticaEmpresa
 *   PUT   /politicas-empresa/:idSubRolEmpresa        catalogo.editar → actualizarPoliticaEmpresa
 *   PATCH /politicas-empresa/:idSubRolEmpresa/estado catalogo.editar → cambiarEstado
 *   POST  /simular                         catalogo.ver     → calculoResponseEnvelope (no escribe, D11)
 *
 *  INTERNO (sin HTTP): PreciosPort (M06) · ImpactoReglasPort (M06)
 * ─────────────────────────────────────────────────────────────────────────── */
