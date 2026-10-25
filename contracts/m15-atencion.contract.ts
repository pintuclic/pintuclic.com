import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M15. Atención al cliente
 * ============================================================================
 * Scope: m15-atencion · Depende de M04 (sesión y datos de contacto). Lo consumen
 * M01 (botón de contacto directo en catálogo y ficha de producto) y, cuando
 * exista, M05 (mismo botón en el carrito).
 *
 * Este contrato ES la especificación del módulo y lo que el Tech Lead revisa antes
 * de que se escriba el código. Lo que cambie aquí cambia el módulo.
 *
 * Fuente funcional: docs/02_MODULOS_FUNCIONALES/M15_ESPECIFICACION_ATENCION.md
 *
 * ── Qué es M15 ──────────────────────────────────────────────────────────────
 *  Atiende al cliente que ya no encontró su respuesta: formulario de contacto
 *  para usuarios autenticados (HU-ATC-02), botón de contacto directo por
 *  WhatsApp («Megaconstrucción», HU-ATC-03), horario de atención humana
 *  configurable (HU-ATC-04) y la base para escalar una consulta automatizada a
 *  un empleado (HU-ATC-05).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No gestiona las preguntas frecuentes. HU-ATC-01 la cumple M16, dueño del
 *    contenido: su contrato (`contracts/m16-contenido.contract.ts`, HU-CON-02 y
 *    HU-CON-04) las administra, las publica en `/contenido/faq` y las expone por
 *    `ContenidoFaqPort`. La spec de M15 dice lo contrario en RF-ATC-01-06, pero
 *    M16 llegó antes a `main` y el equipo resolvió a su favor: queda pendiente
 *    corregir esa línea de la spec.
 *  · No integra la API de WhatsApp Business: el botón es un enlace saliente.
 *    Hoy ese enlace es el canal de difusión de la empresa (temporal, solo para
 *    confirmar que redirige bien); cuando exista un número Business real se
 *    cambia el valor configurado, sin tocar código (R7).
 *  · No implementa el criterio de escalamiento (RF-ATC-05-04) ni una cola o
 *    pantalla de atención de consultas escaladas: eso depende de M03, que no
 *    existe. Solo se contrata el PUERTO (sección 6).
 *  · No crea cotizaciones formales desde el formulario: el tipo `cotizacion` es
 *    un mensaje de intención; el camino formal es el carrito (HU-COT-01, M05).
 *  · No gestiona la configuración general de M17 (`parametro_sistema`): la
 *    configuración de WhatsApp y del horario vive en tablas propias de M15
 *    (D2), para no tocar el contrato de otro módulo.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R3  `POST /atencion/contacto` exige sesión vigente; sin ella, el servidor
 *      responde la denegación estándar y el frontend lleva a login (CA-ATC-02-04).
 *  R4  El tipo `cotizacion` nunca genera una cotización: se guarda como mensaje
 *      de intención dirigido al administrador y el frontend remite al carrito
 *      tras confirmar el envío (RF-ATC-02-07, CA-ATC-02-03).
 *  R5  Nombre, correo y teléfono del remitente se resuelven en el servidor desde
 *      la sesión; el body solo acepta `tipo` y `descripcion` (RF-ATC-02-04).
 *  R6  Protección anti-automatización (RF-ATC-02-08, D5): límite de solicitudes
 *      por usuario autenticado en `/atencion/contacto`; al excederlo, 429
 *      `LIMITE_SOLICITUDES_EXCEDIDO`.
 *  R7  El destino del botón WhatsApp es texto libre (D6): si es una URL
 *      (`http(s)://…`, como el canal vigente) se usa tal cual, sin anexar texto;
 *      si es un número, se arma `https://wa.me/<numero>?text=<mensaje+referencia>`.
 *      Un canal no admite texto prellenado ni referencia de producto, por lo que
 *      RF-ATC-03-03 solo aplica cuando el destino es un número.
 *  R8  Fuera del horario de atención humana configurado, el botón WhatsApp
 *      advierte demora (RF-ATC-03-05) y el escalamiento no se dirige a un
 *      empleado (RF-ATC-05-03); los canales automatizados no se ven afectados
 *      (RF-ATC-04-04).
 *  R9  El formulario se recibe igual fuera de horario; solo cambia el mensaje
 *      de confirmación, que avisa que la respuesta llega dentro del horario
 *      (RF-ATC-04-05).
 *  R10 El horario se define por día de semana con una franja `horaInicio`–
 *      `horaFin` en formato `HH:mm` (24h); un día con `abierto=false` se
 *      considera cerrado todo el día.
 *  R11 Autorización siempre en el servidor, también en los GET administrativos.
 *      Toda denegación (sin sesión o sin permiso) responde 404
 *      `RECURSO_NO_DISPONIBLE`, idéntico al de un recurso inexistente (ADR-003).
 *
 * ── Pantallas ────────────────────────────────────────────────────────────────
 *  Admin (`/admin/atencion`): Solicitudes de contacto (lista, filtro por
 *  tipo/estado, marcar atendida) · Horario y canal (horario semanal, destino y
 *  mensaje de WhatsApp). Las preguntas frecuentes se administran en Contenido (M16).
 *  Público: en `/centro-de-ayuda`, debajo de las preguntas frecuentes de M16,
 *  M15 agrega el formulario de contacto, el horario vigente y el botón de
 *  contacto directo. Ese botón va además en el catálogo y la ficha de producto
 *  (M01) y, cuando exista, en el carrito (M05).
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  GET público → sin permiso. `POST /atencion/contacto` → solo sesión.
 *  Bajo `/admin/atencion/*`: los GET exigen `atencion.ver` y toda escritura
 *  exige `atencion.editar` (que depende de `atencion.ver`, como el resto del
 *  catálogo de M17). El puerto de escalamiento reserva `atencion.atender_clientes`
 *  (RF-ATC-05-01) para cuando M03 exista.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Ids: `HorarioAtencion` es entero autoincremental (estilo catálogo);
 *      `SolicitudContacto` es UUID (estilo `Solicitud*` de M04).
 *  D2  La configuración de WhatsApp y el horario viven en tablas propias de M15
 *      (`ConfiguracionAtencionWhatsapp`, fila única; `HorarioAtencion`, 7 filas),
 *      no en `parametro_sistema` de M17: esa tabla está acotada por RF-ADM-07-02/
 *      03/04 a auth/comunicaciones/comercial y es contrato de otro módulo.
 *  D3  Permisos nuevos (área funcional `atencion` del catálogo de M17):
 *      `atencion.ver`, `atencion.editar` y `atencion.atender_clientes`. Se
 *      siguen el par ver/editar y la dependencia `editar → ver` que ya usan
 *      `configuracion.*` y `notificaciones.*`, en vez de un permiso único:
 *      así la matriz de permisos del panel agrupa M15 como cualquier otra área.
 *      Obliga a tocar el catálogo de M17 (contrato, dtos de backend y frontend,
 *      `determinarArea` y `DEPENDENCIAS_CONSULTA`), igual que hizo M18; va en el
 *      PR de archivos compartidos y se avisa al equipo.
 *  D4  `SolicitudContacto` tiene un `estado` (`pendiente`/`atendida`, deducido):
 *      la spec solo exige enrutar al administrador (RF-ATC-02-05), pero sin esto
 *      la bandeja del admin no se puede vaciar.
 *  D5  Anti-automatización (RF-ATC-02-08): límite de solicitudes por usuario
 *      autenticado, no CAPTCHA — ya hay sesión obligatoria, no es anónimo.
 *  D6  Ver R7. El campo se llama `destino` (no `numero`) porque hoy admite una
 *      URL de canal; cuando haya número Business, el mismo campo recibe el
 *      número y el botón empieza a incluir texto y referencia.
 *  D7  Botón WhatsApp en M01 (catálogo y ficha de producto): autorizado
 *      expresamente por el PO para que M15 toque esas pantallas. M05 (carrito)
 *      no existe aún — el punto de montaje en el carrito queda pendiente y se
 *      avisa al equipo cuando se construya M05 (ver nota en el PR del módulo).
 *  D8  HU-ATC-05: solo se contrata `EscalamientoConsultasPort` (sección 6) y el
 *      permiso `atencion.atender_clientes`. Sin pantalla ni cola de atención:
 *      no hay nada que las alimente hasta que M03 exista (ver nota en el PR).
 *  D9  HU-ATC-01 la cumple M16 y M15 no la duplica: ni tabla, ni CRUD, ni
 *      pantalla de preguntas frecuentes. El centro de ayuda sigue siendo de M16
 *      y M15 le suma debajo el contacto, el horario y el canal directo.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const idSchema = z.number().int().positive();
