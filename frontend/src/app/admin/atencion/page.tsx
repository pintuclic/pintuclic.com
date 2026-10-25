'use client';

import { useState } from 'react';
import { AdminPageHeader, SegmentedTabs } from '@/core/components';
import { ConfiguracionPanel } from '@/modules/m15-atencion/components/admin/ConfiguracionPanel';
import { FaqsPanel } from '@/modules/m15-atencion/components/admin/FaqsPanel';
import { SolicitudesPanel } from '@/modules/m15-atencion/components/admin/SolicitudesPanel';

type Seccion = 'preguntas' | 'solicitudes' | 'configuracion';

export default function AtencionPage() {
  const [seccion, setSeccion] = useState<Seccion>('preguntas');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Atención al cliente"
        subtitle="Preguntas frecuentes del centro de ayuda, solicitudes de los clientes y canal de contacto directo."
      />

      <SegmentedTabs
        value={seccion}
        onChange={setSeccion}
        ariaLabel="Secciones de atención al cliente"
        panelId="panel-atencion"
        idPrefix="tab-atencion"
        options={[
          { value: 'preguntas', label: 'Preguntas frecuentes' },
          { value: 'solicitudes', label: 'Solicitudes' },
          { value: 'configuracion', label: 'Horario y canal' },
        ]}
      />

      <div id="panel-atencion">
        {seccion === 'preguntas' && <FaqsPanel />}
        {seccion === 'solicitudes' && <SolicitudesPanel />}
        {seccion === 'configuracion' && <ConfiguracionPanel />}
      </div>
    </div>
  );
}
