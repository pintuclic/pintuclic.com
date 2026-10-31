import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ETIQUETA_ESTADO } from '@/modules/m08-ordenes/services/presentacion';
import { HojaDocumento } from '../components/HojaDocumento';
import { VistaCabecera } from '../components/CabeceraDeProductos';
import { OpcionesDeLinea } from '../components/ControlesLinea';
import { FilaRetenida } from '../components/RetenidasView';
import type { EstadoOrden, LineaVerificacion, VerificacionOrden } from '../dtos/m09-cumplimiento.dto';
import { HOJA, RETENIDA, lineaVerificacion, verificacion } from './fixtures';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn() }) }));

describe('OpcionesDeLinea (HU-CUM-01)', () => {
  function html(linea = lineaVerificacion(), opciones: { deshabilitado?: boolean; estadoOrden?: EstadoOrden } = {}): string {
    return renderToStaticMarkup(
      <OpcionesDeLinea
        linea={linea}
        estadoOrden={opciones.estadoOrden ?? 'revision_disponibilidad'}
        deshabilitado={opciones.deshabilitado ?? false}
        onMarcar={() => undefined}
      />,
    );
  }

  it('en revisión ofrece las tres marcas de disponibilidad como un grupo de opciones con nombre accesible', () => {
    const m = html();

    expect((m.match(/type="radio"/g) ?? []).length).toBe(3);
    expect(m).toContain('Disponible');
    expect(m).toContain('Consiguiendo stock');
    expect(m).toContain('No disponible');
    expect(m).not.toContain('Preparada');
    expect(m).toContain('<legend class="sr-only">Disponibilidad de Vinilo Tipo 1, Galón</legend>');
  });

  it('ya en preparación ofrece solo «Disponible» y «Preparada»', () => {
    const m = html(lineaVerificacion({ estado: 'disponible' }), { estadoOrden: 'en_preparacion' });

    expect((m.match(/type="radio"/g) ?? []).length).toBe(2);
    expect(m).toContain('Preparada');
    expect(m).not.toContain('Consiguiendo stock');
  });

  it('si la línea tiene un problema en preparación ofrece las cuatro, para poder corregirla', () => {
    const m = html(lineaVerificacion({ estado: 'no_disponible' }), { estadoOrden: 'en_preparacion' });

    expect((m.match(/type="radio"/g) ?? []).length).toBe(4);
  });

  it('una línea sin revisar no trae ninguna marca elegida', () => {
    expect(html()).not.toContain('checked=""');
  });

  it('la marca vigente queda elegida', () => {
    const m = html(lineaVerificacion({ estado: 'consiguiendo_stock' }));

    expect((m.match(/checked=""/g) ?? []).length).toBe(1);
    expect(m).toMatch(/value="consiguiendo_stock"[^>]*checked=""|checked=""[^>]*value="consiguiendo_stock"/);
  });

  it('no repite el nombre ni el estado del producto: eso ya está en la lista de productos del pedido', () => {
    const m = html(lineaVerificacion({ estado: 'consiguiendo_stock' }));

    expect(m).not.toContain('font-title');
    expect(m).not.toContain('rounded-full');
  });

  it('si la línea es entonada recuerda la base que se usa; si no, no inventa una', () => {
    expect(html(lineaVerificacion({ esEntonado: true, baseConsumida: 'Base Deep 1 gal' }))).toContain('Base que se usa: Base Deep 1 gal');
    expect(html(lineaVerificacion())).not.toContain('Base que se usa');
  });

  it('muestra quién la marcó y cuántos cambios anteriores tuvo (el rastro es visible)', () => {
    const m = html(
      lineaVerificacion({
        estado: 'disponible',
        historial: [
          { estado: 'no_disponible', autor: 'Luis Gómez', fecha: '2026-10-30T14:00:00.000Z' },
          { estado: 'disponible', autor: 'Marta Ruiz', fecha: '2026-10-30T15:00:00.000Z' },
        ],
      }),
    );

    expect(m).toContain('Marcado por Marta Ruiz');
    expect(m).toContain('1 cambio anterior');
  });

  it('mientras guarda deshabilita las opciones para que no se pisen dos toques', () => {
    expect(html(lineaVerificacion(), { deshabilitado: true })).toContain('<fieldset disabled=""');
    expect(html(lineaVerificacion(), { deshabilitado: false })).not.toContain('disabled=""');
  });

  it('las opciones son objetivos táctiles de al menos 44 px (se usa desde el móvil)', () => {
    expect(html()).toContain('min-h-[44px]');
  });
});

