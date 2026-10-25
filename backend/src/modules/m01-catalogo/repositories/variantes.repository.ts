import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Estado, ImpactoDesactivacion } from '../dtos/m01-catalogo.dto';
import type { Variante } from '../dtos/m01-catalogo-productos.dto';
import type {
  ClaveVariante,
  CrearVarianteDatos,
  EditarVarianteDatos,
  VariantesRepositoryPort,
} from '../interfaces/productos.interface';
import { impactoVacio } from './prisma-comun';
import { aVariante } from './productos.repository';

const INCLUIR = {
  medida: {
    select: { nombre: true, tipoMedida: { select: { nombre: true } } },
  },
} satisfies Prisma.VarianteInclude;

const igualSinMayusculas = (texto: string): Prisma.StringFilter => ({
  equals: texto,
  mode: 'insensitive',
});

export class VariantesRepository implements VariantesRepositoryPort {
  async obtener(id: number): Promise<Variante | null> {
    const f = await prisma.variante.findUnique({
      where: { idVariante: id },
      include: INCLUIR,
    });
    return f === null ? null : aVariante(f);
  }

  /** V3: sin SKU enviado, se genera `P{idProducto}-V{idVariante}` en la misma transacción. */
  async crear(datos: CrearVarianteDatos): Promise<Variante> {
    const id = await prisma.$transaction(async (tx) => {
      const fila = await tx.variante.create({
        data: {
          idProducto: datos.idProducto,
          idMedida: datos.idMedida,
          // Provisional y único; se reemplaza antes de terminar la transacción.
          sku: datos.sku ?? `tmp-${datos.idProducto}-${datos.idMedida}-${Date.now()}`,
          precioVigente: datos.precio,
          codigoProveedor: datos.codigoProveedor,
        },
        select: { idVariante: true },
      });
      if (datos.sku === null) {
        const base = `P${datos.idProducto}-V${fila.idVariante}`;
        const ocupado = await tx.variante.findFirst({
          where: { sku: igualSinMayusculas(base) },
          select: { idVariante: true },
        });
        await tx.variante.update({
          where: { idVariante: fila.idVariante },
          data: {
            sku: ocupado === null ? base : `${base}-${Date.now().toString(36)}`,
          },
        });
      }
      return fila.idVariante;
    });
    return this.obtenerExistente(id);
  }

  async editar(id: number, datos: EditarVarianteDatos): Promise<Variante> {
    await prisma.variante.update({
      where: { idVariante: id },
      data: {
        ...(datos.precio !== undefined ? { precioVigente: datos.precio } : {}),
        ...(datos.sku !== undefined ? { sku: datos.sku } : {}),
        ...(datos.codigoProveedor !== undefined ? { codigoProveedor: datos.codigoProveedor } : {}),
      },
    });
    return this.obtenerExistente(id);
  }

  /** P8: al desactivar la última variante activa de un producto publicado, el producto se despublica. */
  async cambiarEstado(id: number, estado: Estado): Promise<Variante> {
    await prisma.$transaction(async (tx) => {
      const actual = await tx.variante.update({
        where: { idVariante: id },
        data: { estado },
        select: { idProducto: true },
      });
      if (estado === 'inactivo') {
        const activas = await tx.variante.count({
          where: { idProducto: actual.idProducto, estado: 'activo' },
        });
        if (activas === 0) {
          await tx.producto.update({
            where: { idProducto: actual.idProducto },
            data: { publicado: false },
          });
        }
      }
    });
    return this.obtenerExistente(id);
  }

  /** P8: solo "afecta" a un producto cuando es su última variante activa y está publicado. */
  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const f = await prisma.variante.findUnique({
      where: { idVariante: id },
      select: {
        estado: true,
        idProducto: true,
        producto: { select: { publicado: true } },
      },
    });
    if (f === null || f.estado !== 'activo' || !f.producto.publicado) return impactoVacio();
    const otras = await prisma.variante.count({
      where: {
        idProducto: f.idProducto,
        estado: 'activo',
        NOT: { idVariante: id },
      },
    });
    return { ...impactoVacio(), productos: otras === 0 ? 1 : 0 };
  }

  async existeDuplicado(clave: ClaveVariante, excluirId?: number): Promise<boolean> {
    const f = await prisma.variante.findFirst({
      where: {
        idProducto: clave.idProducto,
        idMedida: clave.idMedida,
        ...(excluirId !== undefined ? { NOT: { idVariante: excluirId } } : {}),
      },
      select: { idVariante: true },
    });
    return f !== null;
  }

  async existeSku(sku: string, excluirId?: number): Promise<boolean> {
    const f = await prisma.variante.findFirst({
      where: {
        sku: igualSinMayusculas(sku),
        ...(excluirId !== undefined ? { NOT: { idVariante: excluirId } } : {}),
      },
      select: { idVariante: true },
    });
    return f !== null;
  }

  async existeCodigoProveedor(codigo: string, excluirId?: number): Promise<boolean> {
    const f = await prisma.variante.findFirst({
      where: {
        codigoProveedor: igualSinMayusculas(codigo),
        ...(excluirId !== undefined ? { NOT: { idVariante: excluirId } } : {}),
      },
      select: { idVariante: true },
    });
    return f !== null;
  }

  /** Reactivar exige producto y medida activos (R7). */
  async padreActivo(id: number): Promise<boolean> {
    const f = await prisma.variante.findUnique({
      where: { idVariante: id },
      select: {
        producto: { select: { estado: true } },
        medida: { select: { estado: true } },
      },
    });
    return f !== null && f.producto.estado === 'activo' && f.medida.estado === 'activo';
  }

  private async obtenerExistente(id: number): Promise<Variante> {
    return aVariante(
      await prisma.variante.findUniqueOrThrow({
        where: { idVariante: id },
        include: INCLUIR,
      }),
    );
  }
}
