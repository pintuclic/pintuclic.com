import type { Metadata } from 'next';
import { AuthCard } from '@/modules/m04-cuentas/components/auth/AuthCard';
import { AuthPanel } from '@/modules/m04-cuentas/components/auth/AuthPanel';

export const metadata: Metadata = { title: 'Crear cuenta · Pintu Clic' };

/** HU-CUE-01 / HU-CUE-03 · Página completa de registro. */
export default function RegistroPage() {
  return (
    <AuthCard>
      <AuthPanel vistaInicial="registro" modo="pagina" />
    </AuthCard>
  );
}
