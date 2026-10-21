import type { EstadoUsuario } from '@prisma/client';
import { prisma } from '../../../core/db/client';

/**
 * Lectura mínima de `usuario`, que pertenece a M04.
 * M20 solo necesita el estado de la cuenta y la derivación de la contraseña.
 */
export interface CredencialUsuario {
  idUsuario: number;
  contrasena: string;
  estado: EstadoUsuario;
}

export class UsuarioRepository {
  async buscarCredencialPorCorreo(correo: string): Promise<CredencialUsuario | null> {
    return prisma.usuario.findUnique({
      where: { correo },
      select: { idUsuario: true, contrasena: true, estado: true },
    });
  }

  async obtenerEstado(idUsuario: number): Promise<EstadoUsuario | null> {
    const fila = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: { estado: true },
    });
    return fila?.estado ?? null;
  }

  /** RN-SEG-03: devuelve solo lo necesario; jamás la derivación de la contraseña. */
  async actualizarContrasena(idUsuario: number, derivacion: string): Promise<void> {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { contrasena: derivacion },
    });
  }
}
