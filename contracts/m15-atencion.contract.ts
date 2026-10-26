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
 *  para usuarios autenticados con hilo de conversación ("ping-pong"), gestión de
 *  estados (`en_revision`, `atendida`, `rechazada`) y calificación de 1 a 5
 *  estrellas al cierre (HU-ATC-02), botón de contacto directo por WhatsApp
 *  («Megaconstrucción», HU-ATC-03), horario de atención humana configurable
 *  (HU-ATC-04) y la base para escalar una consulta automatizada a un empleado
 *  (HU-ATC-05).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No gestiona las preguntas frecuentes. HU-ATC-01 la cumple M16, dueño del
 *    contenido: su contrato (`contracts/m16-contenido.contract.ts`, HU-CON-02 y
 *    HU-CON-04) las administra, las publica en `/contenido/faq` y las expone por
 *    `ContenidoFaqPort`.
 *  · No integra la API de WhatsApp Business: el botón es un enlace saliente.
 *    Hoy ese enlace es el canal de difusión de la empresa (temporal, solo para
 *    confirmar que redirige bien); cuando exista un número Business real se
 *    cambia el valor configurado, sin tocar código (R7).
 *  · No implementa el criterio de escalamiento automático (RF-ATC-05-04): eso
 *    depende de M03 (chatbot IA), que aún no existe. Sí utiliza el permiso
 *    `atencion.atender_clientes` para que los empleados autorizados respondan y
 *    gestionen el hilo de solicitudes de contacto de los clientes.
 *  · No crea cotizaciones formales desde el formulario: el tipo `cotizacion` es
 *    un mensaje de intención; el camino formal es el carrito (HU-COT-01, M05).
 *  · No gestiona la configuración general de M17 (`parametro_sistema`): la
 *    configuración de WhatsApp y del horario vive en tablas propias de M15
 *    (D2), para no tocar el contrato de otro módulo.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R3  `POST /atencion/contacto` y todos los endpoints bajo `/atencion/mis-solicitudes*`
 *      exigen sesión vigente; sin ella, el servidor responde la denegación
 *      estándar y el frontend lleva a login (CA-ATC-02-04).
 *  R4  El tipo `cotizacion` nunca genera una cotización: se guarda como mensaje
 *      de intención dirigido al equipo y el frontend remite al carrito tras
 *      confirmar el envío (RF-ATC-02-07, CA-ATC-02-03).
 *  R5  Nombre, correo y teléfono del remitente se resuelven en el servidor desde
 *      la sesión; el body de creación solo acepta `tipo` y `descripcion` (RF-ATC-02-04).
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
 *  R11 Autorización siempre en el servidor, también en los GET administrativos y
 *      en el detalle de solicitudes del cliente. Toda denegación (sin sesión, sin
 *      permiso o consulta de una solicitud ajena) responde 404 opaco
 *      `RECURSO_NO_DISPONIBLE`, idéntico al de un recurso inexistente (ADR-003).
 *  R12 Ciclo de vida e hilo de conversación ("ping-pong" libre):
 *      · Toda solicitud nace en estado `en_revision`.
 *      · Mientras la solicitud está en `en_revision`, tanto el cliente titular
 *        como el admin/empleado con permiso `atencion.atender_clientes` (o
 *        `atencion.editar`) pueden enviar mensajes consecutivos en el hilo sin
 *        restricción de turnos.
 *      · El admin/empleado puede cambiar el estado entre `en_revision`,
 *        `atendida` y `rechazada` (p. ej., cuando la consulta es ajena a Pintu Clic).
 *      · Cuando la solicitud está en estado `atendida` o `rechazada`, el cliente
 *        queda bloqueado para enviar nuevos mensajes (`409 SOLICITUD_CERRADA`).
 *        El equipo sí puede enviar mensajes adicionales o reabrirla pasándola a
 *        `en_revision`.
 *  R13 Calificación de la atención (1 a 5 estrellas):
 *      · Solo cuando una solicitud pasa a estado `atendida`, el cliente titular
 *        puede calificar la atención recibida con un entero de 1 a 5 estrellas
 *        (`PATCH /atencion/mis-solicitudes/:idSolicitud/calificacion`).
 *      · En la vista del hilo del cliente, cuando `estado === 'atendida'`, se
 *        muestra al final la pregunta "¿Cómo fue mi respuesta el día de hoy?"
 *        junto con la valoración de 1 a 5 estrellas.
 *      · Si el cliente intenta calificar una solicitud en estado `en_revision` o
 *        `rechazada`, el servidor responde `409 SOLICITUD_NO_CALIFICABLE`.
 *
 * ── Pantallas ────────────────────────────────────────────────────────────────
 *  Admin (`/admin/atencion`): Solicitudes de contacto (lista, filtro por
 *  tipo/estado `en_revision | atendida | rechazada`, vista del hilo de mensajes,
 *  envío de respuestas consecutivas, cambio de estado y visualización de la
 *  calificación otorgada por el cliente) · Horario y canal (horario semanal,
 *  destino y mensaje de WhatsApp). Las preguntas frecuentes se administran en
 *  Contenido (M16).
 *  Cliente (`/perfil?seccion=solicitudes`): sección "Mis solicitudes" dentro de
 *  "Mi cuenta", donde el cliente autenticado consulta sus solicitudes con tipo,
 *  descripción, estado (`en_revision`, `atendida`, `rechazada`), abre el hilo de
 *  conversación para enviar mensajes (mientras esté `en_revision`) y califica de
 *  1 a 5 estrellas cuando pasa a `atendida`.
 *  Público (`/centro-de-ayuda`): debajo de las preguntas frecuentes de M16, M15
 *  agrega el formulario de contacto, el horario vigente y el botón de contacto
 *  directo.
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  GET `/atencion/horario` y `/atencion/whatsapp` → público.
 *  `POST /atencion/contacto` y `/atencion/mis-solicitudes*` → sesión autenticada
 *  (el servidor verifica titularidad `solicitud.idUsuario === req.user.idUsuario`).
 *  Bajo `/admin/atencion/*`:
 *  · Lectura de solicitudes (`GET /solicitudes-contacto*`), horario y WhatsApp →
 *    exige `atencion.ver` (tanto `atencion.editar` como `atencion.atender_clientes`
 *    dependen de `atencion.ver` en M17).
 *  · Responder solicitudes y cambiar su estado (`POST .../mensajes`, `PATCH .../estado`) →
 *    exige `atencion.atender_clientes` (o `atencion.editar`).
 *  · Configurar horario y canal de WhatsApp (`PUT /horario`, `PUT /whatsapp`) →
 *    exige `atencion.editar`.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Ids: `HorarioAtencion` es entero autoincremental; `SolicitudContacto` y
 *      `MensajeSolicitudContacto` son UUID.
 *  D2  La configuración de WhatsApp y el horario viven en tablas propias de M15
 *      (`ConfiguracionAtencionWhatsapp`, fila única; `HorarioAtencion`, 7 filas).
 *  D3  Permisos del área funcional `atencion` en M17: `atencion.ver`,
 *      `atencion.editar` y `atencion.atender_clientes`. Tanto `atencion.editar`
 *      como `atencion.atender_clientes` arrastran `atencion.ver` en
 *      `DEPENDENCIAS_CONSULTA` para que el empleado que atiende clientes pueda
 *      consultar la bandeja y responder hilos sin necesitar permiso de edición
 *      de horario/WhatsApp.
 *  D4  `SolicitudContacto` maneja tres estados (`en_revision`, `atendida`,
 *      `rechazada`), una relación 1:N con `MensajeSolicitudContacto` y los
 *      campos `calificacion` (1..5, nullable) y `fechaCalificacion` (nullable).
 *  D5  Anti-automatización (RF-ATC-02-08): límite de solicitudes por usuario
 *      autenticado, no CAPTCHA — ya hay sesión obligatoria, no es anónimo.
 *  D6  Ver R7. El campo se llama `destino` (no `numero`) porque hoy admite una
 *      URL de canal; cuando haya número Business, el mismo campo recibe el
 *      número y el botón empieza a incluir texto y referencia.
 *  D7  Botón WhatsApp en M01 (catálogo y ficha de producto): autorizado
 *      expresamente por el PO para que M15 toque esas pantallas.
 *  D8  HU-ATC-05: se mantiene `EscalamientoConsultasPort` (sección 6) para cuando
 *      exista M03, mientras `atencion.atender_clientes` ya gobierna la atención
 *      humana de los hilos de solicitudes de contacto.
 *  D9  HU-ATC-01 la cumple M16 y M15 no la duplica.
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
export const idMensajeSolicitudSchema = z.string().uuid();

