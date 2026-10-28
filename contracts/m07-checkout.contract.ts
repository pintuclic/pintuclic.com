import { z } from 'zod';
import { idSchema, paginacionQuerySchema, respuestaPaginada, respuestaUno } from './m01-catalogo.contract';
import { nombreSchema, telefonoSchema } from './m04-cuentas.contract';
import type { Carrito, Revalidacion, RevalidarRequest } from './m05-carrito.contract';
import { carritoSchema, revalidacionSchema, revalidarRequestSchema } from './m05-carrito.contract';
import type { PreciosPort } from './m06-precios.contract';
import { cantidadSchema, codigoCuponEntradaSchema, dineroSchema, fechaHoraSchema, resumenCalculoSchema } from './m06-precios.contract';
import type { SolicitudPagadaInput } from './m08-ordenes.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M07. Checkout y pago
 * ============================================================================
 * Scope: m07-checkout · Ola 4 · Prefijo de historias: CHK · BORRADOR para el Tech Lead.
 * No hay documento funcional de M07 en el repo (RUTA_DEL_PROYECTO: "Sin spec"): este contrato ES la
 * especificación. Otros documentos citan RF-CHK-04-06, RF-CHK-04-13 y RF-CHK-05-04 (Tanda del analista,
 * Drive); cuando ese documento llegue, sus HU se mapean aquí (Q1).
 * Lo que M07 debe entregar lo fijan: el contrato de M08 (`crearDesdePagoConfirmado`, rama
 * feature/m08-ordenes), la guía de M06 (§7: recalcular y registrar el cupón), el contrato de M05 (C11 y
 * "Continuar con la compra") y los diagramas docs/assets/diagrams/M05-M08/.
 *
 * ── Qué hace M07 ────────────────────────────────────────────────────────────
 *  · Pantalla /checkout: el cliente con sesión elige cómo recibe el pedido, ve el resumen con el envío y
 *    paga con Nequi a través de Wompi (única pasarela y único medio de pago, decisión del 2026-10-27).
 *  · Solicitud de compra `SOL-AAAA-NNNNN` (RF-CHK-04-13): congela líneas, descuentos, IVA, envío y total
 *    en el momento de pagar, y sigue existiendo aunque el cobro o la orden fallen (RF-CHK-04-06).
 *  · Cobro: crea la transacción NEQUI en Wompi; el cliente la acepta en la app de Nequi.
 *  · Confirmación: por el evento firmado de Wompi y, de respaldo, consultando la transacción en Wompi.
 *  · Orden: con el pago aprobado llama a M08 (`crearDesdePagoConfirmado`) desde una cola con reintentos
 *    (ADR-03 de M08). Cuando la orden existe, quita del carrito lo comprado.
 *  · Panel /admin/pagos: el personal ve las solicitudes, consulta a Wompi y reintenta la orden.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No calcula precios, descuentos ni IVA: los pide a M06 y los copia tal cual (no suma ni redondea
 *    nada de M06; solo suma el envío, R10).
 *  · No crea la orden por su cuenta ni cambia su estado: eso es M08. No envía correos: M08 avisa al nacer
 *    la orden (R10 de M08).
 *  · No guarda datos de pago: ni tarjetas (no se usan) ni el celular completo de Nequi (R12).
 *  · No reembolsa (M11) ni factura (M12). No aparta inventario: la existencia es informativa (M13).
 *  · No cambia el carrito mientras se paga: solo quita lo comprado cuando la orden ya existe (R7).
 *
 * ── Estados de la solicitud ─────────────────────────────────────────────────
 *  en_pago ─(Wompi APPROVED)→ pagada ─(M08 creó la orden)→ completada
 *     ├──(DECLINED / ERROR)→ rechazada ─(reintentar)→ en_pago
 *     ├──(el cliente cancela, sin pago en curso)→ cancelada
 *     └──(pasa la vigencia sin pago en curso)→ vencida
 *  pagada ─(el monto no coincide o M08 la rechaza)→ en_revision ─(el personal la resuelve)→ completada
 *  rechazada también vence y se cancela. Un APPROVED que llega tarde a una vencida o cancelada la lleva a
 *  pagada (R8). completada es final.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R1  SOLO CON SESIÓN DE CLIENTE (RF-CAR-01-02): todas las rutas de /checkout la exigen; sin sesión la
 *      pantalla lleva a iniciar sesión y vuelve. Una solicitud ajena responde 404 RECURSO_NO_DISPONIBLE,
 *      igual que una que no existe (ADR-003). El dueño sale de la sesión, nunca del cuerpo.
 *  R2  INICIAR EL PAGO (POST /checkout/solicitudes), en este orden y sin dejar nada a medias:
 *      a) Revalida el carrito de la cuenta con lo que el cliente tenía en pantalla (C11 de M05). Sin
 *         líneas → 400 CARRITO_VACIO. Si `puedeContinuar` es false → 409 CARRITO_CAMBIO con la
 *         revalidación en `details`; la pantalla muestra el carrito nuevo y el cliente vuelve a confirmar.
 *      b) Líneas de más de una cotización → 409 VARIAS_COTIZACIONES (R9).
 *      c) Si el cliente ya tiene una solicitud con un pago en curso → 409 PAGO_EN_CURSO con su código. Si
 *         tiene una abierta sin pago en curso (rechazada), se cancela y se crea la nueva.
 *      d) Calcula el envío (R10) y congela todo en la solicitud con su código SOL (consecutivo
 *         `solicitud` de la tabla `consecutivo`, en la misma transacción que la crea).
 *      e) Si el cálculo trae un cupón aplicado, lo registra en M06 (`registrarUsoCupon`, referencia = código
 *         SOL). Si M06 responde `registrado: false` → la solicitud queda cancelada y responde 409
 *         CUPON_NO_DISPONIBLE con el motivo; el cliente vuelve al carrito, que ya muestra el motivo.
 *      f) Crea el intento 1 en Wompi (R11). Si Wompi no responde o rechaza la petición → la solicitud queda
 *         rechazada, se puede reintentar, y responde 503 PASARELA_NO_DISPONIBLE.
 *      g) Responde 201 con la solicitud en `en_pago`.
 *  R3  VIGENCIA: VIGENCIA_SOLICITUD_MINUTOS desde que se crea. Mientras el último intento esté PENDING en
 *      Wompi, la solicitud NO vence. Vencer o cancelar libera el cupón (`liberarUsoCupon`). El vencimiento
 *      se aplica al consultarla y en la tarea de la cola (R6); no hace falta un cron aparte.
 *  R4  REINTENTAR (POST /:codigo/reintentar): solo `rechazada` y vigente; puede cambiar el celular. Como
 *      máximo MAXIMO_INTENTOS_PAGO intentos por solicitud; después → 409 LIMITE_INTENTOS y el cliente
 *      empieza otra desde el carrito. El precio no se recalcula: se cobra lo congelado.
 *  R5  CONFIRMACIÓN. Wompi avisa por POST /checkout/wompi/eventos (evento `transaction.updated`):
 *      a) La firma se valida sobre el cuerpo recibido ANTES de validarlo con Zod (Wompi puede cambiar la lista
 *         de propiedades firmadas): se concatenan, en orden, los valores de `signature.properties` leídos de
 *         `data`, luego `timestamp` y el secreto de eventos; SHA-256; se compara con `signature.checksum` (o la
 *         cabecera X-Event-Checksum). Firma inválida → 401 FIRMA_INVALIDA, se audita (M20) y no se toca nada.
 *      b) Nunca se confía solo en el evento: se consulta la transacción en Wompi (GET /transactions/:id) y
 *         se usa ese resultado.
 *      c) Se responde 200 siempre que la firma sea válida, aunque la referencia no exista o el evento sea
 *         repetido (idempotente por id de transacción). Wompi reintenta si no recibe 200.
 *      De respaldo, GET /checkout/solicitudes/:codigo consulta a Wompi si el intento sigue PENDING y la
 *      última consulta fue hace más de INTERVALO_CONSULTA_WOMPI_SEGUNDOS: la pantalla no depende del evento.
 *  R6  APROBADO: el pago se acepta solo si coinciden referencia, moneda COP y `amount_in_cents` con el total
 *      congelado (D06 de M08). Si coinciden → `pagada` y queda en cola para crear la orden: la propia
 *      solicitud es la cola (estado `pagada` + próximo intento), escrita en la misma transacción que el pago.
 *      Si no → `en_revision` y no se crea nada. La cola llama a M08 con
 *      `SolicitudPagadaInput` (sección 6) y reintenta con espera creciente (REINTENTOS_ORDEN_MINUTOS).
 *      M08 es idempotente por `codigoSolicitud` (R2 de M08). Un error que no se arregla reintentando
 *      (CONFLICTO_SOLICITUD, PAGO_INSUFICIENTE, entrada inválida) o agotar los reintentos → `en_revision`.
 *  R7  ORDEN CREADA: la solicitud pasa a `completada` con el código de la orden `PC-…`. Luego se quitan del
 *      carrito de la cuenta las líneas compradas (misma variante y color); lo que el cliente agregó después
 *      se queda. Si quitar falla, no se revierte nada: la orden ya existe.
 *  R8  PAGO TARDÍO (P3 de M08): un APPROVED que llega a una solicitud vencida o cancelada se respeta: el
 *      cliente ya pagó. Pasa a `pagada` y sigue R6 con los precios congelados. El cupón se vuelve a
 *      registrar; si M06 ya no lo permite, la orden se crea igual y lo dice en `observaciones`.
 *  R9  ORIGEN (RF-ORD-01-03): con líneas de UNA cotización (C15 de M05), la solicitud es de origen
 *      `cotizacion` con ese `idCotizacion`, aunque tenga además líneas normales. Sin líneas de cotización,
 *      `carrito`. Con líneas de dos o más cotizaciones → R2 b.
 *  R10 ENVÍO Y TOTAL. Recogida en almacén: 0. Domicilio: el parámetro `comercial.costo_envio_base` de M17,
 *      o 0 si el total de la mercancía (resumen de M06) alcanza `comercial.umbral_envio_gratis`. Si un
 *      parámetro no se puede leer, se usan COSTO_ENVIO_BASE y UMBRAL_ENVIO_GRATIS. Total a cobrar = total
 *      de M06 + envío. A Wompi va en centavos: Math.round(total × 100). M07 no redondea nada más.
 *  R11 NEQUI EN WOMPI. Cada intento es POST /transactions con `payment_method.type = NEQUI`, el celular,
 *      `amount_in_cents`, `currency = COP`, el correo del cliente, `reference` = `<SOL>-<n.º de intento>`
 *      (Wompi exige referencias únicas), la firma de integridad (SHA-256 de reference + amount_in_cents +
 *      currency + secreto de integridad) y los dos tokens de aceptación de R13 (`acceptance_token` y
 *      `accept_personal_auth`), con la llave privada. El resultado nunca es inmediato: el intento nace PENDING
 *      y el cliente lo acepta o rechaza en su app.
 *  R12 CELULAR NEQUI: 10 dígitos, empieza por 3 (`celularNequiSchema`). Se precarga del perfil o de la
 *      dirección si cumple el formato. Solo viaja a Wompi: en la base y en las respuestas queda
 *      enmascarado (`*** *** 1111`, HU-SEG-06) y no se escribe en registros.
 *  R13 TÉRMINOS DE WOMPI: GET /checkout/preparar trae los enlaces y tokens de aceptación de Wompi
 *      (reglamento y autorización de datos personales, de GET /merchants/info con la llave pública). El cliente marca las dos casillas; sin ellas el
 *      esquema rechaza la petición (400 PARAMETRO_INVALIDO). Los tokens no son secretos.
 *  R14 ENTREGA: `domicilio` exige la dirección. Se precarga la única dirección de M04 (HU-CUE-07) y el
 *      cliente puede cambiarla solo para este pedido; no se guarda en su perfil. En la solicitud y en la
 *      orden queda como un texto: "<dirección>, <barrio>, <apto> · Recibe: <nombre>, <teléfono>".
 *  R15 LLAVES Y DATOS: las llaves de Wompi viven solo en el backend (variables WOMPI_*, P8). La llave
 *      privada no se usa en el navegador. Nunca se devuelven trazas, SQL, llaves ni el celular completo.
 *  R16 PANEL (D6): GET con `ventas.ver`; consultar Wompi y reintentar la orden con `ventas.gestionar`.
 *      Toda denegación responde 404 RECURSO_NO_DISPONIBLE. Cada acción del panel se audita (M20). El
 *      personal NO puede marcar un pago como aprobado a mano: solo se acepta un APPROVED de Wompi (D3).
 *
 * ── Pantallas ───────────────────────────────────────────────────────────────
 *  /carrito (M05): "Continuar con la compra" revalida y, si se puede, lleva a /checkout (P3).
 *  /checkout: pasos Carrito → Pago → Orden (Stepper del Core Kit). Columna principal: "¿Cómo quieres
 *   recibirlo?" (Envío a domicilio con la dirección precargada y editable / Recoger en el almacén),
 *   "Paga con Nequi" (celular y el aviso "Necesitas la app de Nequi en este celular") y las dos casillas
 *   de Wompi. Columna lateral fija: líneas compactas, subtotal, descuentos, envío ("Gratis" si es 0),
 *   total con IVA incluido y el botón verde "Pagar con Nequi" (`primary-conversion`). Sellos de pago seguro.
 *  /checkout/:codigo: "Revisa tu celular y acepta el pago en Nequi" con un indicador de espera y la
 *   consulta cada INTERVALO_CONSULTA_PANTALLA_SEGUNDOS. Aprobado y orden creada: "¡Compra confirmada!" con
 *   el código del pedido y el enlace a "Mis pedidos" (M08). Pagada sin orden aún: "Recibimos tu pago,
 *   estamos registrando tu pedido". Rechazado: el motivo en palabras simples, "Intentar de nuevo" y
 *   "Volver al carrito". Vencida o cancelada: aviso y "Volver al carrito".
 *  /admin/pagos: lista con filtros (estado y búsqueda por código SOL, código de orden o cliente, en la URL)
 *   y detalle con los intentos (estado de Wompi, fecha, id de transacción) y los botones "Consultar en
 *   Wompi" y "Reintentar crear el pedido".
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Wompi con Nequi como único medio (decidido con el equipo). Sin tarjetas, PSE ni efectivo.
 *  D2  Integración por API (no Web Checkout), para ofrecer solo Nequi y quedarse en el sitio.
 *  D3  RF-CHK-05-04 (pago directo verificado por un empleado) se reduce a conciliar: el personal solo
 *      pide a Wompi el estado real. No hay pagos fuera de Wompi.
 *  D4  Vigencia de 30 minutos; como máximo 3 intentos por solicitud.
 *  D5  Pago tardío se respeta (R8).
 *  D6  Permisos existentes `ventas.ver` y `ventas.gestionar`: no hay permisos nuevos.
 *  D7  Envío con los parámetros que ya existen en M17 (en el seed: $15.000, gratis desde $200.000).
 *  D8  `esEntonado` y `baseConsumida` van false y null a M08 hasta que M01 los exponga (P5).
 *
 * ── Piezas en otros módulos (cada una en su PR pequeño) ────────────────────
 *  P1  BD / Prisma (PR general): tablas `solicitud_compra` (también hace de cola, R6), `linea_solicitud` (con
 *      sus descuentos congelados) e `intento_pago`; fila `solicitud` en `consecutivo`. La tabla `pagos` no se
 *      toca.
 *  P2  `app.routes.ts`: montar /api/v1/checkout y /api/v1/admin/pagos.
 *  P3  M05: "Continuar con la compra" lleva a /checkout en vez del aviso de pago no disponible, y un puerto
 *      para M07 (CarritoCheckoutPort, sección 6).
 *  P4  M08 con `crearDesdePagoConfirmado`. Su rama (feature/m08-ordenes) se unió a esta: si M08 llega antes a
 *      main, este PR solo trae M07.
 *  P5  M01 (más adelante): exponer en CatalogoParaCompraPort si la línea es entonada y la base que consume.
 *  P6  Core Kit: entrada "Pagos" en el menú del panel.
 *  P7  M17: nada nuevo; se leen los parámetros de envío que ya existen.
 *  P8  DevOps: WOMPI_API_URL, WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET y
 *      WOMPI_INTEGRITY_SECRET en el backend (y sin valores en .env.example); la URL de eventos en el panel
 *      de Wompi: https://<dominio>/api/v1/checkout/wompi/eventos (una para pruebas y otra para producción).
 *
 * ── Preguntas abiertas (no bloquean) ────────────────────────────────────────
 *  Q1  Documento HU-CHK del analista: mapear sus HU y criterios a estas reglas.
 *  Q2  ¿El envío lleva IVA aparte? Hoy el IVA congelado es el de la mercancía (M06) y el envío va sin
 *      desglose.
 *  Q3  Valores reales de envío (D7) y si la recogida tiene horario o sede que mostrar.
 *  Q4  Redondeo: RF-PRE-05-04 vs D07 (Q4 de M08). M07 cobra exactamente lo que da M06.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const PERMISOS_PAGOS = {
  ver: 'ventas.ver',
  gestionar: 'ventas.gestionar',
} as const;

