import { Calculator, UserSearch } from 'lucide-react';
import { ButtonLink, SearchBar } from '@/core/components';
import { tools } from '../_data/home.content';

/** Buscador destacado y accesos directos a las herramientas (UI Spec §4.1, punto 4). */
export function ToolsBar() {
  return (
    <section aria-label="Buscar y herramientas" className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchBar action={tools.search.action} categories={tools.search.categories} className="lg:flex-1" />
      <ButtonLink
        href={tools.calculator.href}
        variant="primary-conversion"
        rightIcon={<Calculator className="h-5 w-5" />}
        className="lg:w-52"
      >
        {tools.calculator.label}
      </ButtonLink>
      <ButtonLink
        href={tools.colorAdvice.href}
        variant="primary-action"
        rightIcon={<UserSearch className="h-5 w-5" />}
        className="lg:w-60"
      >
        {tools.colorAdvice.label}
      </ButtonLink>
    </section>
  );
}
