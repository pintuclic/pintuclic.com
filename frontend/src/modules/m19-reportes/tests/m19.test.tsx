import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GraficoBarras, GraficoRanking } from '../components/Graficos';
import { Indicador } from '../components/Indicador';
import { agrupacionesPosibles, atajoDe, diasDelRango, hoyColombia, rangoDeAtajo } from '../services/periodos';
import { ETIQUETA_AGRUPACION, etiquetaIntervalo, fechaCorta, textoVariacion } from '../services/formato-reportes';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/reportes', useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

const RAIZ = resolve(__dirname, '../../../../../');

describe('M19 · el DTO del frontend es espejo del contrato', () => {
  it('dtos/m19-reportes.dto.ts coincide con contracts/m19-reportes.contract.ts', () => {
    const limpiar = (t: string) => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m19-reportes.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m19-reportes.dto.ts'), 'utf8');
    expect(limpiar(dto)).toBe(limpiar(contrato));
  });
});

describe('M19 · periodos', () => {
  const hoy = '2026-10-28';

  it('hoy es el de Colombia', () => {
    expect(hoyColombia(new Date('2026-10-29T03:00:00.000Z'))).toBe('2026-10-28');
  });

  it('cada atajo da su rango y la agrupación que mejor lo cuenta', () => {
    expect(rangoDeAtajo('7d', hoy)).toEqual({ desde: '2026-10-22', hasta: hoy, agrupar: 'dia' });
    expect(rangoDeAtajo('90d', hoy)).toMatchObject({ desde: '2026-07-31', agrupar: 'semana' });
    expect(rangoDeAtajo('este_mes', hoy)).toEqual({ desde: '2026-10-01', hasta: hoy, agrupar: 'dia' });
    expect(rangoDeAtajo('mes_pasado', hoy)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30', agrupar: 'dia' });
    expect(rangoDeAtajo('este_anio', hoy)).toEqual({ desde: '2026-01-01', hasta: hoy, agrupar: 'mes' });
    expect(rangoDeAtajo('anio_pasado', hoy)).toEqual({ desde: '2025-01-01', hasta: '2025-12-31', agrupar: 'mes' });
  });

  it('el mes pasado en enero es diciembre del año anterior', () => {
    expect(rangoDeAtajo('mes_pasado', '2026-01-15')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31', agrupar: 'dia' });
  });

  it('reconoce el atajo de un rango y, si no coincide, es «libre»', () => {
    expect(atajoDe('2026-10-22', hoy, hoy)).toBe('7d');
    expect(atajoDe('2026-10-02', hoy, hoy)).toBe('libre');
  });

  it('solo ofrece agrupaciones legibles para el largo del rango', () => {
    expect(agrupacionesPosibles(7)).toEqual(['dia']);
    expect(agrupacionesPosibles(30)).toEqual(['dia', 'semana', 'mes']);
    expect(agrupacionesPosibles(365)).toEqual(['semana', 'mes', 'anio']);
    expect(diasDelRango('2026-01-01', '2026-12-31')).toBe(365);
  });
});

describe('M19 · formato', () => {
  it('variación con signo y coma decimal, y guion si no hay con qué comparar', () => {
    expect(textoVariacion(12.5)).toBe('+12,5 %');
    expect(textoVariacion(-3)).toBe('−3 %');
    expect(textoVariacion(0)).toBe('0 %');
    expect(textoVariacion(null)).toBe('—');
  });

  it('nombra cada intervalo', () => {
    expect(fechaCorta('2026-10-26')).toBe('26 oct 2026');
    expect(etiquetaIntervalo('2026-10-26', 'dia')).toBe('26 oct');
    expect(etiquetaIntervalo('2026-10-26', 'semana')).toBe('Sem. 26 oct');
    expect(etiquetaIntervalo('2026-10-01', 'mes')).toBe('oct 2026');
    expect(etiquetaIntervalo('2026-01-01', 'anio')).toBe('2026');
    expect(ETIQUETA_AGRUPACION.semana).toBe('Por semana');
  });
});

describe('M19 · gráficos e indicadores', () => {
  it('las barras son proporcionales al máximo, se describen en voz alta y marcan inicio, mitad y fin', () => {
    const html = renderToStaticMarkup(
      <GraficoBarras datos={[{ etiqueta: '1 oct', valor: 100, detalle: '$ 100' }, { etiqueta: '2 oct', valor: 50, detalle: '$ 50' }, { etiqueta: '3 oct', valor: 0, detalle: '$ 0' }]} resumen="Ventas de octubre" formatoMaximo={(n) => `$${String(n)}`} />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Ventas de octubre"');
    expect(html).toContain('height:100%');
    expect(html).toContain('height:50%');
    expect(html).toContain('title="2 oct: $ 50"');
    expect(html).toContain('$100');
  });

  it('un periodo sin ventas no rompe el gráfico (alto mínimo, sin dividir por 0)', () => {
    const html = renderToStaticMarkup(<GraficoBarras datos={[{ etiqueta: 'a', valor: 0, detalle: '$ 0' }]} resumen="Sin ventas" formatoMaximo={() => '$ 0'} />);
    expect(html).toContain('height:2px');
    expect(renderToStaticMarkup(<GraficoBarras datos={[]} resumen="Vacío" formatoMaximo={() => ''} />)).toContain('role="img"');
  });

  it('el ranking pone cada barra contra la mayor y muestra la participación', () => {
    const html = renderToStaticMarkup(<GraficoRanking ariaLabel="Ventas por marca" filas={[{ etiqueta: 'Pintuco', valor: 200, texto: '$ 200', participacion: 66.7 }, { etiqueta: 'Goya', valor: 100, texto: '$ 100', participacion: 33.3 }]} />);
    expect(html).toContain('aria-label="Ventas por marca"');
    expect(html).toContain('width:100%');
    expect(html).toContain('width:50%');
    expect(html).toContain('66,7 %');
  });

  it('el indicador muestra flecha, signo y texto de la variación, no solo color', () => {
    expect(renderToStaticMarkup(<Indicador titulo="Total" valor="$ 1" variacion={10} />)).toContain('+10 %');
    expect(renderToStaticMarkup(<Indicador titulo="Total" valor="$ 1" variacion={-10} />)).toContain('−10 %');
    expect(renderToStaticMarkup(<Indicador titulo="Total" valor="$ 1" variacion={null} />)).toContain('—');
    expect(renderToStaticMarkup(<Indicador titulo="Total" valor="$ 1" />)).not.toContain('frente al periodo anterior');
  });
});
