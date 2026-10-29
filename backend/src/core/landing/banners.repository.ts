import fs from 'node:fs';
import path from 'node:path';
import type {
  BannerInicioAdminEntity,
  BannerInicioPublicoItem,
  EstadoBannerInicio,
  TipoMimeBannerInicio,
} from './fp01-landing.dto';

export interface ImagenBannerBytes {
  bytes: Buffer;
  mimeType: TipoMimeBannerInicio;
}

export interface CrearBannerRepositorioInput {
  tituloLinea1: string;
  tituloLinea2: string | null;
  descripcion: string;
  textoBotonPrimario: string;
  enlaceBotonPrimario: string;
  textoBotonSecundario: string | null;
  enlaceBotonSecundario: string | null;
  imagen: Buffer | null;
  imagenMimeType: TipoMimeBannerInicio | null;
  orden: number;
  estado: EstadoBannerInicio;
  idAutor: number;
  focoX: number;
  focoY: number;
}

export interface EditarBannerRepositorioInput {
  tituloLinea1?: string;
  tituloLinea2?: string | null;
  descripcion?: string;
  textoBotonPrimario?: string;
  enlaceBotonPrimario?: string;
  textoBotonSecundario?: string | null;
  enlaceBotonSecundario?: string | null;
  imagen?: Buffer | null;
  imagenMimeType?: TipoMimeBannerInicio | null;
  orden?: number;
  idAutor: number;
  focoX?: number;
  focoY?: number;
}

export interface BannersInicioRepositoryPort {
  listarPublicos(): Promise<BannerInicioPublicoItem[]>;
  obtenerImagenPublica(idBanner: number): Promise<ImagenBannerBytes | null>;
  listarAdmin(estado?: EstadoBannerInicio): Promise<BannerInicioAdminEntity[]>;
  obtenerPorIdAdmin(idBanner: number): Promise<BannerInicioAdminEntity | null>;
  crear(datos: CrearBannerRepositorioInput): Promise<BannerInicioAdminEntity>;
  editar(idBanner: number, datos: EditarBannerRepositorioInput): Promise<BannerInicioAdminEntity>;
  cambiarEstado(idBanner: number, estado: EstadoBannerInicio, idAutor: number): Promise<BannerInicioAdminEntity>;
  eliminar(idBanner: number): Promise<void>;
}

