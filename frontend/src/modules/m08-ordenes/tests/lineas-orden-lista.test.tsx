import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LineasOrdenLista } from '../components/LineasOrdenLista';
import {
  ESTADOS_LINEA,
  DISPONIBILIDADES_CLIENTE,
  type LineaOrden,
  type LineaOrdenGestion,
} from '../dtos/m08-ordenes.dto';
import {
  ETIQUETA_DISPONIBILIDAD,
  ETIQUETA_ESTADO_LINEA,
  varianteDisponibilidad,
  varianteEstadoLinea,
} from '../services/presentacion';

const BASE: Omit<LineaOrden, 'disponibilidad'> = {
  nombreProducto: 'Vinilo Tipo 1',
  varianteCopia: 'Galón',
  colorSolicitado: null,
  skuVendido: null,
  cantidad: 1,
  precioInicial: null,
  precioAplicado: 90000,
  descuentos: [],
  productoDisponible: true,
};

function clienteLinea(disponibilidad: LineaOrden['disponibilidad']): LineaOrden {
  return { ...BASE, disponibilidad };
}

function personalLinea(sobrescribir: Partial<LineaOrdenGestion> = {}): LineaOrdenGestion {
  return { ...BASE, disponibilidad: 'confirmado', esEntonado: false, baseConsumida: null, estadoLinea: 'disponible', ...sobrescribir };
}

describe('LineasOrdenLista · estado de cada producto (M08 R15 y R16)', () => {
  it('el cliente ve verificando, confirmado o rechazado, con su texto', () => {
    for (const d of DISPONIBILIDADES_CLIENTE) {
      expect(renderToStaticMarkup(<LineasOrdenLista lineas={[clienteLinea(d)]} />)).toContain(ETIQUETA_DISPONIBILIDAD[d]);
    }
  });

  it('en un pedido cancelado o devuelto el cliente no ve ninguna insignia de disponibilidad', () => {
    const m = renderToStaticMarkup(<LineasOrdenLista lineas={[clienteLinea(null)]} />);

    expect(m).not.toContain('rounded-full');
  });

  it('el cliente nunca ve el estado interno de la línea', () => {
    const m = renderToStaticMarkup(
      <LineasOrdenLista lineas={[clienteLinea('rechazado'), clienteLinea('verificando_disponibilidad')]} />,
    );

    expect(m).not.toMatch(/Consiguiendo stock|No disponible|Sin revisar|Preparada/);
    expect(m).not.toContain('El cliente ve este producto');
  });

  it('el personal ve el estado propio de cada producto', () => {
    const m = renderToStaticMarkup(
      <LineasOrdenLista lineas={[personalLinea({ estadoLinea: 'consiguiendo_stock', disponibilidad: 'verificando_disponibilidad' })]} />,
    );

    expect(m).toContain('Consiguiendo stock');
    expect(m).not.toContain('Verificando disponibilidad');
  });

  it('cuando el cliente lo ve como rechazado, el personal lo sabe', () => {
    const m = renderToStaticMarkup(
      <LineasOrdenLista lineas={[personalLinea({ estadoLinea: 'no_disponible', disponibilidad: 'rechazado' })]} />,
    );

    expect(m).toContain('No disponible');
    expect(m).toContain('El cliente ve este producto como «Rechazado».');
  });

  it('con el producto disponible no se añade ese aviso', () => {
    expect(renderToStaticMarkup(<LineasOrdenLista lineas={[personalLinea()]} />)).not.toContain('El cliente ve este producto');
  });

  it('los controles se montan bajo cada producto con su número de línea, empezando en 1', () => {
    const m = renderToStaticMarkup(
      <LineasOrdenLista
        lineas={[personalLinea(), personalLinea({ nombreProducto: 'Brocha' })]}
        controles={(n) => <span data-linea={n}>controles {n}</span>}
      />,
    );

    expect(m).toContain('data-linea="1"');
    expect(m).toContain('data-linea="2"');
  });

  it('sin controles no añade nada', () => {
    expect(renderToStaticMarkup(<LineasOrdenLista lineas={[personalLinea()]} />)).not.toContain('controles');
  });
});

describe('presentación del estado de cada producto', () => {
  it('toda línea tiene un texto distinto y una variante; todo lo que ve el cliente también', () => {
    expect(new Set(ESTADOS_LINEA.map((e) => ETIQUETA_ESTADO_LINEA[e])).size).toBe(ESTADOS_LINEA.length);
    for (const e of ESTADOS_LINEA) expect(varianteEstadoLinea(e)).toBeTruthy();
    for (const d of DISPONIBILIDADES_CLIENTE) expect(varianteDisponibilidad(d)).toBeTruthy();
  });

  it('rojo lo que no hay, ámbar lo que se consigue o se verifica, verde lo que sigue su curso', () => {
    expect(varianteEstadoLinea('no_disponible')).toBe('danger');
    expect(varianteEstadoLinea('consiguiendo_stock')).toBe('sponsored');
    expect(varianteEstadoLinea('preparada')).toBe('success');
    expect(varianteEstadoLinea('pendiente')).toBe('neutral');
    expect(varianteDisponibilidad('rechazado')).toBe('danger');
    expect(varianteDisponibilidad('verificando_disponibilidad')).toBe('sponsored');
    expect(varianteDisponibilidad('confirmado')).toBe('success');
  });
});
