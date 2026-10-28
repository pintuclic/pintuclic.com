import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M06. Precios, eventos de descuento y descuentos de empresa
 * ============================================================================
 * Scope: m06-precios · Ola 3 · Base de datos: tablas `evento_descuento`, `evento_regla`,
 * `evento_exclusion`, `cupon`, `cupon_uso` (nuevas) + `descuento` y `sub_rol_empresa` (existen,
 * se amplían) + `cuenta_empresa.id_sub_rol_empresa` (columna nueva, M04).
 * Depende de M01 (precio base y catálogo), M04 (cuentas empresa) y M17 (parámetros: IVA y umbrales).
 * Lo consumen M05 (carrito), M07 (checkout), M08 (orden), M02 (filtro y orden), M21 (cotizaciones),
 * M01 (tarjetas y ficha con oferta) y M04 (tipo de cliente empresa al aprobar).
 *
 * Este contrato ES la especificación del módulo (no existe documento funcional de M06) y lo que
 * el Tech Lead revisa antes de que se escriba el código. Lo que cambie aquí cambia el módulo.
 * La guía para quien haga el carrito está en docs/02_MODULOS_FUNCIONALES/M06_GUIA_PARA_EL_CARRITO.md.
 *
 * ── Qué es M06 ──────────────────────────────────────────────────────────────
 *  El único lugar donde se decide CUÁNTO CUESTA algo para un cliente en un momento dado.
 *  Los precios base ya se ponen en M01 (en la variante); M06 NO los edita. M06 hace tres cosas:
 *   1. MOTOR DE EVENTOS: un panel propio (`/admin/promociones`) donde se arman eventos de
 *      descuento con fechas, días de la semana que se repiten, horas, marcas / líneas con su
 *      propio porcentaje cada una, y excepciones (un producto, una variante, un color, una familia
 *      de color). Ej.: "Miércoles de color": todos los miércoles, líneas de Pintuco elegidas con
 *      distinto % cada una, todo excepto el blanco.
 *   2. TIPOS DE CLIENTE EMPRESA: cada cuenta empresa tiene un tipo (Proveedor 15 %, Constructora
 *      10 %…). El administrador crea tipos nuevos y cambia sus porcentajes. El descuento aplica
 *      a TODO el carrito y solo si este supera un monto mínimo configurable, que se le avisa al cliente.
 *   3. CÁLCULO ÚNICO: dado un carrito y un cliente, devuelve el precio de cada línea con el desglose
 *      de cada descuento, el aviso de lo que le falta para el descuento de empresa, los totales y el
 *      IVA. Lo mismo, en pequeño, alimenta las tarjetas y la página de Promociones.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No cambia el precio base ni el IVA: el precio es de la variante (M01) y el IVA es el parámetro
 *    `comercial.iva_porcentaje` de M17 (editable ahí y ya en el sistema; M06 solo lo lee).
 *  · No guarda cálculos. Cada llamada recalcula; quien necesite conservar el resultado (la orden de
 *    M08) lo copia y NO lo recalcula (D07 de M08). Cambiar una regla después no toca ninguna orden creada.
 *  · No calcula envío ni lo exonera (M12); `total` es solo de mercancía, IVA incluido.
 *  · No decide quién es empresa: eso lo aprueba M04. M06 solo administra los TIPOS y sus descuentos.
 *  · No dibuja el carrito ni las tarjetas: entrega los datos (ver "Piezas en otros módulos").
 *  · No hace descuentos por volumen, 2×1, regalos ni puntos.
 *
 * ── Tres tipos de descuento ─────────────────────────────────────────────────
 *  EVENTO   Descuento por porcentaje, con calendario y alcance. Es el único que se ve en las
 *           tarjetas de producto (precio tachado + etiqueta con el %).
 *  EMPRESA  Descuento del tipo de cliente empresa. NUNCA se ve en tarjetas ni en la ficha: depende
 *           del total del carrito, así que solo aparece en el carrito.
 *  CUPÓN    Código que el cliente escribe en el carrito.
 *
 * ── JERARQUÍA (no se suman) ─────────────────────────────────────────────────
 *  Cada descuento se aplica sobre el precio que dejó el anterior, en este orden:
 *      precio base → evento → empresa → cupón
 *  Ej.: producto de 100, evento 10 % → 90; cliente empresa 15 % → 15 % de 90 = 13,50 → 76,50.
 *  NO es 100 − 25 % = 75. Lo que se congela en la orden es cada paso con su porcentaje e importe.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R1  Orden de cálculo por línea: precio base → evento → descuento empresa → cupón. Cada paso que
 *      resta algo es una fila del desglose con su `ordenAplicacion` (1, 2, 3…, igual que en
 *      `linea_orden_descuento`). Un paso que no aplica no deja fila ni hueco en la numeración.
 *  R2  Producto con `excluidoDeDescuentos` (combos o los que se marquen en M01): no recibe NINGÚN
 *      descuento —ni evento, ni empresa, ni cupón— solo su precio base (CA-CAT-13-09). Tampoco cuenta
 *      para el reparto de un cupón. Sí suma al total del carrito que se compara con el mínimo de empresa (R10).
 *  R3  Una línea con `precioAcordado` (cotización de M21) conserva ese precio tal cual: sin descuentos
 *      y sin revalidar con M01. Solo el servicio interno lo puede enviar; el HTTP público lo ignora.
 *  R4  EVENTO EN CURSO: un evento está en curso cuando su estado es activo y ahora, en hora de Colombia
 *      (America/Bogota), cumple las tres cosas: la fecha está entre `fechaInicio` y `fechaFin`
 *      (inclusive; sin fin = abierto), el día de la semana es uno de `diasSemana` (vacío = todos los
 *      días) y la hora está en [`horaInicio`, `horaFin`) (sin horas = todo el día). Días ISO: 1 = lunes … 7 = domingo.
 *      Ej.: "todos los miércoles" = diasSemana [3], sin fecha fin. Un evento de un solo día = fechaInicio igual a fechaFin.
 *  R5  Cada evento tiene una o más REGLAS; cada regla tiene su propio porcentaje y un objetivo: una
 *      marca, línea comercial, categoría, subcategoría, producto o variante (o todo el catálogo si el
 *      objetivo es null). Así un mismo evento da 15 % a una línea y 10 % a otra.
 *  R6  EXCEPCIONES. Una regla puede llevar sus exclusiones y el evento puede llevar exclusiones para
 *      todas sus reglas. Una exclusión es una marca, línea, categoría, subcategoría, producto,
 *      variante, un COLOR o una FAMILIA DE COLOR (el blanco = familia "Blancos"). Si la línea de
 *      compra coincide con cualquier exclusión de la regla o del evento, esa regla no le aplica.
 *      Ej.: "toda la línea V menos este producto" = regla {objetivo: línea V, exclusiones: [producto X]}.
 *      "toda la línea V menos este color" = regla {objetivo: línea V, exclusiones: [color C]}; ese
 *      color solo se excluye en esa regla, no en el resto del evento.
 *  R7  Entre todas las reglas de eventos en curso que cubren una línea NO se suman: gana la de mayor
 *      porcentaje (empate: menor idEvento, luego menor idRegla).
 *  R8  Las exclusiones por color y familia de color solo se evalúan cuando se conoce el color elegido
 *      (línea del carrito con color, o ficha con color escogido). Sin color elegido (tarjetas, listados)
 *      se ignoran: la tarjeta anuncia la oferta del producto y el carrito/ficha con color la ajustan.
 *  R9  Todo se calcula en pesos con 2 decimales, redondeo "mitad hacia arriba", POR LÍNEA: el importe de
 *      cada paso es sobre el subtotal de la línea (precio × cantidad). Para repartir un monto entre
 *      líneas (tope, cupón fijo) cada una recibe su parte truncada a centavos y el sobrante de centavos
 *      va a la línea de mayor monto; así la suma es exacta. El subtotal de la línea es la verdad;
 *      `precioUnitarioFinal` es subtotal / cantidad redondeado y solo informa.
 *  R10 DESCUENTO EMPRESA. Lo recibe una cuenta empresa con un tipo activo. Es el porcentaje del tipo,
 *      aplicado a TODAS las líneas elegibles (R2) ya con su evento. Solo aplica si el total del carrito
 *      después de los eventos (todas las líneas vendibles, incluidas las excluidas de descuento)
 *      alcanza o supera `montoMinimoCompra` del tipo (0 = sin mínimo). Si no lo alcanza NO se aplica y el
 *      cálculo avisa cuánto falta (`faltante`) para que el carrito se lo diga al cliente.
 *  R11 El `tope` del tipo (monto máximo de ahorro por empresa en toda la compra; 0 = sin tope) se
 *      reparte entre las líneas en proporción a su ahorro (R9).
 *  R12 AVISOS. Cálculo con `avisos`: (a) `empresa_falta_monto`: cuenta empresa con tipo cuyo carrito no
 *      llega al mínimo; (b) `sugerir_cuenta_empresa`: cliente REGISTRADO tipo particular cuyo total
 *      después de eventos alcanza el parámetro `comercial.umbral_sugerir_empresa` de M17 (invitación a
 *      pedir la cuenta empresa). El visitante sin sesión no recibe (b). Ambos son solo informativos.
 *  R13 Cupón: uno por compra. Se aplica sobre el subtotal ya rebajado de las líneas elegibles (R2).
 *      `porcentaje` descuenta ese % de cada línea; `importe_fijo` descuenta el valor repartido entre las
 *      líneas en proporción a su subtotal, sin pasar de lo que valen. Un cupón que no aplica NO rompe el
 *      cálculo: se informa con su motivo y el resto sigue.
 *  R14 Un cupón es válido si: está activo, vigente (fechas), no agotó `usosMaximos`, el usuario no agotó
 *      `usosPorUsuario` (exige sesión; si no hay, `requiere_sesion`), la audiencia coincide y el subtotal
 *      elegible alcanza `montoMinimoCompra`. El código es único sin distinguir mayúsculas y no se cambia
 *      una vez creado. Uno inexistente o inactivo responde igual (`cupon_no_valido`: no se revela cuáles existen).
 *  R15 Usar un cupón queda registrado solo cuando la orden se crea: `registrarUsoCupon` es atómico
 *      (nunca supera `usosMaximos`), idempotente por `referencia`, y se revierte con `liberarUsoCupon` al
 *      cancelarse la orden. Calcular NO reserva el cupón.
 *  R16 IVA: los precios de M01 ya lo incluyen. `baseSinImpuesto` = total / (1 + tasa) redondeado a 2
 *      decimales; `importeIva` = total − base. La tasa es `comercial.iva_porcentaje` de M17 (leída por
 *      `ConfiguracionPort`) y viaja en el resultado para que M08 la congele (CA-ORD-02-05).
 *  R17 Una línea no vendible según M01 (variante inactiva, producto retirado, color no ofrecido, combo
 *      agotado) NO se precia ni suma a los totales: vuelve con `vendible: false` y su motivo. El cálculo
 *      nunca falla por una línea no vendible.
 *  R18 Eventos, cupones y tipos de cliente no se borran: se desactivan. Editar uno en curso aplica desde
 *      ese instante; las órdenes ya creadas no cambian.
 *  R19 Al guardar un evento cada objetivo y exclusión debe existir en el catálogo; si no, 400
 *      OBJETIVO_NO_EXISTE con la lista de los inválidos (sin guardar nada).
 *  R20 Desactivar un tipo de cliente empresa deja a sus cuentas sin descuento hasta que se les asigne
 *      otro tipo; la pantalla muestra `cuentasAsociadas` antes de confirmarlo. Una cuenta empresa sin tipo
 *      (las anteriores a este módulo) no recibe descuento.
 *  R21 Autorización siempre en servidor. La administración responde 404 RECURSO_NO_DISPONIBLE a toda
 *      denegación (sin sesión o sin permiso). El cálculo y lo público son abiertos (la sesión es opcional
 *      y solo sirve para el perfil del cliente).
 *
 * ── Pantallas ───────────────────────────────────────────────────────────────
 *  PANEL PROPIO `/admin/promociones` (pestañas): Eventos (lista con situación, crear/editar, "ver qué
 *  productos entran") · Cupones · Clientes empresa (tipos con %, monto mínimo y tope) · Simulador.
 *  Editor de evento: nombre y descripción; calendario (fechas, se repite todos los días / días elegidos,
 *  horas); lista de reglas (cada una: marca → línea → producto/variante, su %, sus excepciones);
 *  excepciones generales del evento.
 *  PÚBLICO (pintan otros módulos con datos de M06): pestaña Promociones, etiqueta con % y precio
 *  tachado en tarjetas y ficha, aviso de descuento de empresa y campo de cupón en el carrito.
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  Administración: GET → catalogo.ver · POST, PUT y PATCH → catalogo.editar.
 *  `POST /admin/precios/simular` y `/admin/precios/eventos/vista-previa` → catalogo.ver (no escriben).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Se reutilizan `catalogo.ver` y `catalogo.editar` (ya se describe como "Editar productos, precios e
 *      imágenes"): sin permisos nuevos ni tocar M17. Alternativa: `precios.ver` / `precios.editar`.
 *  D2  Los eventos son SOLO porcentaje (así la etiqueta "−15 %" y el precio tachado siempre cuadran) y
 *      aplican a todos los clientes. Los cupones sí pueden ser porcentaje o importe fijo.
 *  D3  El mínimo de compra del descuento de empresa es POR TIPO de cliente (Proveedor puede exigir uno
 *      distinto a Constructora), se compara contra el total después de eventos e IVA incluido, y se cumple con ">=".
 *      Alternativa: un único mínimo global como parámetro de M17.
 *  D4  El `tope` del tipo es por compra completa y 0 = sin tope. Se conserva porque la tabla `descuento` ya lo
 *      tiene; si no se quiere, se deja siempre en 0 y se oculta en la pantalla.
 *  D5  Las tarjetas muestran el precio con evento por unidad; el carrito calcula por línea. Con cantidad > 1 puede
 *      haber diferencia de centavos entre N × precio de tarjeta y el subtotal del carrito. El subtotal manda.
 *      M08 debe copiar el subtotal de la línea y no recomputarlo desde el unitario.
 *  D6  Los precios de la variante incluyen IVA (R16); cuadra con RF-BUS-02-04 y con `base_sin_impuesto` /
 *      `importe_iva` de la orden. Si no fuera así, avisar antes de programar.
 *  D7  M06 lee, solo lectura, tablas del catálogo (producto, variante, línea, marca, subcategoría,
 *      categoría, color, familia de color) para saber a qué evento pertenece cada línea, y `usuario` /
 *      `cuenta_empresa` para el perfil del cliente (no hay puertos para eso; M08 ya hace algo así con el
 *      catálogo). Para saber si una línea se puede vender y a qué precio base usa `CatalogoParaCompraPort` de M01.
 *  D8  El tipo de cliente empresa lo asigna el ADMINISTRADOR al aprobar la solicitud (decisión de negocio, no
 *      del solicitante), y lo puede cambiar después. Se guarda en `cuenta_empresa.id_sub_rol_empresa`
 *      (sub-rol empresarial = tipo de cliente). `rol.id_sub_rol_empresa` deja de usarse para esto.
 *  D9  Valores iniciales (seed) a confirmar: tipos "Proveedor" 15 % y "Constructora" 10 % (renombran los dos
 *      sub-roles del seed), sin mínimo ni tope; `comercial.umbral_sugerir_empresa` = 500 000.
 *  D10 Los objetivos y exclusiones de un evento no llevan clave foránea (apuntan a varias tablas); la
 *      integridad la valida el servicio (R19). El catálogo no borra filas, así que no quedan ids colgantes.
 *  D11 El `nombre` del evento se muestra al cliente y se congela como `origen` del descuento en la orden.
 *  D12 PROPUESTAS incluidas, que se pueden quitar sin afectar el resto: el simulador y la vista previa de
 *      "qué productos entran en este evento" (útil para comprobar las excepciones antes de publicar).
 *  D14 El editor de eventos busca marcas, líneas, productos, colores… por nombre con una ruta propia de M06
 *      (`GET /referencias`, solo lectura, catalogo.ver) en vez de usar las de M01: así M06 no depende de su
 *      frontend ni de sus formas de respuesta.
 *  D13 Los cupones se conservan (el campo está en el mockup del carrito); no estaban en tu lista, di si sobran.
 *
 * ── Piezas en otros módulos (cada una en su PR pequeño, con visto bueno del Tech Lead) ──
 *  C1  BD (PR general): tablas nuevas; `descuento.monto_minimo_compra`; `cuenta_empresa.id_sub_rol_empresa`;
 *      enums; seed (D9); Prisma.
 *  C2  M17: parámetro nuevo `comercial.umbral_sugerir_empresa` (seed, lista de claves del contrato, espejos).
 *  C3  M04: (a) el dictamen que APRUEBA un registro o un ascenso exige `idSubRolEmpresa` (no el de renovación
 *      de NIT); la cuenta nace con ese tipo; (b) `GET /admin/empresas/tipos` (lista de tipos activos para el
 *      selector, vía `TiposClienteEmpresaPort`); (c) `GET /admin/empresas/cuentas` y
 *      `PATCH /admin/empresas/cuentas/:idUsuario/tipo` para ver y cambiar el tipo; (d) el perfil de la
 *      empresa muestra su tipo y su descuento. Permiso: `empresas.validar`.
 *  C4  M01: (a) `GET /catalogo/productos` acepta `enOferta` y la tarjeta trae `oferta`; la ficha trae
 *      el precio con oferta por variante (usan `PreciosPort`); (b) `reglasComerciales` del impacto de
 *      desactivación usa `ImpactoReglasPort` (hoy 0 fijo).
 *  C5  Frontend público: la insignia "Ofertas" del menú apunta a `/productos?enOferta=true` y esa página
 *      muestra los eventos en curso arriba; tarjetas con etiqueta y precio tachado; botón "¿Tienes
 *      empresa? Regístrate" en la landing para el cliente registrado particular (lleva a la sección Empresa
 *      del perfil, donde ya está el ascenso).
 *  C6  M05 (cuando se haga): usar `PreciosPort.calcular` y pintar descuentos, avisos y cupón (guía aparte).
 *
 * ── Preguntas abiertas para otros módulos (no bloquean este contrato) ───────
 *  P1  M02 (RF-BUS-02-04, filtro y orden por precio final): como el descuento de empresa depende del total
 *      del carrito, el precio de un listado solo puede incluir el EVENTO, nunca el de empresa. M02 filtra y
 *      ordena por `precioConOferta` (con `preciosDeVariantes`, por lotes de hasta 500). Hay que reflejarlo en
 *      el RF de M02, que hoy dice "empresa incluida".
 *  P2  M07 debe llamar `registrarUsoCupon` ANTES de crear la orden y, si falla, recalcular y avisar.
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
export const MAXIMO_PRODUCTOS_OFERTA = 100;
export const MAXIMO_REGLAS_EVENTO = 50;
export const MAXIMO_EXCLUSIONES = 200;
export const CANTIDAD_MAXIMA_LINEA = 9_999;
export const IMPORTE_MAXIMO = 9_999_999_999.99;
export const ZONA_HORARIA = 'America/Bogota';

export const idSchema = z.number().int().positive();
/** Dinero en pesos con hasta 2 decimales (el redondeo lo hace el servicio, R9). */
export const dineroSchema = z.number().min(0).max(IMPORTE_MAXIMO);
/** Porcentaje de un evento o de un tipo de cliente: más de 0 y hasta 100, con 2 decimales como máximo. */
export const porcentajeSchema = z
  .number()
  .gt(0)
  .max(100)
  .refine((v) => Math.round(v * 100) / 100 === v, { message: 'El porcentaje admite máximo dos decimales' });
export const cantidadSchema = z.number().int().min(1).max(CANTIDAD_MAXIMA_LINEA);
export const nombreSchema = z.string().trim().min(3).max(100);
export const descripcionSchema = z.string().trim().min(1).max(500);
export const fechaHoraSchema = z.string().datetime();
/** Fecha de calendario en hora de Colombia: AAAA-MM-DD. */
export const fechaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
/** Hora del día en hora de Colombia: HH:MM (24 h). */
export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
/** Día ISO: 1 = lunes … 7 = domingo (R4). */
export const diaSemanaSchema = z.number().int().min(1).max(7);

export const estadoSchema = z.enum(['activo', 'inactivo']);
export type Estado = z.infer<typeof estadoSchema>;

export const tipoValorSchema = z.enum(['porcentaje', 'importe_fijo']);
export type TipoValor = z.infer<typeof tipoValorSchema>;

export const audienciaSchema = z.enum(['todos', 'particular', 'empresa']);
export type Audiencia = z.infer<typeof audienciaSchema>;

/** Qué parte del catálogo cubre una regla (R5). */
export const tipoObjetivoSchema = z.enum(['marca', 'linea', 'categoria', 'subcategoria', 'producto', 'variante']);
export type TipoObjetivo = z.infer<typeof tipoObjetivoSchema>;

/** Qué se saca de una regla o evento (R6): lo mismo más color y familia de color. */
export const tipoExclusionSchema = z.enum([...tipoObjetivoSchema.options, 'color', 'familia_color']);
export type TipoExclusion = z.infer<typeof tipoExclusionSchema>;

export const objetivoSchema = z.object({ tipo: tipoObjetivoSchema, id: idSchema });
export type Objetivo = z.infer<typeof objetivoSchema>;

export const exclusionSchema = z.object({ tipo: tipoExclusionSchema, id: idSchema });
export type Exclusion = z.infer<typeof exclusionSchema>;

/** Referencia al catálogo con su nombre, para mostrarla en el panel. */
export const referenciaCatalogoSchema = z.object({ tipo: tipoExclusionSchema, id: idSchema, nombre: z.string() });
export type ReferenciaCatalogo = z.infer<typeof referenciaCatalogoSchema>;

/**
 * Situación de un evento (derivada, no se guarda). `en_curso` = aplica ahora; `en_espera` = dentro de
 * sus fechas pero hoy o a esta hora no toca (otro día de la semana, fuera de horas).
 */
export const situacionEventoSchema = z.enum(['programado', 'en_curso', 'en_espera', 'vencido', 'inactivo']);
export type SituacionEvento = z.infer<typeof situacionEventoSchema>;

/** Situación de un cupón (derivada). */
export const situacionCuponSchema = z.enum(['programado', 'vigente', 'vencido', 'inactivo']);
export type SituacionCupon = z.infer<typeof situacionCuponSchema>;

/** Código del cupón: mayúsculas, números, guion y guion bajo (R14). */
export const codigoCuponSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{6,30}$/);

