import type {
  CrearEventoRequest,
  Estado,
  Evento,
  EventoPublico,
  EventoResumen,
  Exclusion,
  ListarEventosRequest,
  ProductoAfectado,
  ReferenciaCatalogo,
} from '../dtos/m06-precios.dto';
import {
  claveReferencia,
  type CatalogoPreciosRepositoryPort,
  type EventosRepositoryPort,
  type FilaEvento,
  type Pagina,
} from '../interfaces/precios.interface';
import { aBogota } from './fechas';
import { mejorOferta, situacionEvento, type EventoMotor } from './motor-eventos';
import { errores } from './precios-error';

const SIN_NOMBRE = '(ya no existe)';

const porcentajeMaximo = (e: Pick<FilaEvento, 'reglas'>): number => Math.max(...e.reglas.map((r) => r.porcentaje));

/** Todas las referencias al catálogo que menciona un evento: objetivos y excepciones (R19). */
function referenciasDe(datos: Pick<CrearEventoRequest, 'reglas' | 'exclusiones'>): Exclusion[] {
  return [
    ...datos.reglas.flatMap((r) => [...(r.objetivo === null ? [] : [r.objetivo]), ...r.exclusiones]),
    ...datos.exclusiones,
  ];
}

/** Administración de eventos de descuento (el motor): lista, detalle, alta, edición, estado y vista previa. */
export class EventosService {
  constructor(
    private readonly eventos: EventosRepositoryPort,
    private readonly catalogo: CatalogoPreciosRepositoryPort,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async listar(filtro: ListarEventosRequest): Promise<Pagina<EventoResumen>> {
    const ahora = this.reloj();
    const busqueda = filtro.busqueda?.toLowerCase();
    const filas = (await this.eventos.listarTodos())
      .map((f) => ({ f, situacion: situacionEvento(f, ahora) }))
      .filter((x) => filtro.situacion === undefined || x.situacion === filtro.situacion)
      .filter((x) => busqueda === undefined || x.f.nombre.toLowerCase().includes(busqueda));
    const desde = (filtro.pagina - 1) * filtro.limite;
    return {
      total: filas.length,
      items: filas.slice(desde, desde + filtro.limite).map(({ f, situacion }) => ({
        idEvento: f.idEvento,
        nombre: f.nombre,
        estado: f.estado,
        situacion,
        calendario: f.calendario,
        totalReglas: f.reglas.length,
        porcentajeMaximo: porcentajeMaximo(f),
        fechaActualizacion: f.fechaActualizacion.toISOString(),
      })),
    };
  }

  async obtener(idEvento: number): Promise<Evento> {
    const fila = await this.eventos.obtener(idEvento);
    if (fila === null) throw errores.noDisponible();
    return this.detallar(fila);
  }

  async crear(datos: CrearEventoRequest, idUsuario: number): Promise<Evento> {
    await this.exigirReferencias(datos);
    return this.obtener(await this.eventos.crear(datos, idUsuario));
  }

  async actualizar(idEvento: number, datos: CrearEventoRequest, idUsuario: number): Promise<Evento> {
    await this.exigirReferencias(datos);
    if (!(await this.eventos.reemplazar(idEvento, datos, idUsuario))) throw errores.noDisponible();
    return this.obtener(idEvento);
  }

  async cambiarEstado(idEvento: number, estado: Estado, idUsuario: number): Promise<Evento> {
    if (!(await this.eventos.cambiarEstado(idEvento, estado, idUsuario))) throw errores.noDisponible();
    return this.obtener(idEvento);
  }

  /** Lo que el público ve en la pestaña Promociones: los eventos que están en curso ahora. */
  async enCurso(): Promise<EventoPublico[]> {
    const ahora = this.reloj();
    const activos = await this.eventos.listarActivos(aBogota(ahora).fecha);
    return activos
      .filter((e) => situacionEvento(e, ahora) === 'en_curso')
      .map((e) => ({
        idEvento: e.idEvento,
        nombre: e.nombre,
        descripcion: e.descripcion,
        porcentajeMaximo: porcentajeMaximo(e),
        calendario: e.calendario,
      }));
  }

  /**
   * D12: qué productos entrarían con este borrador. El calendario se ignora (se evalúa como si estuviera en
   * curso) para poder revisar las excepciones antes de publicar. Un producto entra si alguna de sus variantes,
   * con algún color, recibe la oferta (R8: las excepciones de color no se evalúan sin color).
   */
  async vistaPrevia(datos: CrearEventoRequest, pagina: number, limite: number): Promise<Pagina<ProductoAfectado>> {
    await this.exigirReferencias(datos);
    const ahora = this.reloj();
    const borrador: EventoMotor = {
      idEvento: 0,
      nombre: datos.nombre,
      estado: 'activo',
      calendario: { fechaInicio: '2000-01-01', fechaFin: null, diasSemana: [], horaInicio: null, horaFin: null },
      reglas: datos.reglas.map((r, i) => ({
        idRegla: i + 1,
        objetivo: r.objetivo,
        porcentaje: r.porcentaje,
        exclusiones: r.exclusiones,
      })),
      exclusiones: datos.exclusiones,
    };
    const porProducto = new Map<number, ProductoAfectado>();
    const totales = new Map<number, number>();
    for (const v of await this.catalogo.variantesActivasDelCatalogo()) {
      totales.set(v.idProducto, (totales.get(v.idProducto) ?? 0) + 1);
      const oferta = v.excluidoDeDescuentos
        ? null
        : mejorOferta([borrador], { ...v, idColor: null, idFamiliaColor: null }, ahora);
      if (oferta === null) continue;
      const previo = porProducto.get(v.idProducto);
      porProducto.set(v.idProducto, {
        idProducto: v.idProducto,
        nombre: v.nombreProducto,
        marca: v.marca,
        linea: v.linea,
        porcentaje: Math.max(previo?.porcentaje ?? 0, oferta.porcentaje),
        variantesConDescuento: (previo?.variantesConDescuento ?? 0) + 1,
        variantesTotales: 0,
      });
    }
    const todos = [...porProducto.values()]
      .map((p) => ({ ...p, variantesTotales: totales.get(p.idProducto) ?? 0 }))
      .sort(
        (a, b) => b.porcentaje - a.porcentaje || a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre),
      );
    const desde = (pagina - 1) * limite;
    return { total: todos.length, items: todos.slice(desde, desde + limite) };
  }

