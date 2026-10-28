import { prisma } from '../../../core/db/client';
import type { CompraRepositoryPort, FilaColorCompra, FilaVarianteCompra } from '../interfaces/compra.interface';
import { ORDEN_GALERIA } from './imagenes.repository';
import { productoVisible } from './prisma-comun';
import { filtroColoresOfrecidos } from './productos.repository';

export class CompraRepository implements CompraRepositoryPort {
  async variantes(idsVariante: readonly number[]): Promise<FilaVarianteCompra[]> {
    if (idsVariante.length === 0) return [];
    const filas = await prisma.variante.findMany({
      where: { idVariante: { in: [...idsVariante] } },
      select: {
        idVariante: true,
        idProducto: true,
        sku: true,
        estado: true,
        precioVigente: true,
        existenciaReferencial: true,
        medida: { select: { nombre: true } },
        producto: {
          select: { nombre: true, esCombo: true, excluidoDeDescuentos: true, marca: { select: { nombre: true } } },
        },
      },
    });
    const idsProducto = [...new Set(filas.map((f) => f.idProducto))];
    const [visibles, imagenes] = await Promise.all([
      prisma.producto.findMany({
        where: productoVisible({ idProducto: { in: idsProducto } }),
        select: { idProducto: true },
      }),
      prisma.imagen.findMany({
        where: { idProducto: { in: idsProducto } },
        select: { idImagen: true, idProducto: true, esPrincipal: true },
        orderBy: ORDEN_GALERIA,
      }),
    ]);
    const idsVisibles = new Set(visibles.map((v) => v.idProducto));
    const portada = (idProducto: number): number | null => {
      const suyas = imagenes.filter((i) => i.idProducto === idProducto);
      return (suyas.find((i) => i.esPrincipal) ?? suyas[0])?.idImagen ?? null;
    };
    return filas.map((f) => ({
      idVariante: f.idVariante,
      idProducto: f.idProducto,
      esCombo: f.producto.esCombo,
      excluidoDeDescuentos: f.producto.excluidoDeDescuentos,
      varianteActiva: f.estado === 'activo',
      productoVisible: idsVisibles.has(f.idProducto),
      nombreProducto: f.producto.nombre,
      marca: f.producto.marca.nombre,
      medida: f.medida.nombre,
      sku: f.sku,
      precioBase: f.precioVigente.toNumber(),
      existenciaReferencial: f.existenciaReferencial,
      idImagenPrincipal: portada(f.idProducto),
    }));
  }

  async colores(pares: ReadonlyArray<{ idProducto: number; idColor: number }>): Promise<Array<FilaColorCompra | null>> {
    if (pares.length === 0) return [];
    const idsColor = [...new Set(pares.map((p) => p.idColor))];
    const colores = await prisma.color.findMany({
      where: { idColor: { in: idsColor } },
      select: { idColor: true, nombre: true, codigo: true, hexadecimal: true },
    });
    const porId = new Map(colores.map((c) => [c.idColor, c]));
    const productos = await prisma.producto.findMany({
      where: { idProducto: { in: [...new Set(pares.map((p) => p.idProducto))] } },
      select: { idProducto: true, idMarca: true },
    });
    const marcaDe = new Map(productos.map((p) => [p.idProducto, p.idMarca]));
    return Promise.all(
      pares.map(async ({ idProducto, idColor }) => {
        const color = porId.get(idColor);
        if (color === undefined) return null;
        const idMarca = marcaDe.get(idProducto);
        const ofrecido =
          idMarca !== undefined &&
          (await prisma.color.count({ where: { AND: [filtroColoresOfrecidos(idProducto, idMarca), { idColor }] } })) >
            0;
        return { ...color, ofrecidoPorElProducto: ofrecido };
      }),
    );
  }
}
