import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import type { GoogleAuthPort, GoogleUserClaims } from '../interfaces/google-auth.port';

export class GoogleAuthTokenInvalidoError extends Error {
  constructor(message = 'Token de Google ID inválido o expirado.') {
    super(message);
    this.name = 'GoogleAuthTokenInvalidoError';
  }
}

export interface VerificadorGoogleTicketPort {
  verifyIdToken(options: { idToken: string; audience: string | string[] }): Promise<{
    getPayload(): TokenPayload | undefined;
  }>;
}

const ISSUERS_VALIDOS = new Set(['accounts.google.com', 'https://accounts.google.com']);

function normalizarNombreGoogle(nombreRaw: string | undefined, email: string): string {
  const limpio = (nombreRaw ?? '').trim();
  if (limpio.length >= 2) {
    return limpio.slice(0, 150);
  }
  const parteLocal = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim();
  if (parteLocal.length >= 2) {
    return parteLocal.slice(0, 150);
  }
  return 'Cliente Google';
}

/**
 * HU-CUE-02: Verifica criptográficamente el ID token de Google Identity Services
 * contra las claves públicas de Google (`iss`, `aud`, `exp` y firma RS256).
 */
export class GoogleOAuth2ClientAdapter implements GoogleAuthPort {
  private readonly client: VerificadorGoogleTicketPort;
  private readonly clientId: string;

  constructor(clientId: string, oauthClient?: VerificadorGoogleTicketPort) {
    const limpio = clientId.trim();
    if (!limpio) {
      throw new Error('GOOGLE_CLIENT_ID es requerido para inicializar GoogleOAuth2ClientAdapter.');
    }
    this.clientId = limpio;
    this.client = oauthClient ?? new OAuth2Client(limpio);
  }

  async verificarIdToken(idToken: string): Promise<GoogleUserClaims> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new GoogleAuthTokenInvalidoError();
    }

    if (
      !payload ||
      !ISSUERS_VALIDOS.has(payload.iss) ||
      typeof payload.sub !== 'string' ||
      payload.sub.trim().length === 0 ||
      typeof payload.email !== 'string' ||
      payload.email.trim().length === 0
    ) {
      throw new GoogleAuthTokenInvalidoError();
    }

    const email = payload.email.trim().toLowerCase();
    return {
      sub: payload.sub.trim(),
      email,
      nombre: normalizarNombreGoogle(payload.name, email),
      emailVerified: payload.email_verified === true,
    };
  }
}

/**
 * Adaptador seguro por omisión cuando `GOOGLE_CLIENT_ID` no está configurado:
 * rechaza cualquier intento de autenticación federada.
 */
export class GoogleAuthDeshabilitadoAdapter implements GoogleAuthPort {
  async verificarIdToken(): Promise<GoogleUserClaims> {
    throw new GoogleAuthTokenInvalidoError('El inicio de sesión con Google no está habilitado.');
  }
}

/**
 * Lee `GOOGLE_CLIENT_ID` del entorno. En `NODE_ENV=test` devuelve `null` por omisión
 * para mantener las pruebas unitarias desacopladas de variables locales.
 */
export function obtenerGoogleClientIdDesdeEntorno(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.NODE_ENV === 'test') {
    return null;
  }
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId || clientId.length < 12 || /^(pendiente|reemplazar|tu[_-])/i.test(clientId)) {
    return null;
  }
  return clientId;
}

export function crearGoogleAuthAdapterDesdeEntorno(env: NodeJS.ProcessEnv = process.env): {
  adapter: GoogleAuthPort;
  clientId: string | null;
  habilitado: boolean;
} {
  const clientId = obtenerGoogleClientIdDesdeEntorno(env);
  if (clientId) {
    return {
      adapter: new GoogleOAuth2ClientAdapter(clientId),
      clientId,
      habilitado: true,
    };
  }
  return {
    adapter: new GoogleAuthDeshabilitadoAdapter(),
    clientId: null,
    habilitado: false,
  };
}

/** Solo para pruebas: acepta tokens simulados sin consultar claves remotas de Google. */
export class MockGoogleAuthAdapter implements GoogleAuthPort {
  private tokens: Map<string, GoogleUserClaims> = new Map();

  registrarToken(token: string, claims: GoogleUserClaims): void {
    this.tokens.set(token, claims);
  }

  async verificarIdToken(idToken: string): Promise<GoogleUserClaims> {
    if (idToken === 'token-google-invalido' || idToken.startsWith('invalido_')) {
      throw new GoogleAuthTokenInvalidoError();
    }

    const registrado = this.tokens.get(idToken);
    if (registrado) {
      return registrado;
    }

    // Si es un token de prueba con formato sub:email:nombre
    if (idToken.startsWith('mock_')) {
      const partes = idToken.split('_');
      const sub = partes[1] ?? 'google-sub-default';
      const email = partes[2] ? decodeURIComponent(partes[2]) : `usuario.${sub}@gmail.com`;
      const nombre = partes[3] ? decodeURIComponent(partes[3]) : 'Usuario Google Mock';
      return {
        sub,
        email,
        nombre,
        emailVerified: true,
      };
    }

    throw new GoogleAuthTokenInvalidoError(`Token '${idToken}' no reconocido en MockGoogleAuthAdapter.`);
  }

  limpiar(): void {
    this.tokens.clear();
  }
}
