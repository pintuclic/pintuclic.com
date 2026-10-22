import type { Metadata } from 'next';
import { AuthCard } from '@/modules/m04-cuentas/components/auth/AuthCard';
import { RestablecerForm } from '@/modules/m04-cuentas/components/auth/RestablecerForm';

export const metadata: Metadata = {
  title: 'Nueva contraseña · Pintu Clic',
  // El enlace lleva un token de un solo uso: no debe indexarse ni filtrarse por Referer.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** HU-CUE-05 · Destino del enlace enviado por correo (`?token=`). */
export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard>
      <header className="mb-6 text-center">
        <h2 className="font-title text-2xl font-bold text-corporate sm:text-3xl">Crea una nueva contraseña</h2>
        <p className="mt-1.5 font-sans text-sm text-neutral-medium">
          Elige una contraseña que no hayas usado antes en Pintu Clic.
        </p>
      </header>
      <RestablecerForm token={typeof token === 'string' && token.length > 0 ? token : null} />
    </AuthCard>
  );
}
