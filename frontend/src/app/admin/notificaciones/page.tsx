'use client';

import React, { useState } from 'react';
import { AdminPageHeader, SegmentedTabs } from '@/core/components';
import { PlantillasView } from '@/modules/m18-notificaciones/components/PlantillasView';
import { RegistroEnviosView } from '@/modules/m18-notificaciones/components/RegistroEnviosView';

export default function NotificacionesPage() {
  const [tab, setTab] = useState<'plantillas' | 'registro'>('plantillas');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notificaciones y Comunicaciones"
        subtitle="Plantillas de correo transaccional y diagnóstico de envíos y rebotes (HU-NOT-03, HU-NOT-04)."
      />

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        ariaLabel="Secciones de notificaciones"
        panelId="panel-notificaciones"
        idPrefix="tab-notificaciones"
        options={[
          { value: 'plantillas', label: 'Plantillas' },
          { value: 'registro', label: 'Registro de envíos' },
        ]}
      />

      <div id="panel-notificaciones">
        {tab === 'plantillas' ? <PlantillasView /> : <RegistroEnviosView />}
      </div>
    </div>
  );
}
