import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AccesoPanel, PendientePanel, ProductoCotizado } from '../dtos/m17-panel-resumen.dto';
import { AccesosPanel } from '../components/panel/AccesosPanel';
import { BloqueCifras } from '../components/panel/BloqueCifras';
import { EstadosCotizaciones } from '../components/panel/EstadosCotizaciones';
import { GraficoCotizaciones } from '../components/panel/GraficoCotizaciones';
import { PendientesPanel } from '../components/panel/PendientesPanel';
import { TopProductos } from '../components/panel/TopProductos';

/** Sin jsdom: se verifica el HTML que produce el servidor (semántica, enlaces y textos). */

describe('PendientesPanel', () => {
  it('sin pendientes lo dice con calma', () => {
    expect(renderToStaticMarkup(<PendientesPanel pendientes={[]} />)).toContain('Todo al día');
  });

  it('cada pendiente es un enlace a su pantalla, con su cantidad', () => {
    const pendientes: PendientePanel[] = [
      { clave: 'cotizaciones_por_responder', etiqueta: 'Cotizaciones por responder', total: 5, prioridad: 'alta', ruta: '/admin/cotizaciones?estado=solicitada' },
      { clave: 'solicitudes_contacto', etiqueta: 'Solicitudes de clientes sin atender', total: 1, prioridad: 'normal', ruta: '/admin/atencion' },
    ];
    const html = renderToStaticMarkup(<PendientesPanel pendientes={pendientes} />);
    expect(html).toContain('href="/admin/cotizaciones?estado=solicitada"');
    expect(html).toContain('href="/admin/atencion"');
    expect(html).toContain('Cotizaciones por responder');
    expect(html).toContain('>5<');
    expect(html).not.toContain('Todo al día');
  });
});

describe('GraficoCotizaciones', () => {
  const serie = [
    { fecha: '2026-10-25', cotizaciones: 0, valor: 0 },
    { fecha: '2026-10-26', cotizaciones: 2, valor: 100000 },
    { fecha: '2026-10-27', cotizaciones: 4, valor: 300000 },
  ];

  it('es una imagen descrita para lectores de pantalla y cada barra dice su día y su cifra', () => {
    const html = renderToStaticMarkup(<GraficoCotizaciones serie={serie} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('6 cotizaciones en los últimos 3 días');
    expect(html).toContain('27 oct: 4 cotizaciones');
    expect(html).toContain('26 oct: 2 cotizaciones');
  });

  it('con el periodo vacío avisa en lugar de dejar un gráfico en blanco', () => {
    const html = renderToStaticMarkup(<GraficoCotizaciones serie={serie.map((p) => ({ ...p, cotizaciones: 0 }))} />);
    expect(html).toContain('Todavía no hay cotizaciones en este periodo.');
  });
});

describe('EstadosCotizaciones', () => {
  const porEstado = [
    { estado: 'solicitada', total: 3 },
    { estado: 'borrador', total: 1 },
    { estado: 'enviada', total: 2 },
    { estado: 'aprobada', total: 2 },
    { estado: 'rechazada', total: 1 },
    { estado: 'vencida', total: 1 },
  ] as const;

  it('junta solicitada y borrador y cada estado enlaza a la lista ya filtrada', () => {
    const html = renderToStaticMarkup(<EstadosCotizaciones porEstado={porEstado} tasaAprobacion={50} />);
    expect(html).toContain('En revisión');
    expect(html).toContain('href="/admin/cotizaciones?estado=solicitada"');
    expect(html).toContain('href="/admin/cotizaciones?estado=aprobada"');
    expect(html).toContain('50 % fueron aceptadas');
  });

  it('sin cotizaciones resueltas no inventa una tasa', () => {
    const html = renderToStaticMarkup(<EstadosCotizaciones porEstado={porEstado} tasaAprobacion={null} />);
    expect(html).toContain('Todavía no hay cotizaciones resueltas');
  });
});

describe('TopProductos', () => {
  it('lista los productos con unidades y cotizaciones, en singular cuando toca', () => {
    const productos: ProductoCotizado[] = [
      { nombre: 'Koraza', marca: 'Pintuco', unidades: 9, cotizaciones: 3 },
      { nombre: 'Brocha', marca: null, unidades: 1, cotizaciones: 1 },
    ];
    const html = renderToStaticMarkup(<TopProductos productos={productos} />);
    expect(html).toContain('Koraza');
    expect(html).toContain('Pintuco');
    expect(html).toContain('9</strong> unidades · 3 cotizaciones');
    expect(html).toContain('1</strong> unidad · 1 cotización');
  });

  it('sin productos lo dice', () => {
    expect(renderToStaticMarkup(<TopProductos productos={[]} />)).toContain('Todavía no hay productos cotizados');
  });
});

describe('AccesosPanel y BloqueCifras', () => {
  it('los accesos son enlaces a rutas del panel', () => {
    const accesos: AccesoPanel[] = [{ clave: 'ajustar_inventario', etiqueta: 'Ajustar inventario', descripcion: 'Corrige existencias.', ruta: '/admin/inventario' }];
    const html = renderToStaticMarkup(<AccesosPanel accesos={accesos} />);
    expect(html).toContain('href="/admin/inventario"');
    expect(html).toContain('Ajustar inventario');
  });

  it('el bloque de cifras resalta lo que pide atención y enlaza lo que tiene pantalla', () => {
    const html = renderToStaticMarkup(
      <BloqueCifras
        id="b"
        titulo="Catálogo"
        icono={<span />}
        colorIcono="x"
        cifras={[
          { etiqueta: 'Agotadas', valor: '3', alerta: true, href: '/admin/inventario' },
          { etiqueta: 'Activas', valor: '9' },
        ]}
      />,
    );
    expect(html).toContain('text-danger');
    expect(html).toContain('href="/admin/inventario"');
    expect(html).toContain('<dt');
  });
});
