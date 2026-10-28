'use client';

import React, { useState } from 'react';
import { AdminPageHeader, SegmentedTabs } from '@/core/components';
import { AnunciosView } from './AnunciosView';
import { CampaniasView } from './CampaniasView';
import { MedicionView } from './MedicionView';

type Pestana = 'campanias' | 'anuncios' | 'medicion';

const PESTANAS = [
  { value: 'campanias', label: 'Campañas de productos' },
  { value: 'anuncios', label: 'Anuncios' },
  { value: 'medicion', label: 'Medición' },
] as const satisfies ReadonlyArray<{ value: Pestana; label: string }>;

const ID_PANEL = 'panel-patrocinios';

/**
 * Panel de patrocinios (M14). Los permisos (`patrocinios.ver` / `patrocinios.editar`) los resuelve el servidor en cada
 * petición. Tres pestañas: campañas de productos, anuncios de los espacios publicitarios y medición.
 */
export const PatrociniosView: React.FC = () => {
  const [pestana, setPestana] = useState<Pestana>('campanias');
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Patrocinios"
        subtitle="Productos patrocinados y anuncios del sitio, con su medición. Los acuerdos con las marcas se hacen fuera del sistema."
      />
      <SegmentedTabs
        options={PESTANAS}
        value={pestana}
        onChange={setPestana}
        ariaLabel="Secciones de patrocinios"
        panelId={ID_PANEL}
        idPrefix="patrocinios"
      />
      <div id={ID_PANEL} role="tabpanel" aria-labelledby={`patrocinios-tab-${pestana}`}>
        {pestana === 'campanias' && <CampaniasView />}
        {pestana === 'anuncios' && <AnunciosView />}
        {pestana === 'medicion' && <MedicionView />}
      </div>
    </div>
  );
};
