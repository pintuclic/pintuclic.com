import type { Metadata } from 'next';
import { AuthCard } from '@/modules/m04-cuentas/components/auth/AuthCard';
import { AuthPanel } from '@/modules/m04-cuentas/components/auth/AuthPanel';

export const metadata: Metadata = { title: 'Iniciar sesión · Pintu Clic' };

/** HU-CUE-04 · Página completa de inicio de sesión (enlace directo o recarga). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string | string[] }>;
}) {
  const { destino } = await searchParams;
  return (
    <AuthCard>
      <AuthPanel vistaInicial="login" modo="pagina" destino={typeof destino === 'string' ? destino : undefined} />
    </AuthCard>
  );
}