/**
 * Lo que escribe el cliente en el campo de cupón: cualquier texto corto. No se valida el formato aquí: un código
 * mal escrito responde `cupon_no_valido` en el cálculo (R14) en vez de un 400 que el carrito tendría que traducir.
 */
export const codigoCuponEntradaSchema = z.string().trim().min(1).max(60);

/** Booleano en query string ("true"/"false"): z.coerce.boolean() trataría "false" como true. */
const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

const sinRepetidos = (valores: readonly number[]): boolean => new Set(valores).size === valores.length;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. EVENTOS DE DESCUENTO (el motor)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Cuándo está en curso un evento (R4). */
export const calendarioEventoSchema = z.object({
  fechaInicio: fechaSchema,
  /** Inclusive; null = sin fin. */
  fechaFin: fechaSchema.nullable(),
  /** Vacío = todos los días del rango. [3] = todos los miércoles. */
  diasSemana: z.array(diaSemanaSchema).max(7),
  /** Ambas o ninguna; null = todo el día. */
  horaInicio: horaSchema.nullable(),
  horaFin: horaSchema.nullable(),
});
export type CalendarioEvento = z.infer<typeof calendarioEventoSchema>;

/** Una regla: su objetivo, su porcentaje y sus excepciones (R5, R6). */
export const reglaEventoRequestSchema = z.object({
  /** Null = todo el catálogo. */
  objetivo: objetivoSchema.nullable(),
  porcentaje: porcentajeSchema,
  exclusiones: z.array(exclusionSchema).max(MAXIMO_EXCLUSIONES),
});
export type ReglaEventoRequest = z.infer<typeof reglaEventoRequestSchema>;

