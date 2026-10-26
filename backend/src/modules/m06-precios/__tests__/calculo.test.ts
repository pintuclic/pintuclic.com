import { describe, expect, it } from 'vitest';
import {
  calcularCarrito,
  type CuponParaCalcular,
  type EntradaCalculo,
  type LineaParaCalcular,
  type TipoClienteParaCalcular,
} from '../services/calculo';
import { repartirProporcional } from '../services/dinero';

const proveedor: TipoClienteParaCalcular = {
  idSubRolEmpresa: 1,
  nombre: 'Proveedor',
  porcentaje: 15,
  montoMinimoCompra: 0,
  tope: 0,
};

function linea(parcial: Partial<LineaParaCalcular> & { precioBase: number | null }): LineaParaCalcular {
  return {
    indice: 0,
    idVariante: 1,
    idColor: null,
    cantidad: 1,
    vendible: true,
    motivoNoVendible: null,
    excluidoDeDescuentos: false,
    precioAcordado: null,
    oferta: null,
    ...parcial,
  };
}

const oferta10 = { idEvento: 1, nombreEvento: 'Miércoles de color', idRegla: 1, porcentaje: 10 };

function entrada(parcial: Partial<EntradaCalculo> & { lineas: LineaParaCalcular[] }): EntradaCalculo {
  return {
    perfil: { tipo: 'particular', idSubRolEmpresa: null },
    tipoCliente: null,
    cupon: null,
    tasaIva: 19,
    umbralSugerirEmpresa: null,
    registrado: false,
    calculadoEn: new Date('2026-11-04T15:00:00Z'),
    ...parcial,
  };
}

const empresa = { tipo: 'empresa' as const, idSubRolEmpresa: 1 };

describe('jerarquía de descuentos (R1): se encadenan, no se suman', () => {
  it('100 con evento 10 % = 90 y con empresa 15 % sobre 90 = 76,50 (no 75)', () => {
    const r = calcularCarrito(
      entrada({ lineas: [linea({ precioBase: 100, oferta: oferta10 })], perfil: empresa, tipoCliente: proveedor }),
    );
    const l = r.lineas[0];
    expect(l?.descuentos).toEqual([
      {
        ordenAplicacion: 1,
        tipoOrigen: 'evento',
        idRegla: 1,
        origen: 'Miércoles de color',
        porcentaje: 10,
        importe: 10,
      },
      {
        ordenAplicacion: 2,
        tipoOrigen: 'empresa',
        idRegla: 1,
        origen: 'Descuento empresa · Proveedor',
        porcentaje: 15,
        importe: 13.5,
      },
    ]);
    expect(l?.subtotal).toBe(76.5);
    expect(r.resumen).toMatchObject({
      subtotalInicial: 100,
      descuentoEventos: 10,
      descuentoEmpresa: 13.5,
      descuentoTotal: 23.5,
      total: 76.5,
    });
  });

  it('el cupón va último, sobre lo ya rebajado', () => {
    const cupon: CuponParaCalcular = {
      codigo: 'HOLA1234',
      valido: true,
      idCupon: 7,
      nombre: 'Hola',
      tipoValor: 'porcentaje',
      valor: 10,
      montoMinimoCompra: null,
    };
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 100, oferta: oferta10 })],
        perfil: empresa,
        tipoCliente: proveedor,
        cupon,
      }),
    );
    expect(r.lineas[0]?.descuentos.map((d) => [d.ordenAplicacion, d.tipoOrigen, d.importe])).toEqual([
      [1, 'evento', 10],
      [2, 'empresa', 13.5],
      [3, 'cupon', 7.65],
    ]);
    expect(r.lineas[0]?.subtotal).toBe(68.85);
    expect(r.cupon).toMatchObject({ aplicado: true, descuento: 7.65, idCupon: 7 });
  });

  it('un paso que no aplica no deja fila ni hueco en la numeración', () => {
    const r = calcularCarrito(
      entrada({ lineas: [linea({ precioBase: 100 })], perfil: empresa, tipoCliente: proveedor }),
    );
    expect(r.lineas[0]?.descuentos.map((d) => d.ordenAplicacion)).toEqual([1]);
    expect(r.lineas[0]?.descuentos[0]?.tipoOrigen).toBe('empresa');
  });

  it('un particular sin evento paga el precio base', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 50000, cantidad: 2 })] }));
    expect(r.lineas[0]).toMatchObject({
      subtotalInicial: 100000,
      descuentos: [],
      subtotal: 100000,
      precioUnitarioFinal: 50000,
    });
  });
});

