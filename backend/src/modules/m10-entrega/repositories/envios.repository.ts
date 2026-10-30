import { prisma } from '../../../core/db/client';
import type { EstadoEnvio, OrigenEnvio } from '../dtos/m10-entrega.dto';
import type {
  DatosGuardarEnvio,
  EnvioGuardado,
  EnviosRepositoryPort,
  NovedadGuardada,
  OrdenParaEnvio,
  OrdenesParaEnvioPort,
  OrigenEnvioPort,
  VarianteParaEnvio,
  VariantesParaEnvioPort,
} from '../interfaces/entrega.interface';

const INCLUIR_ORDEN = { orden: { select: { codigoVisible: true, idUsuario: true } } } as const;

function aEnvio(fila: {
  idEnvio: string;
  proveedor: string;
  idExterno: string | null;
  numeroGuia: string | null;
  urlSeguimiento: string | null;
  urlEtiqueta: string | null;
  estado: string;
  ultimoError: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  orden: { codigoVisible: string; idUsuario: number };
}): EnvioGuardado {
  return {
    idEnvio: fila.idEnvio,
    codigoOrden: fila.orden.codigoVisible,
    idUsuario: fila.orden.idUsuario,
    proveedor: fila.proveedor,
    idExterno: fila.idExterno,
    numeroGuia: fila.numeroGuia,
    urlSeguimiento: fila.urlSeguimiento,
    urlEtiqueta: fila.urlEtiqueta,
    estado: fila.estado as EstadoEnvio,
    ultimoError: fila.ultimoError,
    fechaCreacion: fila.fechaCreacion,
    fechaActualizacion: fila.fechaActualizacion,
  };
}

export class PrismaEnviosRepository implements EnviosRepositoryPort {
  async buscarPorCodigoOrden(codigo: string): Promise<EnvioGuardado | null> {
    const fila = await prisma.envioOrden.findFirst({ where: { orden: { codigoVisible: codigo } }, include: INCLUIR_ORDEN });
    return fila === null ? null : aEnvio(fila);
  }

  async buscarPorProveedorYExterno(proveedor: string, idExterno: string): Promise<EnvioGuardado | null> {
    const fila = await prisma.envioOrden.findFirst({ where: { proveedor, idExterno }, include: INCLUIR_ORDEN });
    return fila === null ? null : aEnvio(fila);
  }

  async guardar(datos: DatosGuardarEnvio): Promise<EnvioGuardado> {
    const orden = await prisma.orden.findUniqueOrThrow({ where: { codigoVisible: datos.codigoOrden }, select: { idOrden: true } });
    const valores = {
      proveedor: datos.proveedor,
      estado: datos.estado,
      idExterno: datos.idExterno,
      numeroGuia: datos.numeroGuia,
      urlSeguimiento: datos.urlSeguimiento,
      urlEtiqueta: datos.urlEtiqueta,
      ultimoError: datos.ultimoError,
      fechaActualizacion: new Date(),
    };
    const fila = await prisma.envioOrden.upsert({
      where: { idOrden: orden.idOrden },
      create: { idOrden: orden.idOrden, ...valores },
      update: valores,
      include: INCLUIR_ORDEN,
    });
    return aEnvio(fila);
  }

  async actualizarEstado(idEnvio: string, estado: EstadoEnvio): Promise<void> {
    await prisma.envioOrden.update({ where: { idEnvio }, data: { estado, fechaActualizacion: new Date() } });
  }

  async registrarNovedad(idEnvio: string, detalle: string): Promise<void> {
    await prisma.novedadEnvio.create({ data: { idEnvio, detalle: detalle.slice(0, 500) } });
  }

  async listarNovedades(idEnvio: string): Promise<NovedadGuardada[]> {
    return prisma.novedadEnvio.findMany({
      where: { idEnvio },
      orderBy: { fecha: 'desc' },
      select: { idNovedad: true, detalle: true, fecha: true },
    });
  }
}

