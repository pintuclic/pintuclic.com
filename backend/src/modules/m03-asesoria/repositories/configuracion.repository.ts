import { prisma } from '../../../core/db/client';
import type { ConfiguracionCalculadoraPort } from '../interfaces/calculadora.interface';

/**
 * Configuración de M03 (`configuracion_asesoria`, fila única del contrato · D8).
 *
 * En esta entrega solo se lee `manos_por_defecto`, la sugerencia de K9. El resto de la fila
 * (el modo de cuestionario y los parámetros de IA) lo consumen las etapas E3 y E4.
 */
export class PrismaConfiguracionAsesoriaRepository implements ConfiguracionCalculadoraPort {
  async obtenerManosPorDefecto(): Promise<number | null> {
    const fila = await prisma.configuracionAsesoria.findUnique({
      where: { idConfiguracion: 1 },
      select: { manosPorDefecto: true },
    });
    // Si la fila no está sembrada, no se inventa una sugerencia: RF-ASE-02-06 prohíbe
    // suponer las manos, así que la ausencia se trata como «sin sugerencia».
    return fila?.manosPorDefecto ?? null;
  }
}
