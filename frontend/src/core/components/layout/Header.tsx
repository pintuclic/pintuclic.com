'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Palette, ShoppingCart, User } from 'lucide-react';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import { Badge } from '../data-display/Badge';
import { Modal } from '../overlays/Modal';
import { useResumenCarrito } from '../../hooks/useResumenCarrito';
import { useAuthStore } from '../../store/authStore';
import type { UsuarioAutenticado } from '../../types/usuario.type';
import { formatCOP } from '../../utils/moneda';
import {
  CategoriesMegaMenu,
  type MegaMenuAssistant,
  type MegaMenuGroup,
  type MegaMenuTab,
} from './CategoriesMegaMenu';
import { Container } from './Container';
import { Logo, type LogoProps } from './Logo';

export interface HeaderNavItem {
  label: string;
  href: string;
  /**
   * `pill` muestra el elemento como insignia roja (p. ej. "OFERTAS"); `destacado` lo muestra como un botón con borde de
   * colores y un ícono de paleta, para la entrada que se quiere hacer notar (p. ej. "Paleta de color").
   */
  variant?: 'link' | 'pill' | 'destacado';
}

export interface HeaderProps {
  logo: LogoProps;
  navItems: ReadonlyArray<HeaderNavItem>;
  categoriesLabel?: string;
  megaMenu: {
    groups: ReadonlyArray<MegaMenuGroup>;
    tabs?: ReadonlyArray<MegaMenuTab>;
    assistant: MegaMenuAssistant;
  };
  account: { label: string; sublabel: string; href: string };
  cart: { count: number; total: number; href: string };
}

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50';