/** Lectura mínima de M08 (la orden y sus líneas); M10 no escribe en ellas. */
export class PrismaOrdenesParaEnvio implements OrdenesParaEnvioPort {
  async buscarPorCodigo(codigo: string): Promise<OrdenParaEnvio | null> {
    const fila = await prisma.orden.findUnique({
      where: { codigoVisible: codigo },
      select: {
        codigoVisible: true,
        idUsuario: true,
        modoEntrega: true,
        direccion: true,
        total: true,
        lineas: { select: { nombreProducto: true, varianteCopia: true, cantidad: true, precioAplicado: true, idVarianteRef: true } },
      },
    });
    if (fila === null) return null;

    // `idVarianteRef` no tiene FK a propósito (ADR-05 de M08): si la variante ya no existe, los datos quedan en null.
    const ids = fila.lineas.flatMap((l) => (l.idVarianteRef === null ? [] : [l.idVarianteRef]));
    const variantes = await prisma.variante.findMany({
      where: { idVariante: { in: ids } },
      select: { idVariante: true, pesoGramos: true, altoCm: true, anchoCm: true, largoCm: true },
    });
    const porId = new Map(variantes.map((v) => [v.idVariante, v]));
    return {
      codigo: fila.codigoVisible,
      idUsuario: fila.idUsuario,
      modoEntrega: fila.modoEntrega,
      direccion: fila.direccion,
      total: Number(fila.total),
      lineas: fila.lineas.map((l) => ({
        descripcion: `${l.nombreProducto} · ${l.varianteCopia}`.slice(0, 150),
        cantidad: l.cantidad,
        valor: Number(l.precioAplicado),
        pesoGramos: porId.get(l.idVarianteRef ?? -1)?.pesoGramos ?? null,
        altoCm: porId.get(l.idVarianteRef ?? -1)?.altoCm?.toNumber() ?? null,
        anchoCm: porId.get(l.idVarianteRef ?? -1)?.anchoCm?.toNumber() ?? null,
        largoCm: porId.get(l.idVarianteRef ?? -1)?.largoCm?.toNumber() ?? null,
      })),
    };
  }
}

/** P3: lee la ficha de datos del vendedor (M12). Sin ficha, todo null: el proveedor decidirá si le basta. */
export class PrismaOrigenEnvio implements OrigenEnvioPort {
  async obtener(): Promise<OrigenEnvio> {
    const ficha = await prisma.datosFacturacion.findUnique({
      where: { idDatos: 1 },
      select: { razonSocial: true, direccion: true, ciudad: true, telefono: true, correo: true },
    });
    return {
      nombre: ficha?.razonSocial ?? null,
      direccion: ficha?.direccion ?? null,
      ciudad: ficha?.ciudad ?? null,
      telefono: ficha?.telefono ?? null,
      correo: ficha?.correo ?? null,
    };
  }
}

/** Lee de M01 el peso y las medidas de las variantes (solo lectura). */
export class PrismaVariantesParaEnvio implements VariantesParaEnvioPort {
  async porIds(ids: readonly number[]): Promise<Map<number, VarianteParaEnvio>> {
    const filas = await prisma.variante.findMany({
      where: { idVariante: { in: [...ids] } },
      select: {
        idVariante: true,
        pesoGramos: true,
        altoCm: true,
        anchoCm: true,
        largoCm: true,
        producto: { select: { nombre: true } },
        medida: { select: { nombre: true } },
      },
    });
    return new Map(
      filas.map((f) => [
        f.idVariante,
        {
          descripcion: `${f.producto.nombre} · ${f.medida.nombre}`.slice(0, 150),
          pesoGramos: f.pesoGramos,
          altoCm: f.altoCm?.toNumber() ?? null,
          anchoCm: f.anchoCm?.toNumber() ?? null,
          largoCm: f.largoCm?.toNumber() ?? null,
        },
      ]),
    );
  }
}
