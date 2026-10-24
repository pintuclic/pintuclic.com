'use client';

import React from 'react';
import { KeyRound, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { AdminPageHeader, AdminStatCard } from '@/core/components';
import { EmpleadosTable } from '@/modules/m17-permisos/components/empleados/EmpleadosTable';
import { useEmpleadosStore } from '@/modules/m17-permisos/store/empleadosStore';

export default function EmpleadosPage() {
  const { total, empleados } = useEmpleadosStore();

  const activos = empleados.filter((e) => e.estado === 'activo').length;
  const inactivos = empleados.filter((e) => e.estado === 'inactivo').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestión de Colaboradores"
        subtitle="Administra las cuentas del equipo, asignación atómica de permisos y control de acceso en servidor (HU-ADM-01 a HU-ADM-04)."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total colaboradores"
          value={total}
          trendText="Registrados"
          trendSubtext="en la plataforma"
          trendType="neutral"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Cuentas activas"
          value={activos}
          trendText="Activas"
          trendSubtext="en página actual"
          trendType="positive"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-conversion/15 text-conversion"
        />

        <AdminStatCard
          label="Cuentas inactivas"
          value={inactivos}
          trendText="Suspendidas"
          trendSubtext="sin acceso"
          trendType={inactivos > 0 ? 'negative' : 'neutral'}
          icon={<ShieldAlert className="w-5 h-5" />}
          iconBgColor="bg-danger/10 text-danger"
        />

        <AdminStatCard
          label="Catálogo de permisos"
          value="20"
          trendText="Atómicos"
          trendSubtext="sin roles fijos"
          trendType="positive"
          icon={<KeyRound className="w-5 h-5" />}
          iconBgColor="bg-highlight/20 text-neutral-black"
        />
      </div>

      <EmpleadosTable />
    </div>
  );
}