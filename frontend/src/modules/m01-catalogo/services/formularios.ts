import type {
  CrearLineaRequest,
  CrearMedidaRequest,
  CrearTipoMedidaRequest,
  EditarLineaRequest,
  EditarMedidaRequest,
  EditarTipoMedidaRequest,
} from '../dtos/m01-catalogo.dto';
import {
  crearColorRequestSchema,
  crearProductoRequestSchema,
  crearVarianteRequestSchema,
  editarColorRequestSchema,
  editarProductoRequestSchema,
  editarVarianteRequestSchema,
  type CrearColorRequest,
  type CrearProductoRequest,
  type CrearVarianteRequest,
  type EditarColorRequest,
  type EditarProductoRequest,
  type EditarVarianteRequest,
  type ProductoDetalle,
} from '../dtos/m01-catalogo-productos.dto';
import type {
  FilaCaracteristica,
  FormColor,
  FormFamiliaColor,
  FormLinea,
  FormMedida,
  FormProducto,
  FormSimple,
  FormTipoMedida,
  FormVariante,
} from '../dtos/formularios.dto';

/**
 * Conversión de los formularios (todo texto) a los cuerpos del contrato. Cada función de
 * producto/color/variante devuelve el cuerpo YA validado con el esquema espejo, o el primer
 * mensaje de error: así el navegador nunca envía algo que el contrato rechazaría.
 */

export type Resultado<T> = { ok: true; valor: T } | { ok: false; mensaje: string };

const aNumero = (texto: string): number => Number(texto.trim().replace(',', '.'));
const aNumeroONulo = (texto: string): number | null => (texto.trim() === '' ? null : aNumero(texto));
const aIdONulo = (texto: string): number | null => (texto === '' ? null : Number(texto));
const textoONulo = (texto: string): string | null => (texto.trim() === '' ? null : texto.trim());

export function aCuerpoSimple(f: FormSimple): { nombre: string; orden?: number } {
  return { nombre: f.nombre.trim(), ...(f.orden.trim() === '' ? {} : { orden: Number(f.orden) }) };
}

export function aCuerpoFamilia(f: FormFamiliaColor): { nombre: string; hexadecimal: string; orden?: number } {
  return { ...aCuerpoSimple(f), hexadecimal: f.hexadecimal.toUpperCase() };
}

export function aCuerpoLinea(f: FormLinea): EditarLineaRequest {
  return { nombre: f.nombre.trim(), gamaComercial: textoONulo(f.gamaComercial) };
}

export function aCuerpoLineaNueva(idMarca: number, f: FormLinea): CrearLineaRequest {
  return { idMarca, ...aCuerpoLinea(f) } as CrearLineaRequest;
}

export function aCuerpoTipoMedida(f: FormTipoMedida): CrearTipoMedidaRequest & EditarTipoMedidaRequest {
  return {
    nombre: f.nombre.trim(),
    abreviatura: f.abreviatura.trim(),
    equivalenciaGalones: aNumeroONulo(f.equivalenciaGalones),
  };
}

export function aCuerpoMedida(f: FormMedida): CrearMedidaRequest & EditarMedidaRequest {
  return { idTipoMedida: Number(f.idTipoMedida), valor: aNumero(f.valor) } as CrearMedidaRequest & EditarMedidaRequest;
}

function primerMensaje(error: { issues: ReadonlyArray<{ message: string }> }): string {
  return error.issues[0]?.message ?? 'Revise los datos del formulario.';
}

export function aCuerpoColor(f: FormColor): Resultado<CrearColorRequest> {
  const r = crearColorRequestSchema.safeParse({
    idMarca: Number(f.idMarca),
    nombre: f.nombre,
    codigo: textoONulo(f.codigo),
    hexadecimal: f.hexadecimal,
    idBase: aIdONulo(f.idBase),
    // Sin acabado el servidor usa Brillante (C2); sin familia la deriva del hexadecimal (C4).
    ...(f.idAcabado === '' ? {} : { idAcabado: Number(f.idAcabado) }),
    ...(f.idFamiliaColor === '' ? {} : { idFamiliaColor: Number(f.idFamiliaColor) }),
  });
  return r.success ? { ok: true, valor: r.data } : { ok: false, mensaje: primerMensaje(r.error) };
}

