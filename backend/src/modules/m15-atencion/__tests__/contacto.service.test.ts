import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIMITE_SOLICITUDES_POR_VENTANA,
  VENTANA_LIMITE_MINUTOS,
  type CalificacionAtencion,
  type ConfiguracionWhatsapp,
  type EstadoSolicitudContacto,
  type FranjaHorario,
  type MensajeSolicitudContacto,
  type RolAutorMensaje,
  type SolicitudContacto,
  type SolicitudContactoDetalle,
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
  mensajesPorSolicitud = new Map<string, MensajeSolicitudContacto[]>();
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
      calificacion: null,
      fechaCalificacion: null,
      totalMensajes: 0,
      fechaCreacion: LUNES_10_00.toISOString(),
    };
    this.creadas.push(solicitud);
    this.mensajesPorSolicitud.set(solicitud.idSolicitud, []);
    return solicitud;
  }

  async listar(filtro: FiltroSolicitudes): Promise<PaginaSolicitudes> {
    const filtradas = this.creadas.filter((s) => {
      if (filtro.idUsuario !== undefined && s.idUsuario !== filtro.idUsuario) return false;
      if (filtro.tipo !== undefined && s.tipo !== filtro.tipo) return false;
      if (filtro.estado !== undefined && s.estado !== filtro.estado) return false;
      return true;
    });
    return { items: filtradas, total: filtradas.length };
  }

  async obtener(idSolicitud: string): Promise<SolicitudContacto | null> {
    return this.creadas.find((s) => s.idSolicitud === idSolicitud) ?? null;
  }

  async obtenerDetalle(idSolicitud: string): Promise<SolicitudContactoDetalle | null> {
    const solicitud = await this.obtener(idSolicitud);
    if (solicitud === null) return null;
    const mensajes = this.mensajesPorSolicitud.get(idSolicitud) ?? [];
    return {
      ...solicitud,
      totalMensajes: mensajes.length,
      mensajes,
    };
  }

  async agregarMensaje(
    idSolicitud: string,
    idAutor: number,
    rolAutor: RolAutorMensaje,
    contenido: string,
  ): Promise<MensajeSolicitudContacto> {
    const existentes = this.mensajesPorSolicitud.get(idSolicitud) ?? [];
    const mensaje: MensajeSolicitudContacto = {
      idMensaje: `10000000-0000-4000-8000-00000000000${existentes.length + 1}`,
      idSolicitud,
      idAutor,
      rolAutor,
      nombreAutor: rolAutor === 'equipo' ? 'Asesor Pintu Clic' : 'Cliente Activo',
      contenido,
      fechaCreacion: LUNES_10_00.toISOString(),
    };
    existentes.push(mensaje);
    this.mensajesPorSolicitud.set(idSolicitud, existentes);

    const indice = this.creadas.findIndex((s) => s.idSolicitud === idSolicitud);
    if (indice >= 0) {
      this.creadas[indice] = { ...this.creadas[indice]!, totalMensajes: existentes.length };
    }
    return mensaje;
  }

  async cambiarEstado(
    idSolicitud: string,
    estado: EstadoSolicitudContacto,
  ): Promise<SolicitudContacto> {
    const indice = this.creadas.findIndex((s) => s.idSolicitud === idSolicitud);
    const actualizada: SolicitudContacto = { ...this.creadas[indice]!, estado };
    this.creadas[indice] = actualizada;
    return actualizada;
  }

  async calificar(
    idSolicitud: string,
    calificacion: CalificacionAtencion,
    fechaCalificacion: Date,
  ): Promise<SolicitudContacto> {
    const indice = this.creadas.findIndex((s) => s.idSolicitud === idSolicitud);
    const actualizada: SolicitudContacto = {
      ...this.creadas[indice]!,
      calificacion,
      fechaCalificacion: fechaCalificacion.toISOString(),
    };
    this.creadas[indice] = actualizada;
    return actualizada;
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

describe('ContactoService (HU-ATC-02, R12, R13)', () => {
  let repo: ContactoRepositorioFalso;
  let config: ConfiguracionRepositorioFalso;
  let servicio: ContactoService;

  beforeEach(() => {
    repo = new ContactoRepositorioFalso();
    config = new ConfiguracionRepositorioFalso();
    servicio = new ContactoService(repo, config);
  });

  it('guarda la solicitud con el usuario de la sesión en estado en_revision (R5, R12)', async () => {
    const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Tengo una duda' }, LUNES_10_00);

    expect(solicitud.idUsuario).toBe(7);
    expect(solicitud.estado).toBe('en_revision');
    expect(solicitud.calificacion).toBeNull();
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

      expect(confirmacion.solicitud.idSolicitud).toBeDefined();
      expect(confirmacion.avisoHorario).toMatch(/fuera del horario/i);
    });
  });

  describe('límite anti-automatización (R6, RF-ATC-02-08)', () => {
    it('permite hasta el límite dentro de la ventana y rechaza la siguiente con 429', async () => {
      repo.recientes = LIMITE_SOLICITUDES_POR_VENTANA;

      await expect(
        servicio.crear(7, { tipo: 'reclamo', descripcion: 'Vino abollado el cuñete' }, LUNES_10_00),
      ).rejects.toMatchObject({
        code: 'LIMITE_SOLICITUDES_EXCEDIDO',
        status: 429,
      });

      const esperado = new Date(LUNES_10_00.getTime() - VENTANA_LIMITE_MINUTOS * 60_000);
      expect(repo.ultimaVentana?.toISOString()).toBe(esperado.toISOString());
    });
  });

  describe('hilo de conversación ping-pong, estados y bloqueo (R11, R12)', () => {
    it('permite enviar varios mensajes consecutivos tanto al cliente como al equipo mientras está en_revision', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Consulta inicial' }, LUNES_10_00);

      await servicio.agregarMensajeCliente(7, solicitud.idSolicitud, { contenido: 'Primer mensaje adicional del cliente' });
      await servicio.agregarMensajeCliente(7, solicitud.idSolicitud, { contenido: 'Segundo mensaje seguido del cliente' });
      await servicio.agregarMensajeEquipo(1, solicitud.idSolicitud, { contenido: 'Primera respuesta del asesor' });
      await servicio.agregarMensajeEquipo(1, solicitud.idSolicitud, { contenido: 'Segunda aclaración seguida del asesor' });

      const detalle = await servicio.obtenerDetalleDeUsuario(7, solicitud.idSolicitud);
      expect(detalle.mensajes).toHaveLength(4);
      expect(detalle.mensajes.map((m) => m.rolAutor)).toEqual(['cliente', 'cliente', 'equipo', 'equipo']);
    });

    it('bloquea nuevos mensajes del cliente cuando la solicitud pasa a atendida o rechazada (409 SOLICITUD_CERRADA)', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Consulta fuera de tema' }, LUNES_10_00);

      await servicio.cambiarEstado(solicitud.idSolicitud, { estado: 'rechazada' });

      await expect(
        servicio.agregarMensajeCliente(7, solicitud.idSolicitud, { contenido: 'Intento seguir escribiendo' }),
      ).rejects.toMatchObject({
        code: 'SOLICITUD_CERRADA',
        status: 409,
      });

      await servicio.cambiarEstado(solicitud.idSolicitud, { estado: 'atendida' });

      await expect(
        servicio.agregarMensajeCliente(7, solicitud.idSolicitud, { contenido: 'Intento escribir en atendida' }),
      ).rejects.toMatchObject({
        code: 'SOLICITUD_CERRADA',
        status: 409,
      });
    });

    it('devuelve 404 opaco si un cliente intenta ver o escribir en la solicitud de otro usuario (ADR-003)', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Solicitud de usuario 7' }, LUNES_10_00);

      await expect(
        servicio.obtenerDetalleDeUsuario(99, solicitud.idSolicitud),
      ).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });

      await expect(
        servicio.agregarMensajeCliente(99, solicitud.idSolicitud, { contenido: 'Intruso' }),
      ).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });
  });

  describe('calificación de 1 a 5 estrellas (R13)', () => {
    it('permite calificar únicamente cuando la solicitud está en estado atendida', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Consulta sobre epóxico' }, LUNES_10_00);

      await expect(
        servicio.calificarDeUsuario(7, solicitud.idSolicitud, { calificacion: 5 }, LUNES_10_00),
      ).rejects.toMatchObject({
        code: 'SOLICITUD_NO_CALIFICABLE',
        status: 409,
      });

      await servicio.cambiarEstado(solicitud.idSolicitud, { estado: 'atendida' });

      const calificada = await servicio.calificarDeUsuario(
        7,
        solicitud.idSolicitud,
        { calificacion: 5 },
        LUNES_10_00,
      );
      expect(calificada.calificacion).toBe(5);
      expect(calificada.fechaCalificacion).toBe(LUNES_10_00.toISOString());
    });

    it('rechaza calificar cuando la solicitud está rechazada', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Consulta ajena' }, LUNES_10_00);
      await servicio.cambiarEstado(solicitud.idSolicitud, { estado: 'rechazada' });

      await expect(
        servicio.calificarDeUsuario(7, solicitud.idSolicitud, { calificacion: 1 }, LUNES_10_00),
      ).rejects.toMatchObject({
        code: 'SOLICITUD_NO_CALIFICABLE',
        status: 409,
      });
    });
  });

  describe('marcarAtendida (compatibilidad)', () => {
    it('pasa de en_revision a atendida y es idempotente', async () => {
      const { solicitud } = await servicio.crear(7, { tipo: 'consulta', descripcion: 'Una duda' }, LUNES_10_00);

      const primera = await servicio.marcarAtendida(solicitud.idSolicitud);
      const segunda = await servicio.marcarAtendida(solicitud.idSolicitud);

      expect(primera.estado).toBe('atendida');
      expect(segunda.estado).toBe('atendida');
    });

    it('responde 404 opaco cuando la solicitud no existe (R11)', async () => {
      await expect(
        servicio.marcarAtendida('00000000-0000-4000-8000-999999999999'),
      ).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });
  });
});

