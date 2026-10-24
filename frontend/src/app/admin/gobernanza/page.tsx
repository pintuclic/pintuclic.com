'use client';

import React from 'react';
import { AdminPageHeader } from '@/core/components';
import { GobernanzaView } from '@/modules/m17-permisos/components/gobernanza/GobernanzaView';

export default function GobernanzaPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gobernanza de la Cuenta Administradora"
        subtitle="Protección de la raíz de confianza, sustitución criptográfica de correo maestro y políticas institucionales (HU-ADM-07)."
      />

      <GobernanzaView />
    </div>
  );
}