/** R3 / D4 */
export const VIGENCIA_SOLICITUD_MINUTOS = 30;
/** R4 / D4 */
export const MAXIMO_INTENTOS_PAGO = 3;
/** R5: cada cuánto, como mucho, la consulta de la pantalla pregunta a Wompi. */
export const INTERVALO_CONSULTA_WOMPI_SEGUNDOS = 5;
/** Pantalla /checkout/:codigo: cada cuánto consulta la solicitud. */
export const INTERVALO_CONSULTA_PANTALLA_SEGUNDOS = 3;
/** R6: espera antes de cada reintento de crear la orden; agotados, la solicitud queda en revisión. */
export const REINTENTOS_ORDEN_MINUTOS = [1, 5, 15, 60, 180, 720] as const;

/** R10: parámetros de M17 y su valor si no se pueden leer (son también sus valores en el seed). */
export const CLAVE_COSTO_ENVIO_BASE = 'comercial.costo_envio_base';
export const CLAVE_UMBRAL_ENVIO_GRATIS = 'comercial.umbral_envio_gratis';
export const COSTO_ENVIO_BASE = 15_000;
export const UMBRAL_ENVIO_GRATIS = 200_000;

/** Nombre de la fila de `consecutivo` para las solicitudes (P1). */
export const CONSECUTIVO_SOLICITUD = 'solicitud';
/** El mismo patrón que valida M08 al recibirla. */
export const CODIGO_SOLICITUD_PATRON = /^SOL-\d{4}-\d{5,}$/;
export const codigoSolicitudSchema = z.string().trim().regex(CODIGO_SOLICITUD_PATRON, 'Use el formato SOL-AAAA-NNNNN');

