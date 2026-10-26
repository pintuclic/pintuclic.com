import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIMITE_SOLICITUDES_POR_VENTANA,
  VENTANA_LIMITE_MINUTOS,
  type ConfiguracionWhatsapp,
  type FranjaHorario,
  type SolicitudContacto,
  type TipoSolicitudContacto,
} from '../dtos/m15-atencion.dto';
import type {
  ConfiguracionAtencionRepositoryPort,
  ContactoRepositoryPort,
  FiltroSolicitudes,
  PaginaSolicitudes,
} from '../interfaces/atencion.interface';
import { ConfiguracionAtencionService } from '../services/configuracion.service';
import { ContactoService } from '../services/contacto.service';

const SEMANA: FranjaHorario[] = [
  { diaSemana: 'lunes', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'martes', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'miercoles', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'jueves', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'viernes', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'sabado', abierto: true, horaInicio: '08:00', horaFin: '13:00' },
  { diaSemana: 'domingo', abierto: false, horaInicio: null, horaFin: null },
];

// 2026-10-26 es lunes; Colombia es UTC-5.
const LUNES_10_00 = new Date('2026-10-26T15:00:00Z');
const LUNES_22_00 = new Date('2026-10-27T03:00:00Z');

class ContactoRepositorioFalso implements ContactoRepositoryPort {
  creadas: SolicitudContacto[] = [];
  /** Lo que devolverá `contarDesde`, para simular el límite sin insertar filas. */
  recientes = 0;
  ultimaVentana: Date | null = null;

  async crear(
    idUsuario: number,
    tipo: TipoSolicitudContacto,
    descripcion: string,
  ): Promise<SolicitudContacto> {
    const solicitud: SolicitudContacto = {
      idSolicitud: `00000000-0000-4000-8000-00000000000${this.creadas.length + 1}`,
      idUsuario,
      remitente: { nombre: 'Cliente Activo', correo: 'cliente@pintuclic.co', telefono: '3001234567' },
      tipo,
      descripcion,
      estado: 'en_revision',
      fechaCreacion: LUNES_10_00.toISOString(),
    };
    this.creadas.push(solicitud);
    return solicitud;
  }

  async listar(_filtro: FiltroSolicitudes): Promise<PaginaSolicitudes> {
    return { items: this.creadas, total: this.creadas.length };
  }

  async obtener(idSolicitud: string): Promise<SolicitudContacto | null> {
    return this.creadas.find((s) => s.idSolicitud === idSolicitud) ?? null;
  }

  async marcarAtendida(idSolicitud: string): Promise<SolicitudContacto> {
    const indice = this.creadas.findIndex((s) => s.idSolicitud === idSolicitud);
    const atendida: SolicitudContacto = { ...this.creadas[indice]!, estado: 'atendida' };
    this.creadas[indice] = atendida;
    return atendida;
  }

  async contarDesde(_idUsuario: number, desde: Date): Promise<number> {
    this.ultimaVentana = desde;
    return this.recientes;
  }
}

class ConfiguracionRepositorioFalso implements ConfiguracionAtencionRepositoryPort {
  constructor(
    public franjas: FranjaHorario[] = SEMANA,
    public whatsapp: ConfiguracionWhatsapp | null = {
      destino: 'https://whatsapp.com/channel/0029VbDzCHgGehEKg98m4J3X',
      mensajeBase: 'Hola, quiero información sobre sus productos.',
      fechaActualizacion: LUNES_10_00.toISOString(),
    },
  ) {}

  async obtenerHorario(): Promise<FranjaHorario[]> {
    return this.franjas;
  }

  async reemplazarHorario(franjas: FranjaHorario[]): Promise<FranjaHorario[]> {
    this.franjas = franjas;
    return franjas;
  }

  async obtenerWhatsapp(): Promise<ConfiguracionWhatsapp | null> {
    return this.whatsapp;
  }

  async guardarWhatsapp(destino: string, mensajeBase: string | null): Promise<ConfiguracionWhatsapp> {
    this.whatsapp = { destino, mensajeBase, fechaActualizacion: LUNES_10_00.toISOString() };
    return this.whatsapp;
  }
}

