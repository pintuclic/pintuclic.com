import { z } from 'zod';
import { estadoWompiSchema, type EstadoWompi, type PasarelaPagoPort, type TerminosWompi } from '../dtos/m07-checkout.dto';
import { PasarelaNoDisponibleError } from '../services/checkout-error';
import { firmaEventoValida, firmaIntegridad } from '../services/firmas-wompi';

const TIEMPO_ESPERA_MS = 10_000;
const MONEDA = 'COP';

/** R15: las llaves salen solo de las variables de entorno del backend (P8). */
export interface ConfiguracionWompi {
  apiUrl: string;
  llavePublica: string;
  llavePrivada: string;
  secretoEventos: string;
  secretoIntegridad: string;
}

/** Null si falta alguna variable: el checkout avisa que el pago no está disponible y no cobra nada. */
export function configuracionWompiDesdeEntorno(env: NodeJS.ProcessEnv = process.env): ConfiguracionWompi | null {
  const apiUrl = env.WOMPI_API_URL?.trim();
  const llavePublica = env.WOMPI_PUBLIC_KEY?.trim();
  const llavePrivada = env.WOMPI_PRIVATE_KEY?.trim();
  const secretoEventos = env.WOMPI_EVENTS_SECRET?.trim();
  const secretoIntegridad = env.WOMPI_INTEGRITY_SECRET?.trim();
  if (!apiUrl || !llavePublica || !llavePrivada || !secretoEventos || !secretoIntegridad) return null;
  return { apiUrl: apiUrl.replace(/\/+$/, ''), llavePublica, llavePrivada, secretoEventos, secretoIntegridad };
}

const aceptacionSchema = z.object({ acceptance_token: z.string().min(1), permalink: z.string().url() });
const comercioSchema = z.object({
  data: z.object({ presigned_acceptance: aceptacionSchema, presigned_personal_data_auth: aceptacionSchema }),
});
const transaccionSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    status: estadoWompiSchema,
    reference: z.string(),
    amount_in_cents: z.number().int(),
    currency: z.string(),
    status_message: z.string().nullable().optional(),
  }),
});

/** Una respuesta con otra forma se trata como pasarela no disponible: no se adivina qué quiso decir. */
function leer<T>(esquema: z.ZodType<T>, datos: unknown): T {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new PasarelaNoDisponibleError('Wompi respondió con un formato inesperado.');
  return r.data;
}

/** Cliente de la API de Wompi (Nequi). Nunca escribe en registros el celular ni las llaves. */
export class WompiAdapter implements PasarelaPagoPort {
  constructor(
    private readonly config: ConfiguracionWompi | null,
    private readonly http: typeof fetch = fetch,
  ) {}

  async terminos(): Promise<TerminosWompi> {
    const c = this.exigir();
    const r = leer(comercioSchema,
      await this.pedir(`${c.apiUrl}/merchants/info`, { headers: { 'x-merchant-public-key': c.llavePublica } }),
    );
    return {
      tokenAceptacion: r.data.presigned_acceptance.acceptance_token,
      enlaceReglamento: r.data.presigned_acceptance.permalink,
      tokenDatosPersonales: r.data.presigned_personal_data_auth.acceptance_token,
      enlaceDatosPersonales: r.data.presigned_personal_data_auth.permalink,
    };
  }

  async crearTransaccionNequi(entrada: {
    referencia: string;
    montoEnCentavos: number;
    celular: string;
    correo: string;
    tokenAceptacion: string;
    tokenDatosPersonales: string;
  }): Promise<{ idTransaccion: string; estado: EstadoWompi }> {
    const c = this.exigir();
    const r = leer(transaccionSchema,
      await this.pedir(`${c.apiUrl}/transactions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.llavePrivada}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptance_token: entrada.tokenAceptacion,
          accept_personal_auth: entrada.tokenDatosPersonales,
          amount_in_cents: entrada.montoEnCentavos,
          currency: MONEDA,
          signature: firmaIntegridad(entrada.referencia, entrada.montoEnCentavos, MONEDA, c.secretoIntegridad),
          customer_email: entrada.correo,
          reference: entrada.referencia,
          payment_method: { type: 'NEQUI', phone_number: entrada.celular },
        }),
      }),
    );
    return { idTransaccion: r.data.id, estado: r.data.status };
  }

  async consultarTransaccion(idTransaccion: string): Promise<{
    idTransaccion: string;
    estado: EstadoWompi;
    referencia: string;
    montoEnCentavos: number;
    moneda: string;
    mensaje: string | null;
  }> {
    const c = this.exigir();
    const r = leer(transaccionSchema,
      await this.pedir(`${c.apiUrl}/transactions/${encodeURIComponent(idTransaccion)}`, {
        headers: { Authorization: `Bearer ${c.llavePublica}` },
      }),
    );
    return {
      idTransaccion: r.data.id,
      estado: r.data.status,
      referencia: r.data.reference,
      montoEnCentavos: r.data.amount_in_cents,
      moneda: r.data.currency,
      mensaje: r.data.status_message ?? null,
    };
  }

  firmaValida(cuerpo: unknown, checksumCabecera: string | null): boolean {
    return this.config !== null && firmaEventoValida(cuerpo, checksumCabecera, this.config.secretoEventos);
  }

  private exigir(): ConfiguracionWompi {
    if (this.config === null) throw new PasarelaNoDisponibleError('Faltan las variables WOMPI_* del backend.');
    return this.config;
  }

  /** Un error de red, un tiempo agotado o una respuesta que no es 2xx se tratan igual: la pasarela no está. */
  private async pedir(url: string, init: RequestInit): Promise<unknown> {
    let respuesta: Response;
    try {
      respuesta = await this.http(url, { ...init, signal: AbortSignal.timeout(TIEMPO_ESPERA_MS) });
    } catch {
      throw new PasarelaNoDisponibleError('Wompi no respondió.');
    }
    if (!respuesta.ok) throw new PasarelaNoDisponibleError(`Wompi respondió ${respuesta.status}.`);
    try {
      return await respuesta.json();
    } catch {
      throw new PasarelaNoDisponibleError('Wompi respondió algo que no es JSON.');
    }
  }
}
