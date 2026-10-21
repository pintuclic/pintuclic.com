'use client';

import React from 'react';
import { Building2, User, UserCheck, Users } from 'lucide-react';
import { AdminStatCard } from '@/modules/m17-permisos/components/AdminStatCard';
import { ClientesTable } from '@/modules/m17-permisos/components/clientes/ClientesTable';
import { useClientesStore } from '@/modules/m17-permisos/store/clientesStore';

export default function ClientesPage() {
  const { total, clientes } = useClientesStore();

  const naturales = clientes.filter((c) => c.tipo === 'normal').length;
  const empresas = clientes.filter((c) => c.tipo === 'empresa').length;
  const activos = clientes.filter((c) => c.estado === 'activo').length;

  return (
    <div className="space-y-6">
      {/* Header de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-title font-bold text-2xl sm:text-3xl text-neutral-black tracking-tight">
            Gestión de Clientes
          </h1>
          <p className="font-sans text-xs sm:text-sm text-neutral-medium mt-1">
            Consulta de clientes, visualización de fichas de compra y suspensión administrativa con
            motivo obligatorio (HU-ADM-05).
          </p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Clientes"
          value={total}
          trendText="Registrados en la plataforma"
          trendType="neutral"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Personas Naturales"
          value={naturales}
          trendText="Compras residenciales y retail"
          trendType="neutral"
          icon={<User className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Empresas y Contratistas"
          value={empresas}
          trendText="Cuentas corporativas con NIT"
          trendType="positive"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-highlight/15 text-neutral-black"
        />

        <AdminStatCard
          label="Cuentas Activas"
          value={activos}
          trendText="Habilitados para comprar"
          trendType="positive"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-conversion/10 text-conversion"
        />
      </div>

      {/* Tabla Principal de Clientes */}
      <ClientesTable />
    </div>
  );
}
