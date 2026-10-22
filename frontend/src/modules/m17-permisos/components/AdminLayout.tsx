'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Button, Input } from '@/core/components';

export interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);

  /**
   * En escritorio el sidebar está siempre visible; en móvil se desplaza fuera
   * de pantalla con `translate-x`, que no lo saca del orden de tabulación. Se
   * necesita saber el ancho real para marcarlo `inert` solo cuando procede.
   */
  const [esEscritorio, setEsEscritorio] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia('(min-width: 1024px)');
    const sincronizar = () => setEsEscritorio(consulta.matches);
    sincronizar();
    consulta.addEventListener('change', sincronizar);
    return () => consulta.removeEventListener('change', sincronizar);
  }, []);

  // Escape cierra el menú de perfil y, en móvil, el sidebar. Sin esto el
  // dropdown solo se cerraba con `onMouseLeave`: inalcanzable con teclado o
  // en pantallas táctiles.
  useEffect(() => {
    if (!profileMenuOpen && !sidebarOpen) return;

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setProfileMenuOpen(false);
      setSidebarOpen(false);
    };

    window.addEventListener('keydown', alPulsarTecla);
    return () => window.removeEventListener('keydown', alPulsarTecla);
  }, [profileMenuOpen, sidebarOpen]);

  // Un clic fuera del menú de perfil lo cierra, igual que haría un menú nativo.
  useEffect(() => {
    if (!profileMenuOpen) return;

    const alPulsarFuera = (evento: PointerEvent) => {
      const destino = evento.target;
      if (destino instanceof Node && !perfilRef.current?.contains(destino)) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', alPulsarFuera);
    return () => window.removeEventListener('pointerdown', alPulsarFuera);
  }, [profileMenuOpen]);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      exact: true,
    },
    {
      label: 'Colaboradores',
      href: '/admin/empleados',
      icon: <Users className="w-5 h-5 shrink-0" />,
      exact: false,
    },
    {
      label: 'Clientes',
      href: '/admin/clientes',
      icon: <UserCheck className="w-5 h-5 shrink-0" />,
      exact: false,
    },
    {
      // M04 · HU-CUE-09 / HU-CUE-10: registros, ascensos y renovaciones de NIT.
      label: 'Empresas',
      href: '/admin/empresas',
      icon: <Building2 className="w-5 h-5 shrink-0" />,
      exact: false,
    },
    {
      label: 'Configuración',
      href: '/admin/configuracion',
      icon: <Settings className="w-5 h-5 shrink-0" />,
      exact: false,
    },
    {
      label: 'Gobernanza',
      href: '/admin/gobernanza',
      icon: <ShieldAlert className="w-5 h-5 shrink-0" />,
      exact: false,
    },
  ];

  // Helper para determinar si el link está activo
  const isNavActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  // Breadcrumbs según la ruta
  const getBreadcrumbTitle = () => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/empleados')) return 'Colaboradores y Permisos';
    if (pathname.startsWith('/admin/clientes')) return 'Gestión de Clientes';
    if (pathname.startsWith('/admin/empresas')) return 'Validación de Empresas';
    if (pathname.startsWith('/admin/configuracion')) return 'Configuración del Sistema';
    if (pathname.startsWith('/admin/gobernanza')) return 'Gobernanza Administradora';
    return 'Administración';
  };

  return (
    <div className="min-h-screen bg-neutral-lightest flex flex-col antialiased">
      {/* ==================================================================== */}
      {/* 1. TOPBAR HEADER                                                     */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-30 h-16 bg-neutral-white border-b border-neutral-light/70 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Lado izquierdo: Botón móvil + Breadcrumbs */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
            className="lg:hidden p-2 text-neutral-dark hover:bg-neutral-lightest min-h-[36px]"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo en móvil */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="font-title font-bold text-lg text-corporate">Pintu</span>
            <span className="font-title font-bold text-lg text-action">clic</span>
          </div>

          {/* Breadcrumb escritorio */}
          <nav
            aria-label="Breadcrumb"
            className="hidden sm:flex items-center gap-2 text-xs font-sans text-neutral-medium"
          >
            <Link href="/admin" className="hover:text-action transition-colors">
              Admin
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-light stroke-[2.5]" />
            <span className="font-semibold text-neutral-dark">{getBreadcrumbTitle()}</span>
          </nav>
        </div>

        {/* Centro: Buscador global (estilo página 2 y 3 del mockup) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <Input
            id="buscar-admin-global"
            type="text"
            placeholder="Buscar en el panel administrativo..."
            aria-label="Buscar en el panel administrativo"
            leftIcon={<Search className="w-4 h-4 text-neutral-medium" />}
            className="h-9 text-xs"
          />
        </div>

        {/* Lado derecho: Notificaciones + Perfil de Administrador */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Campanita con badge rojo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Notificaciones"
            className="relative p-2 text-neutral-dark hover:bg-neutral-lightest rounded-btn transition-colors cursor-pointer min-h-[36px]"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-neutral-white font-title font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-neutral-white">
              3
            </span>
          </Button>

          <div className="h-6 w-px bg-neutral-light mx-1" aria-hidden="true" />

          {/* Perfil Administrador (CA Carlos Álvarez) */}
          <div className="relative" ref={perfilRef}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-label="Menú de perfil"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              aria-controls="admin-menu-perfil"
              className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-btn hover:bg-neutral-lightest transition-colors cursor-pointer select-none min-h-[36px]"
            >
              <div className="w-8 h-8 rounded-full bg-corporate text-neutral-white font-title font-bold text-xs flex items-center justify-center shadow-xs">
                CA
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-title font-semibold text-xs text-neutral-black leading-tight">
                  Carlos Álvarez
                </span>
                <span className="font-sans text-[11px] text-neutral-medium leading-tight">
                  Administrador
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-medium hidden sm:block" />
            </Button>

            {/* Dropdown del perfil */}
            {profileMenuOpen && (
              <div
                id="admin-menu-perfil"
                className="absolute right-0 mt-2 w-56 bg-neutral-white rounded-card shadow-card-hover border border-neutral-light/70 p-2 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="px-3 py-2 border-b border-neutral-light/50">
                  <p className="font-title font-semibold text-xs text-neutral-black">
                    Carlos Álvarez
                  </p>
                  <p className="font-sans text-xs text-neutral-medium truncate">
                    admin@pintuclic.com
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/admin/gobernanza"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-sans text-neutral-dark hover:bg-subaction hover:text-action rounded-btn transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Gobernanza de Cuenta</span>
                  </Link>
                  <Link
                    href="/admin/configuracion"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-sans text-neutral-dark hover:bg-subaction hover:text-action rounded-btn transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configuración Global</span>
                  </Link>
                </div>
                <div className="border-t border-neutral-light/50 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setProfileMenuOpen(false);
                      window.location.href = '/';
                    }}
                    leftIcon={<LogOut className="w-4 h-4" />}
                    className="justify-start text-xs text-danger hover:bg-danger/10 min-h-[32px]"
                  >
                    Ir a Tienda Pública
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. BODY CON SIDEBAR + CONTENIDO PRINCIPAL                             */}
      {/* ==================================================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Overlay en móvil */}
        {sidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Cerrar menú lateral"
            className="fixed inset-0 z-40 bg-neutral-black/50 lg:hidden backdrop-blur-xs cursor-pointer"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                setSidebarOpen(false);
              }
            }}
          />
        )}

        {/* SIDEBAR (Blanco oficial según páginas 2 y 3 del mockup) */}
        <aside
          id="admin-sidebar"
          inert={!esEscritorio && !sidebarOpen}
          className={`
            fixed lg:sticky top-0 lg:top-16 z-40 lg:z-10
            w-64 h-screen lg:h-[calc(100vh-4rem)] bg-neutral-white border-r border-neutral-light/70
            flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Cabecera Sidebar con Logo (visible en desktop) */}
          <div className="p-5 border-b border-neutral-light/40 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5">
              {/* Isotipo con arcoíris oficial de marca */}
              <div className="w-8 h-8 rounded-lg bg-brand-rainbow p-0.5 flex items-center justify-center shadow-xs">
                <div className="w-full h-full bg-neutral-white rounded-[6px] flex items-center justify-center">
                  <Flame className="w-4 h-4 text-action" />
                </div>
              </div>
              <div>
                <span className="font-title font-bold text-xl text-corporate tracking-tight">
                  Pintu
                </span>
                <span className="font-title font-bold text-xl text-action tracking-tight">
                  clic
                </span>
                <span className="ml-1.5 px-1.5 py-0.5 bg-subaction text-action font-title font-semibold text-[10px] rounded uppercase">
                  Admin
                </span>
              </div>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar barra lateral"
              className="lg:hidden p-1.5 text-neutral-medium hover:text-neutral-dark min-h-[32px]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            <p className="px-3 py-1 font-title font-medium text-[11px] text-neutral-medium uppercase tracking-wider">
              Módulos M17
            </p>

            {navItems.map((item) => {
              const active = isNavActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-xs font-title font-medium transition-all duration-150
                    ${
                      active
                        ? 'bg-action text-neutral-white shadow-xs font-semibold'
                        : 'text-neutral-dark hover:bg-neutral-lightest hover:text-action'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Widget Inferior Oficial ("Hacemos crecer tu negocio" - páginas 2 y 3) */}
          <div className="p-4 border-t border-neutral-light/50">
            <div className="p-3.5 bg-subaction/40 border border-subaction rounded-card flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-action shrink-0" />
                <span className="font-title font-bold text-xs text-corporate">
                  Gobernanza Pintuclic
                </span>
              </div>
              <p className="font-sans text-[11px] text-neutral-dark leading-tight">
                Control de acceso individualizado por empleado. Cero roles fijos, 100% auditable.
              </p>
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    window.location.href = '/admin/empleados';
                  }}
                  className="min-h-[32px] text-xs py-1"
                >
                  Ver Colaboradores →
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* ÁREA DE CONTENIDO */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
