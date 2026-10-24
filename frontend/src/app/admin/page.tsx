'use client';

import React, { useMemo } from 'react';
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
import { AdminPageHeader, AdminStatCard } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';

export default function AdminDashboardPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const primerNombre = usuario?.nombre?.trim().split(/\s+/)[0] || 'Carlos';

  const fechaActual = useMemo(() => {
    const texto = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }, []);

  const accesosRapidos = [
    {
      titulo: 'Colaboradores',
      descripcion: 'Alta de personal, credenciales temporales y control de accesos.',
      cta: 'Ir a colaboradores',
      href: '/admin/empleados',
      icon: <Users className="w-5 h-5 text-action" />,
      color: 'bg-subaction text-action',
      btnColor: 'bg-action text-neutral-white hover:bg-action-hover',
    },
    {
      titulo: 'Permisos Atómicos',
      descripcion: 'Matriz granular de 20 permisos individuales sin roles fijos.',
      cta: 'Gestionar permisos',
      href: '/admin/empleados',
      icon: <ShieldCheck className="w-5 h-5 text-conversion" />,
      color: 'bg-conversion/15 text-conversion',
      btnColor: 'bg-conversion/15 text-conversion-hover hover:bg-conversion/25',
    },
    {
      titulo: 'Directorio de Clientes',
      descripcion: 'Historial de compras, cotizaciones y suspensión justificada.',
      cta: 'Ver directorio',
      href: '/admin/clientes',
      icon: <UserCheck className="w-5 h-5 text-neutral-black" />,
      color: 'bg-highlight/20 text-neutral-black',
      btnColor: 'bg-highlight/25 text-neutral-black hover:bg-highlight/35',
    },
    {
      titulo: 'Configuración Global',
      descripcion: 'Ajuste de los 10 parámetros operativos del ecosistema.',
      cta: 'Abrir configuración',
      href: '/admin/configuracion',
      icon: <Settings className="w-5 h-5 text-corporate" />,
      color: 'bg-subaction text-corporate',
      btnColor: 'bg-subaction text-corporate hover:bg-subaction/80',
    },
    {
      titulo: 'Gobernanza Master',
      descripcion: 'Sustitución de correo maestro y protección de la cuenta raíz.',
      cta: 'Ver gobernanza',
      href: '/admin/gobernanza',
      icon: <KeyRound className="w-5 h-5 text-danger" />,
      color: 'bg-danger/10 text-danger',
      btnColor: 'bg-danger/15 text-danger hover:bg-danger/25',
    },
  ];

  return (
    <div className="space-y-8">
      {/* ==================================================================== */}
      {/* 1. GREETING HEADER (Mockup oficial)                                  */}
      {/* ==================================================================== */}
      <AdminPageHeader
        title={
          <>
            <span>¡Hola, {primerNombre}!</span>
            <span className="inline-block" aria-hidden="true">
              👋
            </span>
          </>
        }
        subtitle="Aquí tienes un resumen de tu panel. Todo en orden para seguir pintando grandes proyectos."
        metaPrimary={fechaActual}
        metaSecondary="Pintu Clic Admin"
      />

      {/* ==================================================================== */}
      {/* 2. STAT CARDS ROW (KPIs)                                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Colaboradores activos"
          value="12"
          trendText="Activos"
          trendSubtext="en el equipo"
          trendType="positive"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-subaction text-action"
        />

        <AdminStatCard
          label="Permisos atómicos"
          value="20"
          trendText="6 áreas"
          trendSubtext="funcionales mapeadas"
          trendType="positive"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-conversion/15 text-conversion"
        />

        <AdminStatCard
          label="Clientes administrados"
          value="1.840"
          trendText="B2C y B2B"
          trendSubtext="Naturales y Empresas"
          trendType="neutral"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-highlight/20 text-neutral-black"
        />

        <AdminStatCard
          label="Parámetros activos"
          value="10"
          trendText="Auditados"
          trendSubtext="en base de datos"
          trendType="positive"
          icon={<Settings className="w-5 h-5" />}
          iconBgColor="bg-subaction text-corporate"
        />
      </div>

      {/* ==================================================================== */}
      {/* 3. ACCESOS RÁPIDOS (Mockup oficial)                                  */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-title font-bold text-lg text-corporate">Accesos rápidos</h2>
          <Link
            href="/admin/empleados"
            className="font-sans text-xs font-semibold text-action hover:underline flex items-center gap-1"
          >
            <span>Ver más acciones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {accesosRapidos.map((acc) => (
            <Link
              key={acc.titulo}
              href={acc.href}
              className="bg-neutral-white border border-neutral-light/70 rounded-card p-4 shadow-card hover:shadow-card-hover hover:border-action/40 transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-card flex items-center justify-center shrink-0 ${acc.color}`}>
                  {acc.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-title font-bold text-xs sm:text-sm text-corporate group-hover:text-action transition-colors leading-snug">
                    {acc.titulo}
                  </h3>
                  <p className="font-sans text-[11px] text-neutral-medium mt-1 leading-relaxed">
                    {acc.descripcion}
                  </p>
                </div>
              </div>

              <span
                className={`w-full rounded-btn py-2 px-3 text-center font-title font-semibold text-xs transition-colors ${acc.btnColor}`}
              >
                {acc.cta}
              </span>
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
          <h2 className="font-title font-bold text-base text-corporate">
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