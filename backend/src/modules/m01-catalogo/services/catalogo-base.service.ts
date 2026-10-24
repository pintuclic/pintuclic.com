import type { CambiarEstadoRequest, Estado, ImpactoDesactivacion } from '../dtos/m01-catalogo.dto';
import type { CODIGOS_ERROR_CATALOGO } from '../dtos/m01-catalogo.dto';
import type { CODIGOS_ERROR_PRODUCTOS } from '../dtos/m01-catalogo-productos.dto';

/** Códigos de las dos entregas del contrato; comparten el mismo envelope. */
export type CodigoErrorCatalogo = (typeof CODIGOS_ERROR_CATALOGO)[number] | (typeof CODIGOS_ERROR_PRODUCTOS)[number];

/** `details` del envelope: el impacto de una desactivación, o el campo que causó el error. */
export type DetallesError = ImpactoDesactivacion | { campo: string } | null;

/**
 * Error de dominio de M01. `code` y `status` salen tal cual en el envelope
 * `{ success: false, error: { code, message, details } }` (contrato, sección 5).
 */
export class CatalogoError extends Error {
  constructor(
    public readonly code: CodigoErrorCatalogo,
    message: string,
    public readonly status: number,
    public readonly details: DetallesError = null,
  ) {
    super(message);
    this.name = 'CatalogoError';
  }
}

export const MENSAJE_NO_DISPONIBLE = 'El recurso solicitado no está disponible.';

export const errores = {
  /** 404: recurso inexistente (y, en el middleware, toda denegación). */
  noDisponible: (): CatalogoError => new CatalogoError('RECURSO_NO_DISPONIBLE', MENSAJE_NO_DISPONIBLE, 404),
  parametroInvalido: (mensaje: string): CatalogoError => new CatalogoError('PARAMETRO_INVALIDO', mensaje, 400),
  nombreDuplicado: (que: string): CatalogoError =>
    new CatalogoError('NOMBRE_DUPLICADO', `Ya existe ${que} con ese nombre.`, 409),
  padreInactivo: (padre: string): CatalogoError =>
    new CatalogoError('PADRE_INACTIVO', `No se puede: ${padre} está inactivo.`, 409),
  confirmacionRequerida: (impacto: ImpactoDesactivacion): CatalogoError =>
    new CatalogoError(
      'CONFIRMACION_REQUERIDA',
      'La desactivación afecta otros elementos. Envíe confirmar: true para continuar.',
      409,
      impacto,
    ),
  logotipoInvalido: (mensaje: string): CatalogoError => new CatalogoError('LOGOTIPO_INVALIDO', mensaje, 400),
  /** Entrega 2: duplicado en un campo (código de color, SKU, nombre de producto…). */
  duplicado: (que: string, campo: string): CatalogoError =>
    new CatalogoError('DUPLICADO', `Ya existe ${que}.`, 409, { campo }),
  /** Entrega 2: un id enviado en el cuerpo no existe o no es usable (base inactiva, marca ajena…). */
  relacionInvalida: (mensaje: string, campo: string): CatalogoError =>
    new CatalogoError('RELACION_INVALIDA', mensaje, 409, { campo }),
  /** Entrega 2 (P7): publicar un producto que no cumple las condiciones. */
  noPublicable: (mensaje: string): CatalogoError => new CatalogoError('NO_PUBLICABLE', mensaje, 409),
  acabadoProtegido: (): CatalogoError =>
    new CatalogoError('ACABADO_PROTEGIDO', 'El acabado por defecto no se puede renombrar ni desactivar.', 409),
};

/** Violación de una restricción única de la BD (carrera entre dos peticiones): código Prisma P2002. */
export function esViolacionUnica(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

export function totalImpacto(impacto: ImpactoDesactivacion): number {
  return (
    impacto.productos +
    impacto.subcategorias +
    impacto.lineas +
    impacto.colores +
    impacto.variantes +
    impacto.reglasComerciales
  );
}

interface CambioEstado<E extends { estado: Estado }> {
  actual: E;
  peticion: CambiarEstadoRequest;
  contarImpacto: () => Promise<ImpactoDesactivacion>;
  /** R7: el padre debe estar activo para reactivar. */
  padreActivo: () => Promise<boolean>;
  /** Nombre del padre para el mensaje ("la categoría", "la marca"…). */
  etiquetaPadre: string;
  cambiar: (estado: Estado) => Promise<E>;
}

/** Reglas comunes a todos los servicios del catálogo. */
export abstract class ServicioCatalogoBase {
  /** Convierte "no encontrado" en el 404 estándar. */
  protected exigir<T>(valor: T | null | undefined): T {
    if (valor === null || valor === undefined) {
      throw errores.noDisponible();
    }
    return valor;
  }

  protected async exigirNombreLibre(existe: Promise<boolean>, que: string): Promise<void> {
    if (await existe) {
      throw errores.nombreDuplicado(que);
    }
  }

  /**
   * R6 y R7. Reactivar verifica el padre; desactivar informa el impacto y exige
   * `confirmar: true` si hay algo afectado. Repetir el estado actual no hace nada.
   */
  protected async aplicarCambioEstado<E extends { estado: Estado }>(args: CambioEstado<E>): Promise<E> {
    const { actual, peticion } = args;
    if (actual.estado === peticion.estado) {
      return actual;
    }
    if (peticion.estado === 'activo') {
      if (!(await args.padreActivo())) {
        throw errores.padreInactivo(args.etiquetaPadre);
      }
      return args.cambiar('activo');
    }
    const impacto = await args.contarImpacto();
    if (totalImpacto(impacto) > 0 && !peticion.confirmar) {
      throw errores.confirmacionRequerida(impacto);
    }
    return args.cambiar('inactivo');
  }
}
