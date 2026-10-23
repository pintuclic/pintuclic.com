import type { ControlIntentoAcceso } from '@prisma/client';
import { prisma } from '../../../core/db/client';

export interface ControlIntentosRepository {
  obtener(correo: string): Promise<ControlIntentoAcceso | null>;
  registrarFallo(
    correo: string,
    maxIntentosAntesDeBloqueo: number,
    duracionBloqueoMinutos: number,
    ahora?: Date,
  ): Promise<ControlIntentoAcceso>;
  limpiar(correo: string): Promise<void>;
}

export class PrismaControlIntentosRepository implements ControlIntentosRepository {
  async obtener(correo: string): Promise<ControlIntentoAcceso | null> {
    return prisma.controlIntentoAcceso.findUnique({
      where: { correo: correo.trim().toLowerCase() },
    });
  }

  async registrarFallo(
    correo: string,
    maxIntentosAntesDeBloqueo = 5,
    duracionBloqueoMinutos = 15,
    ahora: Date = new Date(),
  ): Promise<ControlIntentoAcceso> {
    const normalizado = correo.trim().toLowerCase();
    const actual = await prisma.controlIntentoAcceso.findUnique({
      where: { correo: normalizado },
    });

    const nuevosIntentos = (actual?.intentosFallidos ?? 0) + 1;
    let bloqueadoHasta: Date | null = null;

    if (nuevosIntentos >= maxIntentosAntesDeBloqueo) {
      bloqueadoHasta = new Date(ahora.getTime() + duracionBloqueoMinutos * 60 * 1000);
    }

    return prisma.controlIntentoAcceso.upsert({
      where: { correo: normalizado },
      create: {
        correo: normalizado,
        intentosFallidos: 1,
        bloqueadoHasta,
        fechaUltimoIntento: ahora,
      },
      update: {
        intentosFallidos: nuevosIntentos,
        bloqueadoHasta,
        fechaUltimoIntento: ahora,
      },
    });
  }

  async limpiar(correo: string): Promise<void> {
    const normalizado = correo.trim().toLowerCase();
    await prisma.controlIntentoAcceso.deleteMany({
      where: { correo: normalizado },
    });
  }
}
