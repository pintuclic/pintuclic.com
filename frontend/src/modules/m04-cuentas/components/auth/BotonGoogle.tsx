'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '@/core/components';
import type { ResultadoOAuthGoogle } from '../../interfaces/api.interfaces';
import { autenticarConGoogle, obtenerConfigGoogle } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GIS_SCRIPT_ID = 'google-identity-services-sdk';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let promesaConfigClientId: Promise<string | null> | null = null;
let promesaScriptGis: Promise<boolean> | null = null;
let clientIdInicializado: string | null = null;
let receptorCredencialActivo: ((credencial: string) => void) | null = null;

function resolverClientIdGoogle(): Promise<string | null> {
  const desdeBuild = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (desdeBuild) {
    return Promise.resolve(desdeBuild);
  }
  if (!promesaConfigClientId) {
    promesaConfigClientId = obtenerConfigGoogle()
      .then((cfg) => (cfg.habilitado && cfg.clientId ? cfg.clientId : null))
      .catch(() => {
        promesaConfigClientId = null;
        return null;
      });
  }
  return promesaConfigClientId;
}

function cargarScriptGoogleGis(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }
  if (!promesaScriptGis) {
    promesaScriptGis = new Promise<boolean>((resolve) => {
      const existente = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
      if (existente) {
        existente.addEventListener('load', () => resolve(Boolean(window.google?.accounts?.id)), { once: true });
        existente.addEventListener('error', () => {
          promesaScriptGis = null;
          resolve(false);
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = GIS_SCRIPT_ID;
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(Boolean(window.google?.accounts?.id));
      script.onerror = () => {
        promesaScriptGis = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }
  return promesaScriptGis;
}

function IconoGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

export interface BotonGoogleProps {
  onResultado?: (resultado: ResultadoOAuthGoogle) => void;
}

/**
 * Botón oficial de Google Identity Services ("Continuar con Google").
 * El logotipo de Google es la única excepción de color permitida: es marca de terceros.
 */
export function BotonGoogle({ onResultado }: BotonGoogleProps) {
  const contenedorGisRef = useRef<HTMLDivElement | null>(null);
  const envoltorioRef = useRef<HTMLDivElement | null>(null);
  const onResultadoRef = useRef(onResultado);
  onResultadoRef.current = onResultado;

  const [estadoCarga, setEstadoCarga] = useState<'cargando' | 'listo' | 'no_disponible'>('cargando');
  const [verificando, setVerificando] = useState(false);
  const [errorGoogle, setErrorGoogle] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const manejarCredencial = async (credencial: string) => {
      if (cancelado) return;
      setErrorGoogle(null);
      setVerificando(true);
      try {
        const resultado = await autenticarConGoogle(credencial);
        if (!cancelado) {
          onResultadoRef.current?.(resultado);
        }
      } catch (error) {
        if (!cancelado) {
          setErrorGoogle(aErrorCuentas(error).mensaje);
        }
      } finally {
        if (!cancelado) {
          setVerificando(false);
        }
      }
    };

    const despachador = (credencial: string) => {
      void manejarCredencial(credencial);
    };
    receptorCredencialActivo = despachador;

    void (async () => {
      const [clientId, scriptListo] = await Promise.all([resolverClientIdGoogle(), cargarScriptGoogleGis()]);
      if (cancelado) return;

      const googleId = window.google?.accounts?.id;
      const contenedor = contenedorGisRef.current;
      if (!clientId || !scriptListo || !googleId || !contenedor) {
        setEstadoCarga('no_disponible');
        return;
      }

      if (clientIdInicializado !== clientId) {
        googleId.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          auto_select: false,
          callback: (res) => {
            if (res.credential) {
              receptorCredencialActivo?.(res.credential);
            }
          },
        });
        clientIdInicializado = clientId;
      }

      const ancho = Math.min(400, Math.max(240, Math.floor(envoltorioRef.current?.clientWidth ?? 340)));
      contenedor.innerHTML = '';
      googleId.renderButton(contenedor, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: ancho,
        locale: 'es',
      });
      setEstadoCarga('listo');
    })();

    return () => {
      cancelado = true;
      if (receptorCredencialActivo === despachador) {
        receptorCredencialActivo = null;
      }
    };
  }, []);

  const mostrarBotonNativoRespaldo = estadoCarga !== 'listo' || verificando;

  return (
    <div ref={envoltorioRef} className="flex w-full flex-col gap-2">
      {errorGoogle && <Alert variant="error">{errorGoogle}</Alert>}

      <div
        ref={contenedorGisRef}
        className={mostrarBotonNativoRespaldo ? 'hidden' : 'flex w-full justify-center'}
      />

      {mostrarBotonNativoRespaldo && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          disabled
          isLoading={verificando}
          className="border border-neutral-light"
          leftIcon={<IconoGoogle />}
        >
          {verificando ? 'Verificando cuenta de Google...' : 'Continuar con Google'}
        </Button>
      )}
    </div>
  );
}
