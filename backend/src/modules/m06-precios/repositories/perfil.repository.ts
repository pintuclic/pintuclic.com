import { prisma } from '../../../core/db/client';
import type { PerfilComercial } from '../dtos/m06-precios.dto';
import type { PerfilRepositoryPort } from '../interfaces/precios.interface';

/** Lectura de `usuario` y `cuenta_empresa` para saber quién es el cliente (D7). No escribe nada. */
export class PerfilRepository implements PerfilRepositoryPort {
  async perfilDe(idUsuario: number): Promise<PerfilComercial> {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: { tipo: true, cuentaEmpresa: { select: { idSubRolEmpresa: true } } },
    });
    if (usuario === null || usuario.tipo !== 'empresa') return { tipo: 'particular', idSubRolEmpresa: null };
    return { tipo: 'empresa', idSubRolEmpresa: usuario.cuentaEmpresa?.idSubRolEmpresa ?? null };
  }
}
