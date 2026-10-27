import { prisma } from '../../../core/db/client';
import type { ConfiguracionAsesoria, EditarConfiguracionRequest } from '../dtos/cuestionario.dto';
import type { ConfiguracionCalculadoraPort } from '../interfaces/calculadora.interface';
import type { ConfiguracionRepositoryPort } from '../interfaces/cuestionario.interface';

/** Valores de arranque si la fila única no está sembrada (contrato · Q1). */
const POR_DEFECTO: ConfiguracionAsesoria = {
  modoCuestionario: 'fijo',
  manosPorDefecto: null,
  guionCuestionario: '',
  guionAsistente: '',
  iaTiempoEsperaMs: 8000,
  iaReintentos: 2,
  iaSuspensionCuotaMinutos: 60,
  iaRetencionIncidentesDias: 90,
  iaFallosConsecutivosAlerta: 5,
  fechaActualizacion: new Date(0).toISOString(),
};

/**
 * Configuración de M03 (`configuracion_asesoria`, fila única del contrato · D8).
 *
 * Si la fila no está sembrada se devuelven los valores de arranque en lugar de fallar: el
 * cuestionario y la calculadora deben funcionar en una base recién creada. Al guardar, la
 * fila se crea si falta.
 */
export class PrismaConfiguracionAsesoriaRepository
  implements ConfiguracionCalculadoraPort, ConfiguracionRepositoryPort
{
  async obtenerManosPorDefecto(): Promise<number | null> {
    const fila = await prisma.configuracionAsesoria.findUnique({
      where: { idConfiguracion: 1 },
      select: { manosPorDefecto: true },
    });
    // Sin fila no se inventa una sugerencia: RF-ASE-02-06 prohíbe suponer las manos.
    return fila?.manosPorDefecto ?? null;
  }

  async obtener(): Promise<ConfiguracionAsesoria> {
    const fila = await prisma.configuracionAsesoria.findUnique({ where: { idConfiguracion: 1 } });
    if (fila === null) return POR_DEFECTO;
    return {
      modoCuestionario: fila.modoCuestionario,
      manosPorDefecto: fila.manosPorDefecto,
      guionCuestionario: fila.guionCuestionario,
      guionAsistente: fila.guionAsistente,
      iaTiempoEsperaMs: fila.iaTiempoEsperaMs,
      iaReintentos: fila.iaReintentos,
      iaSuspensionCuotaMinutos: fila.iaSuspensionCuotaMinutos,
      iaRetencionIncidentesDias: fila.iaRetencionIncidentesDias,
      iaFallosConsecutivosAlerta: fila.iaFallosConsecutivosAlerta,
      fechaActualizacion: fila.fechaActualizacion.toISOString(),
    };
  }

  async editar(
    datos: EditarConfiguracionRequest,
    idUsuario: number | null,
  ): Promise<ConfiguracionAsesoria> {
    const cambios = {
      ...(datos.modoCuestionario === undefined ? {} : { modoCuestionario: datos.modoCuestionario }),
      ...(datos.manosPorDefecto === undefined ? {} : { manosPorDefecto: datos.manosPorDefecto }),
      ...(datos.guionCuestionario === undefined ? {} : { guionCuestionario: datos.guionCuestionario }),
      ...(datos.guionAsistente === undefined ? {} : { guionAsistente: datos.guionAsistente }),
      ...(datos.iaTiempoEsperaMs === undefined ? {} : { iaTiempoEsperaMs: datos.iaTiempoEsperaMs }),
      ...(datos.iaReintentos === undefined ? {} : { iaReintentos: datos.iaReintentos }),
      ...(datos.iaSuspensionCuotaMinutos === undefined
        ? {}
        : { iaSuspensionCuotaMinutos: datos.iaSuspensionCuotaMinutos }),
      ...(datos.iaRetencionIncidentesDias === undefined
        ? {}
        : { iaRetencionIncidentesDias: datos.iaRetencionIncidentesDias }),
      ...(datos.iaFallosConsecutivosAlerta === undefined
        ? {}
        : { iaFallosConsecutivosAlerta: datos.iaFallosConsecutivosAlerta }),
      fechaActualizacion: new Date(),
      idUsuarioActualizo: idUsuario,
    };

    await prisma.configuracionAsesoria.upsert({
      where: { idConfiguracion: 1 },
      update: cambios,
      create: { idConfiguracion: 1, ...cambios },
    });

    return this.obtener();
  }
}
