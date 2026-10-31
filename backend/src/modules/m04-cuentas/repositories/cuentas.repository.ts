import type {
  Prisma,
  Usuario,
  CuentaEmpresa,
  Descuento,
  SubRolEmpresa,
  UsuarioIdentidadExterna,
  EstadoUsuario,
  TipoUsuario,
} from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { esRolDePersonal } from '../../../core/utils/roles';

/** El rol de la cuenta es `usuario.id_rol` (M17 R-ACC-1): aquí viaja solo su nombre. */
export type UsuarioConRol = Usuario & { rolDirecto?: { nombre: string } | null };

/** M17 R-ACC-2: personal = rol `administrador` o `empleado`. Una cuenta empresa nunca lo es. */
export function esUsuarioDePersonal(usuario: UsuarioConRol): boolean {
  if (usuario.tipo === 'empresa') return false;
  return esRolDePersonal(usuario.rolDirecto?.nombre);
}

/** Cuenta empresa con su tipo de cliente y la política de descuento de ese tipo (M06 · D8). */
export type CuentaEmpresaConTipo = CuentaEmpresa & {
  subRolEmpresa?: (SubRolEmpresa & { descuento: Descuento | null }) | null;
};

export interface FiltroCuentasEmpresa {
  busqueda?: string;
  sinTipo?: boolean;
  page: number;
  limit: number;
}

export interface CuentasRepository {
  buscarPorCorreo(correo: string): Promise<UsuarioConRol | null>;
  buscarPorId(idUsuario: number): Promise<UsuarioConRol | null>;
  buscarConEmpresaPorId(idUsuario: number): Promise<(UsuarioConRol & { cuentaEmpresa: CuentaEmpresaConTipo | null }) | null>;
  crearUsuarioCliente(datos: {
    nombre: string;
    correo: string;
    contrasenaHash: string;
    telefono?: string | null;
    estado?: EstadoUsuario;
    tipo?: TipoUsuario;
  }): Promise<Usuario>;
  actualizarDatosPerfil(idUsuario: number, datos: { nombre?: string; telefono?: string | null }): Promise<Usuario>;
  actualizarContrasena(idUsuario: number, contrasenaHash: string, cambioPendiente?: boolean): Promise<Usuario>;
  actualizarCorreo(idUsuario: number, nuevoCorreo: string): Promise<Usuario>;
  actualizarEstado(idUsuario: number, estado: EstadoUsuario): Promise<Usuario>;
  desactivarCuenta(idUsuario: number): Promise<Usuario>;
  buscarIdentidadExterna(proveedor: string, idProveedor: string): Promise<UsuarioIdentidadExterna | null>;
  buscarIdentidadExternaPorUsuario(idUsuario: number, proveedor: string): Promise<UsuarioIdentidadExterna | null>;
  vincularIdentidadExterna(datos: {
    idUsuario: number;
    proveedor: string;
    idProveedor: string;
    correoProveedor?: string | null;
  }): Promise<UsuarioIdentidadExterna>;
  buscarCuentaEmpresaPorNit(nit: string): Promise<CuentaEmpresa | null>;
  buscarCuentaEmpresaPorIdUsuario(idUsuario: number): Promise<CuentaEmpresa | null>;
  /** Cuentas empresa aprobadas, con su tipo de cliente (M06 · D8). */
  listarCuentasEmpresa(filtro: FiltroCuentasEmpresa): Promise<{ items: CuentaEmpresaConTipo[]; total: number }>;
  buscarCuentaEmpresaConTipo(idUsuario: number): Promise<CuentaEmpresaConTipo | null>;
  /** false si la cuenta no existe. */
  asignarTipoCuentaEmpresa(idUsuario: number, idSubRolEmpresa: number): Promise<boolean>;
}

const INCLUIR_TIPO = { subRolEmpresa: { include: { descuento: true } } } as const;

export class PrismaCuentasRepository implements CuentasRepository {
  async buscarPorCorreo(correo: string): Promise<UsuarioConRol | null> {
    const normalizado = correo.trim().toLowerCase();
    return prisma.usuario.findFirst({
      where: {
        correo: {
          equals: normalizado,
          mode: 'insensitive',
        },
      },
      include: {
        rolDirecto: { select: { nombre: true } },
      },
    });
  }

  async buscarPorId(idUsuario: number): Promise<UsuarioConRol | null> {
    return prisma.usuario.findUnique({
      where: { idUsuario },
      include: {
        rolDirecto: { select: { nombre: true } },
      },
    });
  }

  async buscarConEmpresaPorId(idUsuario: number): Promise<(UsuarioConRol & { cuentaEmpresa: CuentaEmpresaConTipo | null }) | null> {
    return prisma.usuario.findUnique({
      where: { idUsuario },
      include: {
        cuentaEmpresa: { include: INCLUIR_TIPO },
        rolDirecto: { select: { nombre: true } },
      },
    });
  }