export const TIPOS_SOLICITUD_CONTACTO = ['consulta', 'cotizacion', 'reclamo'] as const;
export const tipoSolicitudContactoSchema = z.enum(TIPOS_SOLICITUD_CONTACTO);
export type TipoSolicitudContacto = z.infer<typeof tipoSolicitudContactoSchema>;

export const ESTADOS_SOLICITUD_CONTACTO = ['en_revision', 'atendida', 'rechazada'] as const;
export const estadoSolicitudContactoSchema = z.enum(ESTADOS_SOLICITUD_CONTACTO);
export type EstadoSolicitudContacto = z.infer<typeof estadoSolicitudContactoSchema>;

export const ROLES_AUTOR_MENSAJE = ['cliente', 'equipo'] as const;
export const rolAutorMensajeSchema = z.enum(ROLES_AUTOR_MENSAJE);
export type RolAutorMensaje = z.infer<typeof rolAutorMensajeSchema>;

/** Valoración de 1 a 5 estrellas cuando la solicitud pasa a estado `atendida` (R13). */
export const calificacionAtencionSchema = z.number().int().min(1).max(5);
export type CalificacionAtencion = z.infer<typeof calificacionAtencionSchema>;

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

export const mensajeSolicitudContactoSchema = z.object({
  idMensaje: idMensajeSolicitudSchema,
  idSolicitud: idSolicitudSchema,
  idAutor: idSchema,
  rolAutor: rolAutorMensajeSchema,
  nombreAutor: z.string(),
  contenido: z.string().trim().min(1).max(2000),
  fechaCreacion: z.string().datetime(),
});
export type MensajeSolicitudContacto = z.infer<typeof mensajeSolicitudContactoSchema>;

