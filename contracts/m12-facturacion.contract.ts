import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M12. Facturación (comprobante de venta imprimible)
 * ============================================================================
 * Scope: m12-facturacion · Ola 5 · Depende de M08 (orden) · Usa M18 (correo)
 *
 * QUÉ HACE
 *  Después de una compra pagada, la tienda emite un COMPROBANTE DE VENTA con numeración propia y consecutiva: los datos
 *  del vendedor, los del comprador, las líneas, los descuentos y el IVA discriminado. El cliente lo ve, lo imprime o lo
 *  guarda como PDF desde «Mis pedidos»; el personal lo ve y lo reimprime desde el detalle de la orden y puede reenviarlo por
 *  correo. Al emitirse se avisa al cliente por correo con el enlace (plantilla editable en M18).
 *
 * QUÉ NO HACE
 *  - NO es factura electrónica ante la DIAN: no firma, no genera CUFE ni XML y no usa resolución de numeración. Eso es un
 *    proyecto aparte con un proveedor tecnológico autorizado (ver «Preguntas abiertas»). El comprobante lo dice en su pie.
 *  - No anula ni corrige comprobantes, ni emite notas crédito: la devolución y el reembolso son de M11.
 *  - No genera el PDF en el servidor: el navegador imprime la página del comprobante (Imprimir → Guardar como PDF).
 *  - No cobra ni toca el pago (M07) ni el estado de la orden (M08): solo lee la orden.
 *
 * REGLAS
 *  R1  Un comprobante por orden, y uno solo: emitir es idempotente (dos intentos devuelven el mismo comprobante).
 *  R2  Se emite cuando M08 crea la orden (puerto `NotificacionesOrdenPort.notificarOrdenCreada`, sin tocar M08). Si ese
 *      aviso falla o el vendedor no tenía sus datos completos, se emite al primer GET del comprobante (o del detalle de la
 *      orden): la orden nunca queda sin comprobante por un tropiezo del momento.
 *  R3  El comprobante es una COPIA CONGELADA: vendedor, comprador, líneas, importes e IVA tal como estaban al emitir. Si
 *      luego cambian los datos del vendedor, del cliente o el precio de un producto, los comprobantes ya emitidos no cambian.
 *  R4  Numeración: `CV-NNNNNN`, continua, sin saltos y sin reutilizar. Se asigna dentro de la misma transacción que crea el
 *      comprobante, con la fila `comprobante` de `consecutivo` bloqueada. (Es una numeración distinta a la de las órdenes
 *      `PC-AAAA-NNNNN`, como exige M08 · RF-ORD-06-04.)
 *  R5  Importes, descuentos e IVA se copian de la orden tal cual (M08 · R5). Si la orden no trae el desglose de IVA
 *      (órdenes anteriores a M07), no se emite: `COMPROBANTE_NO_DISPONIBLE`.
 *  R6  Datos del vendedor: una sola ficha editable por el personal (`configuracion.editar`). Si falta razón social, NIT o
 *      dirección, NO se emite (R2 reintenta al completarla) y el panel avisa qué falta. No hay datos de vendedor inventados.
 *  R7  Comprador: nombre y correo de la cuenta; si es cuenta empresa, razón social y NIT. Dirección: la de entrega de la
 *      orden o «Recogida en almacén».
 *  R8  Acceso: el cliente solo ve el comprobante de SUS órdenes; el personal con `ventas.ver` ve cualquiera. Todo lo demás
 *      responde el 404 opaco `RECURSO_NO_DISPONIBLE` (ADR-003), igual que un comprobante inexistente.
 *  R9  El correo (M18 · tipo `comprobante_venta`) lleva el número, el total y el enlace a la página del comprobante (que
 *      exige sesión): no adjunta archivos ni datos del pedido. Un fallo del correo no impide la emisión ni se reintenta
 *      solo; el personal puede reenviarlo (`ventas.gestionar`).
 *
 * PREGUNTAS ABIERTAS (dependen del cliente)
 *  Q1  ¿Necesitan factura electrónica DIAN? Si sí: proveedor tecnológico, resolución de numeración y régimen/responsabilidades
 *      fiscales. Este contrato deja listo el modelo (consecutivo, copia congelada, IVA) para conectarlo después.
 *  Q2  Texto legal del pie y datos del vendedor (razón social, NIT, régimen, dirección): los carga el cliente en el panel.
 *
 * FUERA DEL MÓDULO (PR general aparte, con aviso al equipo)
 *  - BD: tablas `comprobante_venta`, `linea_comprobante_venta` y `datos_facturacion`; fila `comprobante` de `consecutivo`.
 *  - `schema.prisma`, y el cableado en `app.routes.ts` (puerto de M08 y rutas de M12).
 *  - M18: nuevo tipo de comunicación `comprobante_venta` (plantilla por defecto editable) y su método en el puerto.
 *  - Core: entrada «Facturación» en el menú del panel.
 *
 * Rutas (montaje /api/v1):
 *   GET   /facturacion/mis-comprobantes/:codigoOrden        sesión · titular → comprobanteResponse
 *   GET   /facturacion/gestion/:codigoOrden                 ventas.ver       → comprobanteResponse
 *   POST  /facturacion/gestion/:codigoOrden/reenviar        ventas.gestionar → { enviado: true }
 *   GET   /admin/facturacion/datos                          configuracion.ver    → datosFacturacionResponse
 *   PUT   /admin/facturacion/datos                          configuracion.editar → datosFacturacionResponse
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
