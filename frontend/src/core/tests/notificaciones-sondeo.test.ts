import { describe, expect, it } from 'vitest';
import { INTERVALO_CONSULTA_MAXIMO_SEGUNDOS, INTERVALO_CONSULTA_SEGUNDOS } from '../notificaciones/fp02-notificaciones.dto';
import {
  CLAVE_TURNO,
  esperaConDesfase,
  horaRelativa,
  intervaloSiguiente,
  seccionDeRuta,
  textoContador,
  tomarTurno,
} from '../notificaciones/sondeo';

describe('FP-02 · intervalo del sondeo (R13e)', () => {
  it('si algo cambió vuelve al intervalo base', () => {
    expect(intervaloSiguiente(120, true)).toBe(INTERVALO_CONSULTA_SEGUNDOS);
  });
  it('si no cambió crece 1,5 veces y topa en el máximo', () => {
    expect(intervaloSiguiente(30, false)).toBe(45);
    expect(intervaloSiguiente(45, false)).toBe(68);
    expect(intervaloSiguiente(100, false)).toBe(INTERVALO_CONSULTA_MAXIMO_SEGUNDOS);
    expect(intervaloSiguiente(INTERVALO_CONSULTA_MAXIMO_SEGUNDOS, false)).toBe(INTERVALO_CONSULTA_MAXIMO_SEGUNDOS);
  });
  it('el desfase queda entre -10 % y +10 %', () => {
    expect(esperaConDesfase(30, 0)).toBe(27_000);
    expect(esperaConDesfase(30, 0.5)).toBe(30_000);
    expect(esperaConDesfase(30, 1)).toBe(33_000);
    expect(esperaConDesfase(30, 7)).toBe(33_000);
  });
});

function almacenFalso(): Pick<Storage, 'getItem' | 'setItem'> & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => void datos.set(k, v) };
}

describe('FP-02 · un solo sondeo por navegador (R13e)', () => {
  it('quien llega primero toma el turno; otra pestaña espera mientras esté vigente', () => {
    const a = almacenFalso();
    expect(tomarTurno(a, 'pestana-1', 1_000, 40_000)).toBe(true);
    expect(tomarTurno(a, 'pestana-2', 2_000, 40_000)).toBe(false);
  });
  it('quien tiene el turno lo renueva', () => {
    const a = almacenFalso();
    tomarTurno(a, 'pestana-1', 1_000, 40_000);
    expect(tomarTurno(a, 'pestana-1', 30_000, 40_000)).toBe(true);
    expect(tomarTurno(a, 'pestana-2', 60_000, 40_000)).toBe(false);
  });
  it('vencido el turno (pestaña cerrada u oculta) otra lo toma', () => {
    const a = almacenFalso();
    tomarTurno(a, 'pestana-1', 1_000, 40_000);
    expect(tomarTurno(a, 'pestana-2', 41_001, 40_000)).toBe(true);
  });
  it('un valor corrupto no bloquea a nadie', () => {
    const a = almacenFalso();
    a.datos.set(CLAVE_TURNO, '{no es json');
    expect(tomarTurno(a, 'pestana-1', 1_000, 40_000)).toBe(true);
  });
  it('si el almacenamiento lanza, se consulta igual', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(tomarTurno(roto, 'pestana-1', 1_000, 40_000)).toBe(true);
  });
});

describe('FP-02 · de la dirección a la sección del menú', () => {
  it.each([
    ['/admin/pedidos', 'pedidos'],
    ['/admin/pedidos/PC-123', 'pedidos'],
    ['/admin/pedidosx', null],
    ['/admin/cotizaciones', 'cotizaciones'],
    ['/admin/atencion', 'atencion'],
    ['/perfil/pedidos/PC-1', 'mis_pedidos'],
    ['/perfil/cotizaciones', 'mis_cotizaciones'],
    ['/perfil', 'cuenta'],
    ['/perfil/direcciones', null],
    ['/admin', null],
    ['/', null],
  ])('%s → %s', (ruta, esperada) => {
    expect(seccionDeRuta(ruta)).toBe(esperada);
  });
  it('sin dirección no hay sección', () => {
    expect(seccionDeRuta(null)).toBeNull();
  });
});

describe('FP-02 · textos', () => {
  it('el contador topa en 99+', () => {
    expect([textoContador(0), textoContador(15), textoContador(99), textoContador(100)]).toEqual(['0', '15', '99', '99+']);
  });
  it('hora relativa', () => {
    const ahora = new Date('2026-11-03T12:00:00.000Z');
    const antes = (ms: number) => new Date(ahora.getTime() - ms).toISOString();
    expect(horaRelativa(antes(10_000), ahora)).toBe('ahora');
    expect(horaRelativa(antes(5 * 60_000), ahora)).toBe('hace 5 min');
    expect(horaRelativa(antes(3 * 3_600_000), ahora)).toBe('hace 3 h');
    expect(horaRelativa(antes(30 * 3_600_000), ahora)).toBe('ayer');
    expect(horaRelativa(antes(4 * 86_400_000), ahora)).toBe('hace 4 días');
  });
});