export const solicitudContactoSchema = z.object({
  idSolicitud: idSolicitudSchema,
  idUsuario: idSchema,
  remitente: remitenteSolicitudSchema,
  tipo: tipoSolicitudContactoSchema,
  descripcion: z.string(),
  estado: estadoSolicitudContactoSchema,
  calificacion: calificacionAtencionSchema.nullable(),
  fechaCalificacion: z.string().datetime().nullable(),
  totalMensajes: z.number().int().nonnegative(),
  fechaCreacion: z.string().datetime(),
});
export type SolicitudContacto = z.infer<typeof solicitudContactoSchema>;

export const solicitudContactoDetalleSchema = solicitudContactoSchema.extend({
  mensajes: z.array(mensajeSolicitudContactoSchema),
});
export type SolicitudContactoDetalle = z.infer<typeof solicitudContactoDetalleSchema>;

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

/** GET /atencion/mis-solicitudes y GET /admin/atencion/solicitudes-contacto */
export const listarSolicitudesRequestSchema = paginacionQuerySchema.extend({
  tipo: tipoSolicitudContactoSchema.optional(),
  estado: estadoSolicitudContactoSchema.optional(),
});
export type ListarSolicitudesRequest = z.infer<typeof listarSolicitudesRequestSchema>;

/**
 * POST /atencion/mis-solicitudes/:idSolicitud/mensajes
 * POST /admin/atencion/solicitudes-contacto/:idSolicitud/mensajes
 */
export const crearMensajeSolicitudRequestSchema = z.object({
  contenido: z.string().trim().min(1).max(2000),
});
export type CrearMensajeSolicitudRequest = z.infer<typeof crearMensajeSolicitudRequestSchema>;

