'use client';

import React from 'react';
import { AdminPageHeader } from '@/core/components';
import { ConfiguracionView } from '@/modules/m17-permisos/components/configuracion/ConfiguracionView';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Configuración Global del Sistema"
        subtitle="Parámetros operativos del sistema, agrupados por área. Cada cambio se valida contra su rango permitido (HU-ADM-06)."
      />

      <ConfiguracionView />
    </div>
  );
}