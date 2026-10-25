import {
  BANNER_INICIO_MAXIMO_BYTES,
  CODIGOS_ERROR_LANDING,
  MENSAJE_RECURSO_NO_DISPONIBLE_LANDING,
  type BannerInicioAdminEntity,
  type BannerInicioPublicoItem,
  type CodigoErrorLanding,
  type CrearBannerInicioRequest,
  type EditarBannerInicioRequest,
  type EstadoBannerInicio,
  type TipoMimeBannerInicio,
} from './fp01-landing.dto';
import type {
  BannersInicioRepositoryPort,
  ImagenBannerBytes,
} from './banners.repository';

export class LandingBannerError extends Error {
  constructor(
    public readonly code: CodigoErrorLanding,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'LandingBannerError';
  }
}

const FIRMAS_IMAGEN: Record<TipoMimeBannerInicio, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length > 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) =>
    b.length > 12 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP',
};

export function detectarMimePorFirma(b: Buffer): TipoMimeBannerInicio | null {
  if (FIRMAS_IMAGEN['image/png'](b)) return 'image/png';
  if (FIRMAS_IMAGEN['image/jpeg'](b)) return 'image/jpeg';
  if (FIRMAS_IMAGEN['image/webp'](b)) return 'image/webp';
  return null;
}

export function decodificarImagenBanner(
  base64: string,
  mimeType: TipoMimeBannerInicio,
): Buffer {
  const limpio = base64.trim();
  if (limpio === '' || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) {
    throw new LandingBannerError(
      CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
      'La imagen del banner no es un base64 válido.',
      400,
    );
  }
  const bytes = Buffer.from(limpio, 'base64');
  if (bytes.length === 0) {
    throw new LandingBannerError(
      CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
      'La imagen del banner está vacía.',
      400,
    );
  }
  if (bytes.length > BANNER_INICIO_MAXIMO_BYTES) {
    throw new LandingBannerError(
      CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
      'La imagen del banner no puede superar 5 MB.',
      400,
    );
  }
  const mimeReal = detectarMimePorFirma(bytes);
  if (!mimeReal) {
    throw new LandingBannerError(
      CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
      `El archivo no corresponde a una imagen ${mimeType} válida (PNG, JPG o WEBP).`,
      400,
    );
  }
  return bytes;
}

const TTL_CACHE_MS = 5 * 60 * 1000;

export class BannersInicioService {
  private cachePublicos: { datos: BannerInicioPublicoItem[]; expiraEn: number } | null = null;

  constructor(private readonly repo: BannersInicioRepositoryPort) {}

  invalidarCache(): void {
    this.cachePublicos = null;
  }

  async listarPublicos(): Promise<BannerInicioPublicoItem[]> {
    const ahora = Date.now();
    if (this.cachePublicos && this.cachePublicos.expiraEn > ahora) {
      return this.cachePublicos.datos;
    }
    const datos = await this.repo.listarPublicos();
    this.cachePublicos = { datos, expiraEn: ahora + TTL_CACHE_MS };
    return datos;
  }

  async obtenerImagen(idBanner: number): Promise<ImagenBannerBytes> {
    const img = await this.repo.obtenerImagenPublica(idBanner);
    if (!img) {
      throw new LandingBannerError(
        CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
        MENSAJE_RECURSO_NO_DISPONIBLE_LANDING,
        404,
      );
    }
    return img;
  }

  async listarAdmin(): Promise<BannerInicioAdminEntity[]> {
    return this.repo.listarAdmin();
  }

