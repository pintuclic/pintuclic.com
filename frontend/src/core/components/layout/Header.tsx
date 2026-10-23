'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, ShoppingCart, User } from 'lucide-react';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import { Badge } from '../data-display/Badge';
import { Modal } from '../overlays/Modal';
import { useAuthStore } from '../../store/authStore';
import type { UsuarioAutenticado } from '../../types/usuario.type';
import { formatCOP } from '../../utils/moneda';
import { CategoriesMegaMenu, type MegaMenuAssistant, type MegaMenuGroup } from './CategoriesMegaMenu';
import { Container } from './Container';
import { Logo, type LogoProps } from './Logo';

export interface HeaderNavItem {
  label: string;
  href: string;
  /** `pill` muestra el elemento como insignia roja (p. ej. "OFERTAS"). */
  variant?: 'link' | 'pill';
}

export interface HeaderProps {
  logo: LogoProps;
  navItems: ReadonlyArray<HeaderNavItem>;
  categoriesLabel?: string;
  megaMenu: { groups: ReadonlyArray<MegaMenuGroup>; assistant: MegaMenuAssistant };
  account: { label: string; sublabel: string; href: string };
  cart: { count: number; total: number; href: string };
}

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50';

/** Con sesión abierta, "Mi cuenta" saluda por el primer nombre y lleva al perfil (M04). */
export function cuentaDeEncabezado(
  usuario: Pick<UsuarioAutenticado, 'nombre'> | null,
  anonima: HeaderProps['account'],
): HeaderProps['account'] {
  if (!usuario) return anonima;
  return { label: usuario.nombre.trim().split(/\s+/)[0] || usuario.nombre, sublabel: 'Mi perfil', href: '/perfil' };
}

/**
 * Cabecera principal (UI Spec §3.1): logo, botón "Categorías" (abre el mega-menú
 * modal), navegación, acceso a "Mi cuenta" y carrito con contador y monto.
 * Por debajo de `lg` la navegación pasa a un panel modal.
 */
export function Header({
  logo,
  navItems,
  categoriesLabel = 'Categorías',
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

  const total = formatCOP(cart.total);
  const etiquetaCarrito = `Carrito, ${cart.count} ${cart.count === 1 ? 'producto' : 'productos'}, total ${total}`;

  return (
    <header className="border-b border-neutral-light bg-neutral-white">
      <Container className="flex h-16 items-center gap-3 lg:h-[88px] lg:gap-8">
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

        <div className="hidden lg:block">
          <Button
            variant="primary-action"
            leftIcon={<Menu className="h-5 w-5" aria-hidden="true" />}
            rightIcon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}
            aria-haspopup="dialog"
            aria-expanded={megaAbierto}
            onClick={() => setMegaAbierto(true)}
            className="min-w-[170px] justify-between"
          >
            {categoriesLabel}
          </Button>
        </div>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {navItems.map((item) => (
              <li key={item.href}>
                {item.variant === 'pill' ? (
                  <Link href={item.href} className={`inline-flex rounded-full ${FOCO}`}>
                    <Badge variant="offer" pill>
                      {item.label}
                    </Badge>
                  </Link>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={esActivo(item.href) ? 'page' : undefined}
                    className={`relative inline-flex min-h-[44px] items-center rounded-btn px-1 font-sans text-sm font-medium transition-colors ${FOCO} ${
                      esActivo(item.href)
                        ? 'text-conversion-hover after:absolute after:inset-x-1 after:bottom-1 after:h-0.5 after:bg-conversion'
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

        <div className="ml-auto flex items-center gap-1 lg:gap-6">
          <Link
            href={cuenta.href}
            aria-label={`${cuenta.label}, ${cuenta.sublabel}`}
            className={`flex min-h-[44px] items-center gap-2 rounded-btn p-2 ${FOCO}`}
          >
            <User className="h-6 w-6 text-neutral-dark" aria-hidden="true" />
            <span className="hidden flex-col leading-tight lg:flex">
              <span className="font-title text-sm font-semibold text-neutral-black">{cuenta.label}</span>
              <span className="text-xs text-neutral-medium">{cuenta.sublabel}</span>
            </span>
          </Link>

          <Link
            href={cart.href}
            aria-label={etiquetaCarrito}
            className={`flex min-h-[44px] items-center gap-3.5 rounded-btn p-2 ${FOCO}`}
          >
            <span className="relative">
              <ShoppingCart className="h-6 w-6 text-neutral-dark" aria-hidden="true" />
              {cart.count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-neutral-white"
                >
                  {cart.count}
                </span>
              )}
            </span>
            <span className="hidden flex-col leading-tight lg:flex">
              <span className="font-title text-sm font-semibold text-neutral-black">Carrito</span>
              <span className="text-xs font-medium text-neutral-dark">{total}</span>
            </span>
          </Link>
        </div>
      </Container>

      <CategoriesMegaMenu
        isOpen={megaAbierto}
        onClose={cerrarMega}
        groups={megaMenu.groups}
        assistant={megaMenu.assistant}
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
