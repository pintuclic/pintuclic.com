'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator, Percent, Ticket, UsersRound } from 'lucide-react';
import { AdminPageHeader, SectionNav, type SectionNavItem } from '@/core/components';
import { enlaceSeccion, leerSeccion, type SeccionPromociones } from '../services/enlaces';
import { ClientesEmpresaView } from './ClientesEmpresaView';
import { CuponesView } from './CuponesView';
import { EventosView } from './EventosView';
import { SimuladorView } from './SimuladorView';

const SECCIONES: ReadonlyArray<SectionNavItem<SeccionPromociones>> = [
  { id: 'eventos', label: 'Eventos', icon: Percent },
  { id: 'cupones', label: 'Cupones', icon: Ticket },
  { id: 'empresas', label: 'Clientes empresa', icon: UsersRound },
  { id: 'simulador', label: 'Simulador', icon: Calculator },
];

/** Panel de promociones (M06). Los permisos los resuelve el servidor en cada petición. */
export const PromocionesView: React.FC = () => {
  const router = useRouter();
  const parametros = useSearchParams();
  const seccion = leerSeccion(parametros.get('seccion'));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promociones"
        subtitle="Eventos de descuento, cupones y descuentos de los clientes empresa. Los precios base se editan en el catálogo."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <SectionNav
          items={SECCIONES}
          value={seccion}
          onChange={(s) => router.replace(enlaceSeccion(s), { scroll: false })}
          ariaLabel="Secciones de promociones"
          controlsId="panel-promociones"
        />
        <div id="panel-promociones" className="min-w-0">
          {seccion === 'eventos' && <EventosView />}
          {seccion === 'cupones' && <CuponesView />}
          {seccion === 'empresas' && <ClientesEmpresaView />}
          {seccion === 'simulador' && <SimuladorView />}
        </div>
      </div>
    </div>
  );
};