export const codigoSolicitudParamsSchema = z.object({ codigo: codigoSolicitudSchema });
export type CodigoSolicitudParams = z.infer<typeof codigoSolicitudParamsSchema>;

export const estadoSolicitudSchema = z.enum([
  'en_pago',
  'rechazada',
  'pagada',
  'completada',
  'en_revision',
  'vencida',
  'cancelada',
]);
export type EstadoSolicitud = z.infer<typeof estadoSolicitudSchema>;
/** R2 c: estados que cuentan como "abierta" para el cliente. */
export const ESTADOS_ABIERTOS: readonly EstadoSolicitud[] = ['en_pago', 'rechazada'];

export const modoEntregaSchema = z.enum(['domicilio', 'recogida']);
export type ModoEntrega = z.infer<typeof modoEntregaSchema>;

export const origenSolicitudSchema = z.enum(['carrito', 'cotizacion']);
export type OrigenSolicitud = z.infer<typeof origenSolicitudSchema>;

/** Estados de una transacción en Wompi. VOIDED solo aplica a tarjetas, pero se acepta por si llega. */
export const estadoWompiSchema = z.enum(['PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED']);
export type EstadoWompi = z.infer<typeof estadoWompiSchema>;

/** R12: celular colombiano registrado en Nequi. */
export const celularNequiSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^3\d{9}$/, 'Escribe tu celular de Nequi: 10 dígitos que empiezan por 3'));

