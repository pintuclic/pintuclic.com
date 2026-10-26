import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { EntidadMedicion } from '../dtos/m14-patrocinios.dto';
import type { MedicionRepositoryPort, RegistroMedicion, SumaMedicion } from '../interfaces/patrocinios.interface';
import { columnaDeFecha, fechaDeColumna } from '../services/fechas';

/**
 * Totales diarios sin datos personales (M1): la tabla no tiene IP, sesión, cookie ni navegador. Nada se borra (M9).
 */
export class MedicionRepository implements MedicionRepositoryPort {
  async sumar(fecha: string, sumas: readonly SumaMedicion[]): Promise<void> {
    if (sumas.length === 0) return;
    // Un solo INSERT … ON CONFLICT por fila: la suma ocurre en la base, así que dos avisos a la vez no se pisan.
    await prisma.$transaction(
      sumas.map(
        (s) => prisma.$executeRaw`
          INSERT INTO medicion_patrocinio (fecha, entidad, id_entidad, lugar, evento, total)
          VALUES (${columnaDeFecha(fecha)}::date, ${s.entidad}::enum_entidad_medicion, ${s.idEntidad}, ${s.lugar},
                  ${s.evento}::enum_evento_medicion, ${s.total})
          ON CONFLICT (fecha, entidad, id_entidad, lugar, evento)
          DO UPDATE SET total = medicion_patrocinio.total + EXCLUDED.total`,
      ),
    );
  }

  async leer(
    desde: string,
    hasta: string,
    filtro: { entidad?: EntidadMedicion; idEntidad?: number } = {},
  ): Promise<RegistroMedicion[]> {
    const where: Prisma.MedicionPatrocinioWhereInput = {
      fecha: { gte: columnaDeFecha(desde), lte: columnaDeFecha(hasta) },
      ...(filtro.entidad === undefined ? {} : { entidad: filtro.entidad }),
      ...(filtro.idEntidad === undefined ? {} : { idEntidad: filtro.idEntidad }),
    };
    const filas = await prisma.medicionPatrocinio.findMany({
      where,
      orderBy: [{ fecha: 'asc' }, { entidad: 'asc' }, { idEntidad: 'asc' }],
    });
    return filas.map((f) => ({
      fecha: fechaDeColumna(f.fecha),
      entidad: f.entidad,
      idEntidad: f.idEntidad,
      lugar: f.lugar,
      evento: f.evento,
      total: Number(f.total),
    }));
  }
}
