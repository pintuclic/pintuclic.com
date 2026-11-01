import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { pagoFormSchema, reintentoFormSchema } from '../dtos/formularios.dto';
import { codigoDeError, mensajeDeError, pagoEnCursoDeError, revalidacionDeError } from '../services/checkout-api';
import {
  compraDirectaDeUrl,
  diaDeUrl,
  estadoDeUrl,
  hoyColombia,
  idDeUrl,
  mesCompleto,
  mesDe,
  pasoDe,
  periodoDeUrl,
  periodoRapidoDe,
  rangoDePeriodo,
  sigueEnCurso,
  textoEnvio,
  textoPeriodo,
  ultimosMeses,
} from '../services/textos-checkout';

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
        telefonoRecibe: '3001234567',
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

describe('M07 · compra directa desde la ficha (R17)', () => {
  it('lee la presentación, el color y la cantidad de la dirección', () => {
    expect(compraDirectaDeUrl(new URLSearchParams('idVariante=9&cantidad=3'))).toEqual({ idVariante: 9, idColor: null, cantidad: 3 });
    expect(compraDirectaDeUrl(new URLSearchParams('idVariante=4&idColor=12'))).toEqual({ idVariante: 4, idColor: 12, cantidad: 1 });
    expect(compraDirectaDeUrl(new URLSearchParams('idVariante=4&cantidad=99999'))?.cantidad).toBe(9_999);
    expect(compraDirectaDeUrl(new URLSearchParams('cupon=PINTA10'))).toBeNull();
    expect(compraDirectaDeUrl(new URLSearchParams('idVariante=abc'))).toBeNull();
  });
});

describe('M07 · periodo del panel de pagos (R18)', () => {
  it('hoy se cuenta en Colombia aunque en UTC ya sea el día siguiente', () => {
    expect(hoyColombia(new Date('2026-10-29T02:10:00Z'))).toBe('2026-10-28');
    expect(hoyColombia(new Date('2026-10-29T05:00:00Z'))).toBe('2026-10-29');
  });

  it('traduce los botones rápidos a desde y hasta', () => {
    const hoy = '2026-03-02';
    expect(rangoDePeriodo('hoy', hoy)).toEqual({ desde: '2026-03-02', hasta: '2026-03-02' });
    expect(rangoDePeriodo('ayer', hoy)).toEqual({ desde: '2026-03-01', hasta: '2026-03-01' });
    expect(rangoDePeriodo('ultimos7', hoy)).toEqual({ desde: '2026-02-24', hasta: '2026-03-02' });
    expect(rangoDePeriodo('esteMes', hoy)).toEqual({ desde: '2026-03-01', hasta: '2026-03-02' });
    expect(rangoDePeriodo('mesAnterior', hoy)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoDePeriodo('mesAnterior', '2026-01-15')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
  });

  it('un mes completo respeta los bisiestos y se reconoce de vuelta', () => {
    expect(mesCompleto('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
    expect(mesDe({ desde: '2026-10-01', hasta: '2026-10-31' })).toBe('2026-10');
    expect(mesDe({ desde: '2026-10-01', hasta: '2026-10-30' })).toBeNull();
    expect(periodoRapidoDe({ desde: '2026-10-28', hasta: '2026-10-28' }, '2026-10-28')).toBe('hoy');
    expect(periodoRapidoDe({ desde: '2026-10-01', hasta: '2026-10-15' }, '2026-10-28')).toBeNull();
  });

  it('lee de la URL solo fechas reales y descarta un final anterior al inicio', () => {
    expect(diaDeUrl('2026-02-30')).toBeNull();
    expect(diaDeUrl('28/10/2026')).toBeNull();
    expect(periodoDeUrl(new URLSearchParams('desde=2026-10-10&hasta=2026-10-01'))).toEqual({ desde: '2026-10-10', hasta: null });
    expect(periodoDeUrl(new URLSearchParams(''))).toEqual({ desde: null, hasta: null });
    expect(idDeUrl('7')).toBe(7);
    expect(idDeUrl('-1')).toBeNull();
    expect(idDeUrl(null)).toBeNull();
  });

  it('la lista de meses va del actual hacia atrás, cruzando el año', () => {
    const meses = ultimosMeses('2026-02-10', 3);
    expect(meses.map((m) => m.value)).toEqual(['2026-02', '2026-01', '2025-12']);
    expect(meses[0]?.label).toMatch(/febrero/i);
    expect(ultimosMeses('2026-10-31')).toHaveLength(24);
  });

  it('describe el periodo en palabras', () => {
    expect(textoPeriodo({ desde: null, hasta: null })).toBe('Todas las fechas');
    expect(textoPeriodo({ desde: '2026-10-28', hasta: '2026-10-28' })).toMatch(/28/);
    expect(textoPeriodo({ desde: '2026-10-01', hasta: null })).toMatch(/^Desde /);
    expect(textoPeriodo({ desde: '2026-10-01', hasta: '2026-10-31' })).toContain('–');
  });
});
