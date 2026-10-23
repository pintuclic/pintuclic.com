import { AuthModal } from '@/modules/m04-cuentas/components/auth/AuthModal';

/** Navegación interna a /login: el acceso se abre en modal sobre la página actual. */
export default function LoginModal() {
  return <AuthModal vistaInicial="login" />;
}
