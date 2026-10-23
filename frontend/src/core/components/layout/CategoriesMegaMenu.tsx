'use client';

import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { ButtonLink } from '../buttons/ButtonLink';
import { Modal } from '../overlays/Modal';

export interface MegaMenuItem {
  label: string;
  href: string;
}

export interface MegaMenuGroup {
  title: string;
  items: ReadonlyArray<MegaMenuItem>;
}

export interface MegaMenuAssistant {
  text: string;
  ctaLabel: string;
  href: string;
}

export interface CategoriesMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  groups: ReadonlyArray<MegaMenuGroup>;
  assistant: MegaMenuAssistant;
}

/**
 * Mega-menú de categorías (UI Spec §3.2): panel MODAL centrado con overlay, no un
 * desplegable. Tres grupos, chevron por ítem y banda inferior del asistente.
 */
export function CategoriesMegaMenu({ isOpen, onClose, groups, assistant }: CategoriesMegaMenuProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-action" aria-hidden="true" />
          Categorías
        </span>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((grupo) => (
          <section key={grupo.title} aria-label={grupo.title}>
            <h4 className="mb-2 font-title text-base font-semibold text-corporate">{grupo.title}</h4>
            <ul>
              {grupo.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex min-h-[44px] items-center justify-between rounded-btn px-3 py-2 font-sans text-sm text-neutral-dark transition-colors hover:bg-subaction/50 hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-neutral-medium" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-card bg-subaction p-4 sm:flex-row sm:items-center">
        <p className="font-sans text-sm text-corporate">{assistant.text}</p>
        <ButtonLink href={assistant.href} variant="primary-action" onClick={onClose} className="shrink-0">
          {assistant.ctaLabel}
        </ButtonLink>
      </div>
    </Modal>
  );
}
