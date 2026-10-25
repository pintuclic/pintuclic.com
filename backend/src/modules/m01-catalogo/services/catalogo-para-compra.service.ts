import {
  MAXIMO_LINEAS_CONSULTA,
  type CatalogoParaCompraPort,
  type LineaConsultaCompra,
  type LineaParaCompra,
  type MotivoNoVendible,
} from '../dtos/m01-catalogo-entrega3.dto';
import type { CompraRepositoryPort, FilaColorCompra, FilaVarianteCompra } from '../interfaces/compra.interface';
import { errores } from './catalogo-base.service';

/** Línea de una variante que no existe: no hay nada más que informar. */
function noExiste(consulta: LineaConsultaCompra): LineaParaCompra {
  return {
    idVariante: consulta.idVariante,
    idColor: consulta.idColor ?? null,
    idProducto: null,
    vendible: false,
    motivoNoVendible: 'variante_no_existe',
    esCombo: false,
    topeUnidades: null,
    precioBase: null,
    excluidoDeDescuentos: false,
    disponibilidad: null,
    nombreProducto: null,
    marca: null,
    medida: null,
    sku: null,
    color: null,
    idImagenPrincipal: null,
  };
}

/** P1: primera razón por la que no se puede vender, en este orden; null si se puede. */
function motivoNoVendible(
  v: FilaVarianteCompra,
  pideColor: boolean,
  color: FilaColorCompra | null,
): MotivoNoVendible | null {
  if (!v.varianteActiva) return 'variante_inactiva';
  if (!v.productoVisible) return 'producto_no_disponible';
  if (pideColor && (color === null || !color.ofrecidoPorElProducto)) return 'color_no_ofrecido';
  if (v.esCombo && v.existenciaReferencial === 0) return 'combo_agotado';
  return null;
}

/**
 * Puerto CatalogoParaCompraPort (entrega 3, sección 6): lo consumen el carrito, el checkout, las
 * órdenes y las cotizaciones para no leer las tablas del catálogo ni repetir sus reglas.
 */
export class CatalogoParaCompraService implements CatalogoParaCompraPort {
  constructor(private readonly repo: CompraRepositoryPort) {}

  async consultarLineas(consultas: readonly LineaConsultaCompra[]): Promise<LineaParaCompra[]> {
    if (consultas.length > MAXIMO_LINEAS_CONSULTA) {
      throw errores.parametroInvalido(`Se pueden consultar hasta ${MAXIMO_LINEAS_CONSULTA} líneas a la vez.`);
    }
    const variantes = new Map(
      (await this.repo.variantes([...new Set(consultas.map((c) => c.idVariante))])).map((v) => [v.idVariante, v]),
    );
    // Solo se consultan los colores de las líneas cuya variante existe y que traen color.
    const conColor = consultas.flatMap((c) => {
      const v = variantes.get(c.idVariante);
      return v !== undefined && c.idColor != null ? [{ idProducto: v.idProducto, idColor: c.idColor }] : [];
    });
    const coloresPedidos = await this.repo.colores(conColor);
    const colorPorClave = new Map(
      conColor.map((par, i) => [`${par.idProducto}:${par.idColor}`, coloresPedidos[i] ?? null]),
    );

    return consultas.map((consulta) => {
      const v = variantes.get(consulta.idVariante);
      if (v === undefined) return noExiste(consulta);
      const idColor = consulta.idColor ?? null;
      const color = idColor === null ? null : (colorPorClave.get(`${v.idProducto}:${idColor}`) ?? null);
      const motivo = motivoNoVendible(v, idColor !== null, color);
      return {
        idVariante: v.idVariante,
        idColor,
        idProducto: v.idProducto,
        vendible: motivo === null,
        motivoNoVendible: motivo,
        esCombo: v.esCombo,
        // P4: solo los combos tienen tope; es un dato interno, la vitrina nunca lo expone.
        topeUnidades: v.esCombo ? v.existenciaReferencial : null,
        precioBase: v.precioBase,
        excluidoDeDescuentos: v.excluidoDeDescuentos,
        disponibilidad: v.existenciaReferencial > 0 ? 'disponible' : 'agotado',
        nombreProducto: v.nombreProducto,
        marca: v.marca,
        medida: v.medida,
        sku: v.sku,
        color:
          color === null
            ? null
            : { idColor: color.idColor, nombre: color.nombre, codigo: color.codigo, hexadecimal: color.hexadecimal },
        idImagenPrincipal: v.idImagenPrincipal,
      };
    });
  }
}
