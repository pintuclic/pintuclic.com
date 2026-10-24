import type { Metadata } from 'next';
import { AuthCard } from '@/modules/m04-cuentas/components/auth/AuthCard';
import { RestablecerForm } from '@/modules/m04-cuentas/components/auth/RestablecerForm';

export const metadata: Metadata = {
  title: 'Activa tu cuenta · Pintu Clic',
  // El enlace lleva un token de un solo uso: no debe indexarse ni filtrarse por Referer.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** HU-ADM-01 · Destino del enlace de activación que recibe un colaborador nuevo (`?token=`). */
export default async function ActivarCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard>
      <header className="mb-6 text-center">
        <h2 className="font-title text-2xl font-bold text-corporate sm:text-3xl">Bienvenido a Pintu Clic</h2>
        <p className="mt-1.5 font-sans text-sm text-neutral-medium">
          Define la contraseña con la que entrarás a tu cuenta de colaborador.
        </p>
      </header>
      <RestablecerForm token={typeof token === 'string' && token.length > 0 ? token : null} variante="activacion" />
    </AuthCard>
  );
}
