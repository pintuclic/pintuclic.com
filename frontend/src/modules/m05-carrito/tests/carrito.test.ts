import { describe, expect, it } from 'vitest';
import type { Carrito } from '../dtos/m05-carrito.dto';
import { cantidadFormSchema, cuponFormSchema } from '../dtos/formularios.dto';
import {
  pantallaDe,
  referenciaWhatsapp,
  textoAviso,
  textoCambio,
  textoCupon,
  textoNoVendible,
  textoSiguientePaso,
  textoUnion,
} from '../services/textos-carrito';

/** `formatCOP` usa un espacio duro entre "$" y el número. */
const sinEspacios = (t: string): string => t.replace(/\s/g, ' ');

const carrito: Carrito = {
  lineas: [
    {
      idLinea: 7,
      idVariante: 1,
      idColor: 13,
      cantidad: 2,
      producto: {
        idProducto: 10,
        nombre: 'Viniltex Blanco',
        marca: 'Pintuco',
        medida: 'Galón',
        sku: 'VIN-1',
        color: { idColor: 13, nombre: 'Blanco', codigo: null, hexadecimal: '#FFFFFF' },
        idImagenPrincipal: null,
        esCombo: false,
        topeUnidades: null,
        disponibilidad: 'disponible',
      },
      precio: null,
      idCotizacion: null,
      precioAcordado: null,
    },
  ],
  cantidadItems: 2,
  calculo: null,
  union: null,
};

describe('M05 · textos de la pantalla del carrito', () => {
  it('aviso de empresa como lo pide la guía de M06', () => {
    expect(
      sinEspacios(
        textoAviso({ tipo: 'empresa_falta_monto', tipoCliente: 'Proveedor', porcentaje: 15, montoMinimo: 1_000_000, faltante: 120_000 }),
      ),
    ).toBe('Te faltan $ 120.000 para recibir tu 15 % de descuento Proveedor.');
  });

  it('cada motivo no vendible y de cupón tiene un texto sin códigos internos', () => {
    for (const m of ['variante_no_existe', 'variante_inactiva', 'producto_no_disponible', 'color_no_ofrecido', 'combo_agotado'] as const) {
      expect(textoNoVendible(m)).not.toMatch(/_/);
    }
    expect(sinEspacios(textoCupon('monto_minimo_no_alcanzado', 200_000))).toBe('Este código aplica en compras desde $ 200.000.');
    expect(textoCupon('requiere_sesion', null)).toBe('Inicia sesión para usar este código.');
  });

  it('describe los cambios de la revalidación con el nombre del producto', () => {
    expect(sinEspacios(textoCambio({ tipo: 'precio_cambio', idLinea: 7, subtotalAnterior: 90_000, subtotalNuevo: 95_000 }, carrito))).toBe(
      'Viniltex Blanco cambió de $ 90.000 a $ 95.000.',
    );
    expect(textoCambio({ tipo: 'linea_no_vendible', idLinea: 7, motivo: 'color_no_ofrecido' }, carrito)).toContain('Quítalo');
    expect(textoCambio({ tipo: 'linea_quitada', idLinea: 99 }, carrito)).toBe('Un producto que veías ya no está en tu carrito.');
  });

  it('con un código rechazado pide quitarlo, no solo volver a pulsar', () => {
    expect(textoSiguientePaso([{ tipo: 'cupon_no_aplica', codigo: 'ABC', motivo: 'cupon_no_valido' }])).toContain('Quita el código');
    expect(textoSiguientePaso([{ tipo: 'linea_nueva', idLinea: 7 }])).toContain('Revisa tu carrito');
  });

  it('la unión solo se informa si movió algo', () => {
    expect(textoUnion({ lineasAgregadas: 0, lineasSumadas: 0, lineasDescartadas: 0, cantidadesAjustadas: 0 })).toBeNull();
    expect(textoUnion({ lineasAgregadas: 1, lineasSumadas: 1, lineasDescartadas: 1, cantidadesAjustadas: 0 })).toContain('1 producto no cupo');
  });

  it('referencia para WhatsApp y lo que se envía a revalidar', () => {
    expect(referenciaWhatsapp(1)).toBe('Tengo dudas sobre mi carrito de 1 producto.');
    expect(referenciaWhatsapp(3)).toBe('Tengo dudas sobre mi carrito de 3 productos.');
    expect(pantallaDe(carrito, 'BIENVENIDA10')).toEqual({ lineas: [{ idLinea: 7, subtotal: null }], total: 0, codigoCupon: 'BIENVENIDA10' });
    expect(pantallaDe(carrito, null)).toEqual({ lineas: [{ idLinea: 7, subtotal: null }], total: 0 });
  });
});

describe('M05 · formularios', () => {
  it('el cupón exige texto y la cantidad va de 1 a 9 999', () => {
    expect(cuponFormSchema.safeParse({ codigo: '   ' }).success).toBe(false);
    expect(cuponFormSchema.parse({ codigo: ' abc ' })).toEqual({ codigo: 'abc' });
    expect(cantidadFormSchema.safeParse('0').success).toBe(false);
    expect(cantidadFormSchema.safeParse('10000').success).toBe(false);
    expect(cantidadFormSchema.safeParse('2.5').success).toBe(false);
    expect(cantidadFormSchema.parse('12')).toBe(12);
  });
});