describe('ConfiguracionAtencionService (HU-ATC-03, HU-ATC-04)', () => {
  it('calcula abiertoAhora al consultar el horario', async () => {
    const config = new ConfiguracionRepositorioFalso();
    const servicio = new ConfiguracionAtencionService(config);

    const deDia = await servicio.obtenerHorario(LUNES_10_00);
    const deNoche = await servicio.obtenerHorario(LUNES_22_00);

    expect(deDia.abiertoAhora).toBe(true);
    expect(deNoche.abiertoAhora).toBe(false);
  });

  it('marca destinoEsUrl=true para el canal actual y false cuando sea un número (R7)', async () => {
    const config = new ConfiguracionRepositorioFalso();
    const servicio = new ConfiguracionAtencionService(config);

    const canalUrl = await servicio.obtenerCanalPublico();
    expect(canalUrl.destinoEsUrl).toBe(true);

    await servicio.guardarWhatsapp('573001234567', 'Hola');
    const canalNumero = await servicio.obtenerCanalPublico();
    expect(canalNumero.destinoEsUrl).toBe(false);
  });

  it('responde 404 opaco si el canal de WhatsApp no está configurado', async () => {
    const config = new ConfiguracionRepositorioFalso(SEMANA, null);
    const servicio = new ConfiguracionAtencionService(config);

    await expect(servicio.obtenerCanalPublico()).rejects.toMatchObject({
      code: 'RECURSO_NO_DISPONIBLE',
      status: 404,
    });
  });
});