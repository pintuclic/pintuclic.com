import { z } from 'zod';
import { hexadecimalSchema, idSchema, respuestaUno } from './m01-catalogo.contract';
import { disponibilidadSchema, existenciaSchema } from './m01-catalogo-productos.contract';
import type { CatalogoParaCompraPort } from './m01-catalogo-entrega3.contract';
import {
  CANTIDAD_MAXIMA_LINEA,
  MAXIMO_LINEAS_CALCULO,
  calculoSchema,
  cantidadSchema,
  codigoCuponEntradaSchema,
  dineroSchema,
  lineaCalculadaSchema,
  motivoCuponSchema,
  motivoNoVendibleSchema,
} from './m06-precios.contract';
import type { PreciosPort } from './m06-precios.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M05. Carrito de compras
 * ============================================================================
 * Scope: m05-carrito · Ola 3 · Prefijo de historias: CAR · BORRADOR para el Tech Lead.
 * Especificación funcional: docs/02_MODULOS_FUNCIONALES/M05_ESPECIFICACION_CARRITO.md
 * Guía de precios para el carrito: docs/02_MODULOS_FUNCIONALES/M06_GUIA_PARA_EL_CARRITO.md
 * Diagramas: docs/assets/diagrams/M05/ y docs/assets/diagrams/M05-M08/
 *
 * Este contrato ES lo que el Tech Lead revisa antes de que se escriba el código. Lo que cambie
 * aquí cambia el módulo.
 *
 * ── Qué hace M05 ────────────────────────────────────────────────────────────
 *  · HU-CAR-01 Carrito de visitante: agregar sin iniciar sesión; el dispositivo se reconoce con un
 *    token opaco en cookie, sin datos personales.
 *  · HU-CAR-02 Líneas: agregar (si la variante y el color ya están, suma), cambiar la cantidad y quitar.
 *  · HU-CAR-04 Carrito de cliente: el carrito queda en la cuenta; al iniciar sesión se le une el del
 *    visitante; si es empresa, el cálculo trae su descuento.
 *  · HU-CAR-05 Revalidación antes de pagar: vuelve a calcular precios y disponibilidad y avisa qué cambió.
 *  · Pinta el cálculo de M06 tal cual: desglose de descuentos por línea, líneas no vendibles, avisos
 *    (empresa_falta_monto, sugerir_cuenta_empresa), cupón, IVA y totales.
 *  · Pantalla pública `/carrito` (la ruta la usa ya el formulario de contacto de M15) con el botón de
 *    WhatsApp de M15 (RF-ATC-03-01).
 *  · Panel lateral del carrito (L1–L7): el resumen que se despliega a la derecha, la Variante A de la
 *    especificación de UI (§4.7), desde el encabezado y al agregar desde una tarjeta.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No calcula precios ni descuentos: los pide a M06 (`PreciosPort.calcular`) y los muestra. No suma,
 *    no resta, no aplica porcentajes ni redondea.
 *  · No reserva cupones ni existencias: calcular no reserva nada (R15 de M06). El uso del cupón lo
 *    registra M07 al crear la orden.
 *  · No cobra ni crea la orden (M07 y M08). No calcula envío (M12).
 *  · No crea cotizaciones: las líneas con precio acordado solo llegan desde M21 al aceptar una (C15).
 *  · No guarda precios: el carrito es una referencia viva (RF-CAR-05-04).
 *  · No edita catálogo, inventario ni cuentas.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  C1  DUEÑO DEL CARRITO. Con sesión, el carrito es el de la cuenta (`carrito.id_usuario`). Sin sesión,
 *      el del token de visitante de la cookie `pc_cart`. Nunca se acepta un id de carrito en la URL ni en
 *      el cuerpo: el dueño sale siempre de la sesión o de la cookie (autorización en servidor, M20).
 *  C2  TOKEN DE VISITANTE. Aleatorio de 32 bytes (base64url), sin datos personales (RNF-CAR-01-01). En la
 *      base se guarda solo su SHA-256 (`carrito.token_visitante`). Se crea en la primera escritura
 *      (agregar), no al solo mirar: un GET sin carrito responde un carrito vacío y no crea nada.
 *      Atributos en ATRIBUTOS_COOKIE_CARRITO. Dos dispositivos sin sesión = dos carritos (ADR-01 de la spec).
 *  C3  AGREGAR. Una variante con el mismo color es una sola línea (`uq_carrito_variante_color`): agregar
 *      otra vez suma la cantidad (RF-CAR-02-0X). Variante + color distinto = otra línea.
 *  C4  CANTIDAD. Cada línea admite de 1 a CANTIDAD_MAXIMA_LINEA (9 999, el mismo tope de M06)
 *      (RF-CAR-02-07). Si una suma pasa del tope responde 400 CANTIDAD_FUERA_DE_RANGO y no cambia nada.
 *      Para dejar 0 se quita la línea. Un combo no admite más de su `topeUnidades` (409 SIN_EXISTENCIA_SUFICIENTE).
 *  C5  LÍMITE DE LÍNEAS. Máximo MAXIMO_LINEAS_CARRITO (100, lo que acepta un cálculo de M06). Una línea
 *      nueva por encima responde 400 LIMITE_LINEAS_ALCANZADO.
 *  C6  SOLO SE AGREGA LO VENDIBLE. Agregar una variante que M01 marca no vendible responde
 *      409 PRODUCTO_NO_DISPONIBLE con su motivo. Una línea que deja de ser vendible después de agregada
 *      se conserva y se muestra con su motivo y la invitación a quitarla (R17 de M06); no suma.
 *  C7  PRECIOS. Cada respuesta con el carrito trae `calculo` de `PreciosPort.calcular` con las líneas en el
 *      orden del carrito, el perfil del cliente (`idUsuario` de la sesión o null) y el `codigoCupon` que
 *      envía la pantalla. Carrito vacío → `calculo: null` (M06 exige al menos una línea).
 *  C8  CUPÓN. El código no se guarda en el carrito: lo conserva la pantalla y lo envía en cada consulta
 *      (`?codigoCupon=`) y en la revalidación. Se acepta cualquier texto corto (`codigoCuponEntradaSchema` de
 *      M06): un código mal escrito vuelve como `cupon_no_valido`, no como 400. Un cupón que no aplica no rompe
 *      nada: se muestra su motivo.
 *  C9  UNIÓN AL INICIAR SESIÓN (RF-CAR-04-01 y RF-CAR-04-03). La primera petición al carrito que llega
 *      con sesión Y con cookie `pc_cart` une el carrito del visitante al de la cuenta: las líneas iguales
 *      suman (hasta el tope de C4) y las demás se agregan (hasta C5; las que no caben se descartan y se
 *      informan en `union`). Después se borra el carrito del visitante y la cookie. Si la cuenta no tenía
 *      carrito, el del visitante pasa a ser suyo. Así no se toca el inicio de sesión de M04/M20.
 *  C10 EMPRESA (RF-CAR-04-02). No hay nada que recalcular aparte: el cálculo usa el perfil del cliente,
 *      así que una cuenta empresa ve su descuento y sus avisos en cuanto el carrito queda en su cuenta.
 *  C11 REVALIDACIÓN (HU-CAR-05). `POST /carrito/revalidar` recibe lo que el cliente tiene en pantalla
 *      (subtotal de cada línea, total y cupón) y lo compara con un cálculo nuevo. Devuelve `cambios` y
 *      `puedeContinuar`. Se puede continuar solo si el carrito tiene líneas, todas vendibles, y no hubo
 *      cambios; si los hubo, la pantalla muestra el carrito nuevo y el cliente vuelve a confirmar.
 *      La disponibilidad sale de M01 (`CatalogoParaCompraPort`: vendible, disponibilidad y tope de combo).
 *  C12 CONCURRENCIA. Última escritura gana (política de M20 en la spec): cambiar la cantidad fija el valor
 *      absoluto, no suma; agregar suma. Dos pestañas ven el mismo carrito en el siguiente GET.
 *  C13 ACTIVIDAD Y LIMPIEZA (Q4). Cada escritura actualiza `fecha_ultima_actividad`. Los días de vigencia
 *      salen del parámetro CLAVE_DIAS_VIGENCIA de M17 (Configuración, de 1 a 365; si no se puede leer,
 *      DIAS_VIGENCIA_CARRITO_VISITANTE). Un carrito de VISITANTE sin actividad en esos días está vencido: se
 *      ignora, se reemplaza al agregar y SE BORRA de la base con sus líneas. El borrado corre solo, en segundo
 *      plano, como máximo cada INTERVALO_LIMPIEZA_MINUTOS, cuando llega una petición al carrito; nunca demora
 *      ni hace fallar la respuesta. Los carritos de una CUENTA no vencen ni se borran.
 *  C14 ERRORES OPACOS. Una línea que no es del carrito de quien llama responde 404 RECURSO_NO_DISPONIBLE,
 *      igual que una que no existe (ADR-003). Nunca se devuelven trazas, SQL ni el token.
 *  C15 LÍNEAS DE COTIZACIÓN (M21). Al aceptar una cotización, M21 pone sus líneas en el carrito de la cuenta
 *      con `idCotizacion` y `precioAcordado` (puerto interno, sin ruta HTTP); si ya había una línea igual
 *      (variante + color), la reemplaza. Esas líneas van a M06 con `precioAcordado` (R3: sin descuentos) y la
 *      revalidación no compara su precio (RF-CAR-05-06), aunque sí avisa si dejan de venderse. Su cantidad
 *      no se cambia ni se suma: PATCH o agregar la misma variante y color responde 409 LINEA_COTIZADA; se
 *      pueden quitar. Solo existen en carritos de cuenta.
 *
 * ── Pantalla /carrito ───────────────────────────────────────────────────────
 *  Lista de líneas: imagen, nombre, marca, medida, color (muestra y nombre), cantidad con − / + y campo
 *  editable, subtotal y el desglose de descuentos (origen, % e importe); botón Quitar. Línea no vendible:
 *  sin precio, con su motivo en palabras simples y "Quitar". Resumen: subtotal, descuentos por tipo
 *  (evento, empresa, cupón), total con IVA incluido y su base e IVA. Campo "Código de descuento" con
 *  Aplicar / Quitar y el motivo si no aplica. Avisos: "Te faltan $X para recibir tu N % de descuento
 *  <tipo>" y la invitación a pedir cuenta empresa (enlace a la sección Empresa de /perfil). Botón
 *  "Continuar con la compra": revalida (C11); sin sesión lleva a iniciar sesión (RF-CAR-01-02) y vuelve
 *  al carrito. Carrito vacío: mensaje y enlace a /productos. Botón de WhatsApp de M15 con la referencia
 *  "Tengo dudas sobre mi carrito de N productos." Mientras M07 no exista, "Continuar" termina en la
 *  revalidación y un aviso de que el pago aún no está disponible.
 *
 * ── Panel lateral del carrito (UI §4.7 · Variante A) ────────────────────────
 *  L1  SE ABRE desde el ícono del carrito del encabezado (en lugar de ir a /carrito) y al agregar desde
 *      el botón del carrito de una tarjeta del listado o del inicio (V3 del contrato de M02). Se cierra con
 *      la X, con "Seguir comprando", con Esc o tocando fuera; el foco vuelve a donde estaba. Sin JavaScript,
 *      el ícono del encabezado sigue siendo un enlace a /carrito.
 *  L2  AL AGREGAR desde una tarjeta, el panel abre con el aviso "Agregaste <producto> · <color> ·
 *      <medida>". Si M05 rechaza la línea (sin existencias, carrito lleno, línea cotizada…), abre con el
 *      mismo texto de error que muestra la ficha y no agrega nada.
 *  L3  CONTENIDO: título "Tu carrito" con la cantidad de productos; cada línea con imagen, nombre, color
 *      (muestra y nombre), medida, cantidad con − / + y "Quitar", con las mismas reglas de /carrito (C3–C6,
 *      y C15: una línea de cotización no cambia de cantidad). Línea no vendible: su motivo en palabras
 *      simples y "Quitar". Abajo, fijo: el total con IVA incluido y el ahorro total del cálculo de M06, tal
 *      cual (M05 no suma ni redondea), y los botones "Ver carrito" (a /carrito) y "Seguir comprando". Botón
 *      de WhatsApp de M15 con la referencia del carrito.
 *  L4  Lo que se hace en /carrito NO va en el panel: cupón, revalidación y "Continuar con la compra".
 *  L5  CARRITO VACÍO: mensaje y enlace a /productos.
 *  L6  No hay rutas nuevas: usa GET /carrito, PATCH y DELETE de las líneas y POST /carrito/lineas. Cada
 *      cambio actualiza el contador del encabezado con el aviso que ya existe (`pc:carrito-actualizado`).
 *  L7  PANTALLA: entra deslizándose desde la derecha sobre un fondo oscuro; unos 420px en escritorio y todo
 *      el ancho en celular. Es un diálogo accesible: nombre, foco atrapado y regreso del foco al cerrar.
 *
 * ── Puertos ─────────────────────────────────────────────────────────────────
 *  · PreciosPort (M06, ya en main): solo `calcular`. Se inyecta el servicio de M06 (`m06.precios`).
 *    Las pruebas usan un doble con cálculos de ejemplo que respetan `calculoSchema` (evento, aviso de
 *    empresa, cupón aceptado y rechazado, línea no vendible).
 *  · CatalogoParaCompraPort (M01, ya existe): nombre, marca, medida, SKU, color, imagen, vendible,
 *    disponibilidad y tope de combo de cada línea.
 *  · ParametrosCarritoPort (M17): lee CLAVE_DIAS_VIGENCIA de la configuración general (C13).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Cantidad por línea de 1 a 9 999 (pendiente RF-CAR-02-07), el mismo tope que M06.
 *  D2  Conflicto al iniciar sesión (pendiente RF-CAR-04-03): se UNEN los dos carritos sumando cantidades,
 *      sin preguntar. Alternativas: reemplazar o preguntar al cliente.
 *  D3  La unión se hace en la primera petición al carrito con sesión (C9), sin tocar el login de M04/M20.
 *  D4  Cookie `pc_cart` HttpOnly, Secure, SameSite=Lax (para que el carrito siga al volver desde un enlace
 *      externo); vence a los mismos días del parámetro de C13. El token se guarda con SHA-256.
 *  D5  El cupón vive en la pantalla y viaja en cada consulta (C8): no hace falta columna nueva.
 *  D6  La revalidación compara con lo que el cliente tenía en pantalla (C11): el carrito no guarda precios.
 *  D7  `cantidadItems` = suma de las cantidades de las líneas vendibles (es lo que muestra el contador).
 *  D8  M05 llama a M06 por el puerto interno (no por HTTP): una sola petición del navegador trae el
 *      carrito ya calculado.
 *
 * ── Piezas en otros módulos (cada una en su PR pequeño, con visto bueno del Tech Lead) ──
 *  P1  BD / Prisma (PR general): modelos `Carrito` y `LineaCarrito` sobre las tablas que ya existen;
 *      restricciones únicas `carrito(id_usuario)` y `carrito(token_visitante)` (un carrito por dueño;
 *      en PostgreSQL los NULL no chocan entre sí).
 *  P2  `app.routes.ts`: montar `/api/v1/carrito` (público, sesión opcional).
 *  P3  M01: botón "Agregar al carrito" en la ficha del producto (variante + color + cantidad) que llama a
 *      `POST /carrito/lineas`.
 *  P4  Core Kit: el contador del Header lee `GET /carrito/resumen` en vez del valor fijo de `shell.content.ts`.
 *  P5  Core Kit (L1, L7): un panel lateral accesible (`Drawer`) que reutiliza el manejo de foco del `Modal`;
 *      el aviso `pc:abrir-carrito` junto al que ya existe `pc:carrito-actualizado`; y el ícono del carrito
 *      del Header abre el panel con ese aviso.
 *  P6  Layout público (fuera de los módulos): monta el panel lateral una sola vez para todas las páginas.
 *  P7  M02 e inicio: el botón del carrito de la tarjeta agrega y abre el panel (V3 del contrato de M02).
 *
 * ── Preguntas al Tech Lead (respondidas) ────────────────────────────────────
 *  Q1  Unir los carritos al iniciar sesión (D2): confirmado.
 *  Q2  El botón "Agregar al carrito" de la ficha (P3): lo hizo M05, ya está en main.
 *  Q3  No se paga con líneas no vendibles en el carrito; hay que quitarlas antes (C11): confirmado.
 *  Q4  Los carritos de visitante vencidos se borran según un parámetro de días editable en Configuración
 *      (M17): C13.
 *  Q5  La Variante A de §4.7 también trae el paso a paso Carrito → Pago → Orden y "Complementa tu
 *      proyecto": quedan fuera por ahora (Pago y Orden son de M07 y M08, que no existen, y no hay regla para
 *      elegir complementos del carrito). Decisión del equipo, 2026-10-27.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** C5: lo que acepta un cálculo de M06. */
