'use client';

import { useId, useState } from 'react';
import { Building2, FileText } from 'lucide-react';
import { SegmentedTabs, Select } from '@/core/components';
import { estadoSolicitudEmpresaSchema, type EstadoSolicitudEmpresa } from '../../dtos/m04-cuentas.dto';
import { RenovacionesTab } from './RenovacionesTab';
import { SolicitudesTab } from './SolicitudesTab';

type Pestana = 'solicitudes' | 'renovaciones';

const OPCIONES_ESTADO = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: '', label: 'Todas' },
];

/**
 * HU-CUE-09 · Panel de validación de empresas (permiso `empresas.validar`). La
 * autorización la decide el servidor en cada petición (HU-ADM-03): sin permiso
 * las listas responden un 404 opaco y la vista lo muestra como "sin acceso".
 */
export function EmpresasAdminView() {
  const idPestanas = useId();
  const [pestana, setPestana] = useState<Pestana>('solicitudes');
  const [estado, setEstado] = useState<EstadoSolicitudEmpresa | undefined>('pendiente');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-title text-2xl font-bold tracking-tight text-neutral-black sm:text-3xl">
          Validación de empresas
        </h1>
        <p className="mt-1 font-sans text-xs text-neutral-medium sm:text-sm">
          Revisa los registros de empresa, los ascensos de cuentas personales y las renovaciones de NIT (HU-CUE-09,
          HU-CUE-10).
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-[420px]">
          <SegmentedTabs
            options={[
              { value: 'solicitudes', label: 'Solicitudes de empresa' },
              { value: 'renovaciones', label: 'Renovaciones de NIT' },
            ]}
            value={pestana}
            onChange={setPestana}
            ariaLabel="Tipo de solicitud"
            idPrefix={idPestanas}
            panelId={`${idPestanas}-panel`}
          />
        </div>
        <div className="sm:w-56">
          <Select
            id="filtro-estado-empresas"
            label="Estado"
            options={OPCIONES_ESTADO}
            value={estado ?? ''}
            onChange={(evento) => {
              const valor = estadoSolicitudEmpresaSchema.safeParse(evento.target.value);
              setEstado(valor.success ? valor.data : undefined);
            }}
          />
        </div>
      </div>

      <section
        role="tabpanel"
        id={`${idPestanas}-panel`}
        aria-labelledby={`${idPestanas}-tab-${pestana}`}
        className="overflow-hidden rounded-card border border-neutral-light/70 bg-neutral-white shadow-card"
      >
        <div className="flex items-center gap-2 border-b border-neutral-light/60 px-6 py-4">
          {pestana === 'solicitudes' ? (
            <Building2 className="h-5 w-5 text-action" aria-hidden="true" />
          ) : (
            <FileText className="h-5 w-5 text-action" aria-hidden="true" />
          )}
          <h2 className="font-title text-base font-bold text-neutral-black">
            {pestana === 'solicitudes' ? 'Solicitudes de empresa' : 'Renovaciones de NIT'}
          </h2>
        </div>
        {/* `key` reinicia la paginación al cambiar de filtro o de pestaña. */}
        {pestana === 'solicitudes' ? (
          <SolicitudesTab key={`s-${estado ?? 'todas'}`} estado={estado} />
        ) : (
          <RenovacionesTab key={`r-${estado ?? 'todas'}`} estado={estado} />
        )}
      </section>
    </div>
  );
}
