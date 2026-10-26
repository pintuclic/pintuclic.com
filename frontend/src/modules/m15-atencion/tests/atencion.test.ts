import { describe, expect, it } from 'vitest';
import {
  ESTADOS_SOLICITUD,
  calificacionSolicitudSchema,
  canalFormSchema,
  contactoFormSchema,
  horarioFormSchema,
  mensajeSolicitudFormSchema,
} from '../dtos/m15-atencion.dto';
import type { CanalWhatsappPublico } from '../interfaces/atencion.interface';
import { enlaceDelCanal } from '../services/enlace-canal';

const CANAL: CanalWhatsappPublico = {
  destino: 'https://whatsapp.com/channel/0029VbDzCHgGehEKg98m4J3X',
  mensajeBase: 'Hola, quiero información sobre sus productos.',
  destinoEsUrl: true,
};

const NUMERO: CanalWhatsappPublico = {
  destino: '+57 300 123 4567',
  mensajeBase: 'Hola, quiero información.',
  destinoEsUrl: false,
};

describe('enlaceDelCanal — destino del botón de WhatsApp (HU-ATC-03, R7)', () => {
  it('con un canal de difusión abre la URL tal cual, sin anexar texto', () => {
    expect(enlaceDelCanal(CANAL, 'Me interesa Viniltex.')).toBe(CANAL.destino);
  });

  it('con un número arma el enlace wa.me solo con dígitos', () => {
    const enlace = enlaceDelCanal({ ...NUMERO, mensajeBase: null });

    expect(enlace).toBe('https://wa.me/573001234567');
  });

  it('con un número incluye el mensaje base y la referencia del producto (RF-ATC-03-03)', () => {
    const enlace = enlaceDelCanal(NUMERO, 'Me interesa Viniltex (1 galón).');

    expect(enlace).toContain('https://wa.me/573001234567?text=');
    const texto = decodeURIComponent(enlace.split('?text=')[1] ?? '');
    expect(texto).toBe('Hola, quiero información. Me interesa Viniltex (1 galón).');
  });

  it('sin referencia envía solo el mensaje base', () => {
    const texto = decodeURIComponent(enlaceDelCanal(NUMERO).split('?text=')[1] ?? '');

    expect(texto).toBe('Hola, quiero información.');
  });

  it('no devuelve una URL cruda si el esquema no es HTTP/HTTPS pese a destinoEsUrl=true', () => {
    const inseguro: CanalWhatsappPublico = {
      destino: 'javascript:alert(1)',
      mensajeBase: null,
      destinoEsUrl: true,
    };
    expect(enlaceDelCanal(inseguro)).toBe('https://wa.me/1');
  });

  it('ignora una referencia vacía o en blanco', () => {
    expect(enlaceDelCanal({ ...NUMERO, mensajeBase: null }, '   ')).toBe('https://wa.me/573001234567');
  });
});

describe('contactoFormSchema (HU-ATC-02)', () => {
  it('acepta una solicitud completa', () => {
    const resultado = contactoFormSchema.safeParse({
      tipo: 'cotizacion',
      descripcion: 'Necesito pintura para una obra completa.',
    });

    expect(resultado.success).toBe(true);
  });

  it('exige el tipo de solicitud con un mensaje que dice qué falta (CA-ATC-02-02)', () => {
    const resultado = contactoFormSchema.safeParse({ descripcion: 'Una duda cualquiera' });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toMatch(/consulta|cotización|reclamo/i);
  });

  it('rechaza un tipo que no existe', () => {
    const resultado = contactoFormSchema.safeParse({ tipo: 'devolucion', descripcion: 'Hola' });

    expect(resultado.success).toBe(false);
  });

  it('rechaza una descripción demasiado corta', () => {
    const resultado = contactoFormSchema.safeParse({ tipo: 'consulta', descripcion: 'ab' });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain('5 caracteres');
  });
});

describe('mensajeSolicitudFormSchema y calificacionSolicitudSchema (HU-ATC-05, HU-ATC-06)', () => {
  it('expone los tres estados de solicitud del contrato (en_revision, atendida, rechazada)', () => {
    expect(ESTADOS_SOLICITUD.map((e) => e.valor)).toEqual([
      'en_revision',
      'atendida',
      'rechazada',
    ]);
  });

  it('acepta un mensaje válido y recorta espacios', () => {
    const resultado = mensajeSolicitudFormSchema.safeParse({
      contenido: '  Hola, adjunto el detalle de los galones requeridos.  ',
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.contenido).toBe(
        'Hola, adjunto el detalle de los galones requeridos.',
      );
    }
  });

  it('rechaza un mensaje vacío o en blanco con mensaje específico', () => {
    const resultado = mensajeSolicitudFormSchema.safeParse({ contenido: '   ' });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain('Escribe un mensaje');
  });

  it('acepta calificaciones enteras de 1 a 5 estrellas y rechaza valores fuera de rango', () => {
    expect(calificacionSolicitudSchema.safeParse({ calificacion: 1 }).success).toBe(true);
    expect(calificacionSolicitudSchema.safeParse({ calificacion: 5 }).success).toBe(true);
    expect(calificacionSolicitudSchema.safeParse({ calificacion: 0 }).success).toBe(false);
    expect(calificacionSolicitudSchema.safeParse({ calificacion: 6 }).success).toBe(false);
    expect(calificacionSolicitudSchema.safeParse({ calificacion: 3.5 }).success).toBe(false);
  });
});

describe('horarioFormSchema (HU-ATC-04)', () => {
  const franja = (
    diaSemana: 'lunes' | 'domingo',
    abierto: boolean,
    horaInicio = '',
    horaFin = '',
  ) => ({ diaSemana, abierto, horaInicio, horaFin });

  const semana = (primera: ReturnType<typeof franja>) => ({
    franjas: [
      primera,
      franja('domingo', false),
      franja('domingo', false),
      franja('domingo', false),
      franja('domingo', false),
      franja('domingo', false),
      franja('domingo', false),
    ],
  });

  it('acepta un día abierto con franja coherente', () => {
    expect(horarioFormSchema.safeParse(semana(franja('lunes', true, '08:00', '18:00'))).success).toBe(
      true,
    );
  });

  it('un día cerrado no exige horas', () => {
    expect(horarioFormSchema.safeParse(semana(franja('domingo', false))).success).toBe(true);
  });

  it('rechaza una hora de cierre anterior a la de apertura', () => {
    const resultado = horarioFormSchema.safeParse(semana(franja('lunes', true, '18:00', '08:00')));

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain('posterior');
  });

  it('rechaza una hora fuera del reloj de 24 horas', () => {
    expect(horarioFormSchema.safeParse(semana(franja('lunes', true, '25:00', '26:00'))).success).toBe(
      false,
    );
  });

  it('exige los 7 días', () => {
    const resultado = horarioFormSchema.safeParse({
      franjas: [franja('lunes', true, '08:00', '18:00')],
    });

    expect(resultado.success).toBe(false);
  });
});

describe('canalFormSchema (HU-ATC-03)', () => {
  it('acepta el enlace de un canal', () => {
    expect(canalFormSchema.safeParse({ destino: CANAL.destino }).success).toBe(true);
  });

  it('acepta un número de WhatsApp', () => {
    expect(canalFormSchema.safeParse({ destino: '3001234567' }).success).toBe(true);
  });

  it('exige un destino', () => {
    const resultado = canalFormSchema.safeParse({ destino: '' });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toMatch(/enlace|número/i);
  });
});