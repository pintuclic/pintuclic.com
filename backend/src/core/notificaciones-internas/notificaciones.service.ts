import {
  LOTE_LIMPIEZA,
  MAXIMO_AVISOS_POR_PERSONA,
  MAXIMO_DESTINATARIOS,
  MINUTOS_CACHE_DESTINATARIOS,
  RETENCION_DIAS,
  TIPOS_NOTIFICACION,
  TOPE_CONTADOR,
  VENTANA_AGRUPACION_HORAS,
  eventoNotificacionSchema,
  type EventoNotificacion,
  type ListaNotificaciones,
  type Notificacion,
  type Resumen,
  type Seccion,
  type TipoNotificacion,
} from './fp02-notificaciones.dto';
import type {
  FilaNotificacion,
  NotificacionesRepositoryPort,
  PublicadorNotificacionesPort,
} from './notificaciones.interface';

export class NotificacionNoDisponibleError extends Error {
  constructor() {
    super('El recurso solicitado no está disponible.');
    this.name = 'NotificacionNoDisponibleError';
  }
}

export interface OpcionesNotificaciones {
  /** Reloj inyectable (pruebas). */
  ahora?: () => Date;
  /** Registro de fallos al publicar (R10). Por defecto, `console.error`. */
  registrarError?: (mensaje: string, causa: unknown) => void;
  /** Cada cuántos ms puede correr la limpieza como mucho (R13d). Por defecto, un minuto. */
  intervaloLimpiezaMs?: number;
}

const MS_POR_MINUTO = 60_000;
const MAXIMO_USUARIOS_PENDIENTES_DE_RECORTE = 2_000;

/** Compone el texto del catálogo con `{n}` y `{ref}` (R5). Lo que no sea de la plantilla nunca se mete en el texto. */
export function componerTexto(tipo: TipoNotificacion, cantidad: number, referencias: readonly string[]): string {
  const ref = referencias[0] ?? '';
  const plantilla = cantidad === 1 ? tipo.singular : tipo.plural;
  return plantilla.replaceAll('{n}', String(cantidad)).replaceAll('{ref}', ref);
}

export function componerEnlace(tipo: TipoNotificacion, cantidad: number, referencias: readonly string[]): string {
  const ref = encodeURIComponent(referencias[0] ?? '');
  return (cantidad === 1 ? tipo.enlaceUno : tipo.enlaceVarios).replaceAll('{ref}', ref);
}

function tope(n: number): number {
  return Math.min(n, TOPE_CONTADOR);
}

function esTipoConocido(tipo: string): tipo is keyof typeof TIPOS_NOTIFICACION {
  return Object.hasOwn(TIPOS_NOTIFICACION, tipo);
}

export class NotificacionesInternasService implements PublicadorNotificacionesPort {
  private readonly ahora: () => Date;
  private readonly registrar: (mensaje: string, causa: unknown) => void;
  private readonly intervaloLimpiezaMs: number;
  private readonly cacheDestinatarios = new Map<string, { ids: number[]; expira: number }>();
  private readonly pendientesDeRecorte = new Set<number>();
  private ultimaLimpieza = 0;
  private limpiando = false;

  constructor(
    private readonly repo: NotificacionesRepositoryPort,
    opciones: OpcionesNotificaciones = {},
  ) {
    this.ahora = opciones.ahora ?? (() => new Date());
    this.registrar = opciones.registrarError ?? ((mensaje, causa) => console.error(mensaje, causa));
    this.intervaloLimpiezaMs = opciones.intervaloLimpiezaMs ?? MS_POR_MINUTO;
  }

  /* ─── Publicar (R3, R4, R10, R12) ─────────────────────────────────────────── */

  async publicar(evento: EventoNotificacion): Promise<void> {
    try {
      await this.publicarSinProteger(evento);
    } catch (error) {
      this.registrar('FP-02: no se pudo publicar el aviso.', error);
    }
  }

