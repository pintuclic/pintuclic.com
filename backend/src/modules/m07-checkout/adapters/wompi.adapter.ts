import { z } from 'zod';
import {
  estadoWompiSchema,
  type EstadoWompi,
  type PasarelaPagoPort,
  type TerminosWompi,
  type TransaccionWompi,
} from '../dtos/m07-checkout.dto';
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
const datosTransaccionSchema = z.object({
  id: z.string().min(1),
  status: estadoWompiSchema,
  reference: z.string(),
  amount_in_cents: z.number().int(),
  currency: z.string(),
  status_message: z.string().nullable().optional(),
  payment_method_type: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
type DatosTransaccion = z.infer<typeof datosTransaccionSchema>;
const transaccionSchema = z.object({ data: datosTransaccionSchema });
const transaccionesSchema = z.object({ data: z.array(datosTransaccionSchema) });

function aTransaccion(t: DatosTransaccion): TransaccionWompi {
  return {
    idTransaccion: t.id,
    estado: t.status,
    referencia: t.reference,
    montoEnCentavos: t.amount_in_cents,
    moneda: t.currency,
    mensaje: t.status_message ?? null,
    metodo: t.payment_method_type ?? null,
  };
}

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

  async consultarTransaccion(idTransaccion: string): Promise<TransaccionWompi> {
    const c = this.exigir();
    const r = leer(transaccionSchema,
      await this.pedir(`${c.apiUrl}/transactions/${encodeURIComponent(idTransaccion)}`, {
        headers: { Authorization: `Bearer ${c.llavePublica}` },
      }),
    );
    return aTransaccion(r.data);
  }

  /** R19: con la llave privada. Si hay varias, gana la aprobada; si no, la más reciente. */
  async buscarPorReferencia(referencia: string): Promise<TransaccionWompi | null> {
    const c = this.exigir();
    const r = leer(transaccionesSchema,
      await this.pedir(`${c.apiUrl}/transactions?reference=${encodeURIComponent(referencia)}`, {
        headers: { Authorization: `Bearer ${c.llavePrivada}` },
      }),
    );
    const propias = r.data.filter((t) => t.reference === referencia);
    const elegida =
      propias.find((t) => t.status === 'APPROVED') ??
      [...propias].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0];
    return elegida === undefined ? null : aTransaccion(elegida);
  }

  /** R19: la firma incluye el vencimiento con el mismo texto que viaja en `expiration-time`. */
  datosPaginaPago(entrada: { referencia: string; montoEnCentavos: number; venceEn: Date }): {
    llavePublica: string;
    firmaIntegridad: string;
  } {
    const c = this.exigir();
    return {
      llavePublica: c.llavePublica,
      firmaIntegridad: firmaIntegridad(entrada.referencia, entrada.montoEnCentavos, MONEDA, c.secretoIntegridad, entrada.venceEn.toISOString()),
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
