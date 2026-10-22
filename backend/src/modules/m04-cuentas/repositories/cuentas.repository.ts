import type { Prisma, Usuario, CuentaEmpresa, UsuarioIdentidadExterna, EstadoUsuario, TipoUsuario } from '@prisma/client';
import { prisma } from '../../../core/db/client';

export interface CuentasRepository {
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  buscarPorId(idUsuario: number): Promise<Usuario | null>;
  buscarConEmpresaPorId(idUsuario: number): Promise<(Usuario & { cuentaEmpresa: CuentaEmpresa | null }) | null>;
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
  vincularIdentidadExterna(datos: {
    idUsuario: number;
    proveedor: string;
    idProveedor: string;
    correoProveedor?: string | null;
  }): Promise<UsuarioIdentidadExterna>;
  buscarCuentaEmpresaPorNit(nit: string): Promise<CuentaEmpresa | null>;
  buscarCuentaEmpresaPorIdUsuario(idUsuario: number): Promise<CuentaEmpresa | null>;
  crearCuentaEmpresa(datos: {
    idUsuario: number;
    nit: string;
    nombreEmpresa: string;
    nombreRepresentante: string;
    correoEmpresarial: string;
    telefono: string;
    idSolicitudOrigen?: string | null;
  }): Promise<CuentaEmpresa>;
  actualizarNitEmpresa(idUsuario: number, nitNuevo: string): Promise<CuentaEmpresa>;
}

export class PrismaCuentasRepository implements CuentasRepository {
  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const normalizado = correo.trim().toLowerCase();
    return prisma.usuario.findFirst({
      where: {
        correo: {
          equals: normalizado,
          mode: 'insensitive',
        },
      },
    });
  }

  async buscarPorId(idUsuario: number): Promise<Usuario | null> {
    return prisma.usuario.findUnique({
      where: { idUsuario },
    });
  }

  async buscarConEmpresaPorId(idUsuario: number): Promise<(Usuario & { cuentaEmpresa: CuentaEmpresa | null }) | null> {
    return prisma.usuario.findUnique({
      where: { idUsuario },
      include: { cuentaEmpresa: true },
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

  async crearCuentaEmpresa(datos: {
    idUsuario: number;
    nit: string;
    nombreEmpresa: string;
    nombreRepresentante: string;
    correoEmpresarial: string;
    telefono: string;
    idSolicitudOrigen?: string | null;
  }): Promise<CuentaEmpresa> {
    return prisma.cuentaEmpresa.create({
      data: {
        idUsuario: datos.idUsuario,
        nit: datos.nit.trim(),
        nombreEmpresa: datos.nombreEmpresa.trim(),
        nombreRepresentante: datos.nombreRepresentante.trim(),
        correoEmpresarial: datos.correoEmpresarial.trim().toLowerCase(),
        telefono: datos.telefono.trim(),
        idSolicitudOrigen: datos.idSolicitudOrigen ?? null,
      },
    });
  }

  async actualizarNitEmpresa(idUsuario: number, nitNuevo: string): Promise<CuentaEmpresa> {
    return prisma.cuentaEmpresa.update({
      where: { idUsuario },
      data: {
        nit: nitNuevo.trim(),
        fechaActualizacion: new Date(),
      },
    });
  }
}