export const idSolicitudSchema = z.string().uuid();

export const TIPOS_SOLICITUD_CONTACTO = ['consulta', 'cotizacion', 'reclamo'] as const;
export const tipoSolicitudContactoSchema = z.enum(TIPOS_SOLICITUD_CONTACTO);
export type TipoSolicitudContacto = z.infer<typeof tipoSolicitudContactoSchema>;

export const ESTADOS_SOLICITUD_CONTACTO = ['pendiente', 'atendida'] as const;
export const estadoSolicitudContactoSchema = z.enum(ESTADOS_SOLICITUD_CONTACTO);
export type EstadoSolicitudContacto = z.infer<typeof estadoSolicitudContactoSchema>;

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export const diaSemanaSchema = z.enum(DIAS_SEMANA);
export type DiaSemana = z.infer<typeof diaSemanaSchema>;

/** `HH:mm`, 24h. */
export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado HH:mm');

/** R7/D6: si el destino configurado empieza así, es una URL completa (p. ej. el canal) y se usa tal cual. */
export const DESTINO_ES_URL = /^https?:\/\//i;

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES
 * ─────────────────────────────────────────────────────────────────────────── */

export const remitenteSolicitudSchema = z.object({
  nombre: z.string(),
  correo: z.string().email(),
  telefono: z.string().nullable(),
});

