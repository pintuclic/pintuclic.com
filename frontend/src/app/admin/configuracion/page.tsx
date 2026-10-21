'use client';

import React from 'react';
import { ConfiguracionView } from '@/modules/m17-permisos/components/configuracion/ConfiguracionView';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      {/* Header de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-title font-bold text-2xl sm:text-3xl text-neutral-black tracking-tight">
            Configuración Global del Sistema
          </h1>
          <p className="font-sans text-xs sm:text-sm text-neutral-medium mt-1">
            Administración centralizada y validada de los 10 parámetros operativos del ecosistema
            Pintu Clic (HU-ADM-06).
          </p>
        </div>
      </div>

      {/* Componente Principal */}
      <ConfiguracionView />
    </div>
  );
}
