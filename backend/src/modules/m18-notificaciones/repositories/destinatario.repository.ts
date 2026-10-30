import { prisma } from '../../../core/db/client';
import type { BuscadorDestinatarioPort, DestinatarioAviso } from '../interfaces/destinatario.port';

export class PrismaDestinatarioRepository implements BuscadorDestinatarioPort {
  async buscar(idUsuario: number): Promise<DestinatarioAviso | null> {
    return prisma.usuario.findUnique({ where: { idUsuario }, select: { nombre: true, correo: true } });
  }
}