interface RegistroBannerPersistencia {
  idBanner: number;
  tituloLinea1: string;
  tituloLinea2: string | null;
  descripcion: string;
  textoBotonPrimario: string;
  enlaceBotonPrimario: string;
  textoBotonSecundario: string | null;
  enlaceBotonSecundario: string | null;
  imagenBase64: string | null;
  imagenMimeType: TipoMimeBannerInicio | null;
  orden: number;
  /** Punto de enfoque de la imagen (0 a 100); los registros anteriores no lo traen y valen el centro. */
  focoX?: number;
  focoY?: number;
  estado: EstadoBannerInicio;
  idAutor: number | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

const FECHA_SEMILLA = '2026-10-25T00:00:00.000Z';

function crearSemillaInicial(): RegistroBannerPersistencia[] {
  return [
    {
      idBanner: 1,
      tituloLinea1: 'Todo para tu proyecto,',
      tituloLinea2: 'en un solo lugar',
      descripcion:
        'Pinturas arquitectónicas, esmaltes, barnices y accesorios de las mejores marcas. Calidad, asesoría técnica y envío rápido a toda Colombia.',
      textoBotonPrimario: 'Explorar catálogo',
      enlaceBotonPrimario: '/productos',
      textoBotonSecundario: 'Centro de ayuda',
      enlaceBotonSecundario: '/centro-de-ayuda',
      imagenBase64: null,
      imagenMimeType: null,
      orden: 1,
      estado: 'activo',
      idAutor: 1,
      fechaCreacion: FECHA_SEMILLA,
      fechaActualizacion: FECHA_SEMILLA,
    },
    {
      idBanner: 2,
      tituloLinea1: 'Colores y acabados',
      tituloLinea2: 'para interiores y fachadas',
      descripcion:
        'Descubre nuestra línea de vinilos, esmaltes e impermeabilizantes con alta cobertura, lavabilidad y protección duradera frente al clima.',
      textoBotonPrimario: 'Ver pinturas',
      enlaceBotonPrimario: '/productos?categoria=1',
      textoBotonSecundario: 'Preguntas frecuentes',
      enlaceBotonSecundario: '/faq',
      imagenBase64: null,
      imagenMimeType: null,
      orden: 2,
      estado: 'activo',
      idAutor: 1,
      fechaCreacion: FECHA_SEMILLA,
      fechaActualizacion: FECHA_SEMILLA,
    },
    {
      idBanner: 3,
      tituloLinea1: 'Atención especializada para',
      tituloLinea2: 'empresas y contratistas',
      descripcion:
        'Registra tu cuenta corporativa en Pintu Clic y gestiona tus pedidos de obra, remodelación y mantenimiento con respaldo directo.',
      textoBotonPrimario: 'Crear cuenta',
      enlaceBotonPrimario: '/registro',
      textoBotonSecundario: 'Sobre nosotros',
      enlaceBotonSecundario: '/sobre-nosotros',
      imagenBase64: null,
      imagenMimeType: null,
      orden: 3,
      estado: 'activo',
      idAutor: 1,
      fechaCreacion: FECHA_SEMILLA,
      fechaActualizacion: FECHA_SEMILLA,
    },
  ];
}

function mapearPublico(f: RegistroBannerPersistencia): BannerInicioPublicoItem {
  return {
    idBanner: f.idBanner,
    tituloLinea1: f.tituloLinea1,
    tituloLinea2: f.tituloLinea2,
    descripcion: f.descripcion,
    textoBotonPrimario: f.textoBotonPrimario,
    enlaceBotonPrimario: f.enlaceBotonPrimario,
    textoBotonSecundario: f.textoBotonSecundario,
    enlaceBotonSecundario: f.enlaceBotonSecundario,
    tieneImagenPersonalizada: f.imagenMimeType !== null && f.imagenBase64 !== null,
    orden: f.orden,
    focoX: f.focoX ?? 50,
    focoY: f.focoY ?? 50,
  };
}

function mapearAdmin(f: RegistroBannerPersistencia): BannerInicioAdminEntity {
  return {
    ...mapearPublico(f),
    estado: f.estado,
    idAutor: f.idAutor,
    nombreAutor: f.idAutor !== null ? 'Administrador' : null,
    fechaCreacion: f.fechaCreacion,
    fechaActualizacion: f.fechaActualizacion,
  };
}

function ordenarRegistros(lista: RegistroBannerPersistencia[]): RegistroBannerPersistencia[] {
  return [...lista].sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.idBanner - b.idBanner));
}

export class PrismaBannersInicioRepository implements BannersInicioRepositoryPort {
  private readonly rutaArchivo: string;
  private memoria: RegistroBannerPersistencia[] | null = null;

  constructor(rutaArchivo?: string) {
    this.rutaArchivo = rutaArchivo ?? path.resolve(process.cwd(), '.cache', 'landing-banners.json');
  }

  private cargar(): RegistroBannerPersistencia[] {
    if (this.memoria !== null) {
      return this.memoria;
    }
    try {
      if (fs.existsSync(this.rutaArchivo)) {
        const crudo = fs.readFileSync(this.rutaArchivo, 'utf8');
        const parseado = JSON.parse(crudo) as RegistroBannerPersistencia[];
        if (Array.isArray(parseado) && parseado.length > 0) {
          this.memoria = parseado;
          return this.memoria;
        }
      }
    } catch {
      // Si el archivo no existe o no es legible, parte de la semilla inicial.
    }
    this.memoria = crearSemillaInicial();
    return this.memoria;
  }

