import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { DONDE_EMPLEADO, ROL_ADMINISTRADOR } from '../utils/roles';
import { MAXIMO_REFERENCIAS, type Nivel, type Seccion } from './fp02-notificaciones.dto';
import type {
  AgregadoResumen,
  FilaNotificacion,
  NotificacionesRepositoryPort,
  PublicacionFilas,
} from './notificaciones.interface';

const COLUMNAS = {
  idNotificacion: true,
  tipo: true,
  nivel: true,
  seccion: true,
  cantidad: true,
  referencias: true,
  fechaUltima: true,
  fechaVista: true,
  fechaLectura: true,
} satisfies Prisma.NotificacionInternaSelect;

function aFila(r: Prisma.NotificacionInternaGetPayload<{ select: typeof COLUMNAS }>): FilaNotificacion {
  return { ...r, nivel: r.nivel as Nivel, seccion: r.seccion as Seccion };
}

interface FilaAgregado {
  nivel: string;
  seccion: string;
  filas: number;
  cantidad: number;
  sin_ver: number;
}

/**
 * Acceso a `notificacion_interna`. Todo lo caliente (resumen, publicar) es UNA sentencia por llamada y usa los índices
 * parciales de la tabla (R13).
 */
export class NotificacionesRepository implements NotificacionesRepositoryPort {
  async destinatariosDePermiso(permiso: string, maximo: number): Promise<number[]> {
    const [empleados, admin] = await Promise.all([
      prisma.usuarioPermiso.findMany({
        where: { permiso: { nombre: permiso, estado: 'activo' }, usuario: { estado: 'activo', ...DONDE_EMPLEADO } },
        select: { idUsuario: true },
        orderBy: { idUsuario: 'asc' },
        take: maximo,
      }),
      prisma.usuario.findFirst({
        where: { estado: 'activo', rolDirecto: { nombre: ROL_ADMINISTRADOR } },
        orderBy: { idUsuario: 'asc' },
        select: { idUsuario: true },
      }),
    ]);
    const ids = new Set(empleados.map((e) => e.idUsuario));
    if (admin !== null) ids.add(admin.idUsuario);
    return [...ids].slice(0, maximo);
  }

  async publicar(p: PublicacionFilas): Promise<void> {
    if (p.idsUsuario.length === 0) return;
    const referencias = p.referencia === null ? [] : [p.referencia];
    // Un aviso abierto que ya pasó la ventana no admite sumar: se le libera la clave (sigue sin leer y sigue contando) y el
    // hecho nuevo nace como aviso aparte (R4).
    await prisma.$executeRaw`
      UPDATE notificacion_interna
         SET clave_grupo = left(clave_grupo, 100) || '#' || left(id_notificacion::text, 8)
       WHERE id_usuario = ANY(${p.idsUsuario}::int[])
         AND clave_grupo = ${p.claveGrupo}
         AND fecha_lectura IS NULL
         AND fecha_creacion < ${p.limiteVentana}::timestamptz`;
    await prisma.$executeRaw`
      INSERT INTO notificacion_interna
        (id_usuario, tipo, nivel, seccion, clave_grupo, cantidad, referencias, fecha_creacion, fecha_ultima)
      SELECT u, ${p.tipo}::varchar, ${p.nivel}::varchar, ${p.seccion}::varchar, ${p.claveGrupo}::varchar, 1,
             ${referencias}::text[], ${p.ahora}::timestamptz, ${p.ahora}::timestamptz
        FROM unnest(${p.idsUsuario}::int[]) AS u
      ON CONFLICT (id_usuario, clave_grupo) WHERE fecha_lectura IS NULL
      DO UPDATE SET
        cantidad = notificacion_interna.cantidad + 1,
        referencias = CASE
          WHEN EXCLUDED.referencias[1] IS NULL THEN notificacion_interna.referencias
          ELSE (array_prepend(EXCLUDED.referencias[1], array_remove(notificacion_interna.referencias, EXCLUDED.referencias[1])))[1:${Prisma.raw(String(MAXIMO_REFERENCIAS))}]
        END,
        fecha_ultima = EXCLUDED.fecha_ultima,
        fecha_vista = NULL`;
  }

