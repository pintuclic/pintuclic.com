import type { FranjaHorario } from '../interfaces/atencion.interface';

const ABREVIATURA: Record<FranjaHorario['diaSemana'], string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

const ORDEN: ReadonlyArray<FranjaHorario['diaSemana']> = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

/** «08:00» → «8:00 a. m.», «18:30» → «6:30 p. m.» (el horario se guarda en 24 h, `HH:mm`). */
export function horaLegible(hhmm: string): string {
  const [hh, mm] = hhmm.split(':');
  const hora = Number(hh);
  if (!Number.isInteger(hora) || mm === undefined) return hhmm;
  const sufijo = hora >= 12 ? 'p. m.' : 'a. m.';
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${hora12}:${mm} ${sufijo}`;
}

function nombreDeGrupo(dias: ReadonlyArray<FranjaHorario['diaSemana']>): string {
  const primero = dias[0];
  const ultimo = dias[dias.length - 1];
  if (primero === undefined || ultimo === undefined) return '';
  if (dias.length === 1) return ABREVIATURA[primero];
  return dias.length === 2 ? `${ABREVIATURA[primero]} y ${ABREVIATURA[ultimo]}` : `${ABREVIATURA[primero]} a ${ABREVIATURA[ultimo]}`;
}

/**
 * El horario de atención en una línea corta, para la barra superior: los días seguidos con la misma franja van juntos
 * («Lun a Vie 8:00 a. m. – 6:00 p. m. · Sáb 9:00 a. m. – 1:00 p. m.»). Los días cerrados no aparecen; sin ninguno abierto
 * devuelve `null`.
 */
export function resumenHorario(franjas: ReadonlyArray<FranjaHorario>): string | null {
  const grupos: { dias: FranjaHorario['diaSemana'][]; inicio: string; fin: string }[] = [];
  for (const dia of ORDEN) {
    const f = franjas.find((x) => x.diaSemana === dia);
    if (f === undefined || !f.abierto || f.horaInicio === null || f.horaFin === null) continue;
    const ultimo = grupos[grupos.length - 1];
    const esSeguido = ultimo !== undefined && ORDEN.indexOf(ultimo.dias[ultimo.dias.length - 1] ?? dia) === ORDEN.indexOf(dia) - 1;
    if (ultimo !== undefined && esSeguido && ultimo.inicio === f.horaInicio && ultimo.fin === f.horaFin) ultimo.dias.push(dia);
    else grupos.push({ dias: [dia], inicio: f.horaInicio, fin: f.horaFin });
  }
  if (grupos.length === 0) return null;
  return grupos.map((g) => `${nombreDeGrupo(g.dias)} ${horaLegible(g.inicio)} – ${horaLegible(g.fin)}`).join(' · ');
}
