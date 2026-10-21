'use client';

import React from 'react';
import { KeyRound, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { AdminStatCard } from '@/modules/m17-permisos/components/AdminStatCard';
import { EmpleadosTable } from '@/modules/m17-permisos/components/empleados/EmpleadosTable';
import { useEmpleadosStore } from '@/modules/m17-permisos/store/empleadosStore';

export default function EmpleadosPage() {
  const { total, empleados } = useEmpleadosStore();

  const activos = empleados.filter((e) => e.estado === 'activo').length;
  const inactivos = empleados.filter((e) => e.estado === 'inactivo').length;

  return (
    <div className="space-y-6">
      {/* Header de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-title font-bold text-2xl sm:text-3xl text-neutral-black tracking-tight">
            Gestión de Colaboradores
          </h1>
          <p className="font-sans text-xs sm:text-sm text-neutral-medium mt-1">
            Administra las cuentas del equipo, asignación atómica de permisos y control de acceso en
            servidor (HU-ADM-01 a HU-ADM-04).
          </p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Colaboradores"
          value={total}
          trendText="Registrados en la plataforma"
          trendType="neutral"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Cuentas Activas"
          value={activos}
          trendText="Acceso verificado en tiempo real"
          trendType="positive"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-conversion/10 text-conversion"
        />

        <AdminStatCard
          label="Cuentas Inactivas"
          value={inactivos}
          trendText="Sesiones revocadas en 0ms"
          trendType={inactivos > 0 ? 'negative' : 'neutral'}
          icon={<ShieldAlert className="w-5 h-5" />}
          iconBgColor="bg-danger/10 text-danger"
        />

        <AdminStatCard
          label="Catálogo de Permisos"
          value="20"
          trendText="Atómicos sin roles fijos"
          trendType="positive"
          icon={<KeyRound className="w-5 h-5" />}
          iconBgColor="bg-highlight/15 text-neutral-black"
        />
      </div>

      {/* Tabla Principal */}
      <EmpleadosTable />
    </div>
  );
}
