import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ETIQUETA_ESTADO } from '@/modules/m08-ordenes/services/presentacion';
import { HojaDocumento } from '../components/HojaDocumento';
import { LineaChequeo } from '../components/PanelDisponibilidad';
import { FilaRetenida } from '../components/RetenidasView';
import { HOJA, RETENIDA, lineaVerificacion } from './fixtures';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn() }) }));

function html(linea = lineaVerificacion(), deshabilitado = false): string {
  return renderToStaticMarkup(<LineaChequeo linea={linea} deshabilitado={deshabilitado} onMarcar={() => undefined} />);
}

describe('LineaChequeo (HU-CUM-01)', () => {
  it('ofrece las tres marcas como un grupo de opciones con nombre accesible', () => {
    const m = html();

    expect((m.match(/type="radio"/g) ?? []).length).toBe(3);
    expect(m).toContain('Disponible');
    expect(m).toContain('Consiguiendo stock');
    expect(m).toContain('No disponible');
    expect(m).toContain('<legend class="sr-only">Disponibilidad de Vinilo Tipo 1, Galón</legend>');
  });

  it('una línea sin revisar no trae ninguna marca elegida y se rotula «Sin revisar»', () => {
    const m = html();

    expect(m).not.toContain('checked=""');
    expect(m).toContain('Sin revisar');
  });

  it('la marca vigente queda elegida y se rotula con su texto, no solo con color', () => {
    const m = html(lineaVerificacion({ estado: 'consiguiendo_stock' }));

    expect((m.match(/checked=""/g) ?? []).length).toBe(1);
    expect(m).toMatch(/value="consiguiendo_stock"[^>]*checked=""|checked=""[^>]*value="consiguiendo_stock"/);
    expect(m).toContain('Consiguiendo stock');
  });

  it('muestra el producto, la presentación, la cantidad y, si es entonada, el color y la base', () => {
    const m = html(lineaVerificacion({ esEntonado: true, baseConsumida: 'Base Deep 1 gal', colorSolicitado: 'Rojo Colonial', cantidad: 1 }));

    expect(m).toContain('Vinilo Tipo 1');
    expect(m).toContain('Galón');
    expect(m).toContain('1 unidad');
    expect(m).toContain('Color: Rojo Colonial');
    expect(m).toContain('Base que se usa: Base Deep 1 gal');
  });

  it('pluraliza las unidades y no inventa una base en una línea que no la tiene', () => {
    const m = html(lineaVerificacion({ cantidad: 3 }));

    expect(m).toContain('3 unidades');
    expect(m).not.toContain('Base que se usa');
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
    expect(html(lineaVerificacion(), true)).toContain('<fieldset disabled=""');
    expect(html(lineaVerificacion(), false)).not.toContain('disabled=""');
  });

  it('las opciones son objetivos táctiles de al menos 44 px (se usa desde el móvil)', () => {
    expect(html()).toContain('min-h-[44px]');
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