  async resumen(idUsuario: number): Promise<AgregadoResumen[]> {
    const filas = await prisma.$queryRaw<FilaAgregado[]>`
      SELECT nivel, seccion,
             count(*)::int AS filas,
             sum(cantidad)::int AS cantidad,
             (count(*) FILTER (WHERE fecha_vista IS NULL))::int AS sin_ver
        FROM notificacion_interna
       WHERE id_usuario = ${idUsuario} AND fecha_lectura IS NULL
       GROUP BY nivel, seccion`;
    return filas.map((f) => ({
      nivel: f.nivel as Nivel,
      seccion: f.seccion as Seccion,
      filas: f.filas,
      cantidad: f.cantidad,
      sinVer: f.sin_ver,
    }));
  }

  async listar(idUsuario: number, pagina: number, limite: number): Promise<{ filas: FilaNotificacion[]; total: number }> {
    const [filas, total] = await Promise.all([
      prisma.notificacionInterna.findMany({
        where: { idUsuario },
        orderBy: [{ fechaUltima: 'desc' }, { idNotificacion: 'asc' }],
        skip: (pagina - 1) * limite,
        take: limite,
        select: COLUMNAS,
      }),
      prisma.notificacionInterna.count({ where: { idUsuario } }),
    ]);
    return { filas: filas.map(aFila), total };
  }

  async marcarVistas(idUsuario: number, ahora: Date): Promise<number> {
    const r = await prisma.notificacionInterna.updateMany({
      where: { idUsuario, fechaLectura: null, fechaVista: null },
      data: { fechaVista: ahora },
    });
    return r.count;
  }

  async marcarTodasLeidas(idUsuario: number, ahora: Date): Promise<number> {
    return prisma.$executeRaw`
      UPDATE notificacion_interna
         SET fecha_lectura = ${ahora}::timestamptz, fecha_vista = COALESCE(fecha_vista, ${ahora}::timestamptz)
       WHERE id_usuario = ${idUsuario} AND fecha_lectura IS NULL`;
  }

  async marcarSeccionLeida(idUsuario: number, seccion: Seccion, ahora: Date): Promise<number> {
    return prisma.$executeRaw`
      UPDATE notificacion_interna
         SET fecha_lectura = ${ahora}::timestamptz, fecha_vista = COALESCE(fecha_vista, ${ahora}::timestamptz)
       WHERE id_usuario = ${idUsuario} AND nivel = 'novedad' AND seccion = ${seccion} AND fecha_lectura IS NULL`;
  }

  async marcarLeida(idUsuario: number, idNotificacion: string, ahora: Date): Promise<FilaNotificacion | null> {
    await prisma.$executeRaw`
      UPDATE notificacion_interna
         SET fecha_lectura = ${ahora}::timestamptz, fecha_vista = COALESCE(fecha_vista, ${ahora}::timestamptz)
       WHERE id_notificacion = ${idNotificacion}::uuid AND id_usuario = ${idUsuario} AND fecha_lectura IS NULL`;
    const fila = await prisma.notificacionInterna.findFirst({
      where: { idNotificacion, idUsuario },
      select: COLUMNAS,
    });
    return fila === null ? null : aFila(fila);
  }

  async borrarLeidosVencidos(limite: Date, lote: number): Promise<number> {
    return prisma.$executeRaw`
      DELETE FROM notificacion_interna
       WHERE id_notificacion IN (
         SELECT id_notificacion FROM notificacion_interna
          WHERE fecha_lectura IS NOT NULL AND fecha_lectura < ${limite}::timestamptz
          LIMIT ${lote})`;
  }

  async recortarExcedentes(idsUsuario: number[], maximo: number, lote: number): Promise<number> {
    if (idsUsuario.length === 0) return 0;
    return prisma.$executeRaw`
      DELETE FROM notificacion_interna
       WHERE id_notificacion IN (
         SELECT id_notificacion FROM (
           SELECT id_notificacion, fecha_lectura,
                  row_number() OVER (PARTITION BY id_usuario ORDER BY fecha_ultima DESC) AS pos
             FROM notificacion_interna
            WHERE id_usuario = ANY(${idsUsuario}::int[])
         ) t
          WHERE t.pos > ${maximo} AND t.fecha_lectura IS NOT NULL
          LIMIT ${lote})`;
  }
}
