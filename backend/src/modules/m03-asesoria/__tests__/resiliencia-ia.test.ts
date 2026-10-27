import { describe, expect, it, vi } from 'vitest';
import type { ResultadoIncidenteIa, TipoIncidenteIa } from '../dtos/incidentes.dto';
import { ErrorIa, cuotaAgotada, respuestaNoProcesable, tiempoAgotado } from '../gemini/gemini.errores';
import { LimitadorPorMinuto } from '../gemini/limitador-minuto';
import {
  ResilienciaIa,
  type AvisoServicioIa,
  type RegistroIncidentes,
} from '../gemini/resiliencia-ia';

const PARAMETROS = {
  tiempoEsperaMs: 8000,
  reintentos: 2,
  suspensionCuotaMinutos: 60,
  fallosConsecutivosAlerta: 3,
};

interface Anotado {
  tipo: TipoIncidenteIa;
  intentos: number;
  resultado: ResultadoIncidenteIa;
}

function montar(opciones: { ahora?: () => Date } = {}): {
  resiliencia: ResilienciaIa;
  anotados: Anotado[];
  alertas: number[];
} {
  const anotados: Anotado[] = [];
  const alertas: number[] = [];

  const incidentes: RegistroIncidentes = {
    registrar: async (i) => {
      anotados.push({ tipo: i.tipo, intentos: i.intentos, resultado: i.resultado });
    },
  };
  const aviso: AvisoServicioIa = {
    alertar: async (fallos) => {
      alertas.push(fallos);
    },
  };

  return {
    resiliencia: new ResilienciaIa(incidentes, aviso, opciones.ahora ?? (() => new Date())),
    anotados,
    alertas,
  };
}

