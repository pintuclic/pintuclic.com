'use client';

import { useState } from 'react';
import { AdminPageHeader, SegmentedTabs } from '@/core/components';
import { ConfiguracionAsesoriaPanel } from '@/modules/m03-asesoria/components/admin/ConfiguracionAsesoriaPanel';
import { CuestionarioPanel } from '@/modules/m03-asesoria/components/admin/CuestionarioPanel';
import { ServicioIaPanel } from '@/modules/m03-asesoria/components/admin/ServicioIaPanel';

type Seccion = 'cuestionario' | 'configuracion' | 'servicio';

/**
 * Panel de M03 — Asesoría. Exige el permiso «Ver asesoría» para consultar y «Editar
 * asesoría» para cambiar; sin ellos el servidor responde como si la página no existiera.
 */
export default function AsesoriaAdminPage() {
  const [seccion, setSeccion] = useState<Seccion>('cuestionario');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Asesoría"
        subtitle="Las preguntas de la búsqueda asistida y a qué filtro del catálogo lleva cada respuesta, más la configuración del asistente y de la calculadora."
      />

      <SegmentedTabs
        value={seccion}
        onChange={setSeccion}
        ariaLabel="Secciones de asesoría"
        panelId="panel-asesoria-admin"
        idPrefix="tab-asesoria-admin"
        options={[
          { value: 'cuestionario', label: 'Cuestionario' },
          { value: 'configuracion', label: 'Configuración' },
          { value: 'servicio', label: 'Servicio de IA' },
        ]}
      />

      <div id="panel-asesoria-admin" role="tabpanel">
        {seccion === 'cuestionario' && <CuestionarioPanel />}
        {seccion === 'configuracion' && <ConfiguracionAsesoriaPanel />}
        {seccion === 'servicio' && <ServicioIaPanel />}
      </div>
    </div>
  );
}