/** R14: la dirección de este pedido. */
export const direccionEntregaSchema = z.object({
  direccion: z.string().trim().min(5, 'La dirección debe tener al menos 5 caracteres').max(255),
  barrio: z.string().trim().min(2, 'El barrio debe tener al menos 2 caracteres').max(100),
  apartamentoCasa: z.string().trim().max(100).nullable(),
  nombreRecibe: nombreSchema,
  telefonoRecibe: telefonoSchema,
});
export type DireccionEntrega = z.infer<typeof direccionEntregaSchema>;

/** R13: los dos tokens de aceptación de Wompi. */
export const aceptacionesWompiSchema = z.object({
  tokenAceptacion: z.string().trim().min(1).max(2000),
  tokenDatosPersonales: z.string().trim().min(1).max(2000),
  /** La casilla marcada: el esquema solo acepta true. */
  aceptaTerminos: z.literal(true),
});
export type AceptacionesWompi = z.infer<typeof aceptacionesWompiSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /checkout/preparar */
export const prepararCheckoutRequestSchema = z.object({
  codigoCupon: codigoCuponEntradaSchema.optional(),
});
export type PrepararCheckoutRequest = z.infer<typeof prepararCheckoutRequestSchema>;

/** POST /checkout/solicitudes (R2). `pantalla` es lo mismo que recibe POST /carrito/revalidar (C11). */
export const crearSolicitudRequestSchema = z
  .object({
    pantalla: revalidarRequestSchema,
    modoEntrega: modoEntregaSchema,
    /** Obligatoria con `domicilio`; null con `recogida`. */
    direccion: direccionEntregaSchema.nullable(),
    celularNequi: celularNequiSchema,
    aceptaciones: aceptacionesWompiSchema,
  })
  .refine((v) => v.modoEntrega !== 'domicilio' || v.direccion !== null, {
    message: 'Escribe la dirección de entrega',
    path: ['direccion'],
  });
