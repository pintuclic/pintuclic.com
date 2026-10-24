import { prisma } from '../../../core/db/client';
import type {
  EntidadEnvioNotificacion,
  EntidadRebote,
  EstadoEnvio,
  RegistroEnviosRepositoryPort,
  TipoComunicacion,
} from '../interfaces/registro-envios.port';

export class PrismaRegistroEnviosRepository implements RegistroEnviosRepositoryPort {
  async registrarResultado(datos: {
    tipo: TipoComunicacion;
    destinatario: string;
    estado: EstadoEnvio;
    intentos: number;
    maxIntentos: number;
    ultimoError?: string;
  }): Promise<string> {
    const fila = await prisma.envioNotificacion.create({
      data: {
        tipo: datos.tipo,
        destinatario: datos.destinatario,
        estado: datos.estado,
        intentos: datos.intentos,
        maxIntentos: datos.maxIntentos,
        ultimoError: datos.ultimoError ?? null,
        fechaResultado: new Date(),
      },
    });
    return fila.idEnvio;
  }

  async registrarRebote(idEnvio: string | null, destinatario: string, motivo?: string): Promise<void> {
    await prisma.rebotesNotificacion.create({
      data: {
        idEnvio,
        destinatario,
        motivo: motivo ?? null,
      },
    });
  }

  async listarEnvios(filtros: {
    pagina: number;
    limite: number;
    tipo?: TipoComunicacion | undefined;
    estado?: EstadoEnvio | undefined;
  }): Promise<{ envios: EntidadEnvioNotificacion[]; total: number }> {
    const where = {
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
    };

    const [filas, total] = await Promise.all([
      prisma.envioNotificacion.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      prisma.envioNotificacion.count({ where }),
    ]);

    const envios: EntidadEnvioNotificacion[] = filas.map((f) => ({
      idEnvio: f.idEnvio,
      tipo: f.tipo as TipoComunicacion,
      destinatario: f.destinatario,
      estado: f.estado as EstadoEnvio,
      intentos: f.intentos,
      maxIntentos: f.maxIntentos,
      ultimoError: f.ultimoError,
      fechaCreacion: f.fechaCreacion,
      fechaResultado: f.fechaResultado,
    }));

    return { envios, total };
  }

  async listarRebotes(filtros: { pagina: number; limite: number }): Promise<{
    rebotes: EntidadRebote[];
    total: number;
  }> {
    const [filas, total] = await Promise.all([
      prisma.rebotesNotificacion.findMany({
        orderBy: { fechaRegistro: 'desc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      prisma.rebotesNotificacion.count(),
    ]);

    const rebotes: EntidadRebote[] = filas.map((f) => ({
      idRebote: f.idRebote,
      idEnvio: f.idEnvio,
      destinatario: f.destinatario,
      motivo: f.motivo,
      fechaRegistro: f.fechaRegistro,
    }));

    return { rebotes, total };
  }
}
