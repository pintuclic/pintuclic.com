'use client';

import { useState } from 'react';
import { AdminPageHeader, SegmentedTabs } from '@/core/components';
import { ConfiguracionPanel } from '@/modules/m15-atencion/components/admin/ConfiguracionPanel';
import { SolicitudesPanel } from '@/modules/m15-atencion/components/admin/SolicitudesPanel';

type Seccion = 'solicitudes' | 'configuracion';

export default function AtencionPage() {
  const [seccion, setSeccion] = useState<Seccion>('solicitudes');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Atención al cliente"
        subtitle="Solicitudes de los clientes, horario de atención y canal de contacto directo. Las preguntas frecuentes se administran en Contenido."
      />

      <SegmentedTabs
        value={seccion}
        onChange={setSeccion}
        ariaLabel="Secciones de atención al cliente"
        panelId="panel-atencion"
        idPrefix="tab-atencion"
        options={[
          { value: 'solicitudes', label: 'Solicitudes' },
          { value: 'configuracion', label: 'Horario y canal' },
        ]}
      />

      <div id="panel-atencion">
        {seccion === 'solicitudes' && <SolicitudesPanel />}
        {seccion === 'configuracion' && <ConfiguracionPanel />}
      </div>
    </div>
  );
}