export const MAXIMO_LINEAS_CARRITO = MAXIMO_LINEAS_CALCULO;
/** C4 */
export const CANTIDAD_MAXIMA_POR_LINEA = CANTIDAD_MAXIMA_LINEA;
/** C13: parámetro de M17 con los días de vigencia del carrito de visitante. */
export const CLAVE_DIAS_VIGENCIA = 'comercial.dias_vigencia_carrito_visitante';
/** C13: valor si el parámetro no se puede leer (es también su valor inicial en el seed). */
export const DIAS_VIGENCIA_CARRITO_VISITANTE = 30;
/** C13: rango del parámetro (igual al de `parametro_sistema`). */
export const diasVigenciaSchema = z.number().int().min(1).max(365);
/** C13: cada cuánto, como máximo, se borran los carritos de visitante vencidos. */
export const INTERVALO_LIMPIEZA_MINUTOS = 60;

/** C2 / D4: cookie del carrito de visitante. Su vida (`maxAge`) son los días de C13. */
export const atributosCookieCarritoSchema = z.object({
  nombre: z.literal('pc_cart'),
  httpOnly: z.literal(true),
  secure: z.literal(true),
  sameSite: z.literal('lax'),
  path: z.literal('/'),
});
export type AtributosCookieCarrito = z.infer<typeof atributosCookieCarritoSchema>;

