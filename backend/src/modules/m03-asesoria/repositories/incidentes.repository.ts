import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  FuncionIa,
  IncidenteIa,
  ListarIncidentesQuery,
  ResultadoIncidenteIa,
  TipoIncidenteIa,
} from '../dtos/incidentes.dto';

/** Lo que el panel necesita leer del registro de incidentes. */
export interface IncidentesRepositoryPort {
  registrar(incidente: {
    funcion: FuncionIa;
    tipo: TipoIncidenteIa;
    intentos: number;
    resultado: ResultadoIncidenteIa;
  }): Promise<void>;
  listar(query: ListarIncidentesQuery): Promise<{ datos: IncidenteIa[]; total: number }>;
  ultimo(): Promise<IncidenteIa | null>;
  /** I8: borra los que pasaron la retención. Devuelve cuántos se fueron. */
  purgar(diasRetencion: number): Promise<number>;
}

const aIncidente = (fila: {
  idIncidente: number;
  fecha: Date;
  servicio: 'gemini';
  funcion: FuncionIa;
  tipo: TipoIncidenteIa;
  intentos: number;
  resultado: ResultadoIncidenteIa;
}): IncidenteIa => ({
  idIncidente: fila.idIncidente,
  fecha: fila.fecha.toISOString(),
  servicio: fila.servicio,
  funcion: fila.funcion,
  tipo: fila.tipo,
  intentos: fila.intentos,
  resultado: fila.resultado,
});

/**
 * Registro técnico de fallos del servicio de IA (HU-ASE-06 · I7, I8).
 *
 * NUNCA guarda el texto de la persona, la respuesta del modelo, la dirección IP ni la clave
 * del servicio: solo qué falló, cuántas veces se intentó y cómo terminó.
 */
export class PrismaIncidentesRepository implements IncidentesRepositoryPort {
  /** I8: la purga se intenta como mucho una vez al día, no en cada registro. */
  private ultimaPurga: number | null = null;

  async registrar(incidente: {
    funcion: FuncionIa;
    tipo: TipoIncidenteIa;
    intentos: number;
    resultado: ResultadoIncidenteIa;
  }): Promise<void> {
    await prisma.incidenteIa.create({
      data: {
        funcion: incidente.funcion,
        tipo: incidente.tipo,
        intentos: incidente.intentos,
        resultado: incidente.resultado,
      },
    });
  }

  async listar(query: ListarIncidentesQuery): Promise<{ datos: IncidenteIa[]; total: number }> {
    const where: Prisma.IncidenteIaWhereInput = {
      ...(query.tipo === undefined ? {} : { tipo: query.tipo }),
      ...(query.desde === undefined && query.hasta === undefined
        ? {}
        : {
            fecha: {
              ...(query.desde === undefined ? {} : { gte: new Date(`${query.desde}T00:00:00Z`) }),
              ...(query.hasta === undefined ? {} : { lte: new Date(`${query.hasta}T23:59:59Z`) }),
            },
          }),
    };

    const [total, filas] = await Promise.all([
      prisma.incidenteIa.count({ where }),
      prisma.incidenteIa.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
    ]);

    return { total, datos: filas.map(aIncidente) };
  }

  async ultimo(): Promise<IncidenteIa | null> {
    const fila = await prisma.incidenteIa.findFirst({ orderBy: { fecha: 'desc' } });
    return fila === null ? null : aIncidente(fila);
  }

  async purgar(diasRetencion: number): Promise<number> {
    const ahora = Date.now();
    if (this.ultimaPurga !== null && ahora - this.ultimaPurga < 24 * 60 * 60 * 1000) return 0;
    this.ultimaPurga = ahora;

    const corte = new Date(ahora - diasRetencion * 24 * 60 * 60 * 1000);
    const { count } = await prisma.incidenteIa.deleteMany({ where: { fecha: { lt: corte } } });
    return count;
  }
}
