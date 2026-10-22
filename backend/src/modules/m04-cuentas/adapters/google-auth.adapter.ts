import type { GoogleAuthPort, GoogleUserClaims } from '../interfaces/google-auth.port';

export class GoogleAuthTokenInvalidoError extends Error {
  constructor(message = 'Token de Google ID inválido o expirado.') {
    super(message);
    this.name = 'GoogleAuthTokenInvalidoError';
  }
}

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
