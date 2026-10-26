'use client';

import React from 'react';
import { AdminPageHeader } from '@/core/components';
import { CampaniasView } from './CampaniasView';

/**
 * Panel de patrocinios (M14). Los permisos (`patrocinios.ver` / `patrocinios.editar`) los resuelve el servidor en cada
 * petición. Hoy trae las campañas de productos; los espacios publicitarios y la medición llegan en la entrega 2.
 */
export const PatrociniosView: React.FC = () => (
  <div className="space-y-6">
    <AdminPageHeader
      title="Patrocinios"
      subtitle="Campañas que ponen productos por delante en el sitio. Los acuerdos con las marcas se hacen fuera del sistema."
    />
    <CampaniasView />
  </div>
);
