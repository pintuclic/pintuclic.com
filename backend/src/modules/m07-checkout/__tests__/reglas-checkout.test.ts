import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { celularNequiSchema, crearSolicitudRequestSchema, prepararCheckoutRequestSchema } from '../dtos/m07-checkout.dto';
import { checksumEsperado, firmaEventoValida, firmaIntegridad } from '../services/firmas-wompi';
import {
  aCentavos,
  celularNequiDe,
  costoEnvio,
  debeVencer,
  enmascararCelular,
  formatearCodigo,
  origenDeLineas,
  proximoReintento,
  referenciaIntento,
  textoDireccion,
} from '../services/reglas-checkout';

const sha = (t: string): string => createHash('sha256').update(t).digest('hex');

describe('M07 · firmas de Wompi', () => {
  it('R11: la firma de integridad es SHA-256 de referencia + centavos + moneda + secreto', () => {
    expect(firmaIntegridad('SOL-2026-00001-1', 4990000, 'COP', 'test_integrity_x')).toBe(
      sha('SOL-2026-00001-14990000COPtest_integrity_x'),
    );
  });

  const evento = {
    event: 'transaction.updated',
    data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000 } },
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
    timestamp: 1530291411,
  };
  const esperado = sha('1234-1610641025-49201APPROVED44900001530291411test_events_x');

  it('R5 a: concatena las propiedades en su orden, el timestamp y el secreto de eventos', () => {
    expect(checksumEsperado(evento, 'test_events_x')).toBe(esperado);
  });

  it('R5 a: acepta el checksum de la cabecera o del cuerpo y rechaza uno alterado', () => {
    expect(firmaEventoValida(evento, esperado, 'test_events_x')).toBe(true);
    expect(firmaEventoValida({ ...evento, signature: { ...evento.signature, checksum: esperado.toUpperCase() } }, null, 'test_events_x')).toBe(true);
    expect(firmaEventoValida(evento, esperado, 'otro_secreto')).toBe(false);
    const alterado = { ...evento, data: { transaction: { ...evento.data.transaction, amount_in_cents: 100 } } };
    expect(firmaEventoValida(alterado, esperado, 'test_events_x')).toBe(false);
    expect(firmaEventoValida({ data: {} }, esperado, 'test_events_x')).toBe(false);
  });
});

