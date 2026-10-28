import type { ConfiguracionGemini } from './gemini.config';
import {
  cuotaAgotada,
  noDisponible,
  peticionRechazada,
  respuestaNoProcesable,
  tiempoAgotado,
} from './gemini.errores';

/**
 * Cliente de Gemini (contrato · H2, H5, H6).
 *
 * Lo único que habla con el proveedor. Hace UNA llamada: los reintentos, la suspensión por
 * cuota y el registro de incidentes son de `ResilienciaIa`, para que esto quede como una
 * pieza simple y sustituible si algún día se cambia de proveedor.
 *
 * Dos reglas de seguridad viven aquí:
 *  · El texto de la persona va como contenido del USUARIO, separado de las instrucciones del
 *    sistema (H6). Así una instrucción escrita en el mensaje no se lee como regla.
 *  · Se exige salida JSON con esquema (H5). Lo que no encaje se descarta como no procesable;
 *    nunca se intenta adivinar lo que el modelo quiso decir.
 */

export type RolTurno = 'usuario' | 'asistente';

export interface TurnoConversacion {
  rol: RolTurno;
  texto: string;
}

export interface PeticionGemini {
  /** Las reglas duras del sistema; nunca vienen de la persona. */
  instruccionesSistema: string;
  /** Historial y mensaje nuevo, en orden. */
  turnos: readonly TurnoConversacion[];
  /** Esquema JSON que la respuesta debe cumplir (H5). */
  esquemaRespuesta: Record<string, unknown>;
  tiempoEsperaMs: number;
}

/** Forma mínima de la respuesta de Gemini que nos interesa. */
interface RespuestaGemini {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export class GeminiClient {
  constructor(private readonly config: ConfiguracionGemini) {}

  /**
   * Devuelve el JSON ya analizado. Lanza `ErrorIa` con el tipo que corresponda; quien llama
   * decide si reintenta.
   */
  async generarJson(peticion: PeticionGemini): Promise<unknown> {
    const url = `${this.config.urlBase}/models/${encodeURIComponent(this.config.modelo)}:generateContent`;

    const cuerpo = {
      system_instruction: { parts: [{ text: peticion.instruccionesSistema }] },
      contents: peticion.turnos.map((t) => ({
        role: t.rol === 'usuario' ? 'user' : 'model',
        parts: [{ text: t.texto }],
      })),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: peticion.esquemaRespuesta,
        // Baja a propósito: se busca una respuesta previsible, no creativa.
        temperature: 0.2,
      },
    };

    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), peticion.tiempoEsperaMs);

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // La clave va en la cabecera, nunca en la URL: así no acaba en un registro de acceso.
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify(cuerpo),
        signal: control.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw tiempoAgotado();
      throw noDisponible(err instanceof Error ? err.name : 'error de red');
    } finally {
      clearTimeout(reloj);
    }

    if (!respuesta.ok) {
      // I3: la cuota agotada no se reintenta, se suspende.
      if (respuesta.status === 429) throw cuotaAgotada();
      if (respuesta.status >= 500) throw noDisponible(`respondió ${respuesta.status}`);
      throw peticionRechazada(respuesta.status);
    }

    let json: RespuestaGemini;
    try {
      json = (await respuesta.json()) as RespuestaGemini;
    } catch {
      throw respuestaNoProcesable('el cuerpo no es JSON');
    }

    const texto = json.candidates?.[0]?.content?.parts?.[0]?.text;
    // I4: una respuesta vacía se descarta, no se guarda como válida.
    if (typeof texto !== 'string' || texto.trim() === '') {
      throw respuestaNoProcesable('vino vacía');
    }

    try {
      return JSON.parse(texto);
    } catch {
      throw respuestaNoProcesable('no es un JSON válido');
    }
  }
}
