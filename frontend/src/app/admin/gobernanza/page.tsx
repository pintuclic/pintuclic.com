'use client';

import React from 'react';
import { GobernanzaView } from '@/modules/m17-permisos/components/gobernanza/GobernanzaView';

export default function GobernanzaPage() {
  return (
    <div className="space-y-6">
      {/* Header de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-title font-bold text-2xl sm:text-3xl text-neutral-black tracking-tight">
            Gobernanza de la Cuenta Administradora
          </h1>
          <p className="font-sans text-xs sm:text-sm text-neutral-medium mt-1">
            Protección de la raíz de confianza, sustitución criptográfica de correo maestro y
            políticas institucionales (HU-ADM-07).
          </p>
        </div>
      </div>

      {/* Componente Principal */}
      <GobernanzaView />
    </div>
  );
}
