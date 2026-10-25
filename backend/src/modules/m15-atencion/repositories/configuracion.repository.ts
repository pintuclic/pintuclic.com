import { prisma } from '../../../core/db/client';
import { DIAS_SEMANA, type ConfiguracionWhatsapp, type FranjaHorario } from '../dtos/m15-atencion.dto';
import type { ConfiguracionAtencionRepositoryPort } from '../interfaces/atencion.interface';

/** La configuración de WhatsApp es de fila única (contrato D2). */
const ID_CONFIGURACION_WHATSAPP = 1;

const POSICION_DIA = new Map(DIAS_SEMANA.map((dia, indice) => [dia, indice]));

function ordenarSemana(franjas: FranjaHorario[]): FranjaHorario[] {
  return [...franjas].sort(
    (a, b) => (POSICION_DIA.get(a.diaSemana) ?? 0) - (POSICION_DIA.get(b.diaSemana) ?? 0),
  );
}

export class PrismaConfiguracionAtencionRepository implements ConfiguracionAtencionRepositoryPort {
  async obtenerHorario(): Promise<FranjaHorario[]> {
    const filas = await prisma.horarioAtencion.findMany({
      select: { diaSemana: true, abierto: true, horaInicio: true, horaFin: true },
    });

    return ordenarSemana(
      filas.map((fila) => ({
        diaSemana: fila.diaSemana,
        abierto: fila.abierto,
        horaInicio: fila.horaInicio,
        horaFin: fila.horaFin,
      })),
    );
  }

  async reemplazarHorario(franjas: FranjaHorario[], idAdmin?: number): Promise<FranjaHorario[]> {
    const ahora = new Date();

    // Upsert por día: la semana siempre tiene las 7 filas, exista ya o no.
    await prisma.$transaction(
      franjas.map((franja) =>
        prisma.horarioAtencion.upsert({
          where: { diaSemana: franja.diaSemana },
          create: {
            diaSemana: franja.diaSemana,
            abierto: franja.abierto,
            horaInicio: franja.horaInicio,
            horaFin: franja.horaFin,
            fechaActualizacion: ahora,
            idUsuarioActualizo: idAdmin ?? null,
          },
          update: {
            abierto: franja.abierto,
            horaInicio: franja.horaInicio,
            horaFin: franja.horaFin,
            fechaActualizacion: ahora,
            idUsuarioActualizo: idAdmin ?? null,
          },
        }),
      ),
    );

    return this.obtenerHorario();
  }

  async obtenerWhatsapp(): Promise<ConfiguracionWhatsapp | null> {
    const fila = await prisma.configuracionAtencionWhatsapp.findUnique({
      where: { idConfiguracion: ID_CONFIGURACION_WHATSAPP },
    });

    if (fila === null) {
      return null;
    }

    return {
      destino: fila.destino,
      mensajeBase: fila.mensajeBase,
      fechaActualizacion: fila.fechaActualizacion.toISOString(),
    };
  }

  async guardarWhatsapp(
    destino: string,
    mensajeBase: string | null,
    idAdmin?: number,
  ): Promise<ConfiguracionWhatsapp> {
    const ahora = new Date();
    const fila = await prisma.configuracionAtencionWhatsapp.upsert({
      where: { idConfiguracion: ID_CONFIGURACION_WHATSAPP },
      create: {
        idConfiguracion: ID_CONFIGURACION_WHATSAPP,
        destino,
        mensajeBase,
        fechaActualizacion: ahora,
        idUsuarioActualizo: idAdmin ?? null,
      },
      update: {
        destino,
        mensajeBase,
        fechaActualizacion: ahora,
        idUsuarioActualizo: idAdmin ?? null,
      },
    });

    return {
      destino: fila.destino,
      mensajeBase: fila.mensajeBase,
      fechaActualizacion: fila.fechaActualizacion.toISOString(),
    };
  }
}