/** PATCH /admin/atencion/solicitudes-contacto/:idSolicitud/estado */
export const actualizarEstadoSolicitudRequestSchema = z.object({
  estado: estadoSolicitudContactoSchema,
});
export type ActualizarEstadoSolicitudRequest = z.infer<typeof actualizarEstadoSolicitudRequestSchema>;

/** PATCH /atencion/mis-solicitudes/:idSolicitud/calificacion (solo cuando estado === 'atendida', R13) */
export const calificarSolicitudRequestSchema = z.object({
  calificacion: calificacionAtencionSchema,
});
export type CalificarSolicitudRequest = z.infer<typeof calificarSolicitudRequestSchema>;

/** PUT /admin/atencion/horario — reemplaza la semana completa (R10). */
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

export const solicitudContactoDetalleResponseEnvelopeSchema = respuestaUno(solicitudContactoDetalleSchema);
export type SolicitudContactoDetalleResponseEnvelope = z.infer<
  typeof solicitudContactoDetalleResponseEnvelopeSchema
>;

export const mensajeSolicitudResponseEnvelopeSchema = respuestaUno(mensajeSolicitudContactoSchema);
export type MensajeSolicitudResponseEnvelope = z.infer<typeof mensajeSolicitudResponseEnvelopeSchema>;

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
 * Mismo envelope global del resto de la API. Estados HTTP:
 * · 400 PARAMETRO_INVALIDO
 * · 404 RECURSO_NO_DISPONIBLE (toda denegación o solicitud ajena, R11 / ADR-003)
 * · 409 SOLICITUD_CERRADA (cliente intenta escribir cuando está atendida o rechazada, R12)
 * · 409 SOLICITUD_NO_CALIFICABLE (cliente intenta calificar cuando no está atendida, R13)
 * · 429 LIMITE_SOLICITUDES_EXCEDIDO (R6)
 */
export const CODIGOS_ERROR_ATENCION = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'SOLICITUD_CERRADA',
  'SOLICITUD_NO_CALIFICABLE',
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
 * Se contrata la FIRMA, no la API ni la pantalla de escalamiento automático.
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
 *  GET   /atencion/horario                                           público                     → horario + abiertoAhora
 *  GET   /atencion/whatsapp                                          público                     → canalWhatsappPublico
 *  POST  /atencion/contacto                                          sesión                      → confirmacionContacto
 *  GET   /atencion/mis-solicitudes                                   sesión (titular)            → listarMisSolicitudes (paginado)
 *  GET   /atencion/mis-solicitudes/:idSolicitud                      sesión (titular)            → obtenerMiSolicitudDetalle (+ mensajes)
 *  POST  /atencion/mis-solicitudes/:idSolicitud/mensajes             sesión (titular, R12)       → agregarMensajeCliente
 *  PATCH /atencion/mis-solicitudes/:idSolicitud/calificacion         sesión (titular, R13)       → calificarSolicitud (1..5 estrellas)
 *
 *  GET   /admin/atencion/solicitudes-contacto                        atencion.ver                → listarSolicitudes (paginado)
 *  GET   /admin/atencion/solicitudes-contacto/:idSolicitud           atencion.ver                → obtenerSolicitudDetalle (+ mensajes)
 *  POST  /admin/atencion/solicitudes-contacto/:idSolicitud/mensajes  atencion.atender_clientes   → agregarMensajeEquipo
 *  PATCH /admin/atencion/solicitudes-contacto/:idSolicitud/estado    atencion.atender_clientes   → cambiarEstadoSolicitud
 *  GET   /admin/atencion/horario                                     atencion.ver                → verHorario
 *  PUT   /admin/atencion/horario                                     atencion.editar             → actualizarHorario
 *  GET   /admin/atencion/whatsapp                                    atencion.ver                → verWhatsapp
 *  PUT   /admin/atencion/whatsapp                                    atencion.editar             → actualizarWhatsapp
 *
 *  Las preguntas frecuentes las sirve M16: `GET /contenido/faq` (público) y
 *  `/admin/contenido/faq` (administración).
 * ─────────────────────────────────────────────────────────────────────────── */