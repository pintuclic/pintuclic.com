import { describe, expect, it, vi } from 'vitest';
import {
  crearGoogleAuthAdapterDesdeEntorno,
  GoogleAuthDeshabilitadoAdapter,
  GoogleAuthTokenInvalidoError,
  GoogleOAuth2ClientAdapter,
  obtenerGoogleClientIdDesdeEntorno,
  type VerificadorGoogleTicketPort,
} from '../adapters/google-auth.adapter';

describe('GoogleOAuth2ClientAdapter y configuración por entorno (HU-CUE-02)', () => {
  const clientId = '123456789012-abcdef.apps.googleusercontent.com';

  it('verifica un ID token válido y normaliza correo y nombre', async () => {
    const oauthClient: VerificadorGoogleTicketPort = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          aud: clientId,
          sub: 'google-sub-001',
          email: '  Cliente.Pinturas@Gmail.com ',
          email_verified: true,
          name: '  María Fernanda Gómez ',
          iat: 1700000000,
          exp: 1700003600,
        }),
      }),
    };

    const adapter = new GoogleOAuth2ClientAdapter(clientId, oauthClient);
    const claims = await adapter.verificarIdToken('jwt-token-valido');

    expect(oauthClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'jwt-token-valido',
      audience: clientId,
    });
    expect(claims).toEqual({
      sub: 'google-sub-001',
      email: 'cliente.pinturas@gmail.com',
      nombre: 'María Fernanda Gómez',
      emailVerified: true,
    });
  });

  it('usa la parte local del correo si Google no entrega nombre visible válido', async () => {
    const oauthClient: VerificadorGoogleTicketPort = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: clientId,
          sub: 'google-sub-002',
          email: 'juan.perez@empresa.co',
          email_verified: true,
          iat: 1700000000,
          exp: 1700003600,
        }),
      }),
    };

    const adapter = new GoogleOAuth2ClientAdapter(clientId, oauthClient);
    const claims = await adapter.verificarIdToken('jwt-sin-nombre');

    expect(claims.nombre).toBe('juan perez');
  });

  it('rechaza tokens con firma inválida, issuer ajeno o sin correo', async () => {
    const clienteFalla: VerificadorGoogleTicketPort = {
      verifyIdToken: vi.fn().mockRejectedValue(new Error('Invalid token signature')),
    };
    const adapterFalla = new GoogleOAuth2ClientAdapter(clientId, clienteFalla);
    await expect(adapterFalla.verificarIdToken('bad-token')).rejects.toThrow(GoogleAuthTokenInvalidoError);

    const clienteIssuerInvalido: VerificadorGoogleTicketPort = {
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          iss: 'https://evil.example.com',
          aud: clientId,
          sub: 'sub-1',
          email: 'user@gmail.com',
          email_verified: true,
          iat: 1700000000,
          exp: 1700003600,
        }),
      }),
    };
    const adapterIssuer = new GoogleOAuth2ClientAdapter(clientId, clienteIssuerInvalido);
    await expect(adapterIssuer.verificarIdToken('evil-iss')).rejects.toThrow(GoogleAuthTokenInvalidoError);
  });

  it('habilita el adaptador real solo fuera de NODE_ENV=test y con GOOGLE_CLIENT_ID real', () => {
    expect(obtenerGoogleClientIdDesdeEntorno({ NODE_ENV: 'test', GOOGLE_CLIENT_ID: clientId })).toBeNull();
    expect(obtenerGoogleClientIdDesdeEntorno({ NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'pendiente-config' })).toBeNull();
    expect(obtenerGoogleClientIdDesdeEntorno({ NODE_ENV: 'production', GOOGLE_CLIENT_ID: ` ${clientId} ` })).toBe(
      clientId,
    );

    const deshabilitado = crearGoogleAuthAdapterDesdeEntorno({ NODE_ENV: 'production' });
    expect(deshabilitado.habilitado).toBe(false);
    expect(deshabilitado.adapter).toBeInstanceOf(GoogleAuthDeshabilitadoAdapter);

    const habilitado = crearGoogleAuthAdapterDesdeEntorno({
      NODE_ENV: 'production',
      GOOGLE_CLIENT_ID: clientId,
    });
    expect(habilitado.habilitado).toBe(true);
    expect(habilitado.clientId).toBe(clientId);
    expect(habilitado.adapter).toBeInstanceOf(GoogleOAuth2ClientAdapter);
  });
});