/** El botón llamativo del menú: borde en degradado de colores (como una paleta) y adentro un fondo claro de texto oscuro legible. */
function BotonDestacado({ label, activo }: { label: string; activo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full bg-gradient-to-r from-danger via-highlight via-45% to-action p-[2px] shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg ${
        activo ? 'ring-2 ring-corporate/40' : ''
      }`}
    >
      <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-neutral-white px-3 font-title text-sm font-bold text-corporate xl:px-4">
        <Palette className="hidden h-4 w-4 text-action xl:block" aria-hidden="true" />
        {label}
      </span>
    </span>
  );
}

/** Con sesión abierta, "Mi cuenta" saluda por el primer nombre y lleva al perfil o al panel admin (M04 / M17). */
export function cuentaDeEncabezado(
  usuario: Pick<UsuarioAutenticado, 'nombre' | 'esAdmin'> | null,
  anonima: HeaderProps['account'],
): HeaderProps['account'] {
  if (!usuario) return anonima;
  const primerNombre = usuario.nombre.trim().split(/\s+/)[0] || usuario.nombre;
  if (usuario.esAdmin) {
    return { label: primerNombre, sublabel: 'Panel admin', href: '/admin' };
  }
  return { label: primerNombre, sublabel: 'Mi perfil', href: '/perfil' };
}

/**
 * Cabecera principal (UI Spec §3.1): logo, botón "Categorías" (abre el mega-menú
 * modal), navegación, acceso a "Mi cuenta" y carrito con contador y monto.
 * Por debajo de `lg` la navegación pasa a un panel modal.
 */
export function Header({
  logo,
  navItems,
  categoriesLabel = '¿Qué buscas?',
  megaMenu,
  account,
  cart,
}: HeaderProps) {
  const pathname = usePathname();
  const usuario = useAuthStore((s) => s.usuario);
  const cuenta = cuentaDeEncabezado(usuario, account);
  const [megaAbierto, setMegaAbierto] = useState(false);
  const [movilAbierto, setMovilAbierto] = useState(false);
  const cerrarMega = useCallback(() => setMegaAbierto(false), []);
  const cerrarMovil = useCallback(() => setMovilAbierto(false), []);

  const esActivo = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname === href || Boolean(pathname?.startsWith(`${href}/`));

  // El carrito real (M05) manda sobre los valores por defecto de `cart`.
  const resumen = useResumenCarrito();
  const cantidad = resumen?.cantidadItems ?? cart.count;
  const total = formatCOP(resumen?.total ?? cart.total);
  const etiquetaCarrito = `Carrito, ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}, total ${total}`;

  return (
    <header className="border-b border-neutral-light bg-neutral-white">
      <Container className="flex h-16 items-center gap-4 lg:h-[88px] lg:gap-3 xl:gap-5">
        <IconButton
          variant="ghost"
          aria-label="Abrir menú"
          aria-haspopup="dialog"
          aria-expanded={movilAbierto}
          className="lg:hidden"
          onClick={() => setMovilAbierto(true)}
        >
          <Menu className="h-6 w-6" />
        </IconButton>

        <Logo {...logo} priority />

        <div className="hidden shrink-0 lg:block">
          <Button
            variant="primary-action"
            leftIcon={<Menu className="h-5 w-5" aria-hidden="true" />}
            rightIcon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}
            aria-haspopup="dialog"
            aria-expanded={megaAbierto}
            onClick={() => setMegaAbierto(true)}
            className="min-w-[150px] justify-between whitespace-nowrap xl:min-w-[164px]"
          >
            {categoriesLabel}
          </Button>
        </div>

        <nav aria-label="Principal" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center justify-center gap-1 xl:gap-3">
            {navItems.map((item) => (
              <li key={item.href} className="shrink-0">
                {item.variant === 'pill' ? (
                  <Link href={item.href} className={`inline-flex whitespace-nowrap rounded-full ${FOCO}`}>
                    <Badge variant="offer" pill>
                      {item.label}
                    </Badge>
                  </Link>
                ) : item.variant === 'destacado' ? (
                  <Link
                    href={item.href}
                    aria-current={esActivo(item.href) ? 'page' : undefined}
                    className={`inline-flex whitespace-nowrap rounded-full ${FOCO}`}
                  >
                    <BotonDestacado label={item.label} activo={esActivo(item.href)} />
                  </Link>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={esActivo(item.href) ? 'page' : undefined}
                    className={`relative inline-flex min-h-[44px] items-center whitespace-nowrap rounded-btn px-1 font-sans text-sm font-medium transition-colors xl:px-1.5 ${FOCO} ${
                      esActivo(item.href)
                        ? 'text-conversion-hover after:absolute after:inset-x-1.5 after:bottom-1 after:h-0.5 after:bg-conversion'
                        : 'text-neutral-dark hover:text-action'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3 xl:gap-5">
          <Link
            href={cuenta.href}
            aria-label={`${cuenta.label}, ${cuenta.sublabel}`}
            className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-btn p-2 ${FOCO}`}
          >
            <User className="h-6 w-6 shrink-0 text-neutral-dark" aria-hidden="true" />
            <span className="hidden flex-col leading-tight whitespace-nowrap xl:flex">
              <span className="font-title text-sm font-semibold whitespace-nowrap text-neutral-black">{cuenta.label}</span>
              <span className="text-xs whitespace-nowrap text-neutral-medium">{cuenta.sublabel}</span>
            </span>
          </Link>

          <Link
            href={cart.href}
            aria-label={etiquetaCarrito}
            className={`flex min-h-[44px] shrink-0 items-center gap-3 whitespace-nowrap rounded-btn p-2 ${FOCO}`}
          >
            <span className="relative shrink-0">
              <ShoppingCart className="h-6 w-6 text-neutral-dark" aria-hidden="true" />
              {cantidad > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-neutral-white"
                >
                  {cantidad}
                </span>
              )}
            </span>
            <span className="hidden flex-col leading-tight whitespace-nowrap xl:flex">
              <span className="font-title text-sm font-semibold whitespace-nowrap text-neutral-black">Carrito</span>
              <span className="text-xs font-medium whitespace-nowrap text-neutral-dark">{total}</span>
            </span>
          </Link>
        </div>
      </Container>

      <CategoriesMegaMenu
        isOpen={megaAbierto}
        onClose={cerrarMega}
        groups={megaMenu.groups}
        tabs={megaMenu.tabs}
        assistant={megaMenu.assistant}
        title={categoriesLabel}
      />

      <Modal isOpen={movilAbierto} onClose={cerrarMovil} size="sm" title="Menú">
        <div className="flex flex-col gap-4">
          <Button
            variant="primary-action"
            fullWidth
            leftIcon={<Menu className="h-5 w-5" aria-hidden="true" />}
            onClick={() => {
              setMovilAbierto(false);
              setMegaAbierto(true);
            }}
          >
            {categoriesLabel}
          </Button>
          <nav aria-label="Principal (móvil)">
            <ul className="flex flex-col">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={cerrarMovil}
                    aria-current={esActivo(item.href) ? 'page' : undefined}
                    className={`flex min-h-[44px] items-center justify-between rounded-btn px-3 font-sans text-sm font-medium text-neutral-dark hover:bg-subaction/50 ${FOCO}`}
                  >
                    {item.variant === 'pill' ? (
                      <Badge variant="offer" pill>
                        {item.label}
                      </Badge>
                    ) : item.variant === 'destacado' ? (
                      <BotonDestacado label={item.label} activo={esActivo(item.href)} />
                    ) : (
                      item.label
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Modal>
    </header>
  );
}
