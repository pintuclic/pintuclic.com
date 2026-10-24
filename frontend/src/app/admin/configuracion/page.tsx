'use client';

import React from 'react';
import { AdminPageHeader } from '@/core/components';
import { ConfiguracionView } from '@/modules/m17-permisos/components/configuracion/ConfiguracionView';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Configuración Global del Sistema"
        subtitle="Administración centralizada y validada de los 10 parámetros operativos del ecosistema Pintu Clic (HU-ADM-06)."
      />

      <ConfiguracionView />
    </div>
  );
}