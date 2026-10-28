import { describe, expect, it } from 'vitest';
import type { FranjaHorario } from '@/modules/m15-atencion/interfaces/atencion.interface';
import { horaLegible, resumenHorario } from '@/modules/m15-atencion/services/resumen-horario';
import { itemsBarraSuperior } from '../_data/barra-superior';

const franja = (diaSemana: FranjaHorario['diaSemana'], inicio: string | null, fin: string | null): FranjaHorario => ({
  diaSemana,
  abierto: inicio !== null,
  horaInicio: inicio,
  horaFin: fin,
});

const SEMANA: FranjaHorario[] = [
  franja('lunes', '08:00', '18:00'),
  franja('martes', '08:00', '18:00'),
  franja('miercoles', '08:00', '18:00'),
  franja('jueves', '08:00', '18:00'),
  franja('viernes', '08:00', '18:00'),
  franja('sabado', '09:00', '13:00'),
  franja('domingo', null, null),
];

describe('resumen del horario de atención', () => {
  it('pasa la hora de 24 h a 12 h', () => {
    expect(horaLegible('08:00')).toBe('8:00 a. m.');
    expect(horaLegible('12:30')).toBe('12:30 p. m.');
    expect(horaLegible('00:15')).toBe('12:15 a. m.');
    expect(horaLegible('18:00')).toBe('6:00 p. m.');
  });

  it('junta los días seguidos con la misma franja y omite los cerrados', () => {
    expect(resumenHorario(SEMANA)).toBe('Lun a Vie 8:00 a. m. – 6:00 p. m. · Sáb 9:00 a. m. – 1:00 p. m.');
  });

  it('con todos los días cerrados no hay resumen', () => {
    expect(resumenHorario(SEMANA.map((f) => franja(f.diaSemana, null, null)))).toBeNull();
  });

  it('un día con otra franja en medio parte el grupo', () => {
    const f = [franja('lunes', '08:00', '18:00'), franja('martes', '10:00', '14:00'), franja('miercoles', '08:00', '18:00')];
    expect(resumenHorario(f)).toBe('Lun 8:00 a. m. – 6:00 p. m. · Mar 10:00 a. m. – 2:00 p. m. · Mié 8:00 a. m. – 6:00 p. m.');
  });
});

describe('barra superior con datos reales', () => {
  it('sin datos solo deja los enlaces a envíos y ayuda: nada inventado', () => {
    const items = itemsBarraSuperior({ contacto: null, horario: null, canal: null });
    expect(items.map((i) => i.icon)).toEqual(['envio', 'ayuda']);
  });

  it('con datos muestra horario, teléfono, WhatsApp y correo, en ese orden, antes de los fijos', () => {
    const items = itemsBarraSuperior({
      contacto: { direccion: null, telefono: '+57 322 123 4567', correo: 'hola@pintuclic.com', facebook: null, instagram: null, youtube: null, tiktok: null },
      horario: { franjas: SEMANA, abiertoAhora: true },
      canal: { destino: '573221234567', mensajeBase: null, destinoEsUrl: false },
    });
    expect(items.map((i) => i.icon)).toEqual(['horario', 'telefono', 'whatsapp', 'correo', 'envio', 'ayuda']);
    expect(items[0]?.label).toContain('Abierto ahora');
    expect(items[1]).toMatchObject({ label: '+57 322 123 4567', href: 'tel:+573221234567' });
    expect(items[2]?.href).toBe('https://wa.me/573221234567');
    expect(items[3]?.href).toBe('mailto:hola@pintuclic.com');
  });

  it('fuera del horario no dice «Abierto ahora»', () => {
    const items = itemsBarraSuperior({ contacto: null, horario: { franjas: SEMANA, abiertoAhora: false }, canal: null });
    expect(items[0]?.label).not.toContain('Abierto ahora');
  });
});