export const solicitudContactoSchema = z.object({
  idSolicitud: idSolicitudSchema,
  idUsuario: idSchema,
  remitente: remitenteSolicitudSchema,
  tipo: tipoSolicitudContactoSchema,
  descripcion: z.string(),
  estado: estadoSolicitudContactoSchema,
  fechaCreacion: z.string().datetime(),
});
export type SolicitudContacto = z.infer<typeof solicitudContactoSchema>;

export const franjaHorarioSchema = z.object({
  diaSemana: diaSemanaSchema,
  abierto: z.boolean(),
  horaInicio: horaSchema.nullable(),
  horaFin: horaSchema.nullable(),
});
export type FranjaHorario = z.infer<typeof franjaHorarioSchema>;

export const horarioAtencionSchema = z.object({
  franjas: z.array(franjaHorarioSchema).length(7),
  /** Calculado por el servidor al momento de responder, con la hora de Colombia. */
  abiertoAhora: z.boolean(),
});
export type HorarioAtencion = z.infer<typeof horarioAtencionSchema>;

export const configuracionWhatsappSchema = z.object({
  destino: z.string().trim().min(5).max(300),
  mensajeBase: z.string().trim().min(1).max(300).nullable(),
  fechaActualizacion: z.string().datetime(),
});
export type ConfiguracionWhatsapp = z.infer<typeof configuracionWhatsappSchema>;

/**
 * Vista pública del canal: lo mínimo para armar el botón. `destinoEsUrl` lo
 * resuelve el servidor para que el frontend no repita la regla R7.
 */
export const canalWhatsappPublicoSchema = z.object({
  destino: z.string(),
  mensajeBase: z.string().nullable(),
  destinoEsUrl: z.boolean(),
});
export type CanalWhatsappPublico = z.infer<typeof canalWhatsappPublicoSchema>;

/**
 * Respuesta de `POST /atencion/contacto`. El aviso de horario y la remisión al
 * carrito los decide el servidor: son reglas del módulo (R4, R9) y no deben
 * reimplementarse en el frontend.
 */
export const confirmacionContactoSchema = z.object({
  solicitud: solicitudContactoSchema,
  /** R9: null dentro del horario; el aviso cuando la solicitud llega fuera de él. */
  avisoHorario: z.string().nullable(),
  /** R4: true en una cotización, para que el frontend remita al carrito. */
  remitirAlCarrito: z.boolean(),
});
export type ConfirmacionContacto = z.infer<typeof confirmacionContactoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** POST /atencion/contacto — requiere sesión (R3/R5); remitente se resuelve en servidor. */
export const crearSolicitudContactoRequestSchema = z.object({
  tipo: tipoSolicitudContactoSchema,
  descripcion: z.string().trim().min(5).max(2000),
});
export type CrearSolicitudContactoRequest = z.infer<typeof crearSolicitudContactoRequestSchema>;

/** GET /admin/atencion/solicitudes-contacto */
export const listarSolicitudesRequestSchema = paginacionQuerySchema.extend({
  tipo: tipoSolicitudContactoSchema.optional(),
  estado: estadoSolicitudContactoSchema.optional(),
});
export type ListarSolicitudesRequest = z.infer<typeof listarSolicitudesRequestSchema>;

/** PUT /admin/atencion/horario — reemplaza la semana completa (D-ninguna, R10). */
export const actualizarHorarioRequestSchema = z.object({
  franjas: z.array(franjaHorarioSchema).length(7),
});
export type ActualizarHorarioRequest = z.infer<typeof actualizarHorarioRequestSchema>;

