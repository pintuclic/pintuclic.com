import type { Metadata } from 'next';
import { EmpresasAdminView } from '@/modules/m04-cuentas/components/admin/EmpresasAdminView';

export const metadata: Metadata = { title: 'Validación de empresas — Pintu Clic' };

/** HU-CUE-09 / HU-CUE-10 · Panel de decisión de empresas (M04 bajo el AdminLayout de M17). */
export default function EmpresasAdminPage() {
  return <EmpresasAdminView />;
}