export const reglaEventoSchema = z.object({
  idRegla: idSchema,
  objetivo: referenciaCatalogoSchema.nullable(),
  porcentaje: porcentajeSchema,
  exclusiones: z.array(referenciaCatalogoSchema),
});
export type ReglaEvento = z.infer<typeof reglaEventoSchema>;

/** Campos que se escriben al crear o editar un evento. */
const eventoCamposSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema.nullable(),
  calendario: calendarioEventoSchema,
  reglas: z.array(reglaEventoRequestSchema).min(1).max(MAXIMO_REGLAS_EVENTO),
  /** Excepciones de todas las reglas del evento (R6). */
  exclusiones: z.array(exclusionSchema).max(MAXIMO_EXCLUSIONES),
});

/** Reglas que cruzan campos; compartidas por crear, editar y la vista previa. */
function validarEvento(v: z.infer<typeof eventoCamposSchema>, ctx: z.RefinementCtx): void {
  const c = v.calendario;
  if (c.fechaFin !== null && c.fechaFin < c.fechaInicio) {
    ctx.addIssue({
      code: 'custom',
      path: ['calendario', 'fechaFin'],
      message: 'La fecha fin no puede ser anterior al inicio',
    });
  }
  if (!sinRepetidos(c.diasSemana)) {
    ctx.addIssue({ code: 'custom', path: ['calendario', 'diasSemana'], message: 'Días repetidos' });
  }
  if ((c.horaInicio === null) !== (c.horaFin === null)) {
    ctx.addIssue({ code: 'custom', path: ['calendario', 'horaFin'], message: 'Las horas van las dos o ninguna' });
  } else if (c.horaInicio !== null && c.horaFin !== null && c.horaFin <= c.horaInicio) {
    ctx.addIssue({
      code: 'custom',
      path: ['calendario', 'horaFin'],
      message: 'La hora fin debe ser posterior a la de inicio',
    });
  }
}

