import {
  MAXIMO_ANUNCIOS_VISIBLES,
  type ActualizarAnuncioRequest,
  type Anuncio,
  type AnuncioPublico,
  type CrearAnuncioRequest,
  type EspacioPublicitario,
  type Estado,
  type ImagenAnuncioQuery,
  type ListarAnunciosRequest,
} from '../dtos/m14-patrocinios.dto';
import type {
  AnunciosRepositoryPort,
  FilaAnuncio,
  ImagenBytes,
  ImagenPreparada,
  MedicionRepositoryPort,
  Pagina,
} from '../interfaces/patrocinios.interface';
import { situacionAnuncio } from './campanias';
import { esEnlaceExterno, normalizarEnlace } from './enlace-anuncio';
import { fechaBogota } from './fechas';
import { prepararImagen } from './imagen-anuncio';
import { errores } from './patrocinios-error';

const RUTA_ADMIN = '/api/v1/admin/patrocinios/anuncios';
const RUTA_PUBLICA = '/api/v1/patrocinios/anuncios';
/** Adónde va quien llega a un anuncio que ya no está vigente: nunca ve un error (M2). */
export const DESTINO_POR_DEFECTO = '/';

/**
 * El navegador cachea las imágenes; `v` (la última modificación) hace que una imagen cambiada tenga otra dirección y se
 * vea al instante. La pantalla agrega `&tamano=pequeno|mediano` para pedir la versión que necesita (B11).
 */
const version = (f: FilaAnuncio): number => f.fechaActualizacion.getTime();