describe('exclusiones y precios acordados (R2, R3)', () => {
  it('un producto excluido de descuentos (combo) no recibe evento, empresa ni cupón', () => {
    const cupon: CuponParaCalcular = {
      codigo: 'HOLA1234',
      valido: true,
      idCupon: 7,
      nombre: 'Hola',
      tipoValor: 'porcentaje',
      valor: 10,
      montoMinimoCompra: null,
    };
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 100, excluidoDeDescuentos: true, oferta: oferta10 })],
        perfil: empresa,
        tipoCliente: proveedor,
        cupon,
      }),
    );
    expect(r.lineas[0]).toMatchObject({ descuentos: [], subtotal: 100, excluidoDeDescuentos: true });
    expect(r.cupon).toMatchObject({ aplicado: false, motivoRechazo: 'sin_lineas_elegibles' });
  });

  it('el excluido sí cuenta para el mínimo de empresa, aunque no reciba el descuento', () => {
    const tipo = { ...proveedor, montoMinimoCompra: 150 };
    const r = calcularCarrito(
      entrada({
        lineas: [
          linea({ indice: 0, precioBase: 100, excluidoDeDescuentos: true }),
          linea({ indice: 1, idVariante: 2, precioBase: 100 }),
        ],
        perfil: empresa,
        tipoCliente: tipo,
      }),
    );
    expect(r.empresa).toMatchObject({ aplicado: true, totalCarrito: 200 });
    expect(r.lineas[0]?.subtotal).toBe(100);
    expect(r.lineas[1]?.subtotal).toBe(85);
  });

  it('una línea con precio acordado se respeta tal cual, sin descuentos', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 100, precioAcordado: 70, cantidad: 2, oferta: oferta10 })],
        perfil: empresa,
        tipoCliente: proveedor,
      }),
    );
    expect(r.lineas[0]).toMatchObject({ precioAcordado: true, precioInicial: 70, subtotal: 140, descuentos: [] });
  });
});

describe('mínimo de compra del descuento de empresa (R10) y avisos (R12)', () => {
  const tipo = { ...proveedor, montoMinimoCompra: 300000 };

  it('por debajo del mínimo no se aplica y avisa cuánto falta', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 250000 })], perfil: empresa, tipoCliente: tipo }));
    expect(r.lineas[0]?.descuentos).toEqual([]);
    expect(r.empresa).toMatchObject({ aplicado: false, faltante: 50000, totalCarrito: 250000, descuento: 0 });
    expect(r.avisos).toEqual([
      { tipo: 'empresa_falta_monto', tipoCliente: 'Proveedor', porcentaje: 15, montoMinimo: 300000, faltante: 50000 },
    ]);
  });

  it('el mínimo se compara con el total DESPUÉS de los eventos', () => {
    const r = calcularCarrito(
      entrada({ lineas: [linea({ precioBase: 320000, oferta: oferta10 })], perfil: empresa, tipoCliente: tipo }),
    );
    // 320 000 − 10 % = 288 000 < 300 000
    expect(r.empresa).toMatchObject({ aplicado: false, faltante: 12000, totalCarrito: 288000 });
  });

  it('justo en el mínimo sí se aplica (alcanza o supera)', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 300000 })], perfil: empresa, tipoCliente: tipo }));
    expect(r.empresa).toMatchObject({ aplicado: true, faltante: null, descuento: 45000 });
    expect(r.avisos).toEqual([]);
  });

  it('no avisa de un mínimo si el carrito solo tiene líneas sin descuento posible', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 1000, excluidoDeDescuentos: true })],
        perfil: empresa,
        tipoCliente: tipo,
      }),
    );
    expect(r.avisos).toEqual([]);
    expect(r.empresa?.aplicado).toBe(false);
  });

  it('invita a crear cuenta empresa al cliente registrado particular que pasa el umbral', () => {
    const base = { lineas: [linea({ precioBase: 600000 })], umbralSugerirEmpresa: 500000 };
    expect(calcularCarrito(entrada({ ...base, registrado: true })).avisos).toEqual([
      { tipo: 'sugerir_cuenta_empresa', umbral: 500000 },
    ]);
    // el visitante sin sesión no recibe el aviso
    expect(calcularCarrito(entrada({ ...base, registrado: false })).avisos).toEqual([]);
    // por debajo del umbral, tampoco
    expect(
      calcularCarrito(
        entrada({ lineas: [linea({ precioBase: 499999 })], umbralSugerirEmpresa: 500000, registrado: true }),
      ).avisos,
    ).toEqual([]);
    // una cuenta empresa nunca recibe la invitación
    expect(
      calcularCarrito(entrada({ ...base, registrado: true, perfil: empresa, tipoCliente: proveedor })).avisos,
    ).toEqual([]);
  });

  it('el umbral para sugerir se compara después de los eventos', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 540000, oferta: oferta10 })],
        umbralSugerirEmpresa: 500000,
        registrado: true,
      }),
    );
    expect(r.avisos).toEqual([]); // 486 000
  });

  it('una cuenta empresa sin tipo no recibe descuento ni aviso de empresa', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 100 })],
        perfil: { tipo: 'empresa', idSubRolEmpresa: null },
        tipoCliente: null,
      }),
    );
    expect(r.empresa).toBeNull();
    expect(r.lineas[0]?.descuentos).toEqual([]);
  });
});