export const eventoSchema = z.object({
  idEvento: idSchema,
  nombre: nombreSchema,
  descripcion: descripcionSchema.nullable(),
  estado: estadoSchema,
  situacion: situacionEventoSchema,
  calendario: calendarioEventoSchema,
  reglas: z.array(reglaEventoSchema),
  exclusiones: z.array(referenciaCatalogoSchema),
  fechaCreacion: fechaHoraSchema,
  fechaActualizacion: fechaHoraSchema,
  /** Nombre de quien lo editó por última vez; null si ese usuario ya no existe. */
  actualizadoPor: z.string().nullable(),
});
export type Evento = z.infer<typeof eventoSchema>;

/** Fila de la lista de eventos (sin el detalle de reglas). */
export const eventoResumenSchema = z.object({
  idEvento: idSchema,
  nombre: nombreSchema,
  estado: estadoSchema,
  situacion: situacionEventoSchema,
  calendario: calendarioEventoSchema,
  totalReglas: z.number().int().positive(),
  /** El mayor porcentaje de sus reglas. */
  porcentajeMaximo: porcentajeSchema,
  fechaActualizacion: fechaHoraSchema,
});
export type EventoResumen = z.infer<typeof eventoResumenSchema>;

/** GET /eventos */
export const listarEventosRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  situacion: situacionEventoSchema.optional(),
});
export type ListarEventosRequest = z.infer<typeof listarEventosRequestSchema>;

