'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdminStatCard } from '@/modules/m17-permisos/components/AdminStatCard';

export default function AdminDashboardPage() {
  const accesosRapidos = [
    {
      titulo: 'Colaboradores',
      descripcion: 'Alta de personal, credenciales temporales y control de accesos.',
      href: '/admin/empleados',
      icon: <Users className="w-5 h-5 text-action" />,
      color: 'bg-subaction text-action',
    },
    {
      titulo: 'Permisos Atómicos',
      descripcion: 'Matriz granular de 20 permisos individuales sin roles fijos.',
      href: '/admin/empleados',
      icon: <ShieldCheck className="w-5 h-5 text-conversion" />,
      color: 'bg-conversion/10 text-conversion',
    },
    {
      titulo: 'Directorio de Clientes',
      descripcion: 'Historial de compras, cotizaciones y suspensión justificada.',
      href: '/admin/clientes',
      icon: <UserCheck className="w-5 h-5 text-highlight" />,
      color: 'bg-highlight/15 text-neutral-black',
    },
    {
      titulo: 'Configuración Global',
      descripcion: 'Ajuste de los 10 parámetros operativos del ecosistema.',
      href: '/admin/configuracion',
      icon: <Settings className="w-5 h-5 text-corporate" />,
      color: 'bg-neutral-light text-corporate',
    },
    {
      titulo: 'Gobernanza Master',
      descripcion: 'Sustitución de correo maestro y protección de la cuenta raíz.',
      href: '/admin/gobernanza',
      icon: <KeyRound className="w-5 h-5 text-danger" />,
      color: 'bg-danger/10 text-danger',
    },
  ];

  return (
    <div className="space-y-8">
      {/* ==================================================================== */}
      {/* 1. GREETING HEADER (Mockup página 2)                                 */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-title font-bold text-2xl sm:text-3xl text-neutral-black tracking-tight flex items-center gap-2">
            ¡Hola, Carlos! <span className="inline-block animate-wiggle">👋</span>
          </h1>
          <p className="font-sans text-xs sm:text-sm text-neutral-medium mt-1">
            Aquí tienes el resumen administrativo del ecosistema Pintu Clic. Todo en orden para
            asegurar la operación y el control de accesos.
          </p>
        </div>

        <div className="text-right hidden sm:block">
          <p className="font-sans text-xs font-medium text-neutral-dark">Pintu Clic Admin Panel</p>
          <p className="font-sans text-[11px] text-neutral-medium">
            Módulo M17 — Permisos y Administración
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. STAT CARDS ROW (KPIs)                                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Colaboradores Activos"
          value="12"
          trendText="100% verificado en servidor"
          trendType="positive"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Permisos Atómicos"
          value="20"
          trendText="6 áreas funcionales mapeadas"
          trendType="positive"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-conversion/10 text-conversion"
        />

        <AdminStatCard
          label="Clientes Administrados"
          value="1.840"
          trendText="Naturales y Empresas"
          trendType="neutral"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-highlight/15 text-neutral-black"
        />

        <AdminStatCard
          label="Parámetros Activos"
          value="10"
          trendText="Configuración global auditada"
          trendType="positive"
          icon={<Settings className="w-5 h-5" />}
          iconBgColor="bg-neutral-light text-corporate"
        />
      </div>

      {/* ==================================================================== */}
      {/* 3. ACCESOS RÁPIDOS (Mockup página 2)                                 */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-title font-bold text-lg text-neutral-black">Accesos Rápidos</h2>
          <Link
            href="/admin/empleados"
            className="font-sans text-xs font-semibold text-action hover:underline flex items-center gap-1"
          >
            <span>Ver colaboradores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accesosRapidos.map((acc) => (
            <Link
              key={acc.titulo}
              href={acc.href}
              className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card hover:shadow-card-hover hover:border-action/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${acc.color}`}>
                  {acc.icon}
                </div>
                <h3 className="font-title font-bold text-sm text-neutral-black group-hover:text-action transition-colors">
                  {acc.titulo}
                </h3>
                <p className="font-sans text-xs text-neutral-medium mt-1 leading-relaxed">
                  {acc.descripcion}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-neutral-light/50 flex items-center justify-between text-xs font-medium text-action">
                <span>Gestionar módulo</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. PILARES DE SEGURIDAD Y POLÍTICAS TRANSVERSALES                    */}
      {/* ==================================================================== */}
      <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-action" />
          <h2 className="font-title font-bold text-base text-neutral-black">
            Políticas de Integridad y Cumplimiento Activas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-neutral-dark">
          <div className="p-4 bg-neutral-lightest border border-neutral-light/60 rounded-btn space-y-1.5">
            <div className="flex items-center gap-2 font-title font-bold text-corporate">
              <CheckCircle2 className="w-4 h-4 text-conversion" />
              <span>Control de Acceso en Servidor</span>
            </div>
            <p className="text-neutral-medium leading-relaxed">
              HU-ADM-03 / ADR-006: La interfaz solo oculta opciones por usabilidad. Cada endpoint
              valida identidad, estado de cuenta y permisos en tiempo real.
            </p>
          </div>

          <div className="p-4 bg-neutral-lightest border border-neutral-light/60 rounded-btn space-y-1.5">
            <div className="flex items-center gap-2 font-title font-bold text-corporate">
              <CheckCircle2 className="w-4 h-4 text-conversion" />
              <span>Unicidad de Cuentas</span>
            </div>
            <p className="text-neutral-medium leading-relaxed">
              HU-CUE-08: Cada persona cuenta con un único identificador universal; prohibida la
              duplicidad de documentos o correos electrónicos.
            </p>
          </div>

          <div className="p-4 bg-neutral-lightest border border-neutral-light/60 rounded-btn space-y-1.5">
            <div className="flex items-center gap-2 font-title font-bold text-corporate">
              <CheckCircle2 className="w-4 h-4 text-conversion" />
              <span>No Exposición de Datos</span>
            </div>
            <p className="text-neutral-medium leading-relaxed">
              HU-SEG-06: Cero hashes o contraseñas temporales expuestos en respuestas HTTP. Las
              credenciales temporales se entregan exclusivamente en el momento de creación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