/** La marca de un color no cambia (C1). */
export function aCuerpoColorEditado(f: FormColor): Resultado<EditarColorRequest> {
  const r = editarColorRequestSchema.safeParse({
    nombre: f.nombre,
    codigo: textoONulo(f.codigo),
    hexadecimal: f.hexadecimal,
    idBase: aIdONulo(f.idBase),
    ...(f.idAcabado === '' ? {} : { idAcabado: Number(f.idAcabado) }),
    idFamiliaColor: aIdONulo(f.idFamiliaColor),
  });
  return r.success ? { ok: true, valor: r.data } : { ok: false, mensaje: primerMensaje(r.error) };
}

export function aCuerpoVariante(f: FormVariante): Resultado<CrearVarianteRequest> {
  const r = crearVarianteRequestSchema.safeParse({
    idMedida: Number(f.idMedida),
    precio: aNumero(f.precio),
    ...(f.sku.trim() === '' ? {} : { sku: f.sku.trim() }),
    codigoProveedor: textoONulo(f.codigoProveedor),
  });
  return r.success ? { ok: true, valor: r.data } : { ok: false, mensaje: primerMensaje(r.error) };
}

/** La medida de una variante no cambia (V5). */
export function aCuerpoVarianteEditada(f: FormVariante): Resultado<EditarVarianteRequest> {
  const r = editarVarianteRequestSchema.safeParse({
    precio: aNumero(f.precio),
    sku: f.sku.trim(),
    codigoProveedor: textoONulo(f.codigoProveedor),
  });
  return r.success ? { ok: true, valor: r.data } : { ok: false, mensaje: primerMensaje(r.error) };
}

/** Relaciones del producto que no son escalares: listas de ids y características. */
export interface RelacionesProductoForm {
  idsSuperficies: number[];
  idsAcabados: number[];
  idsBases: number[];
  idsColoresFabrica: number[];
  caracteristicas: FilaCaracteristica[];
}

function fichaDe(f: FormProducto): unknown {
  if (!f.conFicha) return null;
  return {
    idTipoResina: Number(f.idTipoResina),
    tipoCalidad: f.tipoCalidad === '' ? null : Number(f.tipoCalidad),
    rendimientoMin: aNumeroONulo(f.rendimientoMin),
    rendimientoMax: aNumeroONulo(f.rendimientoMax),
    manos: f.manos.trim() === '' ? null : Number(f.manos),
  };
}

/**
 * Lo que falta por elegir, dicho con claridad, antes de armar el cuerpo: así nunca llega a la API
 * (ni al usuario) un error genérico de validación.
 */
export function faltantesDeProducto(f: FormProducto, rel: RelacionesProductoForm): string | null {
  if (f.idMarca === '') return 'Elija la marca.';
  if (f.idSubcategoria === '') return 'Elija la subcategoría.';
  if (!f.conFicha) return null;
  if (f.idTipoResina === '') return 'Elija el tipo de resina.';
  if (f.idLinea === '') return 'Elija la línea: los recubrimientos la exigen.';
  if (rel.idsSuperficies.length === 0) return 'Elija al menos una superficie donde se aplica.';
  return null;
}

const caracteristicasDe = (filas: FilaCaracteristica[]) =>
  filas
    .filter((c) => c.nombre.trim() !== '' || c.valor.trim() !== '')
    .map((c, indice) => ({ nombre: c.nombre.trim(), valor: c.valor.trim(), orden: indice }));

