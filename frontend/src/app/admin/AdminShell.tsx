'use client';

import type { ReactNode } from 'react';
import { AdminLayout } from '@/core/components';
import { useContadorPedidos } from '@/modules/m08-ordenes/hooks/useContadorPedidos';

/**
 * Cableado del panel: aporta al menú lateral lo que cada módulo quiere mostrar. Vive en `app/` y no en
 * `core/` para que el núcleo no importe módulos. Hoy: los pedidos que esperan en cada estado (M08).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pedidos = useContadorPedidos();

  return <AdminLayout navConteos={{ '/admin/pedidos': pedidos }}>{children}</AdminLayout>;
}