/** Administración de anuncios de los espacios publicitarios, su entrega pública y el clic por redirección (B, M2). */
export class AnunciosService {
  constructor(
    private readonly anuncios: AnunciosRepositoryPort,
    private readonly medicion: MedicionRepositoryPort,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async listar(filtro: ListarAnunciosRequest): Promise<Pagina<Anuncio>> {
    const ahora = this.reloj();
    const busqueda = filtro.busqueda?.toLowerCase();
    const filas = (await this.anuncios.listarTodos())
      .filter((f) => filtro.espacio === undefined || f.espacio === filtro.espacio)
      .filter((f) => filtro.situacion === undefined || situacionAnuncio(f, ahora) === filtro.situacion)
      .filter(
        (f) =>
          busqueda === undefined ||
          f.nombre.toLowerCase().includes(busqueda) ||
          f.anunciante.toLowerCase().includes(busqueda),
      );
    const desde = (filtro.pagina - 1) * filtro.limite;
    return { total: filas.length, items: filas.slice(desde, desde + filtro.limite).map((f) => this.detallar(f, ahora)) };
  }

  async obtener(idAnuncio: number): Promise<Anuncio> {
    const fila = await this.anuncios.obtener(idAnuncio);
    if (fila === null) throw errores.noDisponible();
    return this.detallar(fila, this.reloj());
  }

  async crear(datos: CrearAnuncioRequest, idUsuario: number): Promise<Anuncio> {
    const enlace = this.enlaceGuardado(datos.enlace);
    const imagenes = await Promise.all([
      prepararImagen(datos.imagen, 'escritorio'),
      ...(datos.imagenMovil === null ? [] : [prepararImagen(datos.imagenMovil, 'movil')]),
    ]);
    const id = await this.anuncios.crear(
      {
        nombre: datos.nombre,
        anunciante: datos.anunciante,
        espacio: datos.espacio,
        textoAlternativo: datos.textoAlternativo,
        enlace,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        orden: datos.orden,
        focoEscritorio: datos.focoEscritorio,
        focoMovil: datos.focoMovil,
      },
      imagenes,
      idUsuario,
    );
    return this.obtener(id);
  }

  async actualizar(idAnuncio: number, datos: ActualizarAnuncioRequest, idUsuario: number): Promise<Anuncio> {
    const actual = await this.anuncios.obtener(idAnuncio);
    if (actual === null) throw errores.noDisponible();
    const enlace = this.enlaceGuardado(datos.enlace);
    const nuevas: Promise<ImagenPreparada>[] = [];
    if (datos.imagen !== undefined) nuevas.push(prepararImagen(datos.imagen, 'escritorio'));
    if (datos.imagenMovil !== undefined) nuevas.push(prepararImagen(datos.imagenMovil, 'movil'));
    const imagenes = await Promise.all(nuevas);
    const ok = await this.anuncios.reemplazar(
      idAnuncio,
      {
        nombre: datos.nombre,
        anunciante: datos.anunciante,
        textoAlternativo: datos.textoAlternativo,
        enlace,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        orden: datos.orden,
        focoEscritorio: datos.focoEscritorio,
        focoMovil: datos.focoMovil,
      },
      imagenes,
      datos.quitarImagenMovil,
      idUsuario,
    );
    if (!ok) throw errores.noDisponible();
    return this.obtener(idAnuncio);
  }

  async cambiarEstado(idAnuncio: number, estado: Estado, idUsuario: number): Promise<Anuncio> {
    if (!(await this.anuncios.cambiarEstado(idAnuncio, estado, idUsuario))) throw errores.noDisponible();
    return this.obtener(idAnuncio);
  }

  /** Vista previa del panel: sirve aunque el anuncio no esté vigente. */
  async imagenAdmin(idAnuncio: number, q: ImagenAnuncioQuery): Promise<ImagenBytes> {
    const imagen = await this.anuncios.imagen(idAnuncio, q.variante, q.tamano);
    if (imagen === null) throw errores.noDisponible();
    return imagen;
  }

  /** B4: lo que pinta el slider de un espacio. Lista vacía = la pantalla no pinta el espacio. */
  async publicos(espacio: EspacioPublicitario): Promise<AnuncioPublico[]> {
    const filas = await this.anuncios.vigentes(espacio, fechaBogota(this.reloj()), MAXIMO_ANUNCIOS_VISIBLES);
    return filas.map((f) => ({
      idAnuncio: f.idAnuncio,
      textoAlternativo: f.textoAlternativo,
      urlClic: f.enlace === null ? null : `${RUTA_PUBLICA}/${f.idAnuncio}/ir`,
      abrirEnNuevaPestana: f.enlace !== null && esEnlaceExterno(f.enlace),
      urlImagen: this.urlPublica(f, 'escritorio'),
      urlImagenMovil: f.tieneImagenMovil ? this.urlPublica(f, 'movil') : null,
      focoEscritorio: f.focoEscritorio,
      focoMovil: f.focoMovil,
    }));
  }

  /** Solo las imágenes de anuncios vigentes se entregan al público (B7): lo demás es 404. */
  async imagenPublica(idAnuncio: number, q: ImagenAnuncioQuery): Promise<ImagenBytes> {
    const fila = await this.anuncios.obtener(idAnuncio);
    if (fila === null || situacionAnuncio(fila, this.reloj()) !== 'vigente') throw errores.noDisponible();
    const imagen = await this.anuncios.imagen(idAnuncio, q.variante, q.tamano);
    if (imagen === null) throw errores.noDisponible();
    return imagen;
  }

  /**
   * M2: adónde mandar a quien hizo clic en un anuncio, y suma el clic si corresponde. La dirección sale SIEMPRE de lo
   * que guardó el personal (jamás de la petición). Sin anuncio, vencido, apagado o sin enlace: al inicio y sin contar.
   * `contar` es false para los robots y las peticiones que no son un clic de persona (M6).
   */
  async resolverClic(idAnuncio: number, contar: boolean): Promise<string> {
    const fila = await this.anuncios.obtener(idAnuncio);
    if (fila === null || fila.enlace === null) return DESTINO_POR_DEFECTO;
    const ahora = this.reloj();
    if (situacionAnuncio(fila, ahora) !== 'vigente') return DESTINO_POR_DEFECTO;
    const destino = normalizarEnlace(fila.enlace);
    if (destino === null) return DESTINO_POR_DEFECTO;
    if (contar) {
      try {
        await this.medicion.sumar(fechaBogota(ahora), [
          { entidad: 'anuncio', idEntidad: idAnuncio, lugar: fila.espacio, evento: 'clic', total: 1 },
        ]);
      } catch {
        // La cifra es indicativa (M7): un fallo al contar no debe dejar al cliente sin llegar adonde hizo clic.
      }
    }
    return destino;
  }

  /** B6: el enlace se guarda ya normalizado; uno inseguro se rechaza (no es un redirector abierto). */
  private enlaceGuardado(enlace: string | null): string | null {
    if (enlace === null) return null;
    const normalizado = normalizarEnlace(enlace);
    if (normalizado === null) {
      throw errores.parametroInvalido('El enlace debe empezar por https:// o por una ruta interna (/…) y no tener caracteres extraños.');
    }
    return normalizado;
  }

  private urlPublica(f: FilaAnuncio, variante: 'escritorio' | 'movil'): string {
    return `${RUTA_PUBLICA}/imagenes/${f.idAnuncio}?variante=${variante}&v=${version(f)}`;
  }

  private detallar(f: FilaAnuncio, ahora: Date): Anuncio {
    return {
      idAnuncio: f.idAnuncio,
      nombre: f.nombre,
      anunciante: f.anunciante,
      espacio: f.espacio,
      textoAlternativo: f.textoAlternativo,
      enlace: f.enlace,
      fechaInicio: f.fechaInicio,
      fechaFin: f.fechaFin,
      orden: f.orden,
      estado: f.estado,
      situacion: situacionAnuncio(f, ahora),
      tieneImagenMovil: f.tieneImagenMovil,
      focoEscritorio: f.focoEscritorio,
      focoMovil: f.focoMovil,
      urlImagen: `${RUTA_ADMIN}/${f.idAnuncio}/imagen?variante=escritorio&v=${version(f)}`,
      urlImagenMovil: f.tieneImagenMovil ? `${RUTA_ADMIN}/${f.idAnuncio}/imagen?variante=movil&v=${version(f)}` : null,
      fechaCreacion: f.fechaCreacion.toISOString(),
      fechaActualizacion: f.fechaActualizacion.toISOString(),
      actualizadoPor: f.actualizadoPor,
    };
  }
}