export type CrearSolicitudRequest = z.infer<typeof crearSolicitudRequestSchema>;

/** POST /checkout/solicitudes/:codigo/reintentar (R4). */
export const reintentarPagoRequestSchema = z.object({
  celularNequi: celularNequiSchema,
  aceptaciones: aceptacionesWompiSchema,
});
export type ReintentarPagoRequest = z.infer<typeof reintentarPagoRequestSchema>;

/** GET /admin/pagos */
export const listarSolicitudesAdminRequestSchema = paginacionQuerySchema.extend({
  estado: estadoSolicitudSchema.optional(),
  /** Código SOL, código de orden PC, o nombre / correo del cliente. */
  busqueda: z.string().trim().max(100).optional(),
});
export type ListarSolicitudesAdminRequest = z.infer<typeof listarSolicitudesAdminRequestSchema>;

/**
 * POST /checkout/wompi/eventos — lo que M07 lee del evento DESPUÉS de validar su firma (R5 a). Los campos
 * que no se usan se ignoran.
 */
export const eventoWompiInputSchema = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      id: z.string().min(1).max(100),
      status: estadoWompiSchema,
      reference: z.string().min(1).max(100),
      amount_in_cents: z.number().int().nonnegative(),
      currency: z.string(),
    }),
  }),
  signature: z.object({
    properties: z.array(z.string()).min(1),
    checksum: z.string().min(1),
  }),
  timestamp: z.number().int(),
});
export type EventoWompiInput = z.infer<typeof eventoWompiInputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const terminosWompiSchema = z.object({
  tokenAceptacion: z.string(),
  enlaceReglamento: z.string().url(),
  tokenDatosPersonales: z.string(),
  enlaceDatosPersonales: z.string().url(),
});
export type TerminosWompi = z.infer<typeof terminosWompiSchema>;