describe('tope del descuento de empresa (R11)', () => {
  it('recorta el ahorro total y lo reparte en proporción; la suma es exacta', () => {
    const tipo = { ...proveedor, tope: 10000 };
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ indice: 0, precioBase: 100000 }), linea({ indice: 1, idVariante: 2, precioBase: 50000 })],
        perfil: empresa,
        tipoCliente: tipo,
      }),
    );
    // sin tope: 15 000 + 7 500 = 22 500 → recortado a 10 000, en proporción 2:1
    const importes = r.lineas.map((l) => l.descuentos[0]?.importe);
    expect(importes).toEqual([6666.67, 3333.33]);
    expect(r.resumen.descuentoEmpresa).toBe(10000);
    // con tope el importe ya no es porcentaje × base: no se informa porcentaje
    expect(r.lineas[0]?.descuentos[0]?.porcentaje).toBeNull();
    expect(r.empresa?.descuento).toBe(10000);
  });

  it('un tope mayor al ahorro no cambia nada; tope 0 = sin tope', () => {
    for (const tope of [0, 1_000_000]) {
      const r = calcularCarrito(
        entrada({ lineas: [linea({ precioBase: 100000 })], perfil: empresa, tipoCliente: { ...proveedor, tope } }),
      );
      expect(r.lineas[0]?.descuentos[0]).toMatchObject({ importe: 15000, porcentaje: 15 });
    }
  });
});

describe('cupón (R13, R14)', () => {
  const fijo = (valor: number, minimo: number | null = null): CuponParaCalcular => ({
    codigo: 'FIJO5000',
    valido: true,
    idCupon: 3,
    nombre: 'Fijo',
    tipoValor: 'importe_fijo',
    valor,
    montoMinimoCompra: minimo,
  });

  it('un cupón de importe fijo se reparte entre las líneas elegibles en proporción', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ indice: 0, precioBase: 30000 }), linea({ indice: 1, idVariante: 2, precioBase: 10000 })],
        cupon: fijo(4000),
      }),
    );
    expect(r.lineas.map((l) => l.descuentos[0]?.importe)).toEqual([3000, 1000]);
    expect(r.lineas[0]?.descuentos[0]?.porcentaje).toBeNull();
    expect(r.cupon?.descuento).toBe(4000);
  });

  it('el cupón fijo nunca pasa de lo que vale la compra', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 3000 })], cupon: fijo(50000) }));
    expect(r.lineas[0]?.subtotal).toBe(0);
    expect(r.resumen.total).toBe(0);
  });

  it('rechaza por monto mínimo sin romper el cálculo y dice cuál es el mínimo', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 30000 })], cupon: fijo(4000, 50000) }));
    expect(r.cupon).toEqual({
      codigo: 'FIJO5000',
      aplicado: false,
      motivoRechazo: 'monto_minimo_no_alcanzado',
      montoMinimo: 50000,
      descuento: 0,
      idCupon: null,
    });
    expect(r.resumen.total).toBe(30000);
  });

  it('el mínimo del cupón se mide sobre lo ya rebajado de las líneas elegibles', () => {
    const r = calcularCarrito(
      entrada({ lineas: [linea({ precioBase: 55000, oferta: oferta10 })], cupon: fijo(4000, 50000) }),
    );
    expect(r.cupon?.motivoRechazo).toBe('monto_minimo_no_alcanzado'); // 49 500
  });

  it('un cupón ya rechazado por la base (vencido, agotado…) se informa tal cual', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [linea({ precioBase: 100 })],
        cupon: { codigo: 'VIEJO123', valido: false, motivo: 'cupon_no_vigente' },
      }),
    );
    expect(r.cupon).toMatchObject({ aplicado: false, motivoRechazo: 'cupon_no_vigente', idCupon: null });
  });
});

