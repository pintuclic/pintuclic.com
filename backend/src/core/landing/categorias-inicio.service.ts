import sharp from 'sharp';
import {
  CODIGOS_ERROR_LANDING,
  type CategoriaInicioAdminEntity,
  type CategoriaInicioPublicaItem,
  type GuardarImagenCategoriaInicioRequest,
} from './fp01-landing.dto';
import type { CategoriasInicioRepositoryPort, ImagenCategoriaBytes } from './categorias-inicio.repository';
import { LandingBannerError, decodificarImagenBanner } from './banners.service';

/** La tarjeta mide unos 300 px de ancho: 1200 px alcanza para pantallas de alta densidad sin guardar fotos de varios MB. */
const LADO_MAXIMO_PX = 1200;

const noDisponible = (): LandingBannerError =>
  new LandingBannerError(CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE, 'El recurso solicitado no está disponible.', 404);

/** Imágenes de las tarjetas de categorías del inicio (FP-01 · C1–C6). */
export class CategoriasInicioService {
  constructor(private readonly repositorio: CategoriasInicioRepositoryPort) {}

  listarPublicas(): Promise<CategoriaInicioPublicaItem[]> {
    return this.repositorio.listarPublicas();
  }

  async obtenerImagen(idCategoria: number): Promise<ImagenCategoriaBytes> {
    const imagen = await this.repositorio.obtenerImagen(idCategoria);
    if (imagen === null) throw noDisponible();
    return imagen;
  }

  listarAdmin(): Promise<CategoriaInicioAdminEntity[]> {
    return this.repositorio.listarAdmin();
  }

  async guardar(
    idCategoria: number,
    datos: GuardarImagenCategoriaInicioRequest,
    idAutor: number | null,
  ): Promise<CategoriaInicioAdminEntity> {
    let imagen: { bytes: Buffer; mimeType: 'image/webp' } | undefined;
    if (datos.imagenBase64 !== undefined && datos.imagenMimeType !== undefined) {
      // Valida la firma real del archivo (C2) y la reduce: sin exigir un tamaño ni una proporción de origen.
      const original = decodificarImagenBanner(datos.imagenBase64, datos.imagenMimeType);
      try {
        const bytes = await sharp(original)
          .rotate()
          .resize({ width: LADO_MAXIMO_PX, height: LADO_MAXIMO_PX, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        imagen = { bytes, mimeType: 'image/webp' };
      } catch {
        throw new LandingBannerError(CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA, 'No se pudo leer la imagen. Prueba con otro archivo PNG, JPG o WEBP.', 400);
      }
    }

    const guardada = await this.repositorio.guardar(idCategoria, {
      ...(imagen === undefined ? {} : { imagen }),
      ...(datos.focoX === undefined ? {} : { focoX: datos.focoX }),
      ...(datos.focoY === undefined ? {} : { focoY: datos.focoY }),
      idAutor,
    });
    if (guardada === null) {
      if (imagen === undefined) {
        throw new LandingBannerError(CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA, 'Esa categoría todavía no tiene imagen: sube una primero.', 400);
      }
      throw noDisponible();
    }
    return guardada;
  }

  async quitar(idCategoria: number): Promise<void> {
    await this.repositorio.quitar(idCategoria);
  }
}