describe('Degradación del servicio de IA (HU-ASE-06)', () => {
  describe('I1 — reintentos', () => {
    it('reintenta un tiempo agotado y deja constancia de que se recuperó', async () => {
      const { resiliencia, anotados } = montar();
      let intentos = 0;

      const resultado = await resiliencia.ejecutar('chat', PARAMETROS, async () => {
        intentos += 1;
        if (intentos === 1) throw tiempoAgotado();
        return 'respuesta';
      });

      expect(resultado).toBe('respuesta');
      expect(intentos).toBe(2);
      expect(anotados).toEqual([{ tipo: 'tiempo_agotado', intentos: 2, resultado: 'recuperado' }]);
    });

    it('NO reintenta una respuesta que no se puede procesar: daría lo mismo', async () => {
      const { resiliencia, anotados } = montar();
      let intentos = 0;

      await expect(
        resiliencia.ejecutar('chat', PARAMETROS, async () => {
          intentos += 1;
          throw respuestaNoProcesable('vino vacía');
        }),
      ).rejects.toBeInstanceOf(ErrorIa);

      expect(intentos).toBe(1);
      expect(anotados[0]).toMatchObject({ resultado: 'fallido', intentos: 1 });
    });

    it('agotados los intentos, se declara fallido', async () => {
      const { resiliencia, anotados } = montar();
      let intentos = 0;

      await expect(
        resiliencia.ejecutar('cuestionario', PARAMETROS, async () => {
          intentos += 1;
          throw tiempoAgotado();
        }),
      ).rejects.toMatchObject({ tipo: 'tiempo_agotado' });

      // 1 intento + 2 reintentos
      expect(intentos).toBe(3);
      expect(anotados).toEqual([{ tipo: 'tiempo_agotado', intentos: 3, resultado: 'fallido' }]);
    });
  });

  describe('I3 — cuota agotada', () => {
    it('suspende las llamadas y responde sin volver a llamar al proveedor', async () => {
      const instante = new Date('2026-10-27T10:00:00Z');
      const { resiliencia, anotados } = montar({ ahora: () => instante });
      let llamadas = 0;

      await expect(
        resiliencia.ejecutar('chat', PARAMETROS, async () => {
          llamadas += 1;
          throw cuotaAgotada();
        }),
      ).rejects.toMatchObject({ tipo: 'cuota_agotada' });

      expect(llamadas).toBe(1);
      expect(resiliencia.estaSuspendido()).toBe(true);

      // Mientras dure la suspensión no se llama a Gemini.
      await expect(
        resiliencia.ejecutar('chat', PARAMETROS, async () => {
          llamadas += 1;
          return 'no deberia';
        }),
      ).rejects.toMatchObject({ tipo: 'cuota_agotada' });

      expect(llamadas).toBe(1);
      expect(anotados.filter((a) => a.resultado === 'suspendido')).toHaveLength(2);
    });

    it('al pasar los minutos configurados se vuelve a intentar', async () => {
      let instante = new Date('2026-10-27T10:00:00Z');
      const { resiliencia } = montar({ ahora: () => instante });

      await expect(
        resiliencia.ejecutar('chat', PARAMETROS, async () => {
          throw cuotaAgotada();
        }),
      ).rejects.toThrow();

      instante = new Date('2026-10-27T11:01:00Z');
      expect(resiliencia.estaSuspendido()).toBe(false);

      await expect(resiliencia.ejecutar('chat', PARAMETROS, async () => 'listo')).resolves.toBe('listo');
    });
  });

  describe('I9 — alerta al administrador', () => {
    it('avisa UNA vez al llegar al umbral de fallos seguidos', async () => {
      const { resiliencia, alertas } = montar();

      for (let i = 0; i < 5; i += 1) {
        await expect(
          resiliencia.ejecutar('chat', { ...PARAMETROS, reintentos: 0 }, async () => {
            throw respuestaNoProcesable('x');
          }),
        ).rejects.toThrow();
      }

      // Umbral 3: avisa al tercero y no vuelve a avisar en la misma racha.
      expect(alertas).toEqual([3]);
      expect(resiliencia.estado().fallosConsecutivos).toBe(5);
      expect(resiliencia.estado().alertaActiva).toBe(true);
    });

    it('un éxito apaga la alerta y reinicia la cuenta', async () => {
      const { resiliencia, alertas } = montar();

      for (let i = 0; i < 3; i += 1) {
        await expect(
          resiliencia.ejecutar('chat', { ...PARAMETROS, reintentos: 0 }, async () => {
            throw respuestaNoProcesable('x');
          }),
        ).rejects.toThrow();
      }
      expect(resiliencia.estado().alertaActiva).toBe(true);

      await resiliencia.ejecutar('chat', PARAMETROS, async () => 'bien');

      expect(resiliencia.estado()).toMatchObject({ fallosConsecutivos: 0, alertaActiva: false });

      // La siguiente racha vuelve a avisar.
      for (let i = 0; i < 3; i += 1) {
        await expect(
          resiliencia.ejecutar('chat', { ...PARAMETROS, reintentos: 0 }, async () => {
            throw respuestaNoProcesable('x');
          }),
        ).rejects.toThrow();
      }
      expect(alertas).toEqual([3, 3]);
    });

    it('A4: si el aviso falla, la petición igual termina', async () => {
      const incidentes: RegistroIncidentes = { registrar: vi.fn() };
      const aviso: AvisoServicioIa = {
        alertar: async () => {
          throw new Error('correo caído');
        },
      };
      const resiliencia = new ResilienciaIa(incidentes, aviso);

      await expect(
        resiliencia.ejecutar('chat', { ...PARAMETROS, fallosConsecutivosAlerta: 1, reintentos: 0 }, async () => {
          throw respuestaNoProcesable('x');
        }),
      ).rejects.toMatchObject({ tipo: 'respuesta_no_procesable' });
    });
  });

  describe('I7 — qué se registra', () => {
    it('solo el tipo de fallo, los intentos y el resultado', async () => {
      const { resiliencia, anotados } = montar();

      await expect(
        resiliencia.ejecutar('chat', { ...PARAMETROS, reintentos: 0 }, async () => {
          throw tiempoAgotado();
        }),
      ).rejects.toThrow();

      // Ni el mensaje de la persona, ni la respuesta del modelo, ni la IP.
      expect(Object.keys(anotados[0] ?? {})).toEqual(['tipo', 'intentos', 'resultado']);
    });
  });
});

describe('H8 — tope de peticiones por minuto', () => {
  it('deja pasar hasta el máximo y rechaza el siguiente', () => {
    const instante = 0;
    const limitador = new LimitadorPorMinuto(3, () => instante);

    expect([1, 2, 3].map(() => limitador.permitir('origen'))).toEqual([true, true, true]);
    expect(limitador.permitir('origen')).toBe(false);
  });

  it('cada origen tiene su propio tope', () => {
    const instante = 0;
    const limitador = new LimitadorPorMinuto(1, () => instante);

    expect(limitador.permitir('uno')).toBe(true);
    expect(limitador.permitir('uno')).toBe(false);
    expect(limitador.permitir('otro')).toBe(true);
  });

  it('al pasar el minuto se olvida', () => {
    let instante = 0;
    const limitador = new LimitadorPorMinuto(1, () => instante);

    expect(limitador.permitir('origen')).toBe(true);
    expect(limitador.permitir('origen')).toBe(false);

    instante = 61_000;
    expect(limitador.permitir('origen')).toBe(true);
  });
});
