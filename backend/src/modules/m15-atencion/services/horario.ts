import type { DiaSemana, FranjaHorario } from '../dtos/m15-atencion.dto';

/**
 * Cálculo del horario de atención humana (HU-ATC-04). Puro y sin dependencias:
 * recibe las franjas y el instante, de modo que se puede probar sin reloj real
 * ni base de datos.
 *
 * La hora se resuelve siempre en `America/Bogota` y NO en la zona del servidor:
 * en producción el backend corre en un contenedor en UTC, y comparar contra esa
 * hora dejaría el negocio abierto o cerrado cinco horas antes de la cuenta.
 */

const ZONA_COLOMBIA = 'America/Bogota';

const DIA_POR_NOMBRE_EN: Readonly<Record<string, DiaSemana>> = {
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
  Sunday: 'domingo',
};

const formateador = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_COLOMBIA,
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface MomentoLocal {
  dia: DiaSemana;
  /** `HH:mm` en 24h. */
  hora: string;
}

/** Día de la semana y hora local de Colombia para un instante dado. */
export function momentoEnColombia(ahora: Date): MomentoLocal {
  const partes = formateador.formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  const dia = DIA_POR_NOMBRE_EN[valor('weekday')];
  if (dia === undefined) {
    throw new Error(`No se pudo resolver el día de la semana para ${ahora.toISOString()}`);
  }

  return { dia, hora: `${valor('hour')}:${valor('minute')}` };
}

/**
 * Si hay atención humana en este instante. Un día con `abierto = false` está
 * cerrado toda la jornada (R10) y la franja se compara con el borde incluido al
 * abrir y excluido al cerrar: a las 18:00 de un horario 08:00-18:00 ya cerró.
 */
export function estaAbierto(franjas: readonly FranjaHorario[], ahora: Date): boolean {
  const { dia, hora } = momentoEnColombia(ahora);
  const franja = franjas.find((candidata) => candidata.diaSemana === dia);

  if (franja === undefined || !franja.abierto) {
    return false;
  }
  if (franja.horaInicio === null || franja.horaFin === null) {
    return false;
  }

  // Las horas son "HH:mm" de ancho fijo: comparar como texto equivale a comparar el reloj.
  return hora >= franja.horaInicio && hora < franja.horaFin;
}
