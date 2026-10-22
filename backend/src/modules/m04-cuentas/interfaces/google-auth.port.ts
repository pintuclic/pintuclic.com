/**
 * ============================================================================
 * PUERTO DE AUTENTICACIÓN GOOGLE IDENTITY — M04 (ADR-011)
 * ============================================================================
 * Aísla la verificación criptográfica de ID tokens de Google (OAuth2).
 * En tests unitarios se sustituye por MockGoogleAuthAdapter.
 * ============================================================================
 */

export interface GoogleUserClaims {
  sub: string;
  email: string;
  nombre: string;
  emailVerified: boolean;
}

export interface GoogleAuthPort {
  verificarIdToken(idToken: string): Promise<GoogleUserClaims>;
}
