import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { BotonPostventaOrden } from '../components/cliente/BotonPostventaOrden';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../services/postventa-api', () => ({
  listarMisSolicitudes: vi.fn().mockResolvedValue({
    items: [],
    paginacion: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 },
  }),
}));

describe('BotonPostventaOrden', () => {
  it('renderiza el boton de cancelacion para orden_confirmada sin solicitud previa', () => {
    const html = renderToStaticMarkup(
      <BotonPostventaOrden
        codigoOrden="PC-2026-00005"
        estadoOrden="orden_confirmada"
        lineas={[]}
      />
    );

    expect(html).toContain('Solicitar cancelación');
  });

  it('no renderiza nada para orden en curso no cancelable', () => {
    const html = renderToStaticMarkup(
      <BotonPostventaOrden
        codigoOrden="PC-2026-00005"
        estadoOrden="despachado"
        lineas={[]}
      />
    );

    expect(html).toBe('');
  });
});
