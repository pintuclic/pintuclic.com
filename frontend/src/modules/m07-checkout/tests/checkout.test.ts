import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { pagoFormSchema, reintentoFormSchema } from '../dtos/formularios.dto';
import { codigoDeError, mensajeDeError, pagoEnCursoDeError, revalidacionDeError } from '../services/checkout-api';
import { estadoDeUrl, pasoDe, sigueEnCurso, textoEnvio } from '../services/textos-checkout';

function errorApi(status: number, code: string, details: unknown): AxiosError {
  const response = {
    status,
    data: { success: false, error: { code, message: `Mensaje de ${code}`, details } },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError('fallo', 'ERR', undefined, undefined, response);
}

const base = {
  modoEntrega: 'recogida' as const,
  direccion: '',
  barrio: '',
  apartamentoCasa: '',
  nombreRecibe: '',
  telefonoRecibe: '',
  celularNequi: '3991111111',
  aceptaReglamento: true,
  aceptaDatos: true,
};

describe('M07 · formulario de pago', () => {
  it('R12, R13: celular de Nequi válido y las dos casillas de Wompi marcadas', () => {
    expect(pagoFormSchema.safeParse(base).success).toBe(true);
    expect(pagoFormSchema.safeParse({ ...base, celularNequi: '6011234567' }).success).toBe(false);
    const sinCasilla = pagoFormSchema.safeParse({ ...base, aceptaDatos: false });
    expect(sinCasilla.success).toBe(false);
    expect(sinCasilla.error?.issues[0]?.message).toContain('datos');
  });

  it('R14: a domicilio exige dirección, barrio, quién recibe y su teléfono; recoger no', () => {
    const r = pagoFormSchema.safeParse({ ...base, modoEntrega: 'domicilio' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(['barrio', 'direccion', 'nombreRecibe', 'telefonoRecibe']);
    expect(
      pagoFormSchema.safeParse({
        ...base,
        modoEntrega: 'domicilio',
        direccion: 'Calle 10 # 5-20',
        barrio: 'Centro',
        nombreRecibe: 'Ana Pérez',
        telefonoRecibe: '300 123 4567',
      }).success,
    ).toBe(true);
  });

  it('R4: el reintento pide celular y casillas', () => {
    expect(reintentoFormSchema.safeParse({ celularNequi: '3992222222', aceptaReglamento: true, aceptaDatos: true }).success).toBe(true);
    expect(reintentoFormSchema.safeParse({ celularNequi: '3992222222', aceptaReglamento: false, aceptaDatos: true }).success).toBe(false);
  });
});

describe('M07 · errores de la API', () => {
  it('lee el mensaje y el código del envelope', () => {
    const e = errorApi(503, 'PASARELA_NO_DISPONIBLE', null);
    expect(mensajeDeError(e, 'respaldo')).toBe('Mensaje de PASARELA_NO_DISPONIBLE');
    expect(codigoDeError(e)).toBe('PASARELA_NO_DISPONIBLE');
    expect(mensajeDeError(new Error('x'), 'respaldo')).toBe('respaldo');
  });

  it('R2 c: PAGO_EN_CURSO trae el código de la compra que sigue en Nequi', () => {
    expect(pagoEnCursoDeError(errorApi(409, 'PAGO_EN_CURSO', { codigo: 'SOL-2026-00004' }))).toBe('SOL-2026-00004');
    expect(pagoEnCursoDeError(errorApi(409, 'CARRITO_CAMBIO', null))).toBeNull();
  });

  it('R2 a: CARRITO_CAMBIO trae la revalidación; si viene mal formada se ignora', () => {
    const revalidacion = {
      carrito: { lineas: [], cantidadItems: 0, calculo: null, union: null },
      cambios: [{ tipo: 'total_cambio', totalAnterior: 1, totalNuevo: 2 }],
      puedeContinuar: false,
    };
    expect(revalidacionDeError(errorApi(409, 'CARRITO_CAMBIO', revalidacion))?.cambios).toHaveLength(1);
    expect(revalidacionDeError(errorApi(409, 'CARRITO_CAMBIO', { otra: 'cosa' }))).toBeNull();
  });
});

describe('M07 · textos', () => {
  it('la pantalla sigue preguntando mientras Nequi no responde o el pedido no existe', () => {
    expect(sigueEnCurso({ estado: 'en_pago', intentos: [{ numero: 1, estadoWompi: 'PENDING', celularEnmascarado: '', motivo: null, fecha: '' }] })).toBe(true);
    expect(sigueEnCurso({ estado: 'pagada', intentos: [] })).toBe(true);
    expect(sigueEnCurso({ estado: 'rechazada', intentos: [] })).toBe(false);
    expect(sigueEnCurso({ estado: 'completada', intentos: [] })).toBe(false);
  });

  it('pasos, filtro de la URL y envío gratis', () => {
    expect(pasoDe('en_pago')).toBe(1);
    expect(pasoDe('completada')).toBe(2);
    expect(estadoDeUrl('en_revision')).toBe('en_revision');
    expect(estadoDeUrl('inventado')).toBeNull();
    expect(textoEnvio(0, String)).toBe('Gratis');
    expect(textoEnvio(15000, String)).toBe('15000');
  });
});
