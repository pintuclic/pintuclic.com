import { z } from 'zod';

/**
 * ============================================================================
 * DTO ESPEJO — M12. Facturación (comprobante de venta imprimible)
 * ============================================================================
 * Espejo exacto de `contracts/m12-facturacion.contract.ts` (la prueba de espejo lo comprueba).
 * ============================================================================
 */

export const PERMISOS_M12 = {
  verComprobantes: 'ventas.ver',
  reenviarComprobantes: 'ventas.gestionar',
  verDatos: 'configuracion.ver',
  editarDatos: 'configuracion.editar',
} as const;

export const CODIGOS_ERROR_M12 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  COMPROBANTE_NO_DISPONIBLE: 'COMPROBANTE_NO_DISPONIBLE',
  DATOS_VENDEDOR_INCOMPLETOS: 'DATOS_VENDEDOR_INCOMPLETOS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export const PREFIJO_COMPROBANTE = 'CV';
export const NUMERO_COMPROBANTE_PATRON = /^CV-\d{6,}$/;

const importeSchema = z.number().nonnegative();
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${String(max)} caracteres`)
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v));

/* ─── Datos del vendedor (ficha única, la edita el personal) ──────────────── */

export const editarDatosFacturacionRequestSchema = z.object({
  razonSocial: textoOpcional(150),
  nit: textoOpcional(30),
  regimen: textoOpcional(150),
  direccion: textoOpcional(200),
  ciudad: textoOpcional(100),
  telefono: textoOpcional(30),
  correo: z
    .string()
    .trim()
    .max(150, 'Máximo 150 caracteres')
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v))
    .refine((v) => v === null || z.string().email().safeParse(v).success, { message: 'Escriba un correo válido' }),
  /** Texto bajo el total (por ejemplo, «Documento sin validez fiscal ante la DIAN»). */
  pieLegal: textoOpcional(500),
});
export type EditarDatosFacturacionRequest = z.infer<typeof editarDatosFacturacionRequestSchema>;

export const datosFacturacionSchema = z.object({
  razonSocial: z.string().nullable(),
  nit: z.string().nullable(),
  regimen: z.string().nullable(),
  direccion: z.string().nullable(),
  ciudad: z.string().nullable(),
  telefono: z.string().nullable(),
  correo: z.string().nullable(),
  pieLegal: z.string().nullable(),
  /** Qué falta para poder emitir (R6): vacío = completa. */
  faltantes: z.array(z.enum(['razonSocial', 'nit', 'direccion'])),
  fechaActualizacion: z.string().datetime().nullable(),
  actualizadoPor: z.string().nullable(),
});
export type DatosFacturacion = z.infer<typeof datosFacturacionSchema>;

/* ─── Comprobante ─────────────────────────────────────────────────────────── */

export const lineaComprobanteSchema = z.object({
  descripcion: z.string(),
  presentacion: z.string(),
  color: z.string().nullable(),
  cantidad: z.number().int().positive(),
  precioUnitario: importeSchema,
  descuentoUnitario: importeSchema,
  totalLinea: importeSchema,
});
export type LineaComprobante = z.infer<typeof lineaComprobanteSchema>;

export const comprobanteSchema = z.object({
  numero: z.string().regex(NUMERO_COMPROBANTE_PATRON),
  codigoOrden: z.string(),
  fechaEmision: z.string().datetime(),
  vendedor: z.object({
    razonSocial: z.string(),
    nit: z.string(),
    regimen: z.string().nullable(),
    direccion: z.string(),
    ciudad: z.string().nullable(),
    telefono: z.string().nullable(),
    correo: z.string().nullable(),
  }),
  comprador: z.object({
    nombre: z.string(),
    /** NIT si es cuenta empresa; null en cuentas personales. */
    documento: z.string().nullable(),
    correo: z.string(),
    telefono: z.string().nullable(),
    direccion: z.string(),
  }),
  lineas: z.array(lineaComprobanteSchema).min(1),
  subtotal: importeSchema,
  descuento: importeSchema,
  envio: importeSchema,
  baseSinIva: importeSchema,
  tasaIva: z.number().min(0).max(100),
  iva: importeSchema,
  total: importeSchema,
  pieLegal: z.string().nullable(),
});
export type Comprobante = z.infer<typeof comprobanteSchema>;

export const comprobanteResponseEnvelopeSchema = z.object({ success: z.literal(true), data: comprobanteSchema });
export const datosFacturacionResponseEnvelopeSchema = z.object({ success: z.literal(true), data: datosFacturacionSchema });
export const reenviarResponseEnvelopeSchema = z.object({ success: z.literal(true), data: z.object({ enviado: z.literal(true) }) });

export const errorM12EnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

/** Código de orden que llega en la ruta (el mismo de M08). */
export const codigoOrdenParamSchema = z.object({ codigoOrden: z.string().trim().min(1).max(50) });