describe('M07 · reglas', () => {
  it('R10: recogida gratis; domicilio con tarifa, gratis desde el umbral', () => {
    expect(costoEnvio('recogida', 50_000, 15_000, 200_000)).toBe(0);
    expect(costoEnvio('domicilio', 199_999.99, 15_000, 200_000)).toBe(15_000);
    expect(costoEnvio('domicilio', 200_000, 15_000, 200_000)).toBe(0);
    expect(aCentavos(215_000.1)).toBe(21_500_010);
  });

  it('R12: el celular de Nequi tiene 10 dígitos y empieza por 3; se guarda enmascarado', () => {
    expect(celularNequiSchema.parse(' 300 123-4567 ')).toBe('3001234567');
    expect(celularNequiSchema.safeParse('6011234567').success).toBe(false);
    expect(celularNequiSchema.safeParse('30012345').success).toBe(false);
    expect(enmascararCelular('3991111111')).toBe('*** *** 1111');
    expect(celularNequiDe('+57 300 123 4567')).toBe('3001234567');
    expect(celularNequiDe('6017778899')).toBeNull();
  });

  it('códigos: SOL-AAAA-NNNNN y referencia única por intento', () => {
    expect(formatearCodigo(2026, 7)).toBe('SOL-2026-00007');
    expect(referenciaIntento('SOL-2026-00007', 2)).toBe('SOL-2026-00007-2');
  });

  it('R9: una cotización da origen cotización; dos no se pueden pagar juntas', () => {
    expect(origenDeLineas([{ idCotizacion: null }])).toEqual({ origen: 'carrito', idCotizacion: null });
    expect(origenDeLineas([{ idCotizacion: null }, { idCotizacion: 4 }, { idCotizacion: 4 }])).toEqual({
      origen: 'cotizacion',
      idCotizacion: 4,
    });
    expect(origenDeLineas([{ idCotizacion: 4 }, { idCotizacion: 5 }])).toBe('varias');
  });

  it('R14: la dirección queda como un texto con quién recibe', () => {
    expect(
      textoDireccion({
        direccion: 'Carrera 7 # 45-23',
        barrio: 'Chapinero',
        apartamentoCasa: null,
        nombreRecibe: 'Ana Pérez',
        telefonoRecibe: '3001234567',
      }),
    ).toBe('Carrera 7 # 45-23, Chapinero · Recibe: Ana Pérez, 3001234567');
  });

  it('R14: domicilio exige dirección; las casillas de Wompi son obligatorias', () => {
    const base = {
      pantalla: { lineas: [], total: 0 },
      modoEntrega: 'domicilio',
      direccion: null,
      celularNequi: '3991111111',
      aceptaciones: { tokenAceptacion: 'a', tokenDatosPersonales: 'b', aceptaTerminos: true },
    };
    expect(crearSolicitudRequestSchema.safeParse(base).success).toBe(false);
    expect(crearSolicitudRequestSchema.safeParse({ ...base, modoEntrega: 'recogida' }).success).toBe(true);
    expect(
      crearSolicitudRequestSchema.safeParse({
        ...base,
        modoEntrega: 'recogida',
        aceptaciones: { ...base.aceptaciones, aceptaTerminos: false },
      }).success,
    ).toBe(false);
  });

  it('R17, D9: la compra directa no lleva cupón; preparar exige la presentación', () => {
    const base = {
      pantalla: { lineas: [{ idLinea: 1, subtotal: 10 }], total: 10, codigoCupon: 'PINTA10' },
      directa: { idVariante: 3, idColor: null, cantidad: 1 },
      modoEntrega: 'recogida',
      direccion: null,
      celularNequi: '3991111111',
      aceptaciones: { tokenAceptacion: 'a', tokenDatosPersonales: 'b', aceptaTerminos: true },
    };
    expect(crearSolicitudRequestSchema.safeParse(base).success).toBe(false);
    expect(crearSolicitudRequestSchema.safeParse({ ...base, pantalla: { lineas: [{ idLinea: 1, subtotal: 10 }], total: 10 } }).success).toBe(true);
    expect(prepararCheckoutRequestSchema.parse({ idVariante: '3', cantidad: '2' })).toEqual({ idVariante: 3, cantidad: 2 });
    expect(prepararCheckoutRequestSchema.safeParse({ cantidad: '2' }).success).toBe(false);
    expect(prepararCheckoutRequestSchema.safeParse({ idVariante: '3', codigoCupon: 'X' }).success).toBe(false);
  });

  it('R3: vence pasado el plazo, salvo con un pago en curso', () => {
    const ahora = new Date('2026-10-27T15:00:00Z');
    const vencida = new Date('2026-10-27T14:00:00Z');
    const intento = (estado: 'PENDING' | 'DECLINED') => [{ estado }] as never;
    expect(debeVencer({ estado: 'en_pago', venceEn: vencida, intentos: intento('PENDING') }, ahora)).toBe(false);
    expect(debeVencer({ estado: 'rechazada', venceEn: vencida, intentos: intento('DECLINED') }, ahora)).toBe(true);
    expect(debeVencer({ estado: 'rechazada', venceEn: new Date('2026-10-27T16:00:00Z'), intentos: [] }, ahora)).toBe(false);
    expect(debeVencer({ estado: 'completada', venceEn: vencida, intentos: [] }, ahora)).toBe(false);
  });

  it('R6: reintentos de la orden con espera creciente; agotados, null', () => {
    const ahora = new Date('2026-10-27T15:00:00Z');
    expect(proximoReintento(1, ahora)?.toISOString()).toBe('2026-10-27T15:01:00.000Z');
    expect(proximoReintento(2, ahora)?.toISOString()).toBe('2026-10-27T15:05:00.000Z');
    expect(proximoReintento(7, ahora)).toBeNull();
  });
});