export function aCuerpoProducto(f: FormProducto, rel: RelacionesProductoForm): Resultado<CrearProductoRequest> {
  const faltante = faltantesDeProducto(f, rel);
  if (faltante !== null) return { ok: false, mensaje: faltante };
  const r = crearProductoRequestSchema.safeParse({
    idMarca: Number(f.idMarca),
    idLinea: aIdONulo(f.idLinea),
    idSubcategoria: Number(f.idSubcategoria),
    nombre: f.nombre,
    descripcion: textoONulo(f.descripcion),
    usoInterior: f.usoInterior,
    usoExterior: f.usoExterior,
    patrocinado: f.patrocinado,
    idCategoriaComplementaria: aIdONulo(f.idCategoriaComplementaria),
    ficha: fichaDe(f),
    idsSuperficies: rel.idsSuperficies,
    idsAcabados: f.conFicha ? rel.idsAcabados : [],
    idsBases: f.conFicha ? rel.idsBases : [],
    idsColoresFabrica: f.conFicha ? rel.idsColoresFabrica : [],
    caracteristicas: caracteristicasDe(rel.caracteristicas),
  });
  return r.success ? { ok: true, valor: r.data } : { ok: false, mensaje: primerMensaje(r.error) };
}

/** Al editar se envía todo: las listas reemplazan a las actuales (D11) y la marca no cambia (P1). */
export function aCuerpoProductoEditado(f: FormProducto, rel: RelacionesProductoForm): Resultado<EditarProductoRequest> {
  const faltante = faltantesDeProducto(f, rel);
  if (faltante !== null) return { ok: false, mensaje: faltante };
  const r = editarProductoRequestSchema.safeParse({
    idLinea: aIdONulo(f.idLinea),
    idSubcategoria: Number(f.idSubcategoria),
    nombre: f.nombre,
    descripcion: textoONulo(f.descripcion),
    usoInterior: f.usoInterior,
    usoExterior: f.usoExterior,
    patrocinado: f.patrocinado,
    idCategoriaComplementaria: aIdONulo(f.idCategoriaComplementaria),
    ficha: fichaDe(f),
    idsSuperficies: rel.idsSuperficies,
    idsAcabados: f.conFicha ? rel.idsAcabados : [],
    idsBases: f.conFicha ? rel.idsBases : [],
    idsColoresFabrica: f.conFicha ? rel.idsColoresFabrica : [],
    caracteristicas: caracteristicasDe(rel.caracteristicas),
  });
  return r.success ? { ok: true, valor: r.data } : { ok: false, mensaje: primerMensaje(r.error) };
}

/** Valores iniciales del formulario de producto a partir del detalle. */
export function formDesdeProducto(p: ProductoDetalle): { form: FormProducto; relaciones: RelacionesProductoForm } {
  return {
    form: {
      idMarca: String(p.idMarca),
      idLinea: p.idLinea === null ? '' : String(p.idLinea),
      idCategoria: '',
      idSubcategoria: String(p.idSubcategoria),
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      usoInterior: p.usoInterior,
      usoExterior: p.usoExterior,
      patrocinado: p.patrocinado,
      idCategoriaComplementaria: p.idCategoriaComplementaria === null ? '' : String(p.idCategoriaComplementaria),
      conFicha: p.ficha !== null,
      idTipoResina: p.ficha === null ? '' : String(p.ficha.idTipoResina),
      tipoCalidad: p.ficha?.tipoCalidad == null ? '' : String(p.ficha.tipoCalidad),
      rendimientoMin: p.ficha?.rendimientoMin == null ? '' : String(p.ficha.rendimientoMin),
      rendimientoMax: p.ficha?.rendimientoMax == null ? '' : String(p.ficha.rendimientoMax),
      manos: p.ficha?.manos == null ? '' : String(p.ficha.manos),
    },
    relaciones: {
      idsSuperficies: p.superficies.map((r) => r.id),
      idsAcabados: p.acabados.map((r) => r.id),
      idsBases: p.bases.map((r) => r.id),
      idsColoresFabrica: p.coloresFabrica.map((r) => r.id),
      caracteristicas: p.caracteristicas.map((c) => ({ nombre: c.nombre, valor: c.valor })),
    },
  };
}
