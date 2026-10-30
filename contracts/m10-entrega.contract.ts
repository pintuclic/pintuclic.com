import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO — M10. Entrega (preparación para un servicio de envíos) — BORRADOR
 * ============================================================================
 * Scope: m10-entrega · Ola 6 · Depende de M08 (orden) y M07 (checkout) · Usa M18 (correo)
 *
 * Regla de Oro #1: Cero código de implementación sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * Estado: BORRADOR a la espera de que el Tech Lead lo dé por bueno.
 *
 * QUÉ HACE
 *  Deja el sistema listo para enchufar, el día que se contrate, un servicio de envíos (transportadora o
 *  agregador) SIN tocar M07 ni M08. Define el puerto que ese servicio implementará, los datos que el
 *  envío necesita guardar y el adaptador por defecto, que reproduce lo que el sistema hace hoy.
 *
 * QUÉ NO HACE
 *  · No elige ni integra ninguna transportadora (D1). Sin proveedor configurado, todo sigue como hoy.
 *    El cliente aún no ha decidido; este módulo existe para que la integración sea rápida cuando lo haga.
 *  · No cambia el cálculo del costo de envío de M07 (R10) mientras no haya proveedor (D3).
 *  · No toca los estados de la orden: los sigue gobernando M08 (RF-ORD-03-06).
 *  · No gestiona devoluciones de transporte (M11).
 *
 * REGLAS
 *  R1  PUERTO ÚNICO. Todo lo que dependa de un proveedor de envíos pasa por `ServicioEnviosPort`. Ningún
 *      módulo importa un SDK de transportadora. Cambiar de proveedor es cambiar de adaptador.
 *  R2  ADAPTADOR POR DEFECTO `envio_propio` (la tienda entrega por su cuenta): cotiza con la tarifa de M07
 *      R10 (parámetros `comercial.costo_envio_base` y `comercial.umbral_envio_gratis`), no genera guía
 *      ni seguimiento externo. Es el comportamiento actual, ahora detrás del puerto.
 *  R3  UN ENVÍO POR ORDEN A DOMICILIO. La recogida en almacén no genera envío. El envío se crea cuando
 *      M08 emite el cambio de estado a `despachado` (evento `emitirCambioEstado`), sin modificar M08.
 *  R4  FALLO DEL PROVEEDOR. Si el proveedor falla al crear el envío, el despacho NO se revierte: queda un
 *      envío en `pendiente` con el motivo y el personal puede reintentar (`gestionar`). Mismo criterio
 *      que M08 con el correo (D5).
 *  R5  SEGUIMIENTO. El cliente solo ve el seguimiento de SUS pedidos (HU-SEG-03). Respuesta 404 opaca.
 *  R6  NOVEDADES. Un reporte de novedad del proveedor se guarda y avisa al personal; M10 no cambia el
 *      estado de la orden por una novedad.
 *  R7  WEBHOOK. El proveedor reporta cambios a `POST /entregas/webhook/:proveedor`, sin sesión y con token
 *      compartido (mismo esquema que el webhook de rebotes de M18). Sin proveedor configurado, 503.
 *  R8  SECRETOS. Las credenciales del proveedor viven solo en el backend (variables `ENVIOS_*`). Nunca se
 *      devuelven ni se registran.
 *  R10 COTIZACIÓN. El costo del envío a domicilio lo calcula el proveedor con origen, destino y peso y medidas de cada
 *      bulto; M10 solo arma la petición y toma la opción más barata. M07 lo pide en el checkout (`POST
 *      /checkout/envio/cotizar`) y lo congela al crear la solicitud.
 *  R11 RESPALDO. Si el proveedor falla, tarda más de 8 s, no ofrece opciones, o (siendo un proveedor real) falta el
 *      municipio o el peso de algún producto, se usa la tarifa de entrega propia y la cotización se marca
 *      `esEstimado`. La compra nunca se bloquea por el proveedor.
 *  R12 PRECIO CONSISTENTE. El cliente envía el costo que tenía en pantalla; si el servidor cotiza otro, M07 responde
 *      409 COSTO_ENVIO_CAMBIO con el nuevo y no crea nada, para que lo confirme.
 *  R9  PERMISOS. Ver el envío: `ventas.ver`. Reintentar o crear a mano: `ventas.gestionar`. Toda
 *      denegación responde 404 RECURSO_NO_DISPONIBLE. Cada acción del panel se audita (M20).
 *
 * DECISIONES
 *  D1  Sin proveedor elegido, el contrato fija la forma, no la marca. Los nombres de campo salen de lo que
 *      cualquier transportadora colombiana pide, no de una en concreto.
 *  D2  `envio_orden` (tabla nueva, cambio compartido) guarda proveedor, id externo, guía, enlaces,
 *      estado del envío y último error. Las novedades van en `novedad_envio`.
 *  D3  Cuando exista un proveedor real, `cotizar` sustituye la tarifa plana de M07. Ese cambio se hace
 *      entonces en M07 (un solo punto: pedirle el costo al puerto) y se aprueba aparte.
 *
 * DATOS DE PREPARACIÓN (el objetivo es integrar rápido cuando el cliente elija proveedor)
 *  Cualquier proveedor pedirá estos tres datos. Se dejan listos y OPCIONALES (null) para no romper lo que ya
 *  existe; cada uno toca a otro módulo y se aprueba y entrega por separado, con su propio PR:
 *  P1  Municipio y departamento del destino → dirección de M04, captura de M07 y copia en la orden de M08.
 *  P2  Peso y medidas de cada variante → catálogo de M01 (opcionales; el panel permite llenarlos).
 *  P3  Origen del envío (dirección y contacto del almacén) → HECHO sin tocar otro módulo: se lee de la ficha de
 *      datos del vendedor de M12 (`datos_facturacion`), que el personal ya edita en el panel. Solo lectura.
 *  M10 los consume cuando existen y manda null cuando no (`destinoEnvioSchema`, `bultoEnvioSchema`).
 *
 * PREGUNTAS ABIERTAS AL CLIENTE
 *  Q1  ¿Qué proveedor o agregador? ¿Se cobra el flete real al cliente o se sigue con tarifa plana?
 *  Q2  ¿La recogida tiene sede y horario que mostrar? (Q3 de M07)
 *
 * Fuente de verdad: docs/02_MODULOS_FUNCIONALES/M10_HISTORIAS_ENTREGA.md
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. ENUMS OFICIALES
 * ─────────────────────────────────────────────────────────────────────────── */