describe('IVA y redondeo (R9, R16)', () => {
  it('los precios ya incluyen IVA: base = total / 1,19 e IVA = total − base', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 119000 })] }));
    expect(r.resumen).toMatchObject({ total: 119000, tasaIva: 19, baseSinImpuesto: 100000, importeIva: 19000 });
  });

  it('base + IVA siempre suman el total, aunque haya centavos', () => {
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 33333.33, cantidad: 3 })] }));
    expect(Math.round((r.resumen.baseSinImpuesto + r.resumen.importeIva) * 100)).toBe(
      Math.round(r.resumen.total * 100),
    );
  });

  it('redondea mitad hacia arriba en el importe de cada paso', () => {
    // 10 % de 0,05 = 0,005 → 0,01
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 0.05, oferta: oferta10 })] }));
    expect(r.lineas[0]?.descuentos[0]?.importe).toBe(0.01);
    expect(r.lineas[0]?.subtotal).toBe(0.04);
  });

  it('el porcentaje se calcula sobre el subtotal de la línea, no por unidad (R9)', () => {
    // 3 × 33,33 = 99,99 − 10 % (9,999 → 10,00) = 89,99
    const r = calcularCarrito(entrada({ lineas: [linea({ precioBase: 33.33, cantidad: 3, oferta: oferta10 })] }));
    expect(r.lineas[0]).toMatchObject({ subtotalInicial: 99.99, subtotal: 89.99 });
    expect(r.lineas[0]?.precioUnitarioFinal).toBe(30);
  });

  it('no desborda con importes y cantidades grandes', () => {
    const r = calcularCarrito(
      entrada({ lineas: [linea({ precioBase: 9_999_999_999.99, cantidad: 9999, oferta: oferta10 })] }),
    );
    expect(r.resumen.descuentoEventos).toBeCloseTo(9_999_999_999.99 * 9999 * 0.1, -2);
  });
});

describe('líneas no vendibles (R17)', () => {
  it('no se precian ni suman, y el cálculo no falla', () => {
    const r = calcularCarrito(
      entrada({
        lineas: [
          linea({ indice: 0, precioBase: 100 }),
          linea({ indice: 1, idVariante: 2, vendible: false, motivoNoVendible: 'combo_agotado', precioBase: null }),
        ],
      }),
    );
    expect(r.lineas[1]).toMatchObject({
      vendible: false,
      motivoNoVendible: 'combo_agotado',
      subtotal: null,
      precioInicial: null,
      descuentos: [],
    });
    expect(r.resumen.total).toBe(100);
  });
});

describe('repartirProporcional', () => {
  it('el sobrante de centavos va a la parte de mayor peso y la suma es exacta', () => {
    const partes = repartirProporcional(100, [1, 1, 1]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(100);
    expect(partes).toEqual([34, 33, 33]);
  });
  it('sin pesos o sin total reparte ceros', () => {
    expect(repartirProporcional(0, [5, 5])).toEqual([0, 0]);
    expect(repartirProporcional(10, [0, 0])).toEqual([0, 0]);
  });
});
