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

export const TIPOS_SOLICITUD_CONTACTO = ['consulta', 'cotizacion', 'reclamo'] as const;
export const tipoSolicitudContactoSchema = z.enum(TIPOS_SOLICITUD_CONTACTO);
export type TipoSolicitudContacto = z.infer<typeof tipoSolicitudContactoSchema>;

export const ESTADOS_SOLICITUD_CONTACTO = ['pendiente', 'atendida'] as const;
export const estadoSolicitudContactoSchema = z.enum(ESTADOS_SOLICITUD_CONTACTO);
export type EstadoSolicitudContacto = z.infer<typeof estadoSolicitudContactoSchema>;

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
 * Lo que necesita el botón público. `destinoEsUrl` evita que el frontend repita
 * la regla R7: si el destino ya es una URL (el canal), el botón la abre tal cual
 * y no le anexa texto; si es un número, arma el enlace wa.me con el mensaje.
 */
export const canalWhatsappPublicoSchema = z.object({
  destino: z.string(),
  mensajeBase: z.string().nullable(),
  destinoEsUrl: z.boolean(),
});
export type CanalWhatsappPublico = z.infer<typeof canalWhatsappPublicoSchema>;

/** Respuesta de POST /atencion/contacto. */
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

/** POST /atencion/contacto — el remitente lo resuelve el servidor (R5). */
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
  'LIMITE_SOLICITUDES_EXCEDIDO',
  'ERROR_INTERNO',
] as const;
export type CodigoErrorAtencion = (typeof CODIGOS_ERROR_ATENCION)[number];
