import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { EntradaUsoCupon, Estado, ResultadoUsoCupon } from '../dtos/m06-precios.dto';
import type {
  CuponesRepositoryPort,
  DatosCupon,
  FilaCupon,
  FilaUsoCupon,
  Pagina,
} from '../interfaces/precios.interface';

const SELECCION = {
  idCupon: true,
  codigo: true,
  nombre: true,
  descripcion: true,
  tipoValor: true,
  valor: true,
  montoMinimoCompra: true,
  usosMaximos: true,
  usosPorUsuario: true,
  audiencia: true,
  fechaInicio: true,
  fechaFin: true,
  estado: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  usuarioActualizo: { select: { nombre: true } },
  _count: { select: { usos: { where: { liberadoEn: null } } } },
} satisfies Prisma.CuponSelect;

type FilaPrisma = Prisma.CuponGetPayload<{ select: typeof SELECCION }>;

function aFila(f: FilaPrisma): FilaCupon {
  return {
    idCupon: f.idCupon,
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    tipoValor: f.tipoValor,
    valor: Number(f.valor),
    montoMinimoCompra: f.montoMinimoCompra === null ? null : Number(f.montoMinimoCompra),
    usosMaximos: f.usosMaximos,
    usosPorUsuario: f.usosPorUsuario,
    audiencia: f.audiencia,
    fechaInicio: f.fechaInicio,
    fechaFin: f.fechaFin,
    estado: f.estado,
    usosActuales: f._count.usos,
    fechaCreacion: f.fechaCreacion,
    fechaActualizacion: f.fechaActualizacion,
    actualizadoPor: f.usuarioActualizo?.nombre ?? null,
  };
}

const esViolacionDeUnicidad = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';

export class CuponesRepository implements CuponesRepositoryPort {
  async listarTodos(): Promise<FilaCupon[]> {
    const filas = await prisma.cupon.findMany({ select: SELECCION, orderBy: { idCupon: 'desc' } });
    return filas.map(aFila);
  }

  async obtener(idCupon: number): Promise<FilaCupon | null> {
    const f = await prisma.cupon.findUnique({ where: { idCupon }, select: SELECCION });
    return f === null ? null : aFila(f);
  }

  async buscarPorCodigo(codigo: string): Promise<FilaCupon | null> {
    const f = await prisma.cupon.findUnique({ where: { codigo }, select: SELECCION });
    return f === null ? null : aFila(f);
  }

  async crear(codigo: string, datos: DatosCupon, idUsuario: number): Promise<number | null> {
    try {
      const c = await prisma.cupon.create({
        data: { codigo, ...datos, idUsuarioActualizo: idUsuario },
        select: { idCupon: true },
      });
      return c.idCupon;
    } catch (e: unknown) {
      if (esViolacionDeUnicidad(e)) return null;
      throw e;
    }
  }

  async actualizar(idCupon: number, datos: DatosCupon, idUsuario: number): Promise<boolean> {
    const { count } = await prisma.cupon.updateMany({
      where: { idCupon },
      data: { ...datos, idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
    });
    return count > 0;
  }

  async cambiarEstado(idCupon: number, estado: Estado, idUsuario: number): Promise<boolean> {
    const { count } = await prisma.cupon.updateMany({
      where: { idCupon },
      data: { estado, idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
    });
    return count > 0;
  }

  contarUsosDeUsuario(idCupon: number, idUsuario: number): Promise<number> {
    return prisma.cuponUso.count({ where: { idCupon, idUsuario, liberadoEn: null } });
  }

  async listarUsos(
    idCupon: number,
    incluirLiberados: boolean,
    pagina: number,
    limite: number,
  ): Promise<Pagina<FilaUsoCupon>> {
    const where: Prisma.CuponUsoWhereInput = { idCupon, ...(incluirLiberados ? {} : { liberadoEn: null }) };
    const [total, filas] = await Promise.all([
      prisma.cuponUso.count({ where }),
      prisma.cuponUso.findMany({
        where,
        orderBy: { idCuponUso: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        include: { usuario: { select: { nombre: true } } },
      }),
    ]);
    return {
      total,
      items: filas.map((u) => ({
        idCuponUso: u.idCuponUso,
        idCupon: u.idCupon,
        idUsuario: u.idUsuario,
        usuario: u.usuario?.nombre ?? null,
        referencia: u.referencia,
        importeDescuento: Number(u.importeDescuento),
        fecha: u.fecha,
        liberadoEn: u.liberadoEn,
      })),
    };
  }

  /**
   * R15: bloquea la fila del cupón para que dos órdenes simultáneas no se pasen de `usosMaximos`, y
   * registra el uso. Repetir la misma `referencia` no gasta otro uso.
   */
  async registrarUso(entrada: EntradaUsoCupon, ahora: Date): Promise<ResultadoUsoCupon> {
    const rechazo = (motivoRechazo: ResultadoUsoCupon['motivoRechazo']): ResultadoUsoCupon => ({
      registrado: false,
      motivoRechazo,
    });
    return prisma.$transaction(async (tx) => {
      const bloqueada = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id_cupon AS id FROM cupon WHERE id_cupon = ${entrada.idCupon} FOR UPDATE`;
      if (bloqueada.length === 0) return rechazo('cupon_no_valido');

      const previo = await tx.cuponUso.findUnique({ where: { referencia: entrada.referencia } });
      if (previo !== null) {
        // Idempotente si es el mismo cupón; una referencia ya usada con otro cupón es un error de quien llama.
        return previo.idCupon === entrada.idCupon
          ? { registrado: true, motivoRechazo: null }
          : rechazo('cupon_no_valido');
      }

      const cupon = await tx.cupon.findUniqueOrThrow({ where: { idCupon: entrada.idCupon } });
      if (cupon.estado !== 'activo') return rechazo('cupon_no_valido');
      if (ahora < cupon.fechaInicio || (cupon.fechaFin !== null && ahora > cupon.fechaFin))
        return rechazo('cupon_no_vigente');
      if (cupon.usosMaximos !== null) {
        const usados = await tx.cuponUso.count({ where: { idCupon: entrada.idCupon, liberadoEn: null } });
        if (usados >= cupon.usosMaximos) return rechazo('cupon_agotado');
      }
      if (cupon.usosPorUsuario !== null) {
        if (entrada.idUsuario === null) return rechazo('requiere_sesion');
        const delUsuario = await tx.cuponUso.count({
          where: { idCupon: entrada.idCupon, idUsuario: entrada.idUsuario, liberadoEn: null },
        });
        if (delUsuario >= cupon.usosPorUsuario) return rechazo('cupon_usado_por_usuario');
      }

      await tx.cuponUso.create({
        data: {
          idCupon: entrada.idCupon,
          idUsuario: entrada.idUsuario,
          referencia: entrada.referencia,
          importeDescuento: entrada.importeDescuento,
          fecha: ahora,
        },
      });
      return { registrado: true, motivoRechazo: null };
    });
  }

  async liberarUso(referencia: string, ahora: Date): Promise<void> {
    await prisma.cuponUso.updateMany({ where: { referencia, liberadoEn: null }, data: { liberadoEn: ahora } });
  }
}
