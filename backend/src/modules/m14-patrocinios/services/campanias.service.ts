import type {
  Campania,
  CampaniaRequest,
  CampaniaResumen,
  BuscarReferenciasRequest,
  Estado,
  ListarCampaniasRequest,
  ObjetivoPatrocinio,
  ProductoCubierto,
} from '../dtos/m14-patrocinios.dto';
import type {
  CampaniasRepositoryPort,
  CatalogoPatrocinioRepositoryPort,
  FilaCampania,
  Pagina,
} from '../interfaces/patrocinios.interface';
import { situacionCampania } from './campanias';
import { errores } from './patrocinios-error';

const SIN_NOMBRE = '(ya no existe)';
const clave = (o: ObjetivoPatrocinio): string => `${o.tipo}:${o.id}`;

/** Administración de campañas de patrocinio de productos: lista, detalle, alta, edición, estado y vista previa. */
export class CampaniasService {
  constructor(
    private readonly campanias: CampaniasRepositoryPort,
    private readonly catalogo: CatalogoPatrocinioRepositoryPort,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  /** El buscador del editor: productos, líneas o marcas para elegir. */
  async buscarReferencias(filtro: BuscarReferenciasRequest): Promise<Array<{ tipo: ObjetivoPatrocinio['tipo']; id: number; nombre: string }>> {
    const filas = await this.catalogo.buscar(filtro.tipo, filtro.busqueda, filtro.limite);
    return filas.map((f) => ({ tipo: filtro.tipo, id: f.id, nombre: f.nombre }));
  }

  async listar(filtro: ListarCampaniasRequest): Promise<Pagina<CampaniaResumen>> {
    const ahora = this.reloj();
    const busqueda = filtro.busqueda?.toLowerCase();
    const filas = (await this.campanias.listarTodas())
      .map((f) => ({ f, situacion: situacionCampania(f, ahora) }))
      .filter((x) => filtro.situacion === undefined || x.situacion === filtro.situacion)
      .filter((x) => filtro.ubicacion === undefined || x.f.ubicaciones.includes(filtro.ubicacion))
      .filter((x) => busqueda === undefined || x.f.nombre.toLowerCase().includes(busqueda));
    const desde = (filtro.pagina - 1) * filtro.limite;
    const pagina = filas.slice(desde, desde + filtro.limite);
    const items = await Promise.all(
      pagina.map(async ({ f, situacion }): Promise<CampaniaResumen> => {
        const productos = await this.catalogo.productosDeObjetivos(f.objetivos);
        return {
          idCampania: f.idCampania,
          nombre: f.nombre,
          estado: f.estado,
          situacion,
          fechaInicio: f.fechaInicio,
          fechaFin: f.fechaFin,
          prioridad: f.prioridad,
          ubicaciones: f.ubicaciones,
          totalProductos: productos.length,
          productosVisibles: productos.filter((p) => p.visible).length,
        };
      }),
    );
    return { total: filas.length, items };
  }

  async obtener(idCampania: number): Promise<Campania> {
    const fila = await this.campanias.obtener(idCampania);
    if (fila === null) throw errores.noDisponible();
    return this.detallar(fila);
  }

  async crear(datos: CampaniaRequest, idUsuario: number): Promise<Campania> {
    await this.exigir(datos);
    return this.obtener(await this.campanias.crear(datos, idUsuario));
  }

  async actualizar(idCampania: number, datos: CampaniaRequest, idUsuario: number): Promise<Campania> {
    if ((await this.campanias.obtener(idCampania)) === null) throw errores.noDisponible();
    await this.exigir(datos, idCampania);
    if (!(await this.campanias.reemplazar(idCampania, datos, idUsuario))) throw errores.noDisponible();
    return this.obtener(idCampania);
  }

  async cambiarEstado(idCampania: number, estado: Estado, idUsuario: number): Promise<Campania> {
    if (!(await this.campanias.cambiarEstado(idCampania, estado, idUsuario))) throw errores.noDisponible();
    return this.obtener(idCampania);
  }

  /** Los productos que cubre hoy una campaña guardada (A3), con su visibilidad (A6). */
  async productosDeCampania(idCampania: number, pagina: number, limite: number): Promise<Pagina<ProductoCubierto>> {
    const fila = await this.campanias.obtener(idCampania);
    if (fila === null) throw errores.noDisponible();
    return this.paginarProductos(fila.objetivos, pagina, limite);
  }

  /** A12: qué productos cubrirían estos objetivos, antes de guardar. No escribe nada. */
  async vistaPrevia(objetivos: ObjetivoPatrocinio[], pagina: number, limite: number): Promise<Pagina<ProductoCubierto>> {
    await this.exigirObjetivos(objetivos);
    return this.paginarProductos(objetivos, pagina, limite);
  }

  private async paginarProductos(objetivos: readonly ObjetivoPatrocinio[], pagina: number, limite: number): Promise<Pagina<ProductoCubierto>> {
    const todos = await this.catalogo.productosDeObjetivos(objetivos);
    const desde = (pagina - 1) * limite;
    return {
      total: todos.length,
      items: todos.slice(desde, desde + limite).map((p) => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        marca: p.marca,
        linea: p.linea,
        subcategoria: p.subcategoria,
        visible: p.visible,
      })),
    };
  }

  /** A11 y A3: el nombre es único y todo objetivo debe existir; si no, 409 y no se guarda nada. */
  private async exigir(datos: CampaniaRequest, exceptoId?: number): Promise<void> {
    await this.exigirObjetivos(datos.objetivos);
    if (await this.campanias.nombreExiste(datos.nombre, exceptoId)) throw errores.nombreDuplicado();
  }

  private async exigirObjetivos(objetivos: readonly ObjetivoPatrocinio[]): Promise<void> {
    const { inexistentes } = await this.catalogo.nombrar(objetivos);
    if (inexistentes.length > 0) throw errores.objetivoNoExiste(inexistentes);
  }

  private async detallar(f: FilaCampania): Promise<Campania> {
    const { nombres } = await this.catalogo.nombrar(f.objetivos);
    return {
      idCampania: f.idCampania,
      nombre: f.nombre,
      descripcion: f.descripcion,
      estado: f.estado,
      situacion: situacionCampania(f, this.reloj()),
      fechaInicio: f.fechaInicio,
      fechaFin: f.fechaFin,
      prioridad: f.prioridad,
      ubicaciones: f.ubicaciones,
      objetivos: f.objetivos.map((o) => ({
        tipo: o.tipo,
        id: o.id,
        nombre: nombres.get(clave(o)) ?? SIN_NOMBRE,
        existe: nombres.has(clave(o)),
      })),
      fechaCreacion: f.fechaCreacion.toISOString(),
      fechaActualizacion: f.fechaActualizacion.toISOString(),
      actualizadoPor: f.actualizadoPor,
    };
  }
}
