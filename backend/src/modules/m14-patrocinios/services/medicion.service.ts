import {
  DIAS_INFORME_MAXIMO,
  DIAS_INFORME_POR_DEFECTO,
  type EntidadMedicion,
  type EventoMedicion as AvisoMedicion,
  type FilaMedicion,
  type PuntoSerieMedicion,
  type ResumenMedicionRequest,
  type SerieMedicionRequest,
} from '../dtos/m14-patrocinios.dto';
import type {
  AnunciosRepositoryPort,
  CampaniasRepositoryPort,
  EventoDeMedicion,
  MedicionRepositoryPort,
  RegistroMedicion,
  SumaMedicion,
} from '../interfaces/patrocinios.interface';
import { situacionAnuncio, situacionCampania } from './campanias';
import { fechaBogota } from './fechas';
import { errores } from './patrocinios-error';

const MS_DIA = 86_400_000;
const sumarDias = (fecha: string, dias: number): string =>
  new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * MS_DIA).toISOString().slice(0, 10);
const diasEntre = (desde: string, hasta: string): number =>
  (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / MS_DIA + 1;

/** CTR en %, con 2 decimales; null si no hubo impresiones (M1). */
const ctr = (clics: number, impresiones: number): number | null =>
  impresiones === 0 ? null : Math.round((clics / impresiones) * 10_000) / 100;

export interface RangoInforme {
  desde: string;
  hasta: string;
}

export interface FilaDiaria {
  fecha: string;
  entidad: EntidadMedicion;
  id: number;
  nombre: string;
  lugar: string;
  impresiones: number;
  clics: number;
  ctr: number | null;
}

/** Medición propia y local: solo totales por día, nunca quién ni desde dónde (M1, M9). */
export class MedicionService {
  constructor(
    private readonly medicion: MedicionRepositoryPort,
    private readonly campanias: CampaniasRepositoryPort,
    private readonly anuncios: AnunciosRepositoryPort,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  /**
   * M3-M5: anota los avisos de la pantalla. Lo que no existe, no está vigente o no tiene esa ubicación se ignora sin
   * error (el cliente no tiene por qué enterarse). Los avisos repetidos del mismo envío se suman antes de escribir.
   */
  async registrar(eventos: readonly AvisoMedicion[]): Promise<void> {
    const ahora = this.reloj();
    const campaniasVigentes = new Map<number, ReadonlySet<string>>();
    const idsCampania = [...new Set(eventos.filter((e) => e.entidad === 'campania').map((e) => e.id))];
    await Promise.all(
      idsCampania.map(async (id) => {
        const c = await this.campanias.obtener(id);
        if (c !== null && situacionCampania(c, ahora) === 'vigente') campaniasVigentes.set(id, new Set(c.ubicaciones));
      }),
    );
    const espaciosVigentes = new Map<number, string>();
    const idsAnuncio = [...new Set(eventos.filter((e) => e.entidad === 'anuncio').map((e) => e.id))];
    await Promise.all(
      idsAnuncio.map(async (id) => {
        const a = await this.anuncios.obtener(id);
        if (a !== null && situacionAnuncio(a, ahora) === 'vigente') espaciosVigentes.set(id, a.espacio);
      }),
    );

    const acumulado = new Map<string, SumaMedicion>();
    const anotar = (entidad: EntidadMedicion, idEntidad: number, lugar: string, evento: EventoDeMedicion): void => {
      const clave = `${entidad}|${idEntidad}|${lugar}|${evento}`;
      const previo = acumulado.get(clave);
      if (previo === undefined) acumulado.set(clave, { entidad, idEntidad, lugar, evento, total: 1 });
      else previo.total += 1;
    };
    for (const e of eventos) {
      if (e.entidad === 'campania') {
        if (campaniasVigentes.get(e.id)?.has(e.ubicacion) === true) anotar('campania', e.id, e.ubicacion, e.tipo);
      } else {
        const espacio = espaciosVigentes.get(e.id);
        if (espacio !== undefined) anotar('anuncio', e.id, espacio, 'impresion');
      }
    }
    await this.medicion.sumar(fechaBogota(ahora), [...acumulado.values()]);
  }

  /** M8: el rango pedido; sin fechas, los últimos 30 días que terminan hoy. Más de 366 días es un error de parámetro. */
  rango(entrada: { desde?: string | undefined; hasta?: string | undefined }): RangoInforme {
    const hoy = fechaBogota(this.reloj());
    const hasta = entrada.hasta ?? hoy;
    const desde = entrada.desde ?? sumarDias(hasta, -(DIAS_INFORME_POR_DEFECTO - 1));
    if (hasta < desde || diasEntre(desde, hasta) > DIAS_INFORME_MAXIMO) {
      throw errores.parametroInvalido(`El rango debe ser válido y de máximo ${DIAS_INFORME_MAXIMO} días.`);
    }
    return { desde, hasta };
  }

  /** M8: una fila por campaña y por anuncio (también las que no tuvieron movimiento), con su CTR. */
  async resumen(filtro: ResumenMedicionRequest): Promise<{ desde: string; hasta: string; filas: FilaMedicion[] }> {
    const { desde, hasta } = this.rango(filtro);
    const [registros, nombres] = await Promise.all([
      this.medicion.leer(desde, hasta, filtro.entidad === undefined ? {} : { entidad: filtro.entidad }),
      this.nombres(filtro.entidad),
    ]);
    const totales = new Map<string, { impresiones: number; clics: number }>();
    for (const r of registros) {
      const clave = `${r.entidad}|${r.idEntidad}`;
      const t = totales.get(clave) ?? { impresiones: 0, clics: 0 };
      if (r.evento === 'impresion') t.impresiones += r.total;
      else t.clics += r.total;
      totales.set(clave, t);
    }
    const filas: FilaMedicion[] = [...nombres.entries()].map(([clave, e]) => {
      const t = totales.get(clave) ?? { impresiones: 0, clics: 0 };
      return { entidad: e.entidad, id: e.id, nombre: e.nombre, impresiones: t.impresiones, clics: t.clics, ctr: ctr(t.clics, t.impresiones) };
    });
    filas.sort(
      (a, b) =>
        a.entidad.localeCompare(b.entidad) || b.impresiones - a.impresiones || b.clics - a.clics || a.id - b.id,
    );
    return { desde, hasta, filas };
  }

  /** M8: una fila por día del rango (con ceros) de una campaña o un anuncio. 404 si no existe. */
  async serie(filtro: SerieMedicionRequest): Promise<{ desde: string; hasta: string; puntos: PuntoSerieMedicion[] }> {
    const { desde, hasta } = this.rango(filtro);
    const existe =
      filtro.entidad === 'campania'
        ? (await this.campanias.obtener(filtro.id)) !== null
        : (await this.anuncios.obtener(filtro.id)) !== null;
    if (!existe) throw errores.noDisponible();
    const registros = await this.medicion.leer(desde, hasta, { entidad: filtro.entidad, idEntidad: filtro.id });
    const porDia = new Map<string, PuntoSerieMedicion>();
    for (let i = 0; i < diasEntre(desde, hasta); i += 1) {
      const fecha = sumarDias(desde, i);
      porDia.set(fecha, { fecha, impresiones: 0, clics: 0 });
    }
    for (const r of registros) {
      const p = porDia.get(r.fecha);
      if (p === undefined) continue;
      if (r.evento === 'impresion') p.impresiones += r.total;
      else p.clics += r.total;
    }
    return { desde, hasta, puntos: [...porDia.values()] };
  }

  /** M8: el CSV del resumen por día (y por lugar). Solo los días con movimiento. */
  async filasDiarias(filtro: ResumenMedicionRequest): Promise<{ desde: string; hasta: string; filas: FilaDiaria[] }> {
    const { desde, hasta } = this.rango(filtro);
    const [registros, nombres] = await Promise.all([
      this.medicion.leer(desde, hasta, filtro.entidad === undefined ? {} : { entidad: filtro.entidad }),
      this.nombres(filtro.entidad),
    ]);
    const filas = new Map<string, FilaDiaria>();
    for (const r of registros as RegistroMedicion[]) {
      const clave = `${r.fecha}|${r.entidad}|${r.idEntidad}|${r.lugar}`;
      let fila = filas.get(clave);
      if (fila === undefined) {
        fila = {
          fecha: r.fecha,
          entidad: r.entidad,
          id: r.idEntidad,
          nombre: nombres.get(`${r.entidad}|${r.idEntidad}`)?.nombre ?? '(ya no existe)',
          lugar: r.lugar,
          impresiones: 0,
          clics: 0,
          ctr: null,
        };
        filas.set(clave, fila);
      }
      if (r.evento === 'impresion') fila.impresiones += r.total;
      else fila.clics += r.total;
    }
    const lista = [...filas.values()];
    for (const f of lista) f.ctr = ctr(f.clics, f.impresiones);
    return { desde, hasta, filas: lista };
  }

  private async nombres(entidad: EntidadMedicion | undefined): Promise<Map<string, { entidad: EntidadMedicion; id: number; nombre: string }>> {
    const mapa = new Map<string, { entidad: EntidadMedicion; id: number; nombre: string }>();
    if (entidad !== 'anuncio') {
      for (const c of await this.campanias.listarTodas()) mapa.set(`campania|${c.idCampania}`, { entidad: 'campania', id: c.idCampania, nombre: c.nombre });
    }
    if (entidad !== 'campania') {
      for (const a of await this.anuncios.listarTodos()) mapa.set(`anuncio|${a.idAnuncio}`, { entidad: 'anuncio', id: a.idAnuncio, nombre: a.nombre });
    }
    return mapa;
  }
}
