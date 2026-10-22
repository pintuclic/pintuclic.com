import crypto from 'node:crypto';
import { prisma } from '../../../core/db/client';
import type {
  AlmacenDocumentosPort,
  MetadatosDocumento,
} from '../interfaces/almacen-documentos.port';
import type { EntidadDocumentoSoporte } from '../interfaces/cuentas.interfaces';

const MAX_BYTES_PERMITIDOS = 5 * 1024 * 1024; // 5 MB
const TIPOS_MIME_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export class DocumentoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentoInvalidoError';
  }
}

export class PrismaDocumentosRepository implements AlmacenDocumentosPort {
  async guardarDocumento(
    nombreOriginal: string,
    tipoMime: string,
    contenido: Buffer,
  ): Promise<MetadatosDocumento> {
    if (contenido.length > MAX_BYTES_PERMITIDOS) {
      throw new DocumentoInvalidoError(
        `El tamaño del archivo (${contenido.length} bytes) excede el límite permitido de 5 MB.`,
      );
    }

    if (!TIPOS_MIME_PERMITIDOS.has(tipoMime.toLowerCase())) {
      throw new DocumentoInvalidoError(
        `Tipo MIME '${tipoMime}' no permitido. Formatos aceptados: PDF, JPEG, PNG.`,
      );
    }

    const sha256 = crypto.createHash('sha256').update(contenido).digest('hex');

    const creado = await prisma.documentoSoporte.create({
      data: {
        nombreOriginal: nombreOriginal.trim(),
        tipoMime: tipoMime.toLowerCase(),
        tamanoBytes: contenido.length,
        sha256,
        contenido: new Uint8Array(contenido),
      },
      select: {
        idDocumento: true,
        nombreOriginal: true,
        tipoMime: true,
        tamanoBytes: true,
        sha256: true,
        fechaCarga: true,
      },
    });

    return creado;
  }

  async obtenerMetadatos(idDocumento: string): Promise<MetadatosDocumento | null> {
    return prisma.documentoSoporte.findUnique({
      where: { idDocumento },
      select: {
        idDocumento: true,
        nombreOriginal: true,
        tipoMime: true,
        tamanoBytes: true,
        sha256: true,
        fechaCarga: true,
      },
    });
  }

  async obtenerDocumentoCompleto(idDocumento: string): Promise<EntidadDocumentoSoporte | null> {
    const doc = await prisma.documentoSoporte.findUnique({
      where: { idDocumento },
    });

    if (doc === null) {
      return null;
    }

    return {
      idDocumento: doc.idDocumento,
      nombreOriginal: doc.nombreOriginal,
      tipoMime: doc.tipoMime,
      tamanoBytes: doc.tamanoBytes,
      sha256: doc.sha256,
      contenido: Buffer.from(doc.contenido),
      fechaCarga: doc.fechaCarga,
    };
  }
}