  /** R19: toda referencia debe existir; si no, 400 con la lista de las que faltan y nada se guarda. */
  private async exigirReferencias(datos: Pick<CrearEventoRequest, 'reglas' | 'exclusiones'>): Promise<void> {
    const { inexistentes } = await this.catalogo.nombrar(referenciasDe(datos));
    if (inexistentes.length > 0) throw errores.objetivoNoExiste(inexistentes);
  }

  private async detallar(f: FilaEvento): Promise<Evento> {
    const { nombres } = await this.catalogo.nombrar(referenciasDe(f));
    const ref = (r: Exclusion): ReferenciaCatalogo => ({
      tipo: r.tipo,
      id: r.id,
      nombre: nombres.get(claveReferencia(r)) ?? SIN_NOMBRE,
    });
    return {
      idEvento: f.idEvento,
      nombre: f.nombre,
      descripcion: f.descripcion,
      estado: f.estado,
      situacion: situacionEvento(f, this.reloj()),
      calendario: f.calendario,
      reglas: f.reglas.map((r) => ({
        idRegla: r.idRegla,
        objetivo: r.objetivo === null ? null : ref(r.objetivo),
        porcentaje: r.porcentaje,
        exclusiones: r.exclusiones.map(ref),
      })),
      exclusiones: f.exclusiones.map(ref),
      fechaCreacion: f.fechaCreacion.toISOString(),
      fechaActualizacion: f.fechaActualizacion.toISOString(),
      actualizadoPor: f.actualizadoPor,
    };
  }
}
