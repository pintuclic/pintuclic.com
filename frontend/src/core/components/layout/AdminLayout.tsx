'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  Percent,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Headset,
  Home,
  Images,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Package,
  RotateCcw,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  UserCheck,
  Users,
  Wallet,
  X,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import { Logo } from './Logo';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

/** Cuántos elementos esperan por cada estado o categoría de un ítem del menú. */
export interface AdminNavConteo {
  etiqueta: string;
  cantidad: number;
}

export interface AdminLayoutProps {
  children: React.ReactNode;
  navItems?: ReadonlyArray<AdminNavItem>;
  /**
   * Conteos de un ítem del menú, por su `href` (p. ej. pedidos esperando en cada estado). El menú muestra solo
   * su suma junto al ítem; el desglose se ve dentro del módulo. Los aporta quien monta el layout: el núcleo no
   * conoce ningún módulo.
   */
  navConteos?: Readonly<Record<string, ReadonlyArray<AdminNavConteo>>>;
}

const DEFAULT_NAV_ITEMS: ReadonlyArray<AdminNavItem> = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: <Home className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: true,
  },
  {
    label: 'Catálogo',
    href: '/admin/catalogo',
    icon: <Package className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Pedidos',
    href: '/admin/pedidos',
    icon: <ClipboardList className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Pagos',
    href: '/admin/pagos',
    icon: <Wallet className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Facturación',
    href: '/admin/facturacion',
    icon: <Receipt className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Reportes',
    href: '/admin/reportes',
    icon: <BarChart3 className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Postventa',
    href: '/admin/postventa',
    icon: <RotateCcw className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Inventario',
    href: '/admin/inventario',
    icon: <Boxes className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Promociones',
    href: '/admin/promociones',
    icon: <Percent className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Patrocinios',
    href: '/admin/patrocinios',
    icon: <Megaphone className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Colaboradores',
    href: '/admin/empleados',
    icon: <Users className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Cotizaciones',
    href: '/admin/cotizaciones',
    icon: <ClipboardList className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Clientes',
    href: '/admin/clientes',
    icon: <UserCheck className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Empresas',
    href: '/admin/empresas',
    icon: <Building2 className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Banners de Inicio',
    href: '/admin/banners',
    icon: <Images className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Contenido',
    href: '/admin/contenido',
    icon: <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Configuración',
    href: '/admin/configuracion',
    icon: <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Notificaciones',
    href: '/admin/notificaciones',
    icon: <Mail className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Atención al cliente',
    href: '/admin/atencion',
    icon: <Headset className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Asesoría',
    href: '/admin/asesoria',
    icon: <Sparkles className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
  {
    label: 'Gobernanza',
    href: '/admin/gobernanza',
    icon: <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />,
    exact: false,
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  navItems = DEFAULT_NAV_ITEMS,
  navConteos,
}) => {
  const pathname = usePathname();
  const usuario = useAuthStore((s) => s.usuario);
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const limpiarSesion = useAuthStore((s) => s.limpiarSesion);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (usuario) return;
    let vigente = true;
    apiClient
      .get<{
        data: {
          idUsuario: number;
          correo: string;
          nombre: string;
          tipo: 'normal' | 'empresa';
          esAdmin?: boolean;
        };
      }>('/cuentas/perfil')
      .then(({ data }) => {
        if (vigente && data?.data) {
          establecerUsuario(data.data);
        }
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [usuario, establecerUsuario]);

  const nombreVisible = usuario?.nombre || 'Mi cuenta';
  const correoVisible = usuario?.correo ?? '';
  const iniciales =
    nombreVisible
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'PC';

  const [esEscritorio, setEsEscritorio] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia('(min-width: 1024px)');
    const sincronizar = () => setEsEscritorio(consulta.matches);
    sincronizar();
    consulta.addEventListener('change', sincronizar);
    return () => consulta.removeEventListener('change', sincronizar);
  }, []);

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

  const isNavActive = (item: AdminNavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href) ?? false;
  };

  /** El título de la sección actual sale de la propia navegación: el ítem cuya ruta mejor coincide con la dirección. */
  const getBreadcrumbTitle = () => {
    const coincidencias = navItems.filter((item) => isNavActive(item));
    const mejor = coincidencias.sort((x, y) => y.href.length - x.href.length)[0];
    return mejor?.label ?? 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-neutral-lightest flex antialiased">
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

      {/* ==================================================================== */}
      {/* 1. SIDEBAR IZQUIERDO FULL-HEIGHT (Mockup oficial)                    */}
      {/* ==================================================================== */}
      <aside
        id="admin-sidebar"
        inert={!esEscritorio && !sidebarOpen}
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-20
          w-64 h-screen bg-neutral-white border-r border-neutral-light/80
          flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Cabecera Sidebar con Logo Oficial */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between lg:justify-center">
          <Logo
            src="/images/landing/logo.png"
            alt="Pintu Clic, ir al panel administrativo"
            width={520}
            height={303}
            href="/admin"
            className="h-14 w-auto"
            priority
          />

          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar barra lateral"
            className="lg:hidden text-neutral-medium hover:text-neutral-dark"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Menú de Navegación */}
        <nav aria-label="Navegación administrativa" className="px-4 py-2 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item);
            const conteos = navConteos?.[item.href] ?? [];
            const total = conteos.reduce((suma, c) => suma + c.cantidad, 0);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    w-full flex items-center gap-3.5 px-4 py-3 rounded-card text-sm font-title transition-all duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50
                    ${
                      active
                        ? 'bg-action text-neutral-white shadow-xs font-semibold'
                        : 'text-corporate font-medium hover:bg-neutral-lightest hover:text-action'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {total > 0 && (
                    <span
                      className="ml-auto rounded-full bg-offer px-2 py-0.5 text-xs font-semibold leading-4 text-neutral-white"
                      aria-label={`${total} esperando`}
                    >
                      {total}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

      </aside>

      {/* ==================================================================== */}
      {/* 2. COLUMNA DERECHA: HEADER SUPERIOR + CONTENIDO PRINCIPAL            */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-neutral-white border-b border-neutral-light/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Lado izquierdo: Botón móvil + Logo móvil + Breadcrumbs */}
          <div className="flex items-center gap-3">
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              className="lg:hidden text-neutral-dark hover:bg-neutral-lightest"
            >
              <Menu className="w-5 h-5" />
            </IconButton>

            <div className="lg:hidden">
              <Logo
                src="/images/landing/logo.png"
                alt="Pintu Clic, ir al panel administrativo"
                width={520}
                height={303}
                href="/admin"
                className="h-9 w-auto"
              />
            </div>

            <nav
              aria-label="Breadcrumb"
              className="hidden sm:flex items-center gap-2 text-sm font-sans"
            >
              <Link href="/admin" className="text-neutral-medium hover:text-action transition-colors">
                Admin
              </Link>
              <ChevronRight className="w-4 h-4 text-neutral-medium" aria-hidden="true" />
              <span className="font-title font-bold text-corporate">{getBreadcrumbTitle()}</span>
            </nav>
          </div>

          {/* Lado derecho: Perfil de la persona que entró */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Perfil Administrador */}
            <div className="relative" ref={perfilRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label={`Menú de perfil de ${nombreVisible}`}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
                aria-controls="admin-menu-perfil"
                leftIcon={
                  <span className="w-10 h-10 rounded-full bg-corporate text-neutral-white font-title font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                    {iniciales}
                  </span>
                }
                rightIcon={
                  <ChevronDown className="w-4 h-4 text-neutral-dark hidden sm:block shrink-0" />
                }
                className="px-2 py-1 rounded-btn hover:bg-neutral-lightest min-h-[44px] gap-2.5"
              >
                <span className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="font-title font-semibold text-xs text-neutral-black">
                    {nombreVisible}
                  </span>
                  <span className="font-sans text-[11px] text-neutral-medium">
                    Administrador
                  </span>
                </span>
              </Button>

              {profileMenuOpen && (
                <div
                  id="admin-menu-perfil"
                  className="absolute right-0 mt-2 w-56 bg-neutral-white rounded-card shadow-card-hover border border-neutral-light/70 p-2 z-50 animate-in fade-in zoom-in-95"
                >
                  <div className="px-3 py-2 border-b border-neutral-light/50">
                    <p className="font-title font-semibold text-xs text-neutral-black">
                      {nombreVisible}
                    </p>
                    <p className="font-sans text-xs text-neutral-medium truncate">
                      {correoVisible}
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
                  <div className="border-t border-neutral-light/50 pt-1 flex flex-col gap-1">
                    <Link
                      href="/"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-sans text-neutral-dark hover:bg-subaction hover:text-action rounded-btn transition-colors"
                    >
                      <Store className="w-4 h-4" />
                      <span>Ir a Tienda Pública</span>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void apiClient
                          .post('/cuentas/logout', {})
                          .catch(() => undefined)
                          .finally(() => {
                            limpiarSesion();
                            window.location.href = '/login';
                          });
                      }}
                      leftIcon={<LogOut className="w-4 h-4" />}
                      className="justify-start text-xs text-danger hover:bg-danger/10 min-h-[32px]"
                    >
                      Cerrar sesión
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};