import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { productoVisible } from '../../m01-catalogo/repositories/prisma-comun';
import type {
  CalculadoraRepositoryPort,
  PaginaProductosCalculables,
  PresentacionCruda,
  ProductoConRendimiento,
} from '../interfaces/calculadora.interface';

const contiene = (texto: string): Prisma.StringFilter => ({ contains: texto, mode: 'insensitive' });

/**
 * Una presentación sirve para calcular si su variante está activa y su medida es de VOLUMEN,
 * es decir tiene equivalencia en galones (`litro = 0,264172052`). Un rodillo se mide en
 * pulgadas y no la tiene, así que queda fuera (M03 · K1, CA-ASE-02-07).
 *
 * Se exige también que la medida esté activa: una presentación retirada del catálogo no debe
 * ofrecerse en la calculadora aunque la variante siga viva.
 */
const presentacionDeVolumen: Prisma.VarianteWhereInput = {
  estado: 'activo',
  medida: { estado: 'activo', tipoMedida: { equivalenciaGalones: { not: null } } },
};

/**
 * Producto que OFRECE calculadora (M03 · K1): visible al público con las mismas condiciones
 * de M01 (U1, reutilizando `productoVisible` para no reescribir la regla), con rendimiento
 * mínimo y máximo registrados, y con al menos una presentación de volumen.
 */
const calculable = (extra: Prisma.ProductoWhereInput = {}): Prisma.ProductoWhereInput =>
  productoVisible({
    AND: [
      { ficha: { rendimientoMin: { not: null }, rendimientoMax: { not: null } } },
      { variantes: { some: presentacionDeVolumen } },
      extra,
    ],
  });

export class PrismaCalculadoraRepository implements CalculadoraRepositoryPort {
  async listarCalculables(args: {
    q?: string;
    pagina: number;
    limite: number;
  }): Promise<PaginaProductosCalculables> {
    const termino = args.q?.trim();
    const busqueda: Prisma.ProductoWhereInput =
      termino === undefined || termino === ''
        ? {}
        : { OR: [{ nombre: contiene(termino) }, { marca: { nombre: contiene(termino) } }] };

    const where = calculable(busqueda);

    const [total, filas] = await Promise.all([
      prisma.producto.count({ where }),
      prisma.producto.findMany({
        where,
        select: { idProducto: true, nombre: true, marca: { select: { nombre: true } } },
        orderBy: [{ nombre: 'asc' }, { idProducto: 'asc' }],
        skip: (args.pagina - 1) * args.limite,
        take: args.limite,
      }),
    ]);

    return {
      total,
      datos: filas.map((p) => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        marca: p.marca.nombre,
      })),
    };
  }

  async obtenerConRendimiento(idProducto: number): Promise<ProductoConRendimiento | null> {
    const producto = await prisma.producto.findFirst({
      where: calculable({ idProducto }),
      select: {
        idProducto: true,
        nombre: true,
        marca: { select: { nombre: true } },
        ficha: { select: { rendimientoMin: true, rendimientoMax: true, manos: true } },
        variantes: {
          where: presentacionDeVolumen,
          select: {
            idVariante: true,
            medida: {
              select: {
                nombre: true,
                valor: true,
                tipoMedida: { select: { equivalenciaGalones: true } },
              },
            },
          },
          orderBy: { idVariante: 'asc' },
        },
      },
    });

    if (producto === null) return null;

    const ficha = producto.ficha;
    // El `where` ya lo garantiza; el guardia es para el tipo y para no romperse si cambia.
    if (ficha?.rendimientoMin === null || ficha?.rendimientoMax === null || ficha === null) {
      return null;
    }

    const presentaciones: PresentacionCruda[] = [];
    for (const v of producto.variantes) {
      const equivalencia = v.medida.tipoMedida.equivalenciaGalones;
      if (equivalencia === null) continue;
      presentaciones.push({
        idVariante: v.idVariante,
        presentacion: v.medida.nombre,
        // Texto exacto: la aritmética de la calculadora no pasa por coma flotante (K5).
        valorTexto: v.medida.valor.toString(),
        equivalenciaGalonesTexto: equivalencia.toString(),
      });
    }

    if (presentaciones.length === 0) return null;

    return {
      idProducto: producto.idProducto,
      nombre: producto.nombre,
      marca: producto.marca.nombre,
      rendimientoMinTexto: ficha.rendimientoMin.toString(),
      rendimientoMaxTexto: ficha.rendimientoMax.toString(),
      manosFicha: ficha.manos,
      presentaciones,
    };
  }
}
