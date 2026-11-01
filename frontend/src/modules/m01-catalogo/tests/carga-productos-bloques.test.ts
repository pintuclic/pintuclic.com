import { describe, expect, it } from 'vitest';
import type { FilaProductoCarga, ProductoCarga } from '../dtos/m01-catalogo-carga-masiva.dto';
import { calcularBalance, dividirEnBloquesDeProductos, filasDelInforme } from '../services/carga-productos-bloques';

let numero = 2;
function fila(producto: string, medida: string, marca = 'Pintuco'): FilaProductoCarga {
  return {
    fila: numero++,
    marca,
    linea: null,
    categoria: 'Pinturas',
    subcategoria: 'Vinilos',
    producto,
    descripcion: null,
    usoInterior: true,
    usoExterior: false,
    medida,
    sku: null,
    precio: 1000,
    codigoProveedor: null,
    superficies: [],
    acabados: [],
    bases: [],
    coloresFabrica: [],
    caracteristicas: [],
    tipoResina: null,
    tipoCalidad: null,
    rendimientoMin: null,
    rendimientoMax: null,
    manos: null,
  };
}

function producto(resultado: ProductoCarga['resultado'], variantes: number, extra: Partial<ProductoCarga> = {}): ProductoCarga {
  return {
    marca: 'Pintuco',
    producto: `P-${resultado}`,
    categoria: 'Pinturas',
    subcategoria: 'Vinilos',
    linea: null,
    resultado,
    motivo: null,
    detalle: null,
    idProducto: null,
    variantes: Array.from({ length: variantes }, (_, i) => ({
      fila: i + 2,
      medida: `M${i}`,
      sku: null,
      precio: 1000,
      resultado: resultado === 'creado' ? ('creada' as const) : resultado === 'por_crear' ? ('por_crear' as const) : ('rechazada' as const),
      motivo: null,
      detalle: null,
    })),
    ...extra,
  };
}

describe('C8 · bloques que no parten un producto', () => {
  it('agrupa por marca y producto sin tildes ni mayúsculas, aunque las filas estén separadas', () => {
    const { bloques } = dividirEnBloquesDeProductos([fila('Viniltex', 'Galón'), fila('Koraza', 'Galón'), fila('VINILTEX', 'Cuarto')]);
    expect(bloques).toHaveLength(1);
    expect(bloques[0]?.map((f) => f.producto)).toEqual(['Viniltex', 'VINILTEX', 'Koraza']);
  });

  it('abre otro bloque en vez de partir un producto cuando no cabe', () => {
    const filas = [fila('A', '1'), fila('A', '2'), fila('A', '3'), fila('B', '1'), fila('B', '2')];
    const { bloques } = dividirEnBloquesDeProductos(filas, 4);
    expect(bloques.map((b) => b.map((f) => f.producto))).toEqual([['A', 'A', 'A'], ['B', 'B']]);
  });

  it('un producto con más filas que el bloque se rechaza entero y no se envía', () => {
    const filas = [fila('Enorme', '1'), fila('Enorme', '2'), fila('Enorme', '3'), fila('Normal', '1')];
    const { bloques, demasiadoGrandes } = dividirEnBloquesDeProductos(filas, 2);
    expect(bloques).toEqual([[expect.objectContaining({ producto: 'Normal' })]]);
    expect(demasiadoGrandes).toHaveLength(1);
    expect(demasiadoGrandes[0]).toMatchObject({ producto: 'Enorme', resultado: 'rechazado', motivo: 'producto_demasiado_grande' });
    expect(demasiadoGrandes[0]?.variantes).toHaveLength(3);
  });
});

describe('balance e informe', () => {
  it('cuenta productos y variantes por resultado', () => {
    const balance = calcularBalance([producto('por_crear', 2), producto('creado', 1), producto('ya_existe', 3), producto('rechazado', 2)]);
    expect(balance).toEqual({
      productos: 4,
      productosNuevos: 2,
      productosYaExisten: 1,
      productosRechazados: 1,
      variantes: 8,
      variantesNuevas: 3,
      variantesRechazadas: 5,
    });
  });

  it('el informe lleva solo los rechazados y los que ya existían, y neutraliza fórmulas (C10)', () => {
    const rechazado = producto('rechazado', 1, {
      producto: '=SUMA(1;1)',
      motivo: 'marca_no_encontrada',
      detalle: 'Fila 2: la marca «X» no existe o está inactivo.',
    });
    const filas = filasDelInforme([producto('por_crear', 2), rechazado, producto('ya_existe', 1, { detalle: 'Ya existe.' })]);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toEqual(['2', 'Pintuco', "'=SUMA(1;1)", 'M0', 'Rechazado', 'marca_no_encontrada', 'Fila 2: la marca «X» no existe o está inactivo.']);
    expect(filas[1]?.[4]).toBe('Ya existe');
  });
});