/** POST /eventos — nace activo. */
export const crearEventoRequestSchema = eventoCamposSchema.superRefine(validarEvento);
export type CrearEventoRequest = z.infer<typeof crearEventoRequestSchema>;

/** PUT /eventos/:idEvento — reemplaza todos los campos (R18). */
export const actualizarEventoRequestSchema = crearEventoRequestSchema;
export type ActualizarEventoRequest = z.infer<typeof actualizarEventoRequestSchema>;

/** PATCH …/estado (eventos, cupones y tipos de cliente). */
export const cambiarEstadoRequestSchema = z.object({ estado: estadoSchema });
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

/**
 * POST /eventos/vista-previa — qué productos entran con este borrador (D12). No guarda. Se pagina con
 * `pagina` y `limite` en la query. Un producto entra si al menos una de sus variantes (con algún color) recibe la oferta.
 */
export const vistaPreviaEventoRequestSchema = crearEventoRequestSchema;
export type VistaPreviaEventoRequest = z.infer<typeof vistaPreviaEventoRequestSchema>;

export const productoAfectadoSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  marca: z.string(),
  linea: z.string().nullable(),
  /** El mayor porcentaje que recibe alguna de sus variantes (R7). */
  porcentaje: porcentajeSchema,
  /** Variantes activas del producto que sí reciben el descuento / total de variantes activas. */
  variantesConDescuento: z.number().int().nonnegative(),
  variantesTotales: z.number().int().nonnegative(),
});
export type ProductoAfectado = z.infer<typeof productoAfectadoSchema>;

/** GET /referencias — buscador del editor de eventos (D14): activos cuyo nombre contiene el texto. */
export const buscarReferenciasRequestSchema = z.object({
  tipo: tipoExclusionSchema,
  busqueda: z.string().trim().max(100).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type BuscarReferenciasRequest = z.infer<typeof buscarReferenciasRequestSchema>;

/** Evento en curso, tal como se enseña al público (pestaña Promociones). */
export const eventoPublicoSchema = z.object({
  idEvento: idSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  porcentajeMaximo: porcentajeSchema,
  calendario: calendarioEventoSchema,
});
export type EventoPublico = z.infer<typeof eventoPublicoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. CUPONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** Campos que se escriben al crear o editar un cupón (R13, R14). */
const cuponCamposSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema.nullable(),
  tipoValor: tipoValorSchema,
  valor: z.number().gt(0).max(IMPORTE_MAXIMO),
  /** Subtotal elegible mínimo para poder usarlo; null = sin mínimo. */
  montoMinimoCompra: dineroSchema.nullable(),
  /** Veces que se puede usar en total; null = sin límite. */
  usosMaximos: z.number().int().min(1).nullable(),
  /** Veces que lo puede usar una misma persona; null = sin límite (con un número exige sesión). */
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
  situacion: situacionCuponSchema,
  /** Usos registrados y no liberados (R15). */
  usosActuales: z.number().int().nonnegative(),
  fechaCreacion: fechaHoraSchema,
  fechaActualizacion: fechaHoraSchema,
  actualizadoPor: z.string().nullable(),
});
export type Cupon = z.infer<typeof cuponSchema>;

