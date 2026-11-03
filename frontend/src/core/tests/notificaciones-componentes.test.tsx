import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CampanaVista, FilaNotificacion, etiquetaDeCampana, type CampanaVistaProps } from '../notificaciones/CampanaNotificaciones';
import type { Notificacion } from '../notificaciones/fp02-notificaciones.dto';
import { cantidadDeSeccion, totalNovedades } from '../notificaciones/notificacionesStore';
import { PuntoNovedad } from '../notificaciones/PuntoNovedad';

const AHORA = new Date('2026-11-03T12:00:00.000Z');

function aviso(sobre: Partial<Notificacion> = {}): Notificacion {
  return {
    idNotificacion: '11111111-1111-4111-8111-111111111111',
    tipo: 'pedido_nuevo',
    nivel: 'novedad',
    seccion: 'pedidos',
    texto: 'Han llegado 15 pedidos nuevos',
    enlace: '/admin/pedidos',
    cantidad: 15,
    referencias: ['PC-1'],
    fecha: '2026-11-03T11:55:00.000Z',
    vista: false,
    leida: false,
    ...sobre,
  };
}

describe('FP-02 · punto rojo con número', () => {
  it('no pinta nada sin novedades', () => {
    expect(renderToStaticMarkup(<PuntoNovedad cantidad={0} />)).toBe('');
  });
  it('muestra el número y lo dice en texto, no solo con el color (R11)', () => {
    const html = renderToStaticMarkup(<PuntoNovedad cantidad={15} etiqueta="novedades" />);
    expect(html).toContain('>15<');
    expect(html).toContain('15 novedades');
    expect(html).toContain('sr-only');
  });
  it('topa en 99+', () => {
    expect(renderToStaticMarkup(<PuntoNovedad cantidad={250} />)).toContain('99+');
  });
});

describe('FP-02 · nombre accesible de la campanita (R11)', () => {
  it.each([
    [3, 3, 'Notificaciones, 3 sin ver'],
    [0, 2, 'Notificaciones, 2 sin leer'],
    [0, 0, 'Notificaciones, sin avisos nuevos'],
    [120, 120, 'Notificaciones, 99+ sin ver'],
  ])('sinVer=%i sinLeer=%i → %s', (sinVer, sinLeer, esperado) => {
    expect(etiquetaDeCampana(sinVer, sinLeer)).toBe(esperado);
  });
});

describe('FP-02 · aviso de la lista', () => {
  it('uno sin leer se resalta y se anuncia «sin leer»; el importante se distingue (R2, R7)', () => {
    const html = renderToStaticMarkup(<FilaNotificacion n={aviso({ nivel: 'importante', texto: 'El pedido PC-1 fue cancelado o devuelto' })} ahora={AHORA} alElegir={() => undefined} />);
    expect(html).toContain('href="/admin/pedidos"');
    expect(html).toContain('Importante: ');
    expect(html).toContain('sin leer');
    expect(html).toContain('hace 5 min');
    expect(html).toContain('font-semibold');
  });
  it('uno leído no se resalta ni dice «sin leer»', () => {
    const html = renderToStaticMarkup(<FilaNotificacion n={aviso({ leida: true, vista: true })} ahora={AHORA} alElegir={() => undefined} />);
    expect(html).not.toContain('sin leer');
    expect(html).not.toContain('bg-subaction');
  });
});

const base: CampanaVistaProps = {
  sinVer: 0, sinLeer: 0, abierta: false, lista: [], hayMas: false, cargando: false, hayError: false,
  alAbrir: () => undefined, alCerrar: () => undefined, alCargarMas: () => undefined, alLeerTodas: () => undefined, alLeer: () => undefined,
};

describe('FP-02 · campanita', () => {
  it('cerrada: botón con nombre, estado y número de avisos sin ver, sin el panel', () => {
    const html = renderToStaticMarkup(<CampanaVista {...base} sinVer={3} sinLeer={4} />);
    expect(html).toContain('aria-label="Notificaciones, 3 sin ver"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-testid="campana-numero"');
    expect(html).not.toContain('role="region"');
  });
  it('sin avisos sin ver no pinta número', () => {
    expect(renderToStaticMarkup(<CampanaVista {...base} />)).not.toContain('campana-numero');
  });
  it('abierta con avisos: lista, «Marcar todo como leído» y «Ver anteriores»', () => {
    const html = renderToStaticMarkup(<CampanaVista {...base} abierta lista={[aviso()]} hayMas sinLeer={1} />);
    expect(html).toContain('role="region"');
    expect(html).toContain('Han llegado 15 pedidos nuevos');
    expect(html).toContain('Marcar todo como leído');
    expect(html).toContain('Ver anteriores');
    expect(html).toContain('aria-expanded="true"');
  });
  it('sin nada por leer, «Marcar todo como leído» queda desactivado', () => {
    const html = renderToStaticMarkup(<CampanaVista {...base} abierta lista={[aviso({ leida: true, vista: true })]} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Marcar todo como leído/);
  });
  it('abierta y sin avisos: lo dice', () => {
    expect(renderToStaticMarkup(<CampanaVista {...base} abierta />)).toContain('Aún no tienes avisos.');
  });
  it('cargando muestra esqueletos; con error, alerta', () => {
    expect(renderToStaticMarkup(<CampanaVista {...base} abierta cargando />)).toContain('Cargando avisos');
    expect(renderToStaticMarkup(<CampanaVista {...base} abierta hayError />)).toContain('role="alert"');
  });
});

describe('FP-02 · lectura del resumen', () => {
  const resumen = { campana: { sinVer: 1, sinLeer: 1 }, secciones: [{ seccion: 'mis_pedidos' as const, cantidad: 2 }, { seccion: 'cuenta' as const, cantidad: 1 }] };
  it('cantidad por sección y total de varias', () => {
    expect(cantidadDeSeccion(resumen, 'mis_pedidos')).toBe(2);
    expect(cantidadDeSeccion(resumen, 'pedidos')).toBe(0);
    expect(totalNovedades(resumen, ['mis_pedidos', 'mis_cotizaciones', 'cuenta'])).toBe(3);
  });
});
