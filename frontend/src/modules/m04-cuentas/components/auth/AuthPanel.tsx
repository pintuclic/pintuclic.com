'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/core/store/authStore';
import type {
  DatosRegistroGooglePendiente,
  DatosVinculacionGooglePendiente,
  ResultadoOAuthGoogle,
  UsuarioResumen,
} from '../../interfaces/api.interfaces';
import { CompletarGoogleForm } from './CompletarGoogleForm';
import { LoginForm } from './LoginForm';
import { PrimerAccesoForm } from './PrimerAccesoForm';
import { RecuperarForm } from './RecuperarForm';
import { RegistroFlow } from './RegistroFlow';
import { VincularGoogleForm } from './VincularGoogleForm';
import { destinoSeguro } from './utilidades';

export type VistaAuth = 'login' | 'registro' | 'recuperar';
type Vista = VistaAuth | 'primer_acceso' | 'google_completar' | 'google_vincular';

const ENCABEZADOS: Record<Vista, { titulo: string; subtitulo: string }> = {
  login: { titulo: 'Iniciar sesión', subtitulo: 'Bienvenido de nuevo a Pintu Clic' },
  registro: { titulo: 'Crear cuenta', subtitulo: 'Únete a Pintu Clic para comprar más fácil' },
  recuperar: {
    titulo: 'Recupera tu contraseña',
    subtitulo: 'Te enviaremos un enlace a tu correo para crear una nueva.',
  },
  primer_acceso: {
    titulo: 'Crea tu nueva contraseña',
    subtitulo: 'Por seguridad, cambia la contraseña temporal antes de continuar.',
  },
  google_completar: {
    titulo: 'Completa tu cuenta',
    subtitulo: 'Agrega tu teléfono y una contraseña para terminar tu registro con Google.',
  },
  google_vincular: {
    titulo: 'Vincula tu cuenta',
    subtitulo: 'Confirma tu contraseña para usar Google al iniciar sesión.',
  },
};

export interface AuthPanelProps {
  vistaInicial: VistaAuth;
  /** En modal se vuelve a la página de fondo; en página se navega al destino. */
  modo: 'pagina' | 'modal';
  /** Ruta interna a la que volver tras autenticarse (`?destino=`). */
  destino?: string;
}

/**
 * Contenido del modal de acceso (UI Spec §4.2). Login, recuperación, primer
 * acceso y pasos federados comparten la misma cabecera y franja de marca.
 */
export function AuthPanel({ vistaInicial, modo, destino }: AuthPanelProps) {
  const router = useRouter();
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const consumirDestino = useAuthStore((s) => s.consumirDestino);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [vistaOrigenGoogle, setVistaOrigenGoogle] = useState<'login' | 'registro'>(
    vistaInicial === 'registro' ? 'registro' : 'login',
  );
  const [tokenCambio, setTokenCambio] = useState<string | null>(null);
  const [datosRegistroGoogle, setDatosRegistroGoogle] = useState<DatosRegistroGooglePendiente | null>(null);
  const [datosVinculacionGoogle, setDatosVinculacionGoogle] = useState<DatosVinculacionGooglePendiente | null>(null);

  const finalizar = (usuario: UsuarioResumen) => {
    const pendiente = consumirDestino();
    if (usuario.esAdmin) {
      if (modo === 'modal' && typeof window !== 'undefined') {
        window.location.assign('/admin');
        return;
      }
      router.replace('/admin');
      return;
    }
    if (modo === 'modal' && !destino) {
      router.back();
      return;
    }
    router.replace(destinoSeguro(destino ?? pendiente));
  };

  const manejarResultadoGoogle = (origen: 'login' | 'registro') => (resultado: ResultadoOAuthGoogle) => {
    if (resultado.etapa === 'sesion') {
      establecerUsuario(resultado.usuario);
      finalizar(resultado.usuario);
      return;
    }
    setVistaOrigenGoogle(origen);
    if (resultado.etapa === 'requiere_registro') {
      setDatosRegistroGoogle({
        tokenRegistroTemporal: resultado.tokenRegistroTemporal,
        email: resultado.email,
        nombre: resultado.nombre,
      });
      setVista('google_completar');
      return;
    }
    setDatosVinculacionGoogle({
      tokenVinculacion: resultado.tokenVinculacion,
      email: resultado.email,
      nombre: resultado.nombre,
    });
    setVista('google_vincular');
  };

  const { titulo, subtitulo } = ENCABEZADOS[vista];

  return (
    <div className="flex flex-col gap-6">
      {/* Relleno simétrico: deja sitio al botón de cerrar del modal sin descentrar el título. */}
      <header className="px-8 text-center">
        <h2 className="font-title text-2xl font-bold text-corporate sm:text-3xl">{titulo}</h2>
        <p className="mt-1.5 font-sans text-sm text-neutral-medium">{subtitulo}</p>
      </header>

      {vista === 'login' && (
        <LoginForm
          onAutenticado={finalizar}
          onCambioObligatorio={(token) => {
            setTokenCambio(token);
            setVista('primer_acceso');
          }}
          onIrARegistro={() => setVista('registro')}
          onIrARecuperar={() => setVista('recuperar')}
          onResultadoGoogle={manejarResultadoGoogle('login')}
        />
      )}

      {vista === 'registro' && (
        <RegistroFlow
          onIrALogin={() => setVista('login')}
          onResultadoGoogle={manejarResultadoGoogle('registro')}
        />
      )}

      {vista === 'recuperar' && <RecuperarForm onVolver={() => setVista('login')} />}

      {vista === 'primer_acceso' && tokenCambio && (
        <PrimerAccesoForm
          tokenCambio={tokenCambio}
          onCompletado={finalizar}
          onVolver={() => {
            setTokenCambio(null);
            setVista('login');
          }}
        />
      )}

      {vista === 'google_completar' && datosRegistroGoogle && (
        <CompletarGoogleForm
          datosGoogle={datosRegistroGoogle}
          onCompletado={finalizar}
          onVolver={() => {
            setDatosRegistroGoogle(null);
            setVista(vistaOrigenGoogle);
          }}
        />
      )}

      {vista === 'google_vincular' && datosVinculacionGoogle && (
        <VincularGoogleForm
          datosVinculacion={datosVinculacionGoogle}
          onCompletado={finalizar}
          onIrARecuperar={() => {
            setDatosVinculacionGoogle(null);
            setVista('recuperar');
          }}
          onVolver={() => {
            setDatosVinculacionGoogle(null);
            setVista(vistaOrigenGoogle);
          }}
        />
      )}
    </div>
  );
}
