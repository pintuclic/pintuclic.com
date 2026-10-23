import type { Metadata } from 'next';
import { PerfilView } from '@/modules/m04-cuentas/components/perfil/PerfilView';
import { esSeccionPerfil } from '@/modules/m04-cuentas/components/perfil/secciones';

export const metadata: Metadata = {
  title: 'Mi cuenta · Pintu Clic',
  robots: { index: false, follow: false },
};

/** HU-CUE-06 / 07 / 10 · Perfil del cliente. `?seccion=direcciones` abre esa sección. */
export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string | string[] }>;
}) {
  const { seccion } = await searchParams;
  return <PerfilView seccionInicial={esSeccionPerfil(seccion) ? seccion : 'datos'} />;
}