/** PUT /admin/atencion/whatsapp */
export const actualizarWhatsappRequestSchema = z.object({
  destino: z.string().trim().min(5).max(300),
  mensajeBase: z.string().trim().min(1).max(300).nullable(),
});
export type ActualizarWhatsappRequest = z.infer<typeof actualizarWhatsappRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS
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

export const solicitudContactoResponseEnvelopeSchema = respuestaUno(solicitudContactoSchema);
export type SolicitudContactoResponseEnvelope = z.infer<typeof solicitudContactoResponseEnvelopeSchema>;

/** POST /atencion/contacto. */
export const confirmacionContactoResponseEnvelopeSchema = respuestaUno(confirmacionContactoSchema);
export type ConfirmacionContactoResponseEnvelope = z.infer<
  typeof confirmacionContactoResponseEnvelopeSchema
>;

/** GET /atencion/whatsapp (público). */
export const canalWhatsappResponseEnvelopeSchema = respuestaUno(canalWhatsappPublicoSchema);
export type CanalWhatsappResponseEnvelope = z.infer<typeof canalWhatsappResponseEnvelopeSchema>;

export const listarSolicitudesResponseEnvelopeSchema = respuestaPaginada(solicitudContactoSchema);
export type ListarSolicitudesResponseEnvelope = z.infer<typeof listarSolicitudesResponseEnvelopeSchema>;

export const horarioResponseEnvelopeSchema = respuestaUno(horarioAtencionSchema);
export type HorarioResponseEnvelope = z.infer<typeof horarioResponseEnvelopeSchema>;

export const whatsappResponseEnvelopeSchema = respuestaUno(configuracionWhatsappSchema);
export type WhatsappResponseEnvelope = z.infer<typeof whatsappResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * Mismo envelope global del resto de la API. Estados HTTP: 400 PARAMETRO_INVALIDO ·
 * 404 RECURSO_NO_DISPONIBLE (toda denegación, R11) · 429 LIMITE_SOLICITUDES_EXCEDIDO (R6).
 */
export const CODIGOS_ERROR_ATENCION = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'LIMITE_SOLICITUDES_EXCEDIDO',
  'ERROR_INTERNO',
] as const;

export const errorAtencionEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_ATENCION),
    message: z.string(),
    details: z.null(),
  }),
});
export type ErrorAtencionEnvelope = z.infer<typeof errorAtencionEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. RN-ATC — PUERTO DE ESCALAMIENTO (HU-ATC-05, RF-ATC-05-04 bloqueada por M03)
 *
 * Se contrata la FIRMA, no la API ni la pantalla. Esto permite declarar hoy el
 * permiso `atencion.atender_clientes` y el punto de extensión, y que M03
 * implemente el adaptador real — con su propia cola o criterio de asignación —
 * sin que M15 cambie. D8.
 * ─────────────────────────────────────────────────────────────────────────── */

export const solicitudEscalamientoSchema = z.object({
  idUsuario: idSchema.nullable(),
  resumenConsulta: z.string(),
});
export type SolicitudEscalamiento = z.infer<typeof solicitudEscalamientoSchema>;

/** El adaptador vigente en esta entrega no existe (no hay llamador: M03 no está). */
export interface EscalamientoConsultasPort {
  escalarAHumano(solicitud: SolicitudEscalamiento): Promise<void>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 7. MAPA DE RUTAS (montaje: /api/v1/atencion y /api/v1/admin/atencion)
 * ───────────────────────────────────────────────────────────────────────────
 *  GET   /atencion/horario                                 público          → horario + abiertoAhora
 *  GET   /atencion/whatsapp                                público          → canalWhatsappPublico
 *  POST  /atencion/contacto                                sesión           → confirmacionContacto
 *
 *  GET    /admin/atencion/solicitudes-contacto             atencion.ver     → listarSolicitudes (paginado)
 *  PATCH  /admin/atencion/solicitudes-contacto/:idSolicitud/atender  atencion.editar → marcarAtendida
 *  GET    /admin/atencion/horario                          atencion.ver     → verHorario
 *  PUT    /admin/atencion/horario                          atencion.editar  → actualizarHorario
 *  GET    /admin/atencion/whatsapp                         atencion.ver     → verWhatsapp
 *  PUT    /admin/atencion/whatsapp                         atencion.editar  → actualizarWhatsapp
 *
 *  Las preguntas frecuentes las sirve M16: `GET /contenido/faq` (público) y
 *  `/admin/contenido/faq` (administración).
 * ─────────────────────────────────────────────────────────────────────────── */