/** GET /checkout/preparar: todo lo que pinta la pantalla /checkout antes de pagar. */
export const prepararCheckoutSchema = z.object({
  /** El carrito de la cuenta con su cálculo (M05). */
  carrito: carritoSchema,
  /** R10: lo que costaría cada modo con este carrito. */
  envio: z.object({
    domicilio: dineroSchema,
    recogida: dineroSchema,
    umbralEnvioGratis: dineroSchema,
  }),
  /** R14: la dirección del perfil; null si no tiene. */
  direccionPerfil: direccionEntregaSchema.nullable(),
  /** R12: celular sugerido (del perfil o la dirección) si cumple el formato de Nequi; si no, null. */
  celularSugerido: z.string().nullable(),
  /** R13: null si Wompi no respondió; la pantalla avisa y no deja pagar. */
  terminos: terminosWompiSchema.nullable(),
  /** R2 c: la solicitud con pago en curso, para llevar al cliente a ella. */
  solicitudEnCurso: codigoSolicitudSchema.nullable(),
});
export type PrepararCheckout = z.infer<typeof prepararCheckoutSchema>;
export const prepararCheckoutResponseEnvelopeSchema = respuestaUno(prepararCheckoutSchema);
export type PrepararCheckoutResponseEnvelope = z.infer<typeof prepararCheckoutResponseEnvelopeSchema>;

export const lineaSolicitudSchema = z.object({
  nombreProducto: z.string(),
  marca: z.string().nullable(),
  medida: z.string().nullable(),
  color: z.object({ nombre: z.string(), hexadecimal: z.string() }).nullable(),
  cantidad: cantidadSchema,
  /** El subtotal de M06 (con sus descuentos), IVA incluido. */
  subtotal: dineroSchema,
  idCotizacion: idSchema.nullable(),
});
export type LineaSolicitud = z.infer<typeof lineaSolicitudSchema>;

export const intentoPagoSchema = z.object({
  numero: z.number().int().min(1).max(MAXIMO_INTENTOS_PAGO),
  estadoWompi: estadoWompiSchema,
  /** R12: `*** *** 1111`. */
  celularEnmascarado: z.string(),
  /** Mensaje en palabras simples cuando Wompi lo rechaza; null en los demás. */
  motivo: z.string().nullable(),
  fecha: fechaHoraSchema,
});
export type IntentoPago = z.infer<typeof intentoPagoSchema>;

