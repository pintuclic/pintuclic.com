import { z } from 'zod';

/**
 * ============================================================================
 * DTOs Y ESQUEMAS DE VALIDACIÓN — M15. Atención al cliente
 * ============================================================================
 * Espejo fiel de `contracts/m15-atencion.contract.ts` para ejecución backend
 * bajo Zod 4. Cero tipos `any`.
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

/** `HH:mm`, 24h (R10). */
export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado HH:mm');

/** R7/D6: un destino que empieza así es una URL completa y se usa tal cual. */
export const DESTINO_ES_URL = /^https?:\/\//i;

/** R6: contención de envíos automatizados del formulario de contacto (RF-ATC-02-08). */
export const LIMITE_SOLICITUDES_POR_VENTANA = 5;
export const VENTANA_LIMITE_MINUTOS = 60;

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
export type RemitenteSolicitud = z.infer<typeof remitenteSolicitudSchema>;

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
  abiertoAhora: z.boolean(),
});
export type HorarioAtencion = z.infer<typeof horarioAtencionSchema>;

export const configuracionWhatsappSchema = z.object({
  destino: z.string().trim().min(5).max(300),
  mensajeBase: z.string().trim().min(1).max(300).nullable(),
  fechaActualizacion: z.string().datetime(),
});
export type ConfiguracionWhatsapp = z.infer<typeof configuracionWhatsappSchema>;

export const canalWhatsappPublicoSchema = z.object({
  destino: z.string(),
  mensajeBase: z.string().nullable(),
  destinoEsUrl: z.boolean(),
});
export type CanalWhatsappPublico = z.infer<typeof canalWhatsappPublicoSchema>;

export const confirmacionContactoSchema = z.object({
  solicitud: solicitudContactoSchema,
  avisoHorario: z.string().nullable(),
  remitirAlCarrito: z.boolean(),
});
export type ConfirmacionContacto = z.infer<typeof confirmacionContactoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** POST /atencion/contacto — el remitente lo resuelve el servidor (R5). */
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
  franjas: z
    .array(franjaHorarioSchema)
    .length(7)
    .superRefine((franjas, ctx) => {
      const dias = new Set(franjas.map((f) => f.diaSemana));
      if (dias.size !== DIAS_SEMANA.length) {
        ctx.addIssue({ code: 'custom', message: 'Debe enviar los 7 días de la semana, sin repetir.' });
      }

      franjas.forEach((franja, indice) => {
        if (!franja.abierto) {
          if (franja.horaInicio !== null || franja.horaFin !== null) {
            ctx.addIssue({
              code: 'custom',
              path: [indice],
              message: 'Un día cerrado no lleva horas.',
            });
          }
          return;
        }

        if (franja.horaInicio === null || franja.horaFin === null) {
          ctx.addIssue({
            code: 'custom',
            path: [indice],
            message: 'Un día abierto exige hora de inicio y de cierre.',
          });
          return;
        }

        if (franja.horaFin <= franja.horaInicio) {
          ctx.addIssue({
            code: 'custom',
            path: [indice],
            message: 'La hora de cierre debe ser posterior a la de inicio.',
          });
        }
      });
    }),
});
export type ActualizarHorarioRequest = z.infer<typeof actualizarHorarioRequestSchema>;

/** PUT /admin/atencion/whatsapp */
export const actualizarWhatsappRequestSchema = z.object({
  destino: z.string().trim().min(5).max(300),
  mensajeBase: z.string().trim().min(1).max(300).nullable(),
});
export type ActualizarWhatsappRequest = z.infer<typeof actualizarWhatsappRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES (contrato, sección 5)
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_ATENCION = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'SOLICITUD_CERRADA',
  'ESPERANDO_RESPUESTA_EQUIPO',
  'SOLICITUD_NO_CALIFICABLE',
  'LIMITE_SOLICITUDES_EXCEDIDO',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorAtencion = (typeof CODIGOS_ERROR_ATENCION)[number];