import { prisma } from '../../../core/db/client';
import type { DireccionEntrega, PerfilCheckoutPort } from '../dtos/m07-checkout.dto';

/**
 * Lectura de la cuenta para precargar la pantalla de pago (R12, R14), como el puerto de solo lectura de M08 (D6):
 * no se cambia código de M04. La dirección es la única que M04 permite guardar (HU-CUE-07).
 */
export class PrismaPerfilCheckoutAdapter implements PerfilCheckoutPort {
  async datosDeEntrega(idUsuario: number): Promise<{
    correo: string;
    telefonoPerfil: string | null;
    direccion: DireccionEntrega | null;
  }> {
    const [usuario, direccion] = await Promise.all([
      prisma.usuario.findUniqueOrThrow({ where: { idUsuario }, select: { correo: true, telefono: true } }),
      prisma.direccionCliente.findFirst({
        where: { idUsuario },
        orderBy: { esPredeterminada: 'desc' },
        select: { direccion: true, barrio: true, apartamentoCasa: true, municipio: true, departamento: true, nombreApellido: true, telefono: true },
      }),
    ]);
    return {
      correo: usuario.correo,
      telefonoPerfil: usuario.telefono,
      direccion:
        direccion === null
          ? null
          : {
              direccion: direccion.direccion,
              barrio: direccion.barrio,
              apartamentoCasa: direccion.apartamentoCasa,
              municipio: direccion.municipio,
              departamento: direccion.departamento,
              nombreRecibe: direccion.nombreApellido,
              telefonoRecibe: direccion.telefono,
            },
    };
  }
}