export const ATRIBUTOS_COOKIE_CARRITO: AtributosCookieCarrito = {
  nombre: 'pc_cart',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

/** Id de una línea del carrito en la URL (`:idLinea`). */
export const idLineaParamsSchema = z.object({
  idLinea: z.coerce.number().int().positive(),
});
export type IdLineaParams = z.infer<typeof idLineaParamsSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /carrito — el cupón lo envía la pantalla en cada consulta (C8). */
export const consultarCarritoRequestSchema = z.object({
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type ConsultarCarritoRequest = z.infer<typeof consultarCarritoRequestSchema>;

/** POST /carrito/lineas — agrega o suma (C3, C4, C6). */
export const agregarLineaRequestSchema = z.object({
  idVariante: idSchema,
  /** El color elegido; null u omitido si el producto no lleva color. */
  idColor: idSchema.nullable().optional(),
  cantidad: cantidadSchema,
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type AgregarLineaRequest = z.infer<typeof agregarLineaRequestSchema>;

/** PATCH /carrito/lineas/:idLinea — fija la cantidad (C4, C12). */
export const cambiarCantidadRequestSchema = z.object({
  cantidad: cantidadSchema,
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type CambiarCantidadRequest = z.infer<typeof cambiarCantidadRequestSchema>;

/** DELETE /carrito/lineas/:idLinea — el cupón viaja en la query para devolver el carrito calculado. */
export const quitarLineaRequestSchema = consultarCarritoRequestSchema;
export type QuitarLineaRequest = z.infer<typeof quitarLineaRequestSchema>;

/** Lo que el cliente veía de una línea al pulsar "Continuar". */
export const lineaEnPantallaSchema = z.object({
  idLinea: idSchema,
  /** Null si la línea ya se mostraba como no vendible. */
  subtotal: dineroSchema.nullable(),
});
export type LineaEnPantalla = z.infer<typeof lineaEnPantallaSchema>;

/** POST /carrito/revalidar (C11). */
export const revalidarRequestSchema = z.object({
  lineas: z.array(lineaEnPantallaSchema).max(MAXIMO_LINEAS_CARRITO),
  total: dineroSchema,
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type RevalidarRequest = z.infer<typeof revalidarRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Datos del catálogo para pintar la línea (de CatalogoParaCompraPort). */
export const productoLineaSchema = z.object({
  /** Null si la variante ya no existe. */
  idProducto: idSchema.nullable(),
  nombre: z.string().nullable(),
  marca: z.string().nullable(),
  medida: z.string().nullable(),
  sku: z.string().nullable(),
  color: z
    .object({
      idColor: idSchema,
      nombre: z.string(),
      codigo: z.string().nullable(),
      hexadecimal: hexadecimalSchema,
    })
    .nullable(),
  idImagenPrincipal: idSchema.nullable(),
  esCombo: z.boolean(),
  /** Solo combos: tope de unidades (C4). Null = sin tope. */
  topeUnidades: existenciaSchema.nullable(),
  disponibilidad: disponibilidadSchema.nullable(),
});
export type ProductoLinea = z.infer<typeof productoLineaSchema>;

export const lineaCarritoSchema = z.object({
  idLinea: idSchema,
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  cantidad: cantidadSchema,
  producto: productoLineaSchema,
  /** La línea correspondiente del cálculo de M06 (mismo orden). Null si el carrito no se pudo calcular. */
  precio: lineaCalculadaSchema.nullable(),
  /** C15: la cotización de la que viene; null en una línea normal. */
  idCotizacion: idSchema.nullable(),
  /** C15: precio unitario pactado; null en una línea normal. */
  precioAcordado: dineroSchema.nullable(),
});
export type LineaCarrito = z.infer<typeof lineaCarritoSchema>;

/** C9: lo que pasó al unir el carrito de visitante con el de la cuenta. */
export const unionCarritoSchema = z.object({
  lineasAgregadas: z.number().int().nonnegative(),
  lineasSumadas: z.number().int().nonnegative(),
  /** Líneas que no cupieron por el límite de C5. */
  lineasDescartadas: z.number().int().nonnegative(),
  /** Líneas que quedaron en el tope de C4. */
  cantidadesAjustadas: z.number().int().nonnegative(),
});
export type UnionCarrito = z.infer<typeof unionCarritoSchema>;

export const carritoSchema = z.object({
  lineas: z.array(lineaCarritoSchema).max(MAXIMO_LINEAS_CARRITO),
  /** D7: suma de cantidades de las líneas vendibles. */
  cantidadItems: z.number().int().nonnegative(),
  /** C7: el cálculo de M06 tal cual. Null con el carrito vacío. */
  calculo: calculoSchema.nullable(),
  /** C9: solo en la respuesta que hizo la unión; null en las demás. */
  union: unionCarritoSchema.nullable(),
});
export type Carrito = z.infer<typeof carritoSchema>;
export const carritoResponseEnvelopeSchema = respuestaUno(carritoSchema);
export type CarritoResponseEnvelope = z.infer<typeof carritoResponseEnvelopeSchema>;

/** GET /carrito/resumen — para el contador del Header (P4). */
export const resumenCarritoSchema = z.object({
  cantidadItems: z.number().int().nonnegative(),
  /** `calculo.resumen.total`, sin cupón; 0 con el carrito vacío. */
  total: dineroSchema,
});
export type ResumenCarrito = z.infer<typeof resumenCarritoSchema>;
export const resumenCarritoResponseEnvelopeSchema = respuestaUno(resumenCarritoSchema);
export type ResumenCarritoResponseEnvelope = z.infer<typeof resumenCarritoResponseEnvelopeSchema>;

/** C11: lo que cambió entre la pantalla y el cálculo nuevo. */
export const cambioRevalidacionSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('precio_cambio'),
    idLinea: idSchema,
    subtotalAnterior: dineroSchema,
    subtotalNuevo: dineroSchema,
  }),
  z.object({
    tipo: z.literal('linea_no_vendible'),
    idLinea: idSchema,
    motivo: motivoNoVendibleSchema,
  }),
  z.object({
    /** La línea estaba en pantalla y ya no está en el carrito (otra pestaña la quitó). */
    tipo: z.literal('linea_quitada'),
    idLinea: idSchema,
  }),
  z.object({
    /** La línea está en el carrito y no estaba en pantalla (otra pestaña la agregó). */
    tipo: z.literal('linea_nueva'),
    idLinea: idSchema,
  }),
  z.object({
    tipo: z.literal('cupon_no_aplica'),
    codigo: z.string(),
    motivo: motivoCuponSchema,
  }),
  z.object({
    tipo: z.literal('total_cambio'),
    totalAnterior: dineroSchema,
    totalNuevo: dineroSchema,
  }),
]);
export type CambioRevalidacion = z.infer<typeof cambioRevalidacionSchema>;

export const revalidacionSchema = z.object({
  carrito: carritoSchema,
  cambios: z.array(cambioRevalidacionSchema),
  /** C11: true solo si hay líneas, todas vendibles, y `cambios` está vacío. */
  puedeContinuar: z.boolean(),
});
export type Revalidacion = z.infer<typeof revalidacionSchema>;
export const revalidacionResponseEnvelopeSchema = respuestaUno(revalidacionSchema);
export type RevalidacionResponseEnvelope = z.infer<typeof revalidacionResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Envelope global del backend: `{ success: false, error: { code, message, details } }`.
 * 400 PARAMETRO_INVALIDO · 400 CANTIDAD_FUERA_DE_RANGO (C4) · 400 LIMITE_LINEAS_ALCANZADO (C5) ·
 * 404 RECURSO_NO_DISPONIBLE (línea ajena o inexistente, C14) · 409 PRODUCTO_NO_DISPONIBLE (C6, con el
 * motivo en `details`) · 409 SIN_EXISTENCIA_SUFICIENTE (tope de combo, C4) · 409 LINEA_COTIZADA (C15) ·
 * 500 ERROR_INTERNO (sin detalles).
 */
export const CODIGOS_ERROR_CARRITO = [
  'PARAMETRO_INVALIDO',
  'CANTIDAD_FUERA_DE_RANGO',
  'LIMITE_LINEAS_ALCANZADO',
  'RECURSO_NO_DISPONIBLE',
  'PRODUCTO_NO_DISPONIBLE',
  'SIN_EXISTENCIA_SUFICIENTE',
  'LINEA_COTIZADA',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorCarrito = (typeof CODIGOS_ERROR_CARRITO)[number];

export const detalleNoDisponibleSchema = z.object({ motivo: motivoNoVendibleSchema });
export const detalleExistenciaSchema = z.object({ topeUnidades: existenciaSchema });
export const detalleCantidadSchema = z.object({ cantidadMaxima: z.number().int().positive() });

export const errorCarritoEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_CARRITO),
    message: z.string(),
    details: z.union([detalleNoDisponibleSchema, detalleExistenciaSchema, detalleCantidadSchema, z.null()]),
  }),
});
export type ErrorCarritoEnvelope = z.infer<typeof errorCarritoEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. PUERTOS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Lo que M05 usa de M06 (solo `calcular`, D8). */
export type PreciosCarritoPort = Pick<PreciosPort, 'calcular'>;

/** Lo que M05 usa de M01 (ya implementado). */
export type CatalogoCarritoPort = CatalogoParaCompraPort;

/** Lo que M05 usa de M17 (C13): null si el parámetro no se pudo leer. */
export interface ParametrosCarritoPort {
  obtenerNumero(clave: typeof CLAVE_DIAS_VIGENCIA): Promise<number | null>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Públicas (montaje: /api/v1/carrito) — sesión opcional; dueño por sesión o cookie `pc_cart` (C1)
 *  GET    /                  el carrito con su cálculo (?codigoCupon)            HU-CAR-01, 04
 *  GET    /resumen           cantidad y total para el contador del Header (P4)
 *  POST   /lineas            agregar o sumar una variante con su color            HU-CAR-01, 02
 *  PATCH  /lineas/:idLinea   fijar la cantidad                                    HU-CAR-02
 *  DELETE /lineas/:idLinea   quitar la línea (?codigoCupon)                       HU-CAR-02
 *  POST   /revalidar         comparar con lo que hay en pantalla antes de pagar   HU-CAR-05
 *
 *  Todas las que devuelven el carrito responden `carritoResponseEnvelopeSchema`, salvo /resumen y
 *  /revalidar. La unión de C9 ocurre dentro de cualquiera de ellas; no tiene ruta propia.
 *  Pantalla: /carrito (frontend, `frontend/src/modules/m05-carrito/`).
 * ─────────────────────────────────────────────────────────────────────────── */
