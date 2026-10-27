import { describe, expect, it } from 'vitest';
import type { ProductoPublicoFicha, VariantePublica } from '../dtos/m01-catalogo-productos.dto';
import { colorDeLaDireccion, direccionConColor, presentacionInicial, requiereColor } from '../services/seleccion-ficha';
import { datosFichaTecnica, textoAmbiente } from '../services/ficha-tecnica';

const variante = (id: number, cambios: Partial<VariantePublica> = {}): VariantePublica => ({
  idVariante: id,
  idMedida: id,
  medida: `Medida ${id}`,
  tipoMedida: 'galon',
  sku: `SKU-${id}`,
  precio: 10000 * id,
  disponibilidad: 'disponible',
  compraBloqueada: false,
  oferta: null,
  rendimiento: null,
  tieneImagenMedida: false,
  ...cambios,
});

const ficha = (cambios: Partial<ProductoPublicoFicha> = {}): ProductoPublicoFicha => ({
  idProducto: 7,
  nombre: 'Viniltex Ultralavable',
  descripcion: null,
  marca: 'Pintuco',
  linea: 'Viniltex',
  categoria: 'Pinturas',
  subcategoria: 'Vinilos',
  usoInterior: true,
  usoExterior: false,
  claseColor: 'entonable',
  tipoResina: null,
  tipoCalidad: null,
  manos: null,
  superficies: [],
  acabados: [],
  caracteristicas: [],
  variantes: [variante(1), variante(2)],
  esCombo: false,
  compraBloqueada: false,
  imagenes: [],
  ...cambios,
});

describe('presentacionInicial (U8)', () => {
  it('elige la primera disponible que se puede comprar', () => {
    const lista = [variante(1, { disponibilidad: 'agotado' }), variante(2), variante(3)];
    expect(presentacionInicial(lista)?.idVariante).toBe(2);
  });

  it('sin disponibles, la primera no bloqueada; si todas lo están, la primera', () => {
    expect(
      presentacionInicial([variante(1, { compraBloqueada: true }), variante(2, { disponibilidad: 'agotado' })])
        ?.idVariante,
    ).toBe(2);
    expect(presentacionInicial([variante(4, { compraBloqueada: true })])?.idVariante).toBe(4);
    expect(presentacionInicial([])).toBeNull();
  });
});

describe('requiereColor', () => {
  it('pide color a los entonables y a los de colores fijos, no a las herramientas', () => {
    expect(requiereColor({ claseColor: 'entonable' })).toBe(true);
    expect(requiereColor({ claseColor: 'colores_fijos' })).toBe(true);
    expect(requiereColor({ claseColor: 'sin_color' })).toBe(false);
  });
});

describe('ficha técnica', () => {
  it('nombra el ambiente', () => {
    expect(textoAmbiente({ usoInterior: true, usoExterior: true })).toBe('Interior y exterior');
    expect(textoAmbiente({ usoInterior: false, usoExterior: true })).toBe('Exterior');
    expect(textoAmbiente({ usoInterior: false, usoExterior: false })).toBeNull();
  });

  it('reúne todos los datos que tiene el producto, en orden', () => {
    const f = ficha({
      tipoResina: 'Base agua',
      tipoCalidad: 1,
      manos: 2,
      superficies: ['Paredes y techos'],
      acabados: [{ id: 1, nombre: 'Mate' }],
      caracteristicas: [{ nombre: 'Secado', valor: '1 hora', orden: 1 }],
      variantes: [variante(1, { medida: '1 galón', rendimiento: { min: 40, max: 45, aproximado: true } })],
    });
    const datos = datosFichaTecnica(f, f.variantes[0] ?? null);
    expect(datos.map((d) => d.etiqueta)).toEqual([
      'Marca',
      'Categoría',
      'Presentaciones',
      'Rendimiento (1 galón)',
      'Ambiente',
      'Superficies',
      'Tipo de resina',
      'Calidad',
      'Acabados',
      'Secado',
    ]);
    expect(datos[0]?.valor).toBe('Pintuco · línea Viniltex');
    expect(datos[3]?.valor).toMatch(/^aprox\. 40 a 45 m² a 2 manos$/);
  });

  it('una herramienta sin ficha de recubrimiento solo muestra lo que tiene', () => {
    const f = ficha({ linea: null, claseColor: 'sin_color', usoInterior: false });
    expect(datosFichaTecnica(f, null).map((d) => d.clave)).toEqual(['marca', 'categoria', 'presentaciones']);
  });
});

describe('ficha abierta en un color (U8)', () => {
  it('lee el ?color= solo si es un id válido', () => {
    expect(colorDeLaDireccion('13')).toBe(13);
    expect(colorDeLaDireccion(['7', '8'])).toBe(7);
    for (const malo of [undefined, '', '0', '-3', 'azul', '1.5', '99999999999999999999']) {
      expect(colorDeLaDireccion(malo)).toBeNull();
    }
  });

  it('cambia el color de la dirección y conserva lo demás', () => {
    expect(direccionConColor('http://x.test/productos/1', 13)).toBe('/productos/1?color=13');
    expect(direccionConColor('http://x.test/productos/1?color=4&ref=inicio#ficha', 9)).toBe(
      '/productos/1?color=9&ref=inicio#ficha',
    );
  });
});
