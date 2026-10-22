import { AuthModal } from '@/modules/m04-cuentas/components/auth/AuthModal';

/** Navegación interna a /registro: el registro se abre en modal (VISTAS.pdf, págs. 3–6). */
export default function RegistroModal() {
  return <AuthModal vistaInicial="registro" />;
}