export const PROVEEDOR_ENVIO_PROPIO = 'envio_propio';

/** Estado del envío en el proveedor; el estado de la orden sigue siendo de M08. */
export const ESTADOS_ENVIO = ['pendiente', 'creado', 'en_transito', 'con_novedad', 'entregado', 'fallido'] as const;
export const estadoEnvioSchema = z.enum(ESTADOS_ENVIO);
export type EstadoEnvio = z.infer<typeof estadoEnvioSchema>;

export const CODIGOS_ERROR_M10 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  PROVEEDOR_NO_CONFIGURADO: 'PROVEEDOR_NO_CONFIGURADO',
  PROVEEDOR_NO_DISPONIBLE: 'PROVEEDOR_NO_DISPONIBLE',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. TIPOS DEL PUERTO (lo que M10 le pide al proveedor y lo que este responde)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Destino del envío. `municipio` y `departamento` son null hasta que M04/M07 los capturen (P1). */
export const destinoEnvioSchema = z.object({
  direccion: z.string().min(1).max(255),
  barrio: z.string().max(100).nullable(),
  complemento: z.string().max(100).nullable(),
  municipio: z.string().max(100).nullable(),
  departamento: z.string().max(100).nullable(),
  /** null si la orden guardó la dirección como texto y no se pudo separar quién recibe. */
  nombreRecibe: z.string().max(150).nullable(),
  telefonoRecibe: z.string().max(20).nullable(),
});
export type DestinoEnvio = z.infer<typeof destinoEnvioSchema>;

/** Desde dónde sale el envío. Sale de la ficha de datos del vendedor de M12 (solo lectura); null si aún no la llenaron. */
export const origenEnvioSchema = z.object({
  nombre: z.string().nullable(),
  direccion: z.string().nullable(),
  ciudad: z.string().nullable(),
  telefono: z.string().nullable(),
  correo: z.string().nullable(),
});
export type OrigenEnvio = z.infer<typeof origenEnvioSchema>;

/** Un bulto. Los pesos y medidas son null hasta que el catálogo los guarde (P2). */
export const bultoEnvioSchema = z.object({
  descripcion: z.string().max(150),
  cantidad: z.number().int().positive(),
  pesoGramos: z.number().int().positive().nullable(),
  altoCm: z.number().positive().nullable(),
  anchoCm: z.number().positive().nullable(),
  largoCm: z.number().positive().nullable(),
  valorDeclarado: z.number().nonnegative(),
});
export type BultoEnvio = z.infer<typeof bultoEnvioSchema>;

export const solicitudCotizacionSchema = z.object({
  origen: origenEnvioSchema,
  destino: destinoEnvioSchema,
  bultos: z.array(bultoEnvioSchema).min(1),
  /** Total de la mercancía, para la regla de envío gratis del adaptador por defecto. */
  totalMercancia: z.number().nonnegative(),
});
export type SolicitudCotizacion = z.infer<typeof solicitudCotizacionSchema>;

export const opcionEnvioSchema = z.object({
  proveedor: z.string().min(1),
  servicio: z.string().min(1).max(100),
  costo: z.number().nonnegative(),
  diasEstimados: z.number().int().nonnegative().nullable(),
});
export type OpcionEnvio = z.infer<typeof opcionEnvioSchema>;

