import type { ArchivoRut } from '../../services/cuentas.service';

/** RN-CUE-20 / DP-18: 5 MB exactos se aceptan; 5 MB + 1 byte no. */
export const RUT_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS: ReadonlyArray<ArchivoRut['tipoMime']> = ['application/pdf', 'image/jpeg', 'image/png'];

/** Valor para `<input accept>`: extensiones y tipos MIME admitidos. */
export const RUT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

function esTipoPermitido(tipo: string): tipo is ArchivoRut['tipoMime'] {
  return (TIPOS_PERMITIDOS as ReadonlyArray<string>).includes(tipo);
}

/**
 * Validación previa en el navegador (usabilidad). El backend vuelve a validar
 * tipo, tamaño y huella: esta comprobación nunca es el control (HU-SEG-03).
 */
export function validarArchivoRut(archivo: { type: string; size: number } | null): string | null {
  if (!archivo) return 'Adjunta el documento de renovación del RUT.';
  if (!esTipoPermitido(archivo.type)) return 'El RUT debe ser un archivo PDF, JPG o PNG.';
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > RUT_TAMANO_MAXIMO_BYTES) return 'El RUT no puede superar 5 MB.';
  return null;
}

function aHexadecimal(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Base64 por bloques: `String.fromCharCode(...bytes)` desborda la pila con archivos grandes. */
export function aBase64(bytes: Uint8Array): string {
  const BLOQUE = 0x8000;
  let binario = '';
  for (let i = 0; i < bytes.length; i += BLOQUE) {
    binario += String.fromCharCode(...bytes.subarray(i, i + BLOQUE));
  }
  return btoa(binario);
}

/** Prepara el cuerpo que espera `POST /cuentas/empresas/renovacion-nit`. */
export async function prepararArchivoRut(archivo: File): Promise<ArchivoRut> {
  if (!esTipoPermitido(archivo.type)) {
    throw new Error('El RUT debe ser un archivo PDF, JPG o PNG.');
  }
  const contenido = await archivo.arrayBuffer();
  const huella = await crypto.subtle.digest('SHA-256', contenido);
  return {
    nombreOriginal: archivo.name,
    tipoMime: archivo.type,
    tamanoBytes: archivo.size,
    sha256: aHexadecimal(huella),
    contenidoBase64: aBase64(new Uint8Array(contenido)),
  };
}
