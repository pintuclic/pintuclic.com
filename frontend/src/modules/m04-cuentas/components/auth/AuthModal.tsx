'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/core/components';
import { AuthPanel, type VistaAuth } from './AuthPanel';

/**
 * Modal de acceso abierto por ruta interceptada (`@modal/(.)login`): la página de
 * fondo se conserva y cerrar el modal vuelve a ella con `router.back()`.
 */
export function AuthModal({ vistaInicial }: { vistaInicial: VistaAuth }) {
  const router = useRouter();
  const cerrar = useCallback(() => router.back(), [router]);

  return (
    <Modal isOpen onClose={cerrar} size="md" ariaLabel="Acceso a tu cuenta Pintu Clic">
      <AuthPanel vistaInicial={vistaInicial} modo="modal" />
    </Modal>
  );
}
