import { logotipoArchivoSchema } from '../dtos/formularios.dto';
import type { ReemplazarLogotipoRequest } from '../dtos/m01-catalogo.dto';

/** "data:image/png;base64,AAAA" → "AAAA". */
export function base64DeDataUrl(dataUrl: string): string {
  const coma = dataUrl.indexOf(',');
  return coma === -1 ? '' : dataUrl.slice(coma + 1);
}

/** R9: valida tipo y tamaño en el navegador; devuelve el mensaje si el archivo no sirve. */
export function validarLogotipo(archivo: { type: string; size: number }): string | null {
  const r = logotipoArchivoSchema.safeParse({ type: archivo.type, size: archivo.size });
  return r.success ? null : (r.error.issues[0]?.message ?? 'Archivo no válido');
}

/** Lee el archivo y lo deja listo para el cuerpo JSON de la API (base64, D2). */
export function leerLogotipo(archivo: File): Promise<ReemplazarLogotipoRequest> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const resultado = typeof lector.result === 'string' ? lector.result : '';
      resolver({
        logotipoBase64: base64DeDataUrl(resultado),
        logotipoMimeType: archivo.type as ReemplazarLogotipoRequest['logotipoMimeType'],
      });
    };
    lector.readAsDataURL(archivo);
  });
}
