'use client';

import React, { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, History, Upload } from 'lucide-react';
import { AdminPageHeader, Button, SectionNav, type SectionNavItem } from '@/core/components';
import { enlaceSeccion, filtrosHistorialDesdeUrl, leerSeccion, type SeccionInventario } from '../services/enlaces';
import { CargaMasivaView } from './CargaMasivaView';
import { AvisoAccion, type Aviso } from './comunes';
import { ExistenciasView } from './ExistenciasView';
import { HistorialView } from './HistorialView';

const SECCIONES: ReadonlyArray<SectionNavItem<SeccionInventario>> = [
  { id: 'existencias', label: 'Existencias', icon: Boxes },
  { id: 'carga', label: 'Carga masiva', icon: Upload },
  { id: 'historial', label: 'Historial', icon: History },
];

/** Panel del inventario referencial (M13). Los permisos los resuelve el servidor en cada petición. */
export const InventarioView: React.FC = () => {
  const router = useRouter();
  const parametros = useSearchParams();
  const seccion = leerSeccion(parametros.get('seccion'));
  const filtros = filtrosHistorialDesdeUrl(new URLSearchParams(parametros.toString()));
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ultimaCarga, setUltimaCarga] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  // La sección y los filtros del historial viven en la URL: se pueden compartir y otras pantallas enlazan aquí.
  const ir = (nueva: SeccionInventario, extra: { idVariante?: number; idCarga?: string } = {}) =>
    router.replace(enlaceSeccion(nueva, extra), { scroll: false });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventario"
        subtitle="Existencias de referencia por variante, con su historial. No bloquea las ventas."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <SectionNav
          items={SECCIONES}
          value={seccion}
          onChange={(s) => ir(s)}
          ariaLabel="Secciones del inventario"
          controlsId="panel-inventario"
        />
        <div id="panel-inventario" className="min-w-0 space-y-4">
          <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
          {seccion === 'existencias' && (
            <ExistenciasView onVerHistorial={(idVariante) => ir('historial', { idVariante })} />
          )}
          {seccion === 'carga' && (
            <>
              <CargaMasivaView
                onAplicada={(texto, idCarga) => {
                  setAviso({ tipo: 'success', texto });
                  setUltimaCarga(idCarga);
                }}
              />
              {ultimaCarga !== null && (
                <Button variant="outline" onClick={() => ir('historial', { idCarga: ultimaCarga })}>
                  Ver el historial de esta carga
                </Button>
              )}
            </>
          )}
          {seccion === 'historial' && (
            <HistorialView
              key={`${filtros.idVariante}|${filtros.idCarga}`}
              idVariante={filtros.idVariante}
              idCarga={filtros.idCarga}
              onQuitarFiltros={() => ir('historial')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
