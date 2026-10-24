'use client';

import React from 'react';
import { Building2, User, UserCheck, Users } from 'lucide-react';
import { AdminPageHeader, AdminStatCard } from '@/core/components';
import { ClientesTable } from '@/modules/m17-permisos/components/clientes/ClientesTable';
import { useClientesStore } from '@/modules/m17-permisos/store/clientesStore';

export default function ClientesPage() {
  const { total, clientes } = useClientesStore();

  const naturales = clientes.filter((c) => c.tipo === 'normal').length;
  const empresas = clientes.filter((c) => c.tipo === 'empresa').length;
  const activos = clientes.filter((c) => c.estado === 'activo').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestión de Clientes"
        subtitle="Consulta de clientes, visualización de fichas de compra y suspensión administrativa con motivo obligatorio (HU-ADM-05)."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total clientes"
          value={total}
          trendText="Registrados"
          trendSubtext="en la plataforma"
          trendType="neutral"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Personas naturales"
          value={naturales}
          trendText="Retail"
          trendSubtext="compras residenciales"
          trendType="neutral"
          icon={<User className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Empresas y contratistas"
          value={empresas}
          trendText="Corporativas"
          trendSubtext="cuentas con NIT"
          trendType="positive"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-highlight/20 text-neutral-black"
        />

        <AdminStatCard
          label="Cuentas activas"
          value={activos}
          trendText="Habilitados"
          trendSubtext="para comprar"
          trendType="positive"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-conversion/15 text-conversion"
        />
      </div>

      <ClientesTable />
    </div>
  );
}