  async crearUsuarioCliente(datos: {
    nombre: string;
    correo: string;
    contrasenaHash: string;
    telefono?: string | null;
    estado?: 'activo' | 'pendiente';
    tipo?: 'normal' | 'empresa';
  }): Promise<Usuario> {
    return prisma.usuario.create({
      data: {
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim().toLowerCase(),
        contrasena: datos.contrasenaHash,
        telefono: datos.telefono?.trim() ?? null,
        estado: datos.estado ?? 'activo',
        tipo: datos.tipo ?? 'normal',
      },
    });
  }

  async actualizarDatosPerfil(idUsuario: number, datos: { nombre?: string; telefono?: string | null }): Promise<Usuario> {
    const data: Prisma.UsuarioUpdateInput = {};
    if (datos.nombre !== undefined) {
      data.nombre = datos.nombre.trim();
    }
    if (datos.telefono !== undefined) {
      data.telefono = datos.telefono?.trim() ?? null;
    }
    return prisma.usuario.update({
      where: { idUsuario },
      data,
    });
  }

  async actualizarContrasena(idUsuario: number, contrasenaHash: string, cambioPendiente = false): Promise<Usuario> {
    return prisma.usuario.update({
      where: { idUsuario },
      data: {
        contrasena: contrasenaHash,
        cambioContrasenaPendiente: cambioPendiente,
      },
    });
  }

  async actualizarCorreo(idUsuario: number, nuevoCorreo: string): Promise<Usuario> {
    return prisma.usuario.update({
      where: { idUsuario },
      data: {
        correo: nuevoCorreo.trim().toLowerCase(),
      },
    });
  }

  async actualizarEstado(idUsuario: number, estado: EstadoUsuario): Promise<Usuario> {
    return prisma.usuario.update({
      where: { idUsuario },
      data: { estado },
    });
  }

  async desactivarCuenta(idUsuario: number): Promise<Usuario> {
    return prisma.usuario.update({
      where: { idUsuario },
      data: { estado: 'inactivo' },
    });
  }

  async buscarIdentidadExterna(proveedor: string, idProveedor: string): Promise<UsuarioIdentidadExterna | null> {
    return prisma.usuarioIdentidadExterna.findUnique({
      where: {
        proveedor_idProveedor: {
          proveedor,
          idProveedor,
        },
      },
    });
  }

  async buscarIdentidadExternaPorUsuario(
    idUsuario: number,
    proveedor: string,
  ): Promise<UsuarioIdentidadExterna | null> {
    return prisma.usuarioIdentidadExterna.findUnique({
      where: {
        idUsuario_proveedor: {
          idUsuario,
          proveedor,
        },
      },
    });
  }

  async vincularIdentidadExterna(datos: {
    idUsuario: number;
    proveedor: string;
    idProveedor: string;
    correoProveedor?: string | null;
  }): Promise<UsuarioIdentidadExterna> {
    return prisma.usuarioIdentidadExterna.create({
      data: {
        idUsuario: datos.idUsuario,
        proveedor: datos.proveedor,
        idProveedor: datos.idProveedor,
        correoProveedor: datos.correoProveedor?.trim().toLowerCase() ?? null,
      },
    });
  }

  async buscarCuentaEmpresaPorNit(nit: string): Promise<CuentaEmpresa | null> {
    return prisma.cuentaEmpresa.findUnique({
      where: { nit: nit.trim() },
    });
  }

  async buscarCuentaEmpresaPorIdUsuario(idUsuario: number): Promise<CuentaEmpresa | null> {
    return prisma.cuentaEmpresa.findUnique({
      where: { idUsuario },
    });
  }

  async listarCuentasEmpresa(filtro: FiltroCuentasEmpresa): Promise<{ items: CuentaEmpresaConTipo[]; total: number }> {
    const busqueda = filtro.busqueda?.trim();
    const where: Prisma.CuentaEmpresaWhereInput = {
      ...(filtro.sinTipo === true ? { idSubRolEmpresa: null } : {}),
      ...(busqueda === undefined || busqueda === ''
        ? {}
        : {
            OR: [
              { nombreEmpresa: { contains: busqueda, mode: 'insensitive' } },
              { nombreRepresentante: { contains: busqueda, mode: 'insensitive' } },
              { nit: { contains: busqueda } },
            ],
          }),
    };
    const [total, items] = await Promise.all([
      prisma.cuentaEmpresa.count({ where }),
      prisma.cuentaEmpresa.findMany({
        where,
        include: INCLUIR_TIPO,
        orderBy: [{ nombreEmpresa: 'asc' }, { idUsuario: 'asc' }],
        skip: (filtro.page - 1) * filtro.limit,
        take: filtro.limit,
      }),
    ]);
    return { items, total };
  }

  async buscarCuentaEmpresaConTipo(idUsuario: number): Promise<CuentaEmpresaConTipo | null> {
    return prisma.cuentaEmpresa.findUnique({ where: { idUsuario }, include: INCLUIR_TIPO });
  }

  async asignarTipoCuentaEmpresa(idUsuario: number, idSubRolEmpresa: number): Promise<boolean> {
    const { count } = await prisma.cuentaEmpresa.updateMany({
      where: { idUsuario },
      data: { idSubRolEmpresa, fechaActualizacion: new Date() },
    });
    return count > 0;
  }
}
