import { describe, expect, it } from 'vitest';
import type { CotizacionDetalle } from '../dtos/m21-cotizaciones.dto';
import { editorFormSchema, rechazoAdminFormSchema, solicitarFormSchema } from '../dtos/formularios.dto';
import {
  cuerpoDelEditor,
  descuentoSobreTotal,
  faltanPrecios,
  referenciaEnPantalla,
  totalEnPantalla,
  valoresDelEditor,
} from '../services/editor';
import {
  ETIQUETA_ESTADO,
  estadoDeUrl,
  fechaCorta,
  paginaDeUrl,
  porcentajeDescuento,
  precioConDescuento,
  precioDesdePorcentaje,
  textoSiguientePaso,
} from '../services/textos-cotizaciones';

const cotizacion: CotizacionDetalle = {
  idCotizacion: 7,
  codigo: 'COT-000007',
  estado: 'solicitada',
  fechaCreacion: '2026-10-26T15:00:00.000Z',
  fechaVencimiento: null,
  cantidadLineas: 2,
  totalReferencia: 350_000,
  totalAcordado: null,
  cliente: null,
  comentarioCliente: null,
  notaParaCliente: null,
  motivoRechazo: null,
  fechaEnvio: null,
  fechaRespuesta: null,
  lineas: [
    {
      idLinea: 1,
      idVariante: 1,
      idColor: null,
      cantidad: 2,
      producto: { nombre: 'Viniltex', marca: 'Pintuco', medida: 'Galón', sku: 'VIN', color: null },
      precioReferencia: 100_000,
      precioAcordado: 90_000,
      subtotalAcordado: 180_000,
    },
    {
      idLinea: 2,
      idVariante: 2,
      idColor: null,
      cantidad: 3,
      producto: { nombre: 'Koraza', marca: 'Pintuco', medida: 'Galón', sku: 'KOR', color: null },
      precioReferencia: 50_000,
      precioAcordado: null,
      subtotalAcordado: null,
    },
  ],
};

describe('M21 · editor del panel', () => {
  it('pasa la cotización a texto y de vuelta al cuerpo del PUT, quitando las desmarcadas', () => {
    const v = valoresDelEditor(cotizacion);
    expect(v.lineas.map((l) => [l.cantidad, l.precio])).toEqual([
      ['2', '90000'],
      ['3', ''],
    ]);
    const conCambios = {
      ...v,
      lineas: [
        { ...v.lineas[0]!, cantidad: '5' },
        { ...v.lineas[1]!, incluida: false },
      ],
      nota: '  Precio por volumen ',
      fechaVencimiento: '2026-11-15',
    };
    expect(cuerpoDelEditor(conCambios)).toEqual({
      lineas: [{ idLinea: 1, cantidad: 5, precioAcordado: 90_000 }],
      notaParaCliente: 'Precio por volumen',
      fechaVencimiento: '2026-11-15',
    });
    expect(faltanPrecios(v)).toBe(true);
    expect(faltanPrecios(conCambios)).toBe(false);
    expect(totalEnPantalla(v)).toBeNull();
    expect(totalEnPantalla(conCambios)).toBe(450_000);
  });

  it('la referencia y el descuento sobre el total salen de las líneas en pantalla', () => {
    const v = valoresDelEditor(cotizacion);
    const refs = new Map([
      [1, 85_900],
      [2, 28_900],
    ]);
    const todas = { ...v, lineas: v.lineas.map((l) => ({ ...l, cantidad: '1' })) };
    expect(referenciaEnPantalla(todas, refs)).toBe(114_800);
    expect(referenciaEnPantalla({ ...todas, lineas: [todas.lineas[0]!, { ...todas.lineas[1]!, incluida: false }] }, refs)).toBe(85_900);
    expect(descuentoSobreTotal(114_800, 103_320)).toEqual({ importe: 11_480, porcentaje: 10 });
    expect(descuentoSobreTotal(100, 120)).toEqual({ importe: 0, porcentaje: 0 });
  });

  it('valida cantidades, precios y que quede al menos una línea', () => {
    const v = valoresDelEditor(cotizacion);
    expect(editorFormSchema.safeParse(v).success).toBe(true);
    expect(editorFormSchema.safeParse({ ...v, lineas: [{ ...v.lineas[0]!, cantidad: '0' }] }).success).toBe(false);
    expect(editorFormSchema.safeParse({ ...v, lineas: [{ ...v.lineas[0]!, precio: '12.345' }] }).success).toBe(false);
    expect(editorFormSchema.safeParse({ ...v, lineas: v.lineas.map((l) => ({ ...l, incluida: false })) }).success).toBe(false);
  });

  it('el atajo de % calcula el precio y al revés', () => {
    expect(precioConDescuento(85_900, 10)).toBe(77_310);
    expect(precioDesdePorcentaje(34_900, '3')).toBe(33_853);
    expect(precioDesdePorcentaje(100_000, '12,5')).toBe(87_500);
    expect(precioDesdePorcentaje(100_000, '1.')).toBe(99_000);
    for (const t of ['', 'abc', '100', '-5', '10.555']) expect(precioDesdePorcentaje(100_000, t)).toBeNull();
    expect(porcentajeDescuento(100_000, 90_000)).toBe(10);
    expect(porcentajeDescuento(0, 1)).toBe(0);
  });
});

describe('M21 · textos y URL', () => {
  it('nombres de estado sin códigos internos y siguiente paso', () => {
    expect(ETIQUETA_ESTADO.borrador).toBe(ETIQUETA_ESTADO.solicitada);
    expect(textoSiguientePaso('enviada', '2026-11-10')).toContain('10 de nov');
    expect(textoSiguientePaso('vencida', null)).toContain('nueva');
  });

  it('lee estado y página de la URL con seguridad', () => {
    expect(estadoDeUrl('enviada')).toBe('enviada');
    expect(estadoDeUrl('inventado')).toBeNull();
    expect(paginaDeUrl('3')).toBe(3);
    expect(paginaDeUrl('-1')).toBe(1);
    expect(paginaDeUrl(null)).toBe(1);
  });

  it('una fecha AAAA-MM-DD se lee como ese mismo día', () => {
    expect(fechaCorta('2026-11-10').replace(/\s/g, ' ')).toMatch(/^10 de nov/);
  });

  it('formularios del cliente y del panel', () => {
    expect(solicitarFormSchema.safeParse({ comentario: 'x'.repeat(501) }).success).toBe(false);
    expect(rechazoAdminFormSchema.safeParse({ motivo: '  ' }).success).toBe(false);
    expect(rechazoAdminFormSchema.parse({ motivo: ' Sin existencias ' })).toEqual({ motivo: 'Sin existencias' });
  });
});