/** Un uso de un cupón (R15). */
export const usoCuponSchema = z.object({
  idCuponUso: idSchema,
  idCupon: idSchema,
  idUsuario: idSchema.nullable(),
  /** Nombre del usuario; null si ya no existe. */
  usuario: z.string().nullable(),
  /** Identificador de la orden que lo usó. */
  referencia: z.string(),
  importeDescuento: dineroSchema,
  fecha: fechaHoraSchema,
  /** Fecha en que se liberó (orden cancelada); null si sigue en pie. */
  liberadoEn: fechaHoraSchema.nullable(),
});
export type UsoCupon = z.infer<typeof usoCuponSchema>;

/** GET /cupones */
export const listarCuponesRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  situacion: situacionCuponSchema.optional(),
});
export type ListarCuponesRequest = z.infer<typeof listarCuponesRequestSchema>;

/** POST /cupones — nace activo. */
export const crearCuponRequestSchema = cuponCamposSchema
  .extend({ codigo: codigoCuponSchema })
  .superRefine(validarCupon);
export type CrearCuponRequest = z.infer<typeof crearCuponRequestSchema>;

/** PUT /cupones/:idCupon — el código no se cambia (R14). */
export const actualizarCuponRequestSchema = cuponCamposSchema.superRefine(validarCupon);
export type ActualizarCuponRequest = z.infer<typeof actualizarCuponRequestSchema>;

/** GET /cupones/:idCupon/usos */
export const listarUsosCuponRequestSchema = paginacionQuerySchema.extend({
  incluirLiberados: booleanoQuerySchema.optional(),
});
export type ListarUsosCuponRequest = z.infer<typeof listarUsosCuponRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. TIPOS DE CLIENTE EMPRESA (sub-roles empresariales con su descuento)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Campos que se escriben al crear o editar un tipo. `descuento` y `sub_rol_empresa` se guardan juntos. */
const tipoClienteCamposSchema = z.object({
  /** "Proveedor", "Constructora"… */
  nombre: nombreSchema,
  porcentaje: porcentajeSchema,
  /** Total del carrito (después de eventos, IVA incluido) desde el que aplica el descuento; 0 = sin mínimo (R10). */
  montoMinimoCompra: dineroSchema,
  /** Monto máximo de ahorro por compra; 0 = sin tope (R11, D4). */
  tope: dineroSchema,
});

export const tipoClienteEmpresaSchema = tipoClienteCamposSchema.extend({
  idSubRolEmpresa: idSchema,
  estado: estadoSchema,
  /** Cuentas empresa que hoy tienen este tipo (R20). */
  cuentasAsociadas: z.number().int().nonnegative(),
});
export type TipoClienteEmpresa = z.infer<typeof tipoClienteEmpresaSchema>;

/** POST /tipos-cliente-empresa — nace activo. */
export const crearTipoClienteRequestSchema = tipoClienteCamposSchema;
export type CrearTipoClienteRequest = z.infer<typeof crearTipoClienteRequestSchema>;

/** PUT /tipos-cliente-empresa/:idSubRolEmpresa */
export const actualizarTipoClienteRequestSchema = tipoClienteCamposSchema;
export type ActualizarTipoClienteRequest = z.infer<typeof actualizarTipoClienteRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. CÁLCULO (lo central del módulo)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Perfil comercial del cliente. Se resuelve por la sesión (D7); el simulador lo fija a mano. */
export const perfilComercialSchema = z.object({
  tipo: z.enum(['particular', 'empresa']),
  /** Solo para `empresa`; null = sin tipo, por tanto sin descuento (R20). */
  idSubRolEmpresa: idSchema.nullable(),
});
export type PerfilComercial = z.infer<typeof perfilComercialSchema>;

