import type { Metadata } from 'next';
import { PatrociniosView } from '@/modules/m14-patrocinios/components/PatrociniosView';

export const metadata: Metadata = {
  title: 'Patrocinios — Panel Administrativo — Pintu Clic',
};

export default function PatrociniosAdminPage() {
  return <PatrociniosView />;
}
