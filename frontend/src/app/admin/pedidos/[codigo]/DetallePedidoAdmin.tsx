'use client';

import { EnvioPersonal } from '@/modules/m10-entrega/components/EnvioPersonal';
import { DetallePedidoView } from '@/modules/m08-ordenes/components/admin/DetallePedidoView';

/**
 * Frontera de cliente propia de la ruta. Si la página (servidor) importara `DetallePedidoView` directamente,
 * el build de la imagen Docker (Alpine) dejaba a ese componente fuera del manifiesto de cliente y el detalle
 * respondía 500 («Could not find the module … in the React Client Manifest»).
 */
export function DetallePedidoAdmin({ codigo }: { codigo: string }) {
  return (
    <div className="space-y-6">
      <DetallePedidoView codigo={codigo} />
      <EnvioPersonal codigo={codigo} />
    </div>
  );
}
