/**
 * Configuración del proveedor de IA (contrato · D2, H2, Q5).
 *
 * La clave vive SOLO en el entorno del servidor: nunca va al repositorio, ni a una respuesta,
 * ni a un registro, ni al navegador. El navegador habla únicamente con nuestro backend.
 *
 * Variables de entorno (las agrega DevOps a `.env.example` y al VPS; AGENTS.md reserva ese
 * archivo a su rol):
 *   · GEMINI_API_KEY  — obligatoria. Sin ella el asistente se declara «no configurado» y el
 *                       resto del sitio sigue funcionando igual (I6).
 *   · GEMINI_MODELO   — opcional. Por defecto `MODELO_POR_DEFECTO`.
 *   · GEMINI_API_URL  — opcional. Solo para apuntar a otra base en pruebas.
 */

const MODELO_POR_DEFECTO = 'gemini-2.0-flash';
const URL_POR_DEFECTO = 'https://generativelanguage.googleapis.com/v1beta';

export interface ConfiguracionGemini {
  apiKey: string;
  modelo: string;
  urlBase: string;
}

/** `null` cuando falta la clave: el asistente no se ofrece, pero nada más se rompe. */
export function leerConfiguracionGemini(
  entorno: NodeJS.ProcessEnv = process.env,
): ConfiguracionGemini | null {
  const apiKey = entorno['GEMINI_API_KEY']?.trim();
  if (apiKey === undefined || apiKey === '') return null;

  const modelo = entorno['GEMINI_MODELO']?.trim();
  const urlBase = entorno['GEMINI_API_URL']?.trim();

  return {
    apiKey,
    modelo: modelo === undefined || modelo === '' ? MODELO_POR_DEFECTO : modelo,
    urlBase: urlBase === undefined || urlBase === '' ? URL_POR_DEFECTO : urlBase.replace(/\/+$/, ''),
  };
}
