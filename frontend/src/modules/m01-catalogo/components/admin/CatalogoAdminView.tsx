'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, Layers, Package, Palette, Ruler, SlidersHorizontal, Tags } from 'lucide-react';
import { AdminPageHeader, SectionNav, type SectionNavItem } from '@/core/components';
import { leerSeccion, RUTA_ADMIN_CATALOGO, type SeccionAdmin } from '../../services/enlaces';
import { AtributosView } from './AtributosView';
import { ClasificacionView } from './ClasificacionView';
import { ColoresView } from './ColoresView';
import { CombosView } from './CombosView';
import { MarcasLineasView } from './MarcasLineasView';
import { MedidasView } from './MedidasView';
import { ProductosView } from './ProductosView';

type Seccion = SeccionAdmin;

const SECCIONES: ReadonlyArray<SectionNavItem<Seccion>> = [
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'combos', label: 'Combos', icon: Boxes },
  { id: 'colores', label: 'Colores', icon: Palette },
  { id: 'marcas', label: 'Marcas y líneas', icon: Tags },
  { id: 'clasificacion', label: 'Categorías', icon: Layers },
  { id: 'medidas', label: 'Medidas', icon: Ruler },
  { id: 'atributos', label: 'Atributos', icon: SlidersHorizontal },
];

/** Panel de administración del catálogo (M01). Los permisos los resuelve el servidor en cada petición. */
export const CatalogoAdminView: React.FC = () => {
  const router = useRouter();
  const parametros = useSearchParams();
  const seccion: Seccion = leerSeccion(parametros.get('seccion'));
  // La sección y los filtros viven en la URL: otras pantallas enlazan aquí ("Ver productos") y se puede compartir.
  const setSeccion = (nueva: Seccion) => router.replace(`${RUTA_ADMIN_CATALOGO}?seccion=${nueva}`, { scroll: false });
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Catálogo de productos"
        subtitle="Productos, variantes, colores y los catálogos que los describen."
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
          {seccion === 'productos' && <ProductosView key={parametros.toString()} />}
          {seccion === 'combos' && <CombosView />}
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