export const solicitudSchema = z.object({
  codigo: codigoSolicitudSchema,
  estado: estadoSolicitudSchema,
  origen: origenSolicitudSchema,
  modoEntrega: modoEntregaSchema,
  /** R14: el texto con el que irá a la orden; null con recogida. */
  direccion: z.string().nullable(),
  lineas: z.array(lineaSolicitudSchema).min(1),
  /** Lo que congeló de M06. */
  resumen: resumenCalculoSchema,
  costoEnvio: dineroSchema,
  /** R10: lo que se cobra. */
  totalACobrar: dineroSchema,
  intentos: z.array(intentoPagoSchema),
  /** R3: hasta cuándo se puede pagar (sin contar un pago en curso). */
  venceEn: fechaHoraSchema,
  /** R7: el código PC-… cuando la orden existe; null antes. */
  codigoOrden: z.string().nullable(),
  creadaEn: fechaHoraSchema,
});
export type Solicitud = z.infer<typeof solicitudSchema>;
export const solicitudResponseEnvelopeSchema = respuestaUno(solicitudSchema);
export type SolicitudResponseEnvelope = z.infer<typeof solicitudResponseEnvelopeSchema>;

/** Panel: la solicitud con su cliente y el último error de la cola. */
export const solicitudAdminSchema = solicitudSchema.extend({
  cliente: z.object({ idUsuario: idSchema, nombre: z.string(), correo: z.string() }),
  /** Id de la transacción aprobada en Wompi; null si no la hay. */
  transaccionPagoId: z.string().nullable(),
  /** R6: por qué quedó en revisión o falló el último intento de crear la orden. */
  ultimoError: z.string().nullable(),
  reintentosOrden: z.number().int().nonnegative(),
});
export type SolicitudAdmin = z.infer<typeof solicitudAdminSchema>;
export const solicitudAdminResponseEnvelopeSchema = respuestaUno(solicitudAdminSchema);
export type SolicitudAdminResponseEnvelope = z.infer<typeof solicitudAdminResponseEnvelopeSchema>;
export const listarSolicitudesResponseEnvelopeSchema = respuestaPaginada(solicitudAdminSchema);
export type ListarSolicitudesResponseEnvelope = z.infer<typeof listarSolicitudesResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Envelope global: `{ success: false, error: { code, message, details } }`.
 * 400 PARAMETRO_INVALIDO · 400 CARRITO_VACIO (R2 a) · 401 FIRMA_INVALIDA (R5 a) ·
 * 404 RECURSO_NO_DISPONIBLE (ajena, inexistente o sin permiso) · 409 CARRITO_CAMBIO (R2 a, con la
 * revalidación) · 409 VARIAS_COTIZACIONES (R2 b) · 409 PAGO_EN_CURSO (R2 c, con el código) ·
 * 409 CUPON_NO_DISPONIBLE (R2 e, con el motivo) · 409 ESTADO_NO_PERMITE · 409 SOLICITUD_VENCIDA (R3) ·
 * 409 LIMITE_INTENTOS (R4) · 503 PASARELA_NO_DISPONIBLE (R2 f) · 500 ERROR_INTERNO.
 */
export const CODIGOS_ERROR_CHECKOUT = [
  'PARAMETRO_INVALIDO',
  'CARRITO_VACIO',
  'FIRMA_INVALIDA',
  'RECURSO_NO_DISPONIBLE',
  'CARRITO_CAMBIO',
  'VARIAS_COTIZACIONES',
  'PAGO_EN_CURSO',
  'CUPON_NO_DISPONIBLE',
  'ESTADO_NO_PERMITE',
  'SOLICITUD_VENCIDA',
  'LIMITE_INTENTOS',
  'PASARELA_NO_DISPONIBLE',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorCheckout = (typeof CODIGOS_ERROR_CHECKOUT)[number];

export const detalleCarritoCambioSchema = revalidacionSchema;
export const detallePagoEnCursoSchema = z.object({ codigo: codigoSolicitudSchema });
export const detalleCuponSchema = z.object({ motivo: z.string() });

export const errorCheckoutEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_CHECKOUT),
    message: z.string(),
    details: z.union([detalleCarritoCambioSchema, detallePagoEnCursoSchema, detalleCuponSchema, z.null()]),
  }),
});
export type ErrorCheckoutEnvelope = z.infer<typeof errorCheckoutEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. PUERTOS QUE M07 USA
 * ─────────────────────────────────────────────────────────────────────────── */

/** Lo que M07 usa de M05 (P3). */
export interface CarritoCheckoutPort {
  /** El carrito calculado de la cuenta, con el cupón que envía la pantalla (C7, C8). */
  carritoDeCuenta(idUsuario: number, codigoCupon?: string): Promise<Carrito>;
  /** C11 con el dueño ya resuelto. */
  revalidar(idUsuario: number, pantalla: RevalidarRequest): Promise<Revalidacion>;
  /** R7: quita las líneas con esa variante y color; las que ya no estén se ignoran. */
  quitarComprado(idUsuario: number, lineas: readonly { idVariante: number; idColor: number | null }[]): Promise<void>;
}

