'use client';

import React, { useState } from 'react';
import { Layers, Package, Palette, Ruler, SlidersHorizontal, Tags } from 'lucide-react';
import { AdminPageHeader, SectionNav, type SectionNavItem } from '@/core/components';
import { AtributosView } from './AtributosView';
import { ClasificacionView } from './ClasificacionView';
import { ColoresView } from './ColoresView';
import { MarcasLineasView } from './MarcasLineasView';
import { MedidasView } from './MedidasView';
import { ProductosView } from './ProductosView';

type Seccion = 'productos' | 'colores' | 'marcas' | 'clasificacion' | 'medidas' | 'atributos';

const SECCIONES: ReadonlyArray<SectionNavItem<Seccion>> = [
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'colores', label: 'Colores', icon: Palette },
  { id: 'marcas', label: 'Marcas y líneas', icon: Tags },
  { id: 'clasificacion', label: 'Categorías', icon: Layers },
  { id: 'medidas', label: 'Medidas', icon: Ruler },
  { id: 'atributos', label: 'Atributos', icon: SlidersHorizontal },
];

/** Panel de administración del catálogo (M01). Los permisos los resuelve el servidor en cada petición. */
export const CatalogoAdminView: React.FC = () => {
  const [seccion, setSeccion] = useState<Seccion>('productos');
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Catálogo de productos"
        subtitle="Productos, variantes, colores y los catálogos que los describen (HU-CAT-01 a HU-CAT-12)."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <SectionNav
          items={SECCIONES}
          value={seccion}
          onChange={setSeccion}
          ariaLabel="Secciones del catálogo"
          controlsId="panel-catalogo"
        />
        <div id="panel-catalogo" className="min-w-0">
          {seccion === 'productos' && <ProductosView />}
          {seccion === 'colores' && <ColoresView />}
          {seccion === 'marcas' && <MarcasLineasView />}
          {seccion === 'clasificacion' && <ClasificacionView />}
          {seccion === 'medidas' && <MedidasView />}
          {seccion === 'atributos' && <AtributosView />}
        </div>
      </div>
    </div>
  );
};
