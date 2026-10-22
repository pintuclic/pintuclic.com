'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/core/store/authStore';
import { LoginForm } from './LoginForm';
import { PrimerAccesoForm } from './PrimerAccesoForm';
import { RecuperarForm } from './RecuperarForm';
import { RegistroFlow } from './RegistroFlow';
import { destinoSeguro } from './utilidades';

export type VistaAuth = 'login' | 'registro' | 'recuperar';
type Vista = VistaAuth | 'primer_acceso';

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
};

export interface AuthPanelProps {
  vistaInicial: VistaAuth;
  /** En modal se vuelve a la página de fondo; en página se navega al destino. */
  modo: 'pagina' | 'modal';
  /** Ruta interna a la que volver tras autenticarse (`?destino=`). */
  destino?: string;
}

/**
 * Contenido del modal de acceso (UI Spec §4.2). Login, recuperación y primer
 * acceso se derivan del modal de registro (VISTAS.pdf, págs. 3–6): misma
 * cabecera, mismos campos y la misma franja de marca.
 */
export function AuthPanel({ vistaInicial, modo, destino }: AuthPanelProps) {
  const router = useRouter();
  const consumirDestino = useAuthStore((s) => s.consumirDestino);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [tokenCambio, setTokenCambio] = useState<string | null>(null);

  const finalizar = () => {
    const pendiente = consumirDestino();
    if (modo === 'modal' && !destino) {
      router.back();
      return;
    }
    router.replace(destinoSeguro(destino ?? pendiente));
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
        />
      )}

      {vista === 'registro' && <RegistroFlow onIrALogin={() => setVista('login')} />}

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
    </div>
  );
}
