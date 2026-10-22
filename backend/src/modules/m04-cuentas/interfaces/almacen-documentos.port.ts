import type { EntidadDocumentoSoporte } from './cuentas.interfaces';

/**
 * ============================================================================
 * PUERTO DE ALMACENAMIENTO DE DOCUMENTOS — M04 (ADR-010)
 * ============================================================================
 * Aísla la custodia y recuperación del archivo RUT adjunto.
 * Permite cambiar el almacenamiento relacional BYTEA por almacenamiento en nube
 * (S3 / GCS) en el futuro sin modificar la capa de dominio.
 * ============================================================================
 */

export interface MetadatosDocumento {
  idDocumento: string;
  nombreOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  sha256: string;
  fechaCarga: Date;
}

export interface AlmacenDocumentosPort {
  guardarDocumento(
    nombreOriginal: string,
    tipoMime: string,
    contenido: Buffer
  ): Promise<MetadatosDocumento>;

  obtenerMetadatos(idDocumento: string): Promise<MetadatosDocumento | null>;

  obtenerDocumentoCompleto(idDocumento: string): Promise<EntidadDocumentoSoporte | null>;
}