/**
 * Lo que M07 usa de M06 (guía §7). El recálculo llega dentro de la revalidación de M05, que ya trae el
 * cálculo nuevo y los datos de M01 de cada línea; aquí solo se registra o libera el cupón.
 */
export type PreciosCheckoutPort = Pick<PreciosPort, 'registrarUsoCupon' | 'liberarUsoCupon'>;

/** Lo que M07 usa de M17 (R10): null si el parámetro no se pudo leer. */
export interface ParametrosCheckoutPort {
  obtenerNumero(clave: typeof CLAVE_COSTO_ENVIO_BASE | typeof CLAVE_UMBRAL_ENVIO_GRATIS): Promise<number | null>;
}

/** Lo que M07 usa de M04 (R12, R14). */
export interface PerfilCheckoutPort {
  datosDeEntrega(idUsuario: number): Promise<{
    correo: string;
    telefonoPerfil: string | null;
    direccion: DireccionEntrega | null;
  }>;
}

/**
 * Lo que M07 usa de M08 (P4). Mapeo desde la solicitud: codigoSolicitud ← código SOL · transaccionPagoId ← id
 * de Wompi aprobado · origen e idCotizacion ← R9 · modoEntrega, direccion ← R14 · costoEntrega ← R10 ·
 * subTotal ← resumen.subtotalInicial · descuento ← resumen.descuentoTotal · total ← totalACobrar ·
 * baseSinImpuesto, importeIva, tasaIva ← resumen · montoPagado ← amount_in_cents / 100 · por línea:
 * nombreProducto, varianteCopia (medida), colorSolicitado, skuVendido ← M01 (vía M05); precioInicial,
 * precioAplicado (precioUnitarioFinal) y descuentos ← M06; idVarianteRef ← idVariante; esEntonado y
 * baseConsumida ← D8.
 */
export interface OrdenesCheckoutPort {
  crearDesdePagoConfirmado(entrada: SolicitudPagadaInput): Promise<{ codigo: string; creada: boolean }>;
}

/** Cliente de Wompi (adaptador del módulo; en pruebas, uno en memoria). */
export interface PasarelaPagoPort {
  terminos(): Promise<TerminosWompi>;
  crearTransaccionNequi(entrada: {
    referencia: string;
    montoEnCentavos: number;
    celular: string;
    correo: string;
    tokenAceptacion: string;
    tokenDatosPersonales: string;
  }): Promise<{ idTransaccion: string; estado: EstadoWompi }>;
  consultarTransaccion(idTransaccion: string): Promise<{
    idTransaccion: string;
    estado: EstadoWompi;
    referencia: string;
    montoEnCentavos: number;
    moneda: string;
    mensaje: string | null;
  }>;
  /** R5 a: valida el checksum del evento sobre el cuerpo recibido, antes de Zod. */
  firmaValida(cuerpo: unknown, checksumCabecera: string | null): boolean;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Cliente (montaje: /api/v1/checkout) — exige sesión de cliente (R1)
 *  GET  /preparar                        datos de la pantalla /checkout (?codigoCupon)
 *  POST /solicitudes                     iniciar el pago (R2)                     → 201 solicitud
 *  GET  /solicitudes/:codigo             estado de una mía (R5, consulta a Wompi de respaldo)
 *  POST /solicitudes/:codigo/reintentar  nuevo intento con Nequi (R4)
 *  POST /solicitudes/:codigo/cancelar    cancelar si no hay pago en curso (R3)
 *
 *  Wompi (montaje: /api/v1/checkout/wompi) — sin sesión; firma del evento (R5)
 *  POST /eventos                         evento transaction.updated → 200 vacío
 *
 *  Panel (montaje: /api/v1/admin/pagos) — sesión + permiso (R16)
 *  GET  /                                lista (?estado, ?busqueda)               ventas.ver
 *  GET  /:codigo                         detalle con intentos y cliente           ventas.ver
 *  POST /:codigo/consultar-wompi         pedir a Wompi el estado real (R5)        ventas.gestionar
 *  POST /:codigo/reintentar-orden        volver a encolar la orden (R6)           ventas.gestionar
 *
 *  Cliente: `solicitudResponseEnvelopeSchema`, salvo /preparar. Panel: `solicitudAdminResponseEnvelopeSchema`
 *  y `listarSolicitudesResponseEnvelopeSchema`.
 * ─────────────────────────────────────────────────────────────────────────── */