export const solicitudCrearEnvioSchema = z.object({
  codigoOrden: z.string().min(1),
  origen: origenEnvioSchema,
  destino: destinoEnvioSchema,
  bultos: z.array(bultoEnvioSchema).min(1),
  servicio: z.string().max(100).nullable(),
});
export type SolicitudCrearEnvio = z.infer<typeof solicitudCrearEnvioSchema>;

export const resultadoCrearEnvioSchema = z.object({
  proveedor: z.string().min(1),
  idExterno: z.string().max(100).nullable(),
  numeroGuia: z.string().max(100).nullable(),
  urlSeguimiento: z.string().url().nullable(),
  urlEtiqueta: z.string().url().nullable(),
});
export type ResultadoCrearEnvio = z.infer<typeof resultadoCrearEnvioSchema>;

export const seguimientoEnvioSchema = z.object({
  estado: estadoEnvioSchema,
  detalle: z.string().max(500).nullable(),
  fechaEstimadaEntrega: z.string().datetime().nullable(),
  eventos: z.array(z.object({ fecha: z.string().datetime(), descripcion: z.string().max(500) })),
});
export type SeguimientoEnvio = z.infer<typeof seguimientoEnvioSchema>;

/** Lo que el proveedor reporta por webhook, ya traducido por su adaptador. */
export const eventoProveedorEnvioSchema = z.object({
  idExterno: z.string().min(1),
  estado: estadoEnvioSchema,
  detalle: z.string().max(500).nullable(),
});
export type EventoProveedorEnvio = z.infer<typeof eventoProveedorEnvioSchema>;

/**
 * Puerto que implementará cada proveedor (R1). El adaptador `envio_propio` es el de por defecto (R2).
 * Las operaciones que el proveedor no soporte lanzan `ProveedorEnvioError`, nunca devuelven datos inventados.
 */
export interface ServicioEnviosPort {
  readonly proveedor: string;
  cotizar(solicitud: SolicitudCotizacion): Promise<OpcionEnvio[]>;
  crearEnvio(solicitud: SolicitudCrearEnvio): Promise<ResultadoCrearEnvio>;
  consultarSeguimiento(idExterno: string): Promise<SeguimientoEnvio | null>;
  /** Traduce el cuerpo crudo del webhook al evento del contrato; null si no es un evento de envío. */
  interpretarWebhook(cuerpo: unknown): EventoProveedorEnvio | null;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 3. ENTIDAD Y RESPUESTAS DE LA API
 * ─────────────────────────────────────────────────────────────────────────── */

export const envioOrdenSchema = z.object({
  codigoOrden: z.string(),
  proveedor: z.string(),
  estado: estadoEnvioSchema,
  numeroGuia: z.string().nullable(),
  urlSeguimiento: z.string().url().nullable(),
  /** Solo el personal recibe la etiqueta. */
  urlEtiqueta: z.string().url().nullable(),
  ultimoError: z.string().nullable(),
  fechaCreacion: z.string().datetime(),
  fechaActualizacion: z.string().datetime(),
});
export type EnvioOrden = z.infer<typeof envioOrdenSchema>;

/** Lo que ve el cliente: sin etiqueta ni errores internos. */
export const envioClienteSchema = envioOrdenSchema.omit({ urlEtiqueta: true, ultimoError: true });
export type EnvioCliente = z.infer<typeof envioClienteSchema>;

export const novedadEnvioSchema = z.object({
  idNovedad: z.string().uuid(),
  detalle: z.string(),
  fecha: z.string().datetime(),
});
export type NovedadEnvio = z.infer<typeof novedadEnvioSchema>;

export const envioDetallePersonalSchema = z.object({
  envio: envioOrdenSchema.nullable(),
  novedades: z.array(novedadEnvioSchema),
});
export type EnvioDetallePersonal = z.infer<typeof envioDetallePersonalSchema>;

export const webhookEnvioOutputSchema = z.object({ procesado: z.boolean() });
export type WebhookEnvioOutput = z.infer<typeof webhookEnvioOutputSchema>;

export const PERMISOS_M10 = { ver: 'ventas.ver', gestionar: 'ventas.gestionar' } as const;

export const codigoOrdenParamsSchema = z.object({ codigo: z.string().trim().min(1).max(50) });

/* ───────────────────────────────────────────────────────────────────────────
 * 4. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Cliente (exige sesión; solo sus pedidos, R5)
 *  GET  /api/v1/ordenes/mis-pedidos/:codigo/envio            → EnvioCliente | 404
 *  Personal (`ventas.ver` / `ventas.gestionar`, R9)
 *  GET  /api/v1/ordenes/gestion/:codigo/envio                → EnvioDetallePersonal
 *  POST /api/v1/ordenes/gestion/:codigo/envio/reintentar     → EnvioOrden        (gestionar, R4)
 *  Proveedor (sin sesión, token compartido, R7)
 *  POST /api/v1/entregas/webhook/:proveedor                  → { procesado }
 * ─────────────────────────────────────────────────────────────────────────── */