  async crear(
    input: CrearBannerInicioRequest,
    idAutor: number,
  ): Promise<BannerInicioAdminEntity> {
    let imagen: Buffer | null = null;
    let imagenMimeType: TipoMimeBannerInicio | null = null;

    if (input.imagenBase64 && input.imagenMimeType) {
      imagen = decodificarImagenBanner(input.imagenBase64, input.imagenMimeType);
      imagenMimeType = detectarMimePorFirma(imagen) ?? input.imagenMimeType;
    } else if (input.imagenBase64 || input.imagenMimeType) {
      throw new LandingBannerError(
        CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
        'Debe enviar tanto imagenBase64 como imagenMimeType para subir una imagen.',
        400,
      );
    }

    const creado = await this.repo.crear({
      tituloLinea1: input.tituloLinea1.trim(),
      tituloLinea2: input.tituloLinea2?.trim() ? input.tituloLinea2.trim() : null,
      descripcion: input.descripcion.trim(),
      textoBotonPrimario: input.textoBotonPrimario.trim(),
      enlaceBotonPrimario: input.enlaceBotonPrimario.trim(),
      textoBotonSecundario: input.textoBotonSecundario?.trim()
        ? input.textoBotonSecundario.trim()
        : null,
      enlaceBotonSecundario: input.enlaceBotonSecundario?.trim()
        ? input.enlaceBotonSecundario.trim()
        : null,
      imagen,
      imagenMimeType,
      orden: input.orden,
      estado: input.estado,
      idAutor,
    });

    this.invalidarCache();
    return creado;
  }

  async editar(
    idBanner: number,
    input: EditarBannerInicioRequest,
    idAutor: number,
  ): Promise<BannerInicioAdminEntity> {
    const actual = await this.repo.obtenerPorIdAdmin(idBanner);
    if (!actual) {
      throw new LandingBannerError(
        CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
        MENSAJE_RECURSO_NO_DISPONIBLE_LANDING,
        404,
      );
    }

    let imagen: Buffer | undefined;
    let imagenMimeType: TipoMimeBannerInicio | undefined;

    if (input.imagenBase64 && input.imagenMimeType) {
      imagen = decodificarImagenBanner(input.imagenBase64, input.imagenMimeType);
      imagenMimeType = detectarMimePorFirma(imagen) ?? input.imagenMimeType;
    } else if (input.imagenBase64 || input.imagenMimeType) {
      throw new LandingBannerError(
        CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
        'Debe enviar tanto imagenBase64 como imagenMimeType para actualizar la imagen.',
        400,
      );
    }

    const editado = await this.repo.editar(idBanner, {
      ...(input.tituloLinea1 !== undefined ? { tituloLinea1: input.tituloLinea1.trim() } : {}),
      ...(input.tituloLinea2 !== undefined
        ? { tituloLinea2: input.tituloLinea2?.trim() ? input.tituloLinea2.trim() : null }
        : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion.trim() } : {}),
      ...(input.textoBotonPrimario !== undefined
        ? { textoBotonPrimario: input.textoBotonPrimario.trim() }
        : {}),
      ...(input.enlaceBotonPrimario !== undefined
        ? { enlaceBotonPrimario: input.enlaceBotonPrimario.trim() }
        : {}),
      ...(input.textoBotonSecundario !== undefined
        ? {
            textoBotonSecundario: input.textoBotonSecundario?.trim()
              ? input.textoBotonSecundario.trim()
              : null,
          }
        : {}),
      ...(input.enlaceBotonSecundario !== undefined
        ? {
            enlaceBotonSecundario: input.enlaceBotonSecundario?.trim()
              ? input.enlaceBotonSecundario.trim()
              : null,
          }
        : {}),
      ...(imagen !== undefined ? { imagen } : {}),
      ...(imagenMimeType !== undefined ? { imagenMimeType } : {}),
      ...(input.orden !== undefined ? { orden: input.orden } : {}),
      idAutor,
    });

    this.invalidarCache();
    return editado;
  }

  async cambiarEstado(
    idBanner: number,
    estado: EstadoBannerInicio,
    idAutor: number,
  ): Promise<BannerInicioAdminEntity> {
    const actual = await this.repo.obtenerPorIdAdmin(idBanner);
    if (!actual) {
      throw new LandingBannerError(
        CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
        MENSAJE_RECURSO_NO_DISPONIBLE_LANDING,
        404,
      );
    }
    const actualizado = await this.repo.cambiarEstado(idBanner, estado, idAutor);
    this.invalidarCache();
    return actualizado;
  }

  async eliminar(idBanner: number): Promise<void> {
    const actual = await this.repo.obtenerPorIdAdmin(idBanner);
    if (!actual) {
      throw new LandingBannerError(
        CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
        MENSAJE_RECURSO_NO_DISPONIBLE_LANDING,
        404,
      );
    }
    await this.repo.eliminar(idBanner);
    this.invalidarCache();
  }
}