describe('ContactoService (HU-ATC-02)', () => {
  let repo: ContactoRepositorioFalso;
  let config: ConfiguracionRepositorioFalso;
  let servicio: ContactoService;

  beforeEach(() => {
    repo = new ContactoRepositorioFalso();
    config = new ConfiguracionRepositorioFalso();
    servicio = new ContactoService(repo, config);
  });

  it('guarda la solicitud con el usuario de la sesión, no con datos del cuerpo (R5)', async () => {
    const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Tengo una duda' }, LUNES_10_00);

    expect(solicitud.idUsuario).toBe(7);
    expect(solicitud.estado).toBe('en_revision');
  });

  it('una cotización remite al carrito y no crea ninguna cotización (R4, CA-ATC-02-03)', async () => {
    const confirmacion = await servicio.crear(
      7,
      { tipo: 'cotizacion', descripcion: 'Necesito pintura para una obra' },
      LUNES_10_00,
    );

    expect(confirmacion.remitirAlCarrito).toBe(true);
    expect(confirmacion.solicitud.tipo).toBe('cotizacion');
  });

  it('una consulta no remite al carrito', async () => {
    const confirmacion = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_10_00);

    expect(confirmacion.remitirAlCarrito).toBe(false);
  });

  describe('aviso de horario (R9, CA-ATC-04-03)', () => {
    it('dentro del horario no avisa nada', async () => {
      const confirmacion = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_10_00);

      expect(confirmacion.avisoHorario).toBeNull();
    });

    it('fuera del horario recibe la solicitud igual y avisa', async () => {
      const confirmacion = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_22_00);

      expect(repo.creadas).toHaveLength(1);
      expect(confirmacion.avisoHorario).toContain('fuera del horario');
    });
  });

  describe('contención de envíos automatizados (R6, RF-ATC-02-08)', () => {
    it('acepta hasta el límite de la ventana', async () => {
      repo.recientes = LIMITE_SOLICITUDES_POR_VENTANA - 1;

      await expect(
        servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_10_00),
      ).resolves.toBeDefined();
    });

    it('al alcanzar el límite responde 429 y no guarda', async () => {
      repo.recientes = LIMITE_SOLICITUDES_POR_VENTANA;

      await expect(
        servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_10_00),
      ).rejects.toMatchObject({ code: 'LIMITE_SOLICITUDES_EXCEDIDO', status: 429 });
      expect(repo.creadas).toEqual([]);
    });

    it('cuenta sobre la ventana configurada', async () => {
      await servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_10_00);

      const esperado = LUNES_10_00.getTime() - VENTANA_LIMITE_MINUTOS * 60_000;
      expect(repo.ultimaVentana?.getTime()).toBe(esperado);
    });
  });

  describe('marcar atendida', () => {
    it('cambia el estado', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'reclamo', descripcion: 'Llegó mal' }, LUNES_10_00);

      const atendida = await servicio.marcarAtendida(solicitud.idSolicitud);
      expect(atendida.estado).toBe('atendida');
    });

    it('repetirlo no falla ni cambia nada', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'reclamo', descripcion: 'Llegó mal' }, LUNES_10_00);
      await servicio.marcarAtendida(solicitud.idSolicitud);

      const otra = await servicio.marcarAtendida(solicitud.idSolicitud);
      expect(otra.estado).toBe('atendida');
    });

    it('una solicitud inexistente responde 404 opaco (R11)', async () => {
      await expect(servicio.marcarAtendida('00000000-0000-4000-8000-000000000404')).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });
  });
});

describe('ConfiguracionAtencionService (HU-ATC-03, HU-ATC-04)', () => {
  it('calcula abiertoAhora junto con las franjas', async () => {
    const servicio = new ConfiguracionAtencionService(new ConfiguracionRepositorioFalso());

    const dentro = await servicio.obtenerHorario(LUNES_10_00);
    const fuera = await servicio.obtenerHorario(LUNES_22_00);

    expect(dentro.abiertoAhora).toBe(true);
    expect(fuera.abiertoAhora).toBe(false);
    expect(dentro.franjas).toHaveLength(7);
  });

  it('marca destinoEsUrl cuando el destino es el canal de difusión (R7)', async () => {
    const servicio = new ConfiguracionAtencionService(new ConfiguracionRepositorioFalso());

    const canal = await servicio.obtenerCanalPublico();

    expect(canal.destinoEsUrl).toBe(true);
    expect(canal.destino).toMatch(/^https:\/\/whatsapp\.com\/channel\//);
  });

  it('marca destinoEsUrl en false cuando el destino es un número de WhatsApp Business (R7)', async () => {
    const repo = new ConfiguracionRepositorioFalso(SEMANA, {
      destino: '+573001234567',
      mensajeBase: 'Hola',
      fechaActualizacion: LUNES_10_00.toISOString(),
    });
    const servicio = new ConfiguracionAtencionService(repo);

    const canal = await servicio.obtenerCanalPublico();

    expect(canal.destinoEsUrl).toBe(false);
  });

  it('sin canal configurado responde 404 opaco en vez de un destino vacío', async () => {
    const servicio = new ConfiguracionAtencionService(new ConfiguracionRepositorioFalso(SEMANA, null));

    await expect(servicio.obtenerCanalPublico()).rejects.toMatchObject({
      code: 'RECURSO_NO_DISPONIBLE',
      status: 404,
    });
  });
});