  private async publicarSinProteger(entrada: EventoNotificacion): Promise<void> {
    const evento = eventoNotificacionSchema.parse(entrada);
    const tipo: TipoNotificacion = TIPOS_NOTIFICACION[evento.tipo];
    const necesitaReferencia = tipo.singular.includes('{ref}') || tipo.enlaceUno.includes('{ref}');
    const referencia = evento.referencia === undefined || evento.referencia === '' ? null : evento.referencia;
    if (necesitaReferencia && referencia === null) {
      throw new Error(`El aviso «${evento.tipo}» exige una referencia.`);
    }
    const idsUsuario = await this.resolverDestinatarios(tipo, evento);
    if (idsUsuario.length === 0) return;

    const entidad = evento.entidad ?? referencia;
    if (tipo.agruparPor === 'entidad' && entidad === null) {
      throw new Error(`El aviso «${evento.tipo}» agrupa por entidad y no trae ninguna.`);
    }
    const claveGrupo = tipo.agruparPor === 'entidad' ? `${evento.tipo}:${entidad}` : evento.tipo;
    const ahora = this.ahora();
    await this.repo.publicar({
      idsUsuario,
      tipo: evento.tipo,
      nivel: tipo.nivel,
      seccion: tipo.seccion,
      claveGrupo,
      referencia,
      ahora,
      limiteVentana: new Date(ahora.getTime() - VENTANA_AGRUPACION_HORAS * 60 * MS_POR_MINUTO),
    });
    this.programarLimpieza(idsUsuario);
  }

  private async resolverDestinatarios(tipo: TipoNotificacion, evento: EventoNotificacion): Promise<number[]> {
    const { destino } = evento;
    if (destino.tipo === 'usuario') {
      // Un aviso de personal solo sale por permiso (R3): así un cliente jamás recibe uno.
      if (tipo.audiencia !== 'cliente') throw new Error(`El aviso «${evento.tipo}» es de personal y se publica por permiso.`);
      return [destino.idUsuario];
    }
    if (tipo.audiencia !== 'personal') throw new Error(`El aviso «${evento.tipo}» es de cliente y se publica a un usuario.`);
    if (tipo.permiso !== destino.permiso) {
      throw new Error(`El aviso «${evento.tipo}» se publica con el permiso «${tipo.permiso}», no con «${destino.permiso}».`);
    }
    const ahora = Date.now();
    const guardado = this.cacheDestinatarios.get(destino.permiso);
    if (guardado !== undefined && guardado.expira > ahora) return guardado.ids;
    const ids = await this.repo.destinatariosDePermiso(destino.permiso, MAXIMO_DESTINATARIOS);
    this.cacheDestinatarios.set(destino.permiso, { ids, expira: ahora + MINUTOS_CACHE_DESTINATARIOS * MS_POR_MINUTO });
    return ids;
  }

  /* ─── Limpieza (R8, R13d): fuera de la ruta de la petición, por lotes y como mucho una vez por intervalo ─── */

  private programarLimpieza(idsUsuario: number[]): void {
    if (this.pendientesDeRecorte.size < MAXIMO_USUARIOS_PENDIENTES_DE_RECORTE) {
      for (const id of idsUsuario) this.pendientesDeRecorte.add(id);
    }
    if (this.limpiando || Date.now() - this.ultimaLimpieza < this.intervaloLimpiezaMs) return;
    this.ultimaLimpieza = Date.now();
    setImmediate(() => {
      void this.limpiar().catch((error: unknown) => this.registrar('FP-02: la limpieza de avisos falló.', error));
    });
  }