/** Línea que se quiere preciar. */
export const lineaCalculoSchema = z.object({
  idVariante: idSchema,
  /** El color que eligió el cliente; null si el producto no tiene color (R8). */
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
  /** El código que escribió el cliente; se normaliza (R14). */
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type CalcularRequest = z.infer<typeof calcularRequestSchema>;

/** POST /admin/precios/simular — igual, más cliente y momento simulados. */
export const simularRequestSchema = calcularRequestSchema.extend({
  perfil: perfilComercialSchema,
  /** Si se manda, el simulador comprueba también los límites de uso de ese usuario y cuenta como registrado (R12). */
  idUsuario: idSchema.optional(),
  /** Fecha y hora a simular; por defecto, ahora. */
  momento: fechaHoraSchema.optional(),
});
export type SimularRequest = z.infer<typeof simularRequestSchema>;

export const tipoOrigenDescuentoSchema = z.enum(['evento', 'empresa', 'cupon']);
export type TipoOrigenDescuento = z.infer<typeof tipoOrigenDescuentoSchema>;

/** Un descuento aplicado a una línea. Mapea 1 a 1 a una fila de `linea_orden_descuento` (R1). */
export const descuentoAplicadoSchema = z.object({
  /** 1, 2, 3… en el orden en que se aplicó (R1). */
  ordenAplicacion: z.number().int().min(1),
  tipoOrigen: tipoOrigenDescuentoSchema,
  /** Id del evento, del sub-rol empresarial o del cupón. */
  idRegla: idSchema,
  /** Texto que se congela en la orden (D11): nombre del evento, "Descuento empresa · Proveedor", "Cupón X". */
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
export type MotivoNoVendible = z.infer<typeof motivoNoVendibleSchema>;

export const lineaCalculadaSchema = z.object({
  /** Posición de la línea en la petición (base 0). */
  indice: z.number().int().nonnegative(),
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  cantidad: cantidadSchema,
  /** R17: false = no se precia y no suma. Los campos de dinero vienen null. */
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
  /** Lo que se cobra por la línea, IVA incluido. Es la verdad (R9). */
  subtotal: dineroSchema.nullable(),
  /** Informativo (R9). */
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

/** Estado del descuento de empresa en este carrito (R10). Null en el cálculo si el cliente no tiene tipo. */
export const descuentoEmpresaCalculoSchema = z.object({
  idSubRolEmpresa: idSchema,
  /** "Proveedor", "Constructora"… */
  tipo: z.string(),
  porcentaje: porcentajeSchema,
  montoMinimoCompra: dineroSchema,
  /** El total del carrito después de eventos con el que se comparó el mínimo. */
  totalCarrito: dineroSchema,
  aplicado: z.boolean(),
  /** Cuánto falta para llegar al mínimo; null si ya se aplicó. */
  faltante: dineroSchema.nullable(),
  /** Lo que restó en total; 0 si no se aplicó. */
  descuento: dineroSchema,
});
export type DescuentoEmpresaCalculo = z.infer<typeof descuentoEmpresaCalculoSchema>;

/** Avisos para el carrito (R12): solo informan, no cambian el precio. */
export const avisoCalculoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('empresa_falta_monto'),
    /** "Proveedor". */
    tipoCliente: z.string(),
    porcentaje: porcentajeSchema,
    montoMinimo: dineroSchema,
    faltante: dineroSchema,
  }),
  z.object({
    tipo: z.literal('sugerir_cuenta_empresa'),
    /** El parámetro `comercial.umbral_sugerir_empresa`. */
    umbral: dineroSchema,
  }),
]);
export type AvisoCalculo = z.infer<typeof avisoCalculoSchema>;

export const resumenCalculoSchema = z.object({
  /** Suma de `subtotalInicial` de las líneas vendibles. Es `orden.sub_total`. */
  subtotalInicial: dineroSchema,
  descuentoEventos: dineroSchema,
  descuentoEmpresa: dineroSchema,
  descuentoCupon: dineroSchema,
  /** Suma de los tres. Es `orden.descuento`. */
  descuentoTotal: dineroSchema,
  /** Mercancía con IVA incluido, sin envío (R16). */
  total: dineroSchema,
  /** Tasa vigente en porcentaje (R16). */
  tasaIva: z.number().min(0).max(100),
  baseSinImpuesto: dineroSchema,
  importeIva: dineroSchema,
});
export type ResumenCalculo = z.infer<typeof resumenCalculoSchema>;

export const calculoSchema = z.object({
  lineas: z.array(lineaCalculadaSchema),
  /** Null si no se mandó código. */
  cupon: resultadoCuponSchema.nullable(),
  /** Null si el cliente no es empresa o no tiene un tipo activo. */
  empresa: descuentoEmpresaCalculoSchema.nullable(),
  avisos: z.array(avisoCalculoSchema),
  resumen: resumenCalculoSchema,
  /** Perfil con el que se calculó. */
  perfil: perfilComercialSchema,
  /** Momento del cálculo; la orden lo puede guardar como referencia. */
  calculadoEn: fechaHoraSchema,
});
export type Calculo = z.infer<typeof calculoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. OFERTAS EN TARJETAS, FICHA Y PROMOCIONES (solo eventos; nunca empresa ni cupón)
 * ─────────────────────────────────────────────────────────────────────────── */

export const ofertaEventoSchema = z.object({
  idEvento: idSchema,
  nombre: z.string(),
  /** La etiqueta de la tarjeta: "−15 %". */
  porcentaje: porcentajeSchema,
  /** Precio unitario sin la oferta (el que se tacha). */
  precioAntes: dineroSchema,
  /** Precio unitario con la oferta, IVA incluido. */
  precioConOferta: dineroSchema,
});
export type OfertaEvento = z.infer<typeof ofertaEventoSchema>;

/**
 * Oferta de un producto para su tarjeta: la de su variante con oferta de menor precio (D5). Null en
 * `oferta` = el producto no está en oferta ahora.
 */
export const ofertaProductoSchema = z.object({
  idProducto: idSchema,
  idVariante: idSchema.nullable(),
  oferta: ofertaEventoSchema.nullable(),
});
export type OfertaProducto = z.infer<typeof ofertaProductoSchema>;

export const consultaPrecioSchema = z.object({
  idVariante: idSchema,
  /** Con color se aplican también las exclusiones de color (R8). */
  idColor: idSchema.nullable().optional(),
});
export type ConsultaPrecio = z.infer<typeof consultaPrecioSchema>;

/** Precio de UNA unidad de una variante, con el evento en curso (ficha, filtros y orden de M02). */
export const precioVarianteSchema = z.object({
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  vendible: z.boolean(),
  precioBase: dineroSchema.nullable(),
  /** Igual a `precioBase` si no hay oferta. */
  precioConOferta: dineroSchema.nullable(),
  oferta: ofertaEventoSchema.nullable(),
});
export type PrecioVariante = z.infer<typeof precioVarianteSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. RESPUESTAS
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

export const eventoResponseEnvelopeSchema = respuestaUno(eventoSchema);
export type EventoResponseEnvelope = z.infer<typeof eventoResponseEnvelopeSchema>;
export const listarEventosResponseEnvelopeSchema = respuestaPaginada(eventoResumenSchema);
export type ListarEventosResponseEnvelope = z.infer<typeof listarEventosResponseEnvelopeSchema>;
export const vistaPreviaEventoResponseEnvelopeSchema = respuestaPaginada(productoAfectadoSchema);
export type VistaPreviaEventoResponseEnvelope = z.infer<typeof vistaPreviaEventoResponseEnvelopeSchema>;

export const buscarReferenciasResponseEnvelopeSchema = respuestaLista(referenciaCatalogoSchema);
export type BuscarReferenciasResponseEnvelope = z.infer<typeof buscarReferenciasResponseEnvelopeSchema>;

export const cuponResponseEnvelopeSchema = respuestaUno(cuponSchema);
export type CuponResponseEnvelope = z.infer<typeof cuponResponseEnvelopeSchema>;
export const listarCuponesResponseEnvelopeSchema = respuestaPaginada(cuponSchema);
export type ListarCuponesResponseEnvelope = z.infer<typeof listarCuponesResponseEnvelopeSchema>;
export const listarUsosCuponResponseEnvelopeSchema = respuestaPaginada(usoCuponSchema);
export type ListarUsosCuponResponseEnvelope = z.infer<typeof listarUsosCuponResponseEnvelopeSchema>;

export const tipoClienteEmpresaResponseEnvelopeSchema = respuestaUno(tipoClienteEmpresaSchema);
export type TipoClienteEmpresaResponseEnvelope = z.infer<typeof tipoClienteEmpresaResponseEnvelopeSchema>;
/** Pocos tipos: sin paginar. */
export const listarTiposClienteResponseEnvelopeSchema = respuestaLista(tipoClienteEmpresaSchema);
export type ListarTiposClienteResponseEnvelope = z.infer<typeof listarTiposClienteResponseEnvelopeSchema>;

export const calculoResponseEnvelopeSchema = respuestaUno(calculoSchema);
export type CalculoResponseEnvelope = z.infer<typeof calculoResponseEnvelopeSchema>;

export const eventosEnCursoResponseEnvelopeSchema = respuestaLista(eventoPublicoSchema);
export type EventosEnCursoResponseEnvelope = z.infer<typeof eventosEnCursoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 8. PUERTOS (servicios internos, sin HTTP)
 * ─────────────────────────────────────────────────────────────────────────── */

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
  codigoCupon: codigoCuponEntradaSchema.optional(),
  contexto: contextoPrecioSchema,
});
export type CalculoEntrada = z.infer<typeof calculoEntradaSchema>;