  private guardar(registros: RegistroBannerPersistencia[]): void {
    this.memoria = registros;
    try {
      const dir = path.dirname(this.rutaArchivo);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.rutaArchivo, JSON.stringify(registros, null, 2), 'utf8');
    } catch {
      // En entornos de solo lectura conserva el estado en memoria del proceso.
    }
  }

  async listarPublicos(): Promise<BannerInicioPublicoItem[]> {
    const activos = ordenarRegistros(this.cargar()).filter((b) => b.estado === 'activo');
    return activos.map(mapearPublico);
  }

  async listarAdmin(estado?: EstadoBannerInicio): Promise<BannerInicioAdminEntity[]> {
    const todos = ordenarRegistros(this.cargar());
    const filtrados = estado !== undefined ? todos.filter((b) => b.estado === estado) : todos;
    return filtrados.map(mapearAdmin);
  }

  async obtenerPorIdAdmin(idBanner: number): Promise<BannerInicioAdminEntity | null> {
    const encontrado = this.cargar().find((b) => b.idBanner === idBanner);
    return encontrado ? mapearAdmin(encontrado) : null;
  }

  async obtenerImagenPublica(idBanner: number): Promise<ImagenBannerBytes | null> {
    const encontrado = this.cargar().find((b) => b.idBanner === idBanner && b.estado === 'activo');
    if (!encontrado || encontrado.imagenBase64 === null || encontrado.imagenMimeType === null) {
      return null;
    }
    return {
      bytes: Buffer.from(encontrado.imagenBase64, 'base64'),
      mimeType: encontrado.imagenMimeType,
    };
  }

  async crear(datos: CrearBannerRepositorioInput): Promise<BannerInicioAdminEntity> {
    const actual = this.cargar();
    const maxId = actual.reduce((max, b) => Math.max(max, b.idBanner), 0);
    const ahora = new Date().toISOString();
    const nuevo: RegistroBannerPersistencia = {
      idBanner: maxId + 1,
      tituloLinea1: datos.tituloLinea1,
      tituloLinea2: datos.tituloLinea2,
      descripcion: datos.descripcion,
      textoBotonPrimario: datos.textoBotonPrimario,
      enlaceBotonPrimario: datos.enlaceBotonPrimario,
      textoBotonSecundario: datos.textoBotonSecundario,
      enlaceBotonSecundario: datos.enlaceBotonSecundario,
      imagenBase64: datos.imagen ? datos.imagen.toString('base64') : null,
      imagenMimeType: datos.imagenMimeType,
      orden: datos.orden,
      focoX: datos.focoX,
      focoY: datos.focoY,
      estado: datos.estado,
      idAutor: datos.idAutor,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };
    this.guardar([...actual, nuevo]);
    return mapearAdmin(nuevo);
  }

  async editar(idBanner: number, datos: EditarBannerRepositorioInput): Promise<BannerInicioAdminEntity> {
    const actual = this.cargar();
    const idx = actual.findIndex((b) => b.idBanner === idBanner);
    const existente = actual[idx];
    if (idx === -1 || !existente) {
      throw new Error('BANNER_NO_ENCONTRADO');
    }
    const actualizado: RegistroBannerPersistencia = {
      ...existente,
      ...(datos.tituloLinea1 !== undefined ? { tituloLinea1: datos.tituloLinea1 } : {}),
      ...(datos.tituloLinea2 !== undefined ? { tituloLinea2: datos.tituloLinea2 } : {}),
      ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
      ...(datos.textoBotonPrimario !== undefined ? { textoBotonPrimario: datos.textoBotonPrimario } : {}),
      ...(datos.enlaceBotonPrimario !== undefined ? { enlaceBotonPrimario: datos.enlaceBotonPrimario } : {}),
      ...(datos.textoBotonSecundario !== undefined ? { textoBotonSecundario: datos.textoBotonSecundario } : {}),
      ...(datos.enlaceBotonSecundario !== undefined ? { enlaceBotonSecundario: datos.enlaceBotonSecundario } : {}),
      ...(datos.orden !== undefined ? { orden: datos.orden } : {}),
      ...(datos.focoX !== undefined ? { focoX: datos.focoX } : {}),
      ...(datos.focoY !== undefined ? { focoY: datos.focoY } : {}),
      ...(datos.imagen !== undefined
        ? {
            imagenBase64: datos.imagen !== null ? datos.imagen.toString('base64') : null,
            imagenMimeType: datos.imagenMimeType ?? null,
          }
        : {}),
      idAutor: datos.idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    const copia = [...actual];
    copia[idx] = actualizado;
    this.guardar(copia);
    return mapearAdmin(actualizado);
  }

  async cambiarEstado(
    idBanner: number,
    estado: EstadoBannerInicio,
    idAutor: number,
  ): Promise<BannerInicioAdminEntity> {
    const actual = this.cargar();
    const idx = actual.findIndex((b) => b.idBanner === idBanner);
    const existente = actual[idx];
    if (idx === -1 || !existente) {
      throw new Error('BANNER_NO_ENCONTRADO');
    }
    const actualizado: RegistroBannerPersistencia = {
      ...existente,
      estado,
      idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    const copia = [...actual];
    copia[idx] = actualizado;
    this.guardar(copia);
    return mapearAdmin(actualizado);
  }

  async eliminar(idBanner: number): Promise<void> {
    const actual = this.cargar();
    this.guardar(actual.filter((b) => b.idBanner !== idBanner));
  }
}