  /** Borra los leídos vencidos y los que sobran por persona, por lotes. Pública para las pruebas. */
  async limpiar(): Promise<{ vencidos: number; excedentes: number }> {
    if (this.limpiando) return { vencidos: 0, excedentes: 0 };
    this.limpiando = true;
    try {
      const limite = new Date(this.ahora().getTime() - RETENCION_DIAS * 24 * 60 * MS_POR_MINUTO);
      let vencidos = 0;
      for (;;) {
        const n = await this.repo.borrarLeidosVencidos(limite, LOTE_LIMPIEZA);
        vencidos += n;
        if (n < LOTE_LIMPIEZA) break;
      }
      const ids = [...this.pendientesDeRecorte];
      this.pendientesDeRecorte.clear();
      let excedentes = 0;
      if (ids.length > 0) {
        for (;;) {
          const n = await this.repo.recortarExcedentes(ids, MAXIMO_AVISOS_POR_PERSONA, LOTE_LIMPIEZA);
          excedentes += n;
          if (n < LOTE_LIMPIEZA) break;
        }
      }
      return { vencidos, excedentes };
    } finally {
      this.limpiando = false;
    }
  }

  /* ─── Consultas de la persona (R1, R6, R7) ────────────────────────────────── */

  async resumen(idUsuario: number): Promise<Resumen> {
    const agregados = await this.repo.resumen(idUsuario);
    let sinVer = 0;
    let sinLeer = 0;
    const porSeccion = new Map<Seccion, number>();
    for (const a of agregados) {
      sinVer += a.sinVer;
      sinLeer += a.filas;
      if (a.nivel === 'novedad') porSeccion.set(a.seccion, (porSeccion.get(a.seccion) ?? 0) + a.cantidad);
    }
    const secciones = [...porSeccion.entries()]
      .filter(([, cantidad]) => cantidad > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([seccion, cantidad]) => ({ seccion, cantidad: tope(cantidad) }));
    return { campana: { sinVer: tope(sinVer), sinLeer: tope(sinLeer) }, secciones };
  }

  async listar(idUsuario: number, pagina: number, limite: number): Promise<ListaNotificaciones> {
    const { filas, total } = await this.repo.listar(idUsuario, pagina, limite);
    return { items: filas.flatMap((f) => this.aNotificacion(f)), total, hayMas: pagina * limite < total };
  }

  async marcarVistas(idUsuario: number): Promise<number> {
    return this.repo.marcarVistas(idUsuario, this.ahora());
  }

  async marcarTodasLeidas(idUsuario: number): Promise<number> {
    return this.repo.marcarTodasLeidas(idUsuario, this.ahora());
  }

  async marcarSeccionLeida(idUsuario: number, seccion: Seccion): Promise<number> {
    return this.repo.marcarSeccionLeida(idUsuario, seccion, this.ahora());
  }

  async marcarLeida(idUsuario: number, idNotificacion: string): Promise<Notificacion> {
    const fila = await this.repo.marcarLeida(idUsuario, idNotificacion, this.ahora());
    const notificacion = fila === null ? [] : this.aNotificacion(fila);
    const primera = notificacion[0];
    if (primera === undefined) throw new NotificacionNoDisponibleError();
    return primera;
  }

  /** Un tipo que ya no está en el catálogo (retirado en una versión posterior) se omite en vez de romper la lista. */
  private aNotificacion(f: FilaNotificacion): Notificacion[] {
    if (!esTipoConocido(f.tipo)) return [];
    const tipo: TipoNotificacion = TIPOS_NOTIFICACION[f.tipo];
    return [
      {
        idNotificacion: f.idNotificacion,
        tipo: f.tipo,
        nivel: f.nivel,
        seccion: f.seccion,
        texto: componerTexto(tipo, f.cantidad, f.referencias),
        enlace: componerEnlace(tipo, f.cantidad, f.referencias),
        cantidad: f.cantidad,
        referencias: f.referencias,
        fecha: f.fechaUltima.toISOString(),
        vista: f.fechaVista !== null || f.fechaLectura !== null,
        leida: f.fechaLectura !== null,
      },
    ];
  }
}