export const entradaUsoCuponSchema = z.object({
  idCupon: idSchema,
  /** Null solo si el cupón no limita por usuario. */
  idUsuario: idSchema.nullable(),
  /** Identificador de la orden; hace idempotente la llamada (R15). */
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

/**
 * Lo implementa M06; lo consumen M05, M07, M08 (solo para leer), M02, M21 y M01.
 * Nunca lanza por una línea no vendible ni por un cupón que no aplica (R13, R17); solo ante entradas
 * inválidas (más líneas del máximo).
 */
export interface PreciosPort {
  /** El cálculo completo para el carrito (secciones 5 y R1–R17). */
  calcular(entrada: CalculoEntrada): Promise<Calculo>;
  /** Hasta MAXIMO_VARIANTES_PRECIO consultas; una respuesta por consulta, en el mismo orden. Solo evento. */
  preciosDeVariantes(consultas: readonly ConsultaPrecio[], momento?: string): Promise<PrecioVariante[]>;
  /** Hasta MAXIMO_PRODUCTOS_OFERTA productos (una página de tarjetas); una respuesta por producto, en orden. */
  ofertasDeProductos(idsProducto: readonly number[], momento?: string): Promise<OfertaProducto[]>;
  /** Ids de los productos que hoy están en oferta, para el filtro `enOferta` de M01. */
  idsProductosEnOferta(momento?: string): Promise<number[]>;
  /** Atómico y todo-o-nada (R15). No lanza si el cupón se agotó: lo informa. */
  registrarUsoCupon(entrada: EntradaUsoCupon): Promise<ResultadoUsoCupon>;
  /** Libera los usos de esa `referencia`; sin usos registrados no hace nada (idempotente). */
  liberarUsoCupon(referencia: string): Promise<void>;
}

/**
 * Lo implementa M06; lo consume M04 para el selector al aprobar una cuenta empresa y para validar el id (C3).
 */
export interface TiposClienteEmpresaPort {
  listarActivos(): Promise<TipoClienteEmpresa[]>;
  existeActivo(idSubRolEmpresa: number): Promise<boolean>;
}

/**
 * Lo implementa M06; lo consume M01 (C4). Cuántos eventos activos y no vencidos incluyen alguno de esos
 * objetivos en una de sus reglas (aviso antes de desactivar una línea, marca o producto, HU-CAT-11). No
 * cuenta las reglas de todo el catálogo.
 */
export interface ImpactoReglasPort {
  contarEventosVigentes(objetivos: readonly Objetivo[]): Promise<number>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 9. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * Mismo envelope global que M01. Estados HTTP: 400 PARAMETRO_INVALIDO y OBJETIVO_NO_EXISTE ·
 * 404 RECURSO_NO_DISPONIBLE (también toda denegación, R21) · 409 CODIGO_CUPON_DUPLICADO y
 * NOMBRE_TIPO_CLIENTE_DUPLICADO.
 */
export const CODIGOS_ERROR_PRECIOS = [
  'PARAMETRO_INVALIDO',
  'OBJETIVO_NO_EXISTE',
  'RECURSO_NO_DISPONIBLE',
  'CODIGO_CUPON_DUPLICADO',
  'NOMBRE_TIPO_CLIENTE_DUPLICADO',
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
 * 10. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  PÚBLICAS (montaje: /api/v1/precios; sesión opcional)
 *   POST /calcular                         → calculoResponseEnvelope
 *   GET  /eventos-en-curso                 → eventosEnCursoResponseEnvelope (para la pestaña Promociones)
 *
 *  ADMINISTRACIÓN (montaje: /api/v1/admin/precios)
 *   GET   /eventos                         catalogo.ver     → listarEventos (paginado)
 *   POST  /eventos                         catalogo.editar  → crearEvento
 *   POST  /eventos/vista-previa            catalogo.ver     → productos que entran (paginado; no escribe)
 *   GET   /referencias                     catalogo.ver     → buscarReferencias (lista sin paginar, D14)
 *   GET   /eventos/:idEvento               catalogo.ver
 *   PUT   /eventos/:idEvento               catalogo.editar  → actualizarEvento
 *   PATCH /eventos/:idEvento/estado        catalogo.editar  → cambiarEstado
 *   GET   /cupones                         catalogo.ver     → listarCupones (paginado)
 *   POST  /cupones                         catalogo.editar  → crearCupon
 *   GET   /cupones/:idCupon                catalogo.ver
 *   PUT   /cupones/:idCupon                catalogo.editar  → actualizarCupon
 *   PATCH /cupones/:idCupon/estado         catalogo.editar  → cambiarEstado
 *   GET   /cupones/:idCupon/usos           catalogo.ver     → listarUsosCupon (paginado)
 *   GET   /tipos-cliente-empresa           catalogo.ver     → lista sin paginar
 *   POST  /tipos-cliente-empresa           catalogo.editar  → crearTipoCliente
 *   PUT   /tipos-cliente-empresa/:idSubRolEmpresa        catalogo.editar → actualizarTipoCliente
 *   PATCH /tipos-cliente-empresa/:idSubRolEmpresa/estado catalogo.editar → cambiarEstado
 *   POST  /simular                         catalogo.ver     → calculoResponseEnvelope (no escribe, D12)
 *
 *  INTERNO (sin HTTP): PreciosPort · TiposClienteEmpresaPort · ImpactoReglasPort (los tres de M06)
 * ─────────────────────────────────────────────────────────────────────────── */
