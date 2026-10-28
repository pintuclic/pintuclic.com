import {
  actualizarAnuncioRequestSchema,
  crearAnuncioRequestSchema,
  type ActualizarAnuncioRequest,
  type Anuncio,
  type CrearAnuncioRequest,
  type EspacioPublicitario,
} from '../dtos/m14-patrocinios.dto';
import { sumarDias } from './etiquetas';
import type { Resultado } from './formularios';
import type { ImagenElegida } from './imagenes';

const falla = (mensaje: string): { ok: false; mensaje: string } => ({ ok: false, mensaje });

/** Lo que la persona tiene escrito en el editor de anuncios. */
export interface BorradorAnuncio {
  nombre: string;
  anunciante: string;
  espacio: EspacioPublicitario;
  textoAlternativo: string;
  /** Vacío = el anuncio no es clicable. */
  enlace: string;
  fechaInicio: string;
  fechaFin: string;
  orden: string;
  /** En un anuncio nuevo es obligatoria; al editar, null conserva la que ya tiene. */
  imagen: ImagenElegida | null;
  imagenMovil: ImagenElegida | null;
  quitarImagenMovil: boolean;
}

/** Un anuncio nuevo: empieza hoy, dura 30 días y va al inicio. */
export function borradorAnuncioVacio(hoy: string): BorradorAnuncio {
  return {
    nombre: '',
    anunciante: '',
    espacio: 'inicio',
    textoAlternativo: '',
    enlace: '',
    fechaInicio: hoy,
    fechaFin: sumarDias(hoy, 29),
    orden: '0',
    imagen: null,
    imagenMovil: null,
    quitarImagenMovil: false,
  };
}

export function borradorDesdeAnuncio(a: Anuncio): BorradorAnuncio {
  return {
    nombre: a.nombre,
    anunciante: a.anunciante,
    espacio: a.espacio,
    textoAlternativo: a.textoAlternativo,
    enlace: a.enlace ?? '',
    fechaInicio: a.fechaInicio,
    fechaFin: a.fechaFin,
    orden: String(a.orden),
    imagen: null,
    imagenMovil: null,
    quitarImagenMovil: false,
  };
}

/** "" → 0; admite solo enteros de 0 a 999. */
export function parsearOrden(texto: string): number | null {
  const t = texto.trim();
  if (t === '') return 0;
  return /^\d{1,3}$/.test(t) ? Number(t) : null;
}

/** Revisa en español lo que sea del formulario; el esquema del contrato queda como red de seguridad. */
function revisarCampos(b: BorradorAnuncio): string | null {
  if (b.nombre.trim().length < 3) return 'Escriba el nombre del anuncio (al menos 3 letras).';
  if (b.anunciante.trim().length < 2) return 'Escriba quién es el anunciante.';
  if (b.textoAlternativo.trim().length < 3) {
    return 'Escriba el texto alternativo: describe la imagen para quien no puede verla (al menos 3 letras).';
  }
  if (b.textoAlternativo.trim().length > 150) return 'El texto alternativo no puede pasar de 150 letras.';
  if (b.enlace.trim() !== '' && /^http:\/\//i.test(b.enlace.trim())) {
    return 'El enlace debe empezar por https:// (los enlaces http:// no se admiten) o ser una ruta del sitio, como /productos/5.';
  }
  if (b.fechaInicio === '' || b.fechaFin === '') return 'Indique desde y hasta qué fecha se muestra el anuncio.';
  if (b.fechaFin < b.fechaInicio) return 'La fecha fin no puede ser anterior al inicio.';
  if (parsearOrden(b.orden) === null) return 'El orden es un número entero de 0 a 999.';
  return null;
}

const camposComunes = (b: BorradorAnuncio) => ({
  nombre: b.nombre,
  anunciante: b.anunciante,
  textoAlternativo: b.textoAlternativo,
  enlace: b.enlace.trim() === '' ? null : b.enlace.trim(),
  fechaInicio: b.fechaInicio,
  fechaFin: b.fechaFin,
  orden: parsearOrden(b.orden) ?? 0,
});

const imagenSubida = (i: ImagenElegida) => ({ imagenBase64: i.imagenBase64, imagenMimeType: i.imagenMimeType });

export function aCuerpoCrearAnuncio(b: BorradorAnuncio): Resultado<CrearAnuncioRequest> {
  const problema = revisarCampos(b);
  if (problema !== null) return falla(problema);
  if (b.imagen === null) return falla('Elija la imagen del anuncio (la de escritorio es obligatoria).');
  const validado = crearAnuncioRequestSchema.safeParse({
    ...camposComunes(b),
    espacio: b.espacio,
    imagen: imagenSubida(b.imagen),
    imagenMovil: b.imagenMovil === null ? null : imagenSubida(b.imagenMovil),
  });
  return validado.success ? { ok: true, valor: validado.data } : falla(validado.error.issues[0]?.message ?? 'Revise los datos.');
}

export function aCuerpoActualizarAnuncio(b: BorradorAnuncio): Resultado<ActualizarAnuncioRequest> {
  const problema = revisarCampos(b);
  if (problema !== null) return falla(problema);
  const validado = actualizarAnuncioRequestSchema.safeParse({
    ...camposComunes(b),
    ...(b.imagen === null ? {} : { imagen: imagenSubida(b.imagen) }),
    ...(b.imagenMovil === null ? {} : { imagenMovil: imagenSubida(b.imagenMovil) }),
    quitarImagenMovil: b.quitarImagenMovil,
  });
  return validado.success ? { ok: true, valor: validado.data } : falla(validado.error.issues[0]?.message ?? 'Revise los datos.');
}