describe('VistaCabecera (HU-CUM-01, 03 · R18, R19)', () => {
  const TRAMITE = { codigo: 'DEV-2026-00012', estado: 'solicitada', iniciadaPor: 'tienda', fecha: '2026-10-31T10:00:00.000Z' } as const;

  function html(v: VerificacionOrden | null, extra: Partial<Parameters<typeof VistaCabecera>[0]> = {}): string {
    return renderToStaticMarkup(
      <VistaCabecera
        verificacion={v}
        cargando={false}
        guardando={false}
        error={null}
        aviso={null}
        onMarcarTodas={() => undefined}
        onContactar={() => undefined}
        onCancelar={() => undefined}
        {...extra}
      />,
    );
  }
  const lineas = (...estados: LineaVerificacion['estado'][]) => estados.map((estado, i) => lineaVerificacion({ numeroLinea: i + 1, estado }));

  it('con todo en orden solo muestra el resumen y el atajo: ningún botón de problema', () => {
    const m = html(verificacion(lineas('disponible', 'pendiente')));

    expect(m).toContain('1 de 2 productos disponibles');
    expect(m).toContain('Marcar todos como disponibles');
    expect(m).not.toContain('Contactar al cliente');
    expect(m).not.toContain('Cancelar pedido');
  });

  it('con un producto consiguiéndose ofrece contactar al cliente, pero todavía no cancelar', () => {
    const m = html(verificacion(lineas('disponible', 'consiguiendo_stock')));

    expect(m).toContain('Contactar al cliente');
    expect(m).not.toContain('Cancelar pedido');
  });

  it('con un producto que no hay ofrece contactar y cancelar el pedido, una sola vez', () => {
    const m = html(verificacion(lineas('no_disponible', 'no_disponible', 'disponible')));

    expect((m.match(/Contactar al cliente/g) ?? []).length).toBe(1);
    expect((m.match(/Cancelar pedido/g) ?? []).length).toBe(1);
  });

  it('con una cancelación en trámite oculta «Cancelar pedido», dice quién la pidió y enlaza a la solicitud', () => {
    const m = html(verificacion(lineas('no_disponible'), { cancelacion: TRAMITE }));

    expect(m).not.toContain('Cancelar pedido');
    expect(m).toContain('Contactar al cliente');
    expect(m).toContain('Cancelación pedida por la tienda');
    expect(m).toContain('DEV-2026-00012');
    expect(m).toContain('href="/admin/postventa/DEV-2026-00012"');
  });

  it('una cancelación pedida por el cliente se rotula como tal', () => {
    const m = html(verificacion(lineas('disponible'), { cancelacion: { ...TRAMITE, iniciadaPor: 'cliente' } }));

    expect(m).toContain('pedida por el cliente');
  });

  it('con el pedido preparado no ofrece cancelar aunque quede un producto sin stock tras una corrección', () => {
    const m = html(verificacion(lineas('no_disponible'), { estado: 'preparada' }));

    expect(m).toContain('Contactar al cliente');
    expect(m).not.toContain('Cancelar pedido');
  });

  it('ya en preparación el atajo marca todos como preparados y el resumen cuenta preparados', () => {
    const m = html(verificacion(lineas('disponible', 'preparada'), { estado: 'en_preparacion' }));

    expect(m).toContain('1 de 2 productos preparados');
    expect(m).toContain('Marcar todos como preparados');
  });

  it('con todo preparado y el pedido en «preparada» no queda ningún atajo', () => {
    expect(html(verificacion(lineas('preparada'), { estado: 'preparada' }))).not.toContain('Marcar todos');
  });

  it('muestra el error y el aviso que le pasan, y mientras carga una cáscara', () => {
    expect(html(verificacion(lineas('disponible')), { error: 'No se pudo guardar.', aviso: 'Hecho.' })).toMatch(/No se pudo guardar\.[\s\S]*Hecho\./);
    expect(html(null, { cargando: true })).toContain('aria-busy="true"');
    expect(html(null, { error: 'Sin acceso.' })).toContain('Sin acceso.');
    expect(html(null)).toBe('');
  });
});

describe('HojaDocumento (HU-CUM-06)', () => {
  const m = renderToStaticMarkup(<HojaDocumento hoja={HOJA} />);

  it('lleva el código, el momento y el estado del pedido al generarla', () => {
    expect(m).toContain('Pedido PC-2026-00001');
    expect(m).toContain('Generada el');
    expect(m).toContain(ETIQUETA_ESTADO.en_preparacion.toLowerCase());
  });

  it('es una tabla con su descripción y encabezados, con una fila por producto', () => {
    expect(m).toContain('<caption class="sr-only">');
    expect((m.match(/scope="col"/g) ?? []).length).toBe(5);
    expect(m).toContain('Vinilo Tipo 1');
    expect(m).toContain('Rojo Colonial');
    expect(m).toContain('Base Deep 1 gal');
  });

  it('la línea que no es entonada muestra un guion donde iría la base', () => {
    expect(m).toContain('—');
  });

  it('no trae precios, descuentos, pagos ni datos del cliente', () => {
    // Solo el texto visible: los nombres de clase y atributos (scope, aria-…) no cuentan.
    const texto = m.replace(/<[^>]*>/g, ' ');
    expect(texto).not.toMatch(/\$|\b(COP|precio|descuento|total|importe|IVA|pago|correo|teléfono|dirección)\b/i);
  });

  it('avisa que la hoja refleja el pedido al generarla', () => {
    expect(m).toContain('tal como estaba al generarla');
  });
});

describe('FilaRetenida (HU-CUM-03)', () => {
  const m = renderToStaticMarkup(<FilaRetenida fila={RETENIDA} />);

  it('enlaza al pedido y dice cuánto lleva esperando', () => {
    expect(m).toContain('href="/admin/pedidos/PC-2026-00007"');
    expect(m).toContain('en revisión');
  });

  it('nombra cada producto que retiene el pedido con su estado en texto', () => {
    expect(m).toContain('Vinilo Tipo 1 — Galón');
    expect(m).toContain('Consiguiendo stock');
    expect(m).toContain('Rodillo felpa — Unidad');
    expect(m).toContain('Sin revisar');
  });

  it('dice cuántos faltan de cuántos', () => {
    expect(m).toContain('faltan 2 de 3 productos');
  });
});
