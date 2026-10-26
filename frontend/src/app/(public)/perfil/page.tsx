import type { Metadata } from 'next';
import { PerfilView } from '@/modules/m04-cuentas/components/perfil/PerfilView';
import { esSeccionPerfil } from '@/modules/m04-cuentas/components/perfil/secciones';
import { MisSolicitudesSection } from '@/modules/m15-atencion/components/publico/MisSolicitudesSection';

export const metadata: Metadata = {
  title: 'Mi cuenta · Pintu Clic',
  robots: { index: false, follow: false },
};

/** Perfil del cliente. `?seccion=direcciones` o `?seccion=solicitudes` abre esa sección. */
export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string | string[] }>;
}) {
  const { seccion } = await searchParams;
  return (
    <PerfilView
      seccionInicial={esSeccionPerfil(seccion) ? seccion : 'datos'}
      solicitudesSlot={<MisSolicitudesSection />}
    />
  );
}