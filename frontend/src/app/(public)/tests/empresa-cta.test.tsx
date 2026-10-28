import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductCard } from '@/core/components';
import { debeInvitarEmpresa, EmpresaCta, InvitacionEmpresa } from '../_components/EmpresaCta';

describe('Botón «¿Tienes empresa? Regístrate» del landing (M06)', () => {
  it('lleva a la sección Cuenta empresa del perfil, donde está el ascenso de cuenta', () => {
    const salida = renderToStaticMarkup(<InvitacionEmpresa />);
    expect(salida).toContain('¿Tienes empresa? Regístrate');
    expect(salida).toContain('href="/perfil?seccion=empresa"');
  });

  it('lo ve el cliente particular; no el visitante, la cuenta empresa ni el administrador', () => {
    expect(debeInvitarEmpresa({ tipo: 'normal' })).toBe(true);
    expect(debeInvitarEmpresa(null)).toBe(false);
    expect(debeInvitarEmpresa({ tipo: 'empresa' })).toBe(false);
    expect(debeInvitarEmpresa({ tipo: 'normal', esAdmin: true })).toBe(false);
  });

  it('el HTML de servidor es el de visitante: la sesión se hidrata en el cliente', () => {
    expect(renderToStaticMarkup(<EmpresaCta />)).toBe('');
  });
});

describe('Tarjeta con oferta', () => {
  it('muestra la etiqueta con el porcentaje, el precio anterior tachado y el precio rebajado', () => {
    const salida = renderToStaticMarkup(
      <ProductCard id="1" name="Viniltex" price={85000} originalPrice={100000} isOffer offerBadgeText="−15 %" />,
    );
    expect(salida).toContain('−15 %');
    expect(salida).toMatch(/line-through[^>]*>\s*\$\s?100\.000/);
    expect(salida).toMatch(/\$\s?85\.000/);
  });
});
