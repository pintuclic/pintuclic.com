import type { Metadata } from 'next';
import { AuthCard } from '@/modules/m04-cuentas/components/auth/AuthCard';
import { AuthPanel } from '@/modules/m04-cuentas/components/auth/AuthPanel';

export const metadata: Metadata = { title: 'Recuperar contraseña · Pintu Clic' };

/** HU-CUE-05 · Solicitud del enlace de recuperación. */
export default function RecuperarContrasenaPage() {
  return (
    <AuthCard>
      <AuthPanel vistaInicial="recuperar" modo="pagina" />
    </AuthCard>
  );
}
