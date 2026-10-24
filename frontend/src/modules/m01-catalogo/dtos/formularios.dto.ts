import { z } from 'zod';
import { hexadecimalSchema, TIPOS_MIME_LOGOTIPO } from './m01-catalogo.dto';

/**
 * Esquemas de los FORMULARIOS de administración de M01. Los campos viajan como texto (es lo
 * que entregan los inputs); `services/formularios.ts` los convierte en los cuerpos del
 * contrato, que se vuelven a validar con los esquemas espejo antes de enviarlos.
 * Directiva #12: ningún esquema Zod vive inline en un `.tsx`.
 */

const numeroTexto = (mensaje: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+([.,]\d+)?$/.test(v), mensaje);
const enteroTexto = (mensaje: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), mensaje);

/** Catálogos pequeños: superficie, tipo de resina, acabado, base. */
export const formSimpleSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  orden: enteroTexto('El orden es un número entero'),
});
export type FormSimple = z.infer<typeof formSimpleSchema>;

export const formFamiliaColorSchema = formSimpleSchema.extend({
  hexadecimal: hexadecimalSchema,
});
export type FormFamiliaColor = z.infer<typeof formFamiliaColorSchema>;

/** Forma común del formulario de catálogo pequeño: el hexadecimal solo se exige en las familias. */
export const formCatalogoSimpleSchema = formSimpleSchema.extend({ hexadecimal: z.string() });

export const formCategoriaSchema = formSimpleSchema;

export const formMarcaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
});
export type FormMarca = z.infer<typeof formMarcaSchema>;

export const formLineaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  gamaComercial: z.string().trim().max(100, 'Máximo 100 caracteres'),
});
export type FormLinea = z.infer<typeof formLineaSchema>;

export const formTipoMedidaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  abreviatura: z.string().trim().min(1, 'La abreviatura es obligatoria').max(10, 'Máximo 10 caracteres'),
  equivalenciaGalones: numeroTexto('Use un número, por ejemplo 0.264172'),
});
export type FormTipoMedida = z.infer<typeof formTipoMedidaSchema>;

export const formMedidaSchema = z.object({
  idTipoMedida: z.string().min(1, 'Elija el tipo de medida'),
  valor: numeroTexto('Use un número, por ejemplo 3.78').refine((v) => v !== '' && Number(v.replace(',', '.')) > 0, {
    message: 'El valor debe ser mayor que cero',
  }),
});
export type FormMedida = z.infer<typeof formMedidaSchema>;

export const formColorSchema = z.object({
  idMarca: z.string().min(1, 'Elija la marca'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  codigo: z.string().trim().max(60, 'Máximo 60 caracteres'),
  hexadecimal: hexadecimalSchema,
  idBase: z.string(),
  idAcabado: z.string(),
  idFamiliaColor: z.string(),
});
export type FormColor = z.infer<typeof formColorSchema>;

export const formVarianteSchema = z.object({
  idMedida: z.string().min(1, 'Elija la medida'),
  precio: numeroTexto('Use un número, por ejemplo 98900').refine((v) => v !== '', {
    message: 'El precio es obligatorio',
  }),
  sku: z.string().trim().max(60, 'Máximo 60 caracteres'),
  existenciaReferencial: enteroTexto('La existencia es un número entero'),
  codigoProveedor: z.string().trim().max(100, 'Máximo 100 caracteres'),
});
export type FormVariante = z.infer<typeof formVarianteSchema>;

export const formProductoSchema = z.object({
  idMarca: z.string().min(1, 'Elija la marca'),
  idLinea: z.string(),
  idSubcategoria: z.string().min(1, 'Elija la subcategoría'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150, 'Máximo 150 caracteres'),
  descripcion: z.string().trim().max(5000, 'Máximo 5000 caracteres'),
  usoInterior: z.boolean(),
  usoExterior: z.boolean(),
  patrocinado: z.boolean(),
  idCategoriaComplementaria: z.string(),
  conFicha: z.boolean(),
  idTipoResina: z.string(),
  tipoCalidad: z.string(),
  rendimientoMin: numeroTexto('Use un número'),
  rendimientoMax: numeroTexto('Use un número'),
});
export type FormProducto = z.infer<typeof formProductoSchema>;

/** Logotipo: tipos aceptados y tamaño máximo, para validar en el navegador antes de enviar (R9). */
export const logotipoArchivoSchema = z.object({
  type: z.enum(TIPOS_MIME_LOGOTIPO, { message: 'Use una imagen JPEG, PNG o WebP' }),
  size: z.number().max(5 * 1024 * 1024, 'El logotipo no puede superar 5 MB'),
});

/** Una fila de caracteristica del producto en el formulario. */
export const filaCaracteristicaSchema = z.object({
  nombre: z.string().trim().max(100, 'Máximo 100 caracteres'),
  valor: z.string().trim().max(255, 'Máximo 255 caracteres'),
});
export type FilaCaracteristica = z.infer<typeof filaCaracteristicaSchema>;
