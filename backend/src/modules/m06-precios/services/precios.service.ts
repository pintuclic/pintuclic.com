import {
  MAXIMO_LINEAS_CONSULTA,
  type CatalogoParaCompraPort,
  type LineaParaCompra,
} from '../../m01-catalogo/dtos/m01-catalogo-entrega3.dto';
import {
  MAXIMO_LINEAS_CALCULO,
  MAXIMO_PRODUCTOS_OFERTA,
  MAXIMO_VARIANTES_PRECIO,
  type Calculo,
  type CalculoEntrada,
  type ConsultaPrecio,
  type ContextoPrecio,
  type EntradaUsoCupon,
  type OfertaEvento,
  type OfertaProducto,
  type PerfilComercial,
  type PrecioVariante,
  type PreciosPort,
  type ResultadoUsoCupon,
} from '../dtos/m06-precios.dto';
import type {
  CatalogoPreciosRepositoryPort,
  CuponesRepositoryPort,
  EventosRepositoryPort,
  FilaClasificacion,
  ParametrosComercialesPort,
  PerfilRepositoryPort,
  TiposClienteRepositoryPort,
} from '../interfaces/precios.interface';
import {
  calcularCarrito,
  type CuponParaCalcular,
  type LineaParaCalcular,
  type TipoClienteParaCalcular,
} from './calculo';
import { aCentavos, aPuntosBasicos, dePesos, porcentajeDe } from './dinero';
import { aBogota } from './fechas';
import { mejorOferta, type ClasificacionLinea, type EventoMotor, type OfertaResuelta } from './motor-eventos';
import { errores } from './precios-error';

const IVA_POR_DEFECTO = 19;
const FORMATO_CODIGO = /^[A-Z0-9_-]{6,30}$/;

export interface DependenciasPrecios {
  catalogoCompra: CatalogoParaCompraPort;
  catalogo: CatalogoPreciosRepositoryPort;
  eventos: EventosRepositoryPort;
  cupones: CuponesRepositoryPort;
  tipos: TiposClienteRepositoryPort;
  perfiles: PerfilRepositoryPort;
  parametros: ParametrosComercialesPort;
  /** Para las pruebas. */
  reloj?: () => Date;
}

/** Precio unitario con la oferta: el porcentaje se aplica sobre el precio y se redondea mitad hacia arriba. */
export function precioConOferta(precioBase: number, porcentaje: number): number {
  const base = aCentavos(precioBase);
  return dePesos(base - porcentajeDe(base, aPuntosBasicos(porcentaje)));
}

function aOfertaEvento(o: OfertaResuelta, precioBase: number): OfertaEvento {
  return {
    idEvento: o.idEvento,
    nombre: o.nombreEvento,
    porcentaje: o.porcentaje,
    precioAntes: precioBase,
    precioConOferta: precioConOferta(precioBase, o.porcentaje),
  };
}

/**
 * Puerto PreciosPort (contrato de M06, sección 8). Junta lo que cada pieza sabe —precio base y venta
 * de M01, eventos, tipo de cliente, cupón— y deja la cuenta a `calcularCarrito`, que es pura.
 */
export class PreciosService implements PreciosPort {
  private readonly reloj: () => Date;

  constructor(private readonly dep: DependenciasPrecios) {
    this.reloj = dep.reloj ?? (() => new Date());
  }

  private ahora(momento?: string): Date {
    return momento === undefined ? this.reloj() : new Date(momento);
  }

  private async eventosActivos(ahora: Date): Promise<EventoMotor[]> {
    return this.dep.eventos.listarActivos(aBogota(ahora).fecha);
  }

  /** Consulta a M01 por lotes: su límite por llamada es menor que el de este módulo. */
  private async consultarCompra(
    consultas: ReadonlyArray<{ idVariante: number; idColor: number | null }>,
  ): Promise<LineaParaCompra[]> {
    const salida: LineaParaCompra[] = [];
    for (let i = 0; i < consultas.length; i += MAXIMO_LINEAS_CONSULTA) {
      salida.push(...(await this.dep.catalogoCompra.consultarLineas(consultas.slice(i, i + MAXIMO_LINEAS_CONSULTA))));
    }
    return salida;
  }

  /** Dónde cae cada línea en el catálogo, con la familia del color elegido (R6, R8). */
  private async clasificaciones(
    items: ReadonlyArray<{ idVariante: number; idColor: number | null }>,
  ): Promise<Array<ClasificacionLinea | null>> {
    const base = await this.dep.catalogo.clasificar([...new Set(items.map((i) => i.idVariante))]);
    const colores = [...new Set(items.map((i) => i.idColor).filter((c): c is number => c !== null))];
    const familias = await this.dep.catalogo.familiasDeColores(colores);
    return items.map((it) => {
      const f: FilaClasificacion | undefined = base.get(it.idVariante);
      if (f === undefined) return null;
      return {
        idVariante: f.idVariante,
        idProducto: f.idProducto,
        idMarca: f.idMarca,
        idLinea: f.idLinea,
        idSubcategoria: f.idSubcategoria,
        idCategoria: f.idCategoria,
        idColor: it.idColor,
        idFamiliaColor: it.idColor === null ? null : (familias.get(it.idColor) ?? null),
      };
    });
  }

  private async perfil(contexto: ContextoPrecio): Promise<PerfilComercial> {
    if (contexto.perfil !== undefined) return contexto.perfil;
    if (contexto.idUsuario === null) return { tipo: 'particular', idSubRolEmpresa: null };
    return this.dep.perfiles.perfilDe(contexto.idUsuario);
  }

  async calcular(entrada: CalculoEntrada): Promise<Calculo> {
    if (entrada.lineas.length === 0 || entrada.lineas.length > MAXIMO_LINEAS_CALCULO) {
      throw errores.parametroInvalido(`El carrito debe tener entre 1 y ${MAXIMO_LINEAS_CALCULO} líneas.`);
    }
    const ahora = this.ahora(entrada.contexto.momento);
    const perfil = await this.perfil(entrada.contexto);

    // R3: una línea con precio acordado no se revalida con M01.
    const aConsultar = entrada.lineas
      .map((l, indice) => ({
        indice,
        idVariante: l.idVariante,
        idColor: l.idColor ?? null,
        acordado: l.precioAcordado !== undefined,
      }))
      .filter((l) => !l.acordado);
    const [compra, clases, eventos] = await Promise.all([
      this.consultarCompra(aConsultar),
      this.clasificaciones(aConsultar),
      this.eventosActivos(ahora),
    ]);
    const posicion = new Map(aConsultar.map((l, i) => [l.indice, i]));

    const lineas: LineaParaCalcular[] = entrada.lineas.map((l, indice) => {
      const idColor = l.idColor ?? null;
      const i = posicion.get(indice);
      if (i === undefined) {
        // precio acordado
        return {
          indice,
          idVariante: l.idVariante,
          idColor,
          cantidad: l.cantidad,
          vendible: true,
          motivoNoVendible: null,
          excluidoDeDescuentos: false,
          precioBase: null,
          precioAcordado: l.precioAcordado ?? null,
          oferta: null,
        };
      }
      const c = compra[i];
      const clase = clases[i] ?? null;
      const vendible = c?.vendible === true;
      const excluido = c?.excluidoDeDescuentos === true;
      return {
        indice,
        idVariante: l.idVariante,
        idColor,
        cantidad: l.cantidad,
        vendible,
        motivoNoVendible: c?.motivoNoVendible ?? 'variante_no_existe',
        excluidoDeDescuentos: excluido,
        precioBase: vendible ? (c?.precioBase ?? null) : null,
        precioAcordado: null,
        oferta: vendible && !excluido && clase !== null ? mejorOferta(eventos, clase, ahora) : null,
      };
    });

    const tipoCliente = await this.tipoCliente(perfil);
    const cupon =
      entrada.codigoCupon === undefined
        ? null
        : await this.validarCupon(entrada.codigoCupon, perfil, entrada.contexto.idUsuario, ahora);
    const [tasaIva, umbral] = await Promise.all([this.tasaIva(), this.umbralSugerirEmpresa()]);

    return calcularCarrito({
      lineas,
      perfil,
      tipoCliente,
      cupon,
      tasaIva,
      umbralSugerirEmpresa: umbral,
      registrado: entrada.contexto.idUsuario !== null,
      calculadoEn: ahora,
    });
  }

  private async tipoCliente(perfil: PerfilComercial): Promise<TipoClienteParaCalcular | null> {
    if (perfil.tipo !== 'empresa' || perfil.idSubRolEmpresa === null) return null;
    return this.dep.tipos.activoParaCalcular(perfil.idSubRolEmpresa);
  }

  private async tasaIva(): Promise<number> {
    try {
      const v = await this.dep.parametros.obtenerNumero('comercial.iva_porcentaje');
      return v !== null && v >= 0 && v <= 100 ? v : IVA_POR_DEFECTO;
    } catch {
      return IVA_POR_DEFECTO;
    }
  }

  private async umbralSugerirEmpresa(): Promise<number | null> {
    try {
      const v = await this.dep.parametros.obtenerNumero('comercial.umbral_sugerir_empresa');
      return v !== null && v >= 0 ? v : null;
    } catch {
      return null;
    }
  }

  /** R14: lo que depende de la base (existe, vigencia, audiencia, usos). El mínimo de compra lo mide el cálculo. */
  async validarCupon(
    texto: string,
    perfil: PerfilComercial,
    idUsuario: number | null,
    ahora: Date,
  ): Promise<CuponParaCalcular> {
    const codigo = texto.trim().toUpperCase();
    const rechazo = (motivo: Extract<CuponParaCalcular, { valido: false }>['motivo']): CuponParaCalcular => ({
      codigo: codigo.slice(0, 60),
      valido: false,
      motivo,
    });
    if (!FORMATO_CODIGO.test(codigo)) return rechazo('cupon_no_valido');
    const cupon = await this.dep.cupones.buscarPorCodigo(codigo);
    if (cupon === null || cupon.estado !== 'activo') return rechazo('cupon_no_valido');
    if (ahora < cupon.fechaInicio || (cupon.fechaFin !== null && ahora > cupon.fechaFin))
      return rechazo('cupon_no_vigente');
    if (cupon.audiencia !== 'todos' && cupon.audiencia !== perfil.tipo) return rechazo('audiencia_no_aplica');
    if (cupon.usosMaximos !== null && cupon.usosActuales >= cupon.usosMaximos) return rechazo('cupon_agotado');
    if (cupon.usosPorUsuario !== null) {
      if (idUsuario === null) return rechazo('requiere_sesion');
      if ((await this.dep.cupones.contarUsosDeUsuario(cupon.idCupon, idUsuario)) >= cupon.usosPorUsuario) {
        return rechazo('cupon_usado_por_usuario');
      }
    }
    return {
      codigo: cupon.codigo,
      valido: true,
      idCupon: cupon.idCupon,
      nombre: cupon.nombre,
      tipoValor: cupon.tipoValor,
      valor: cupon.valor,
      montoMinimoCompra: cupon.montoMinimoCompra,
    };
  }

  async preciosDeVariantes(consultas: readonly ConsultaPrecio[], momento?: string): Promise<PrecioVariante[]> {
    if (consultas.length > MAXIMO_VARIANTES_PRECIO) {
      throw errores.parametroInvalido(`Se pueden consultar hasta ${MAXIMO_VARIANTES_PRECIO} variantes a la vez.`);
    }
    const ahora = this.ahora(momento);
    const items = consultas.map((c) => ({ idVariante: c.idVariante, idColor: c.idColor ?? null }));
    const [compra, clases, eventos] = await Promise.all([
      this.consultarCompra(items),
      this.clasificaciones(items),
      this.eventosActivos(ahora),
    ]);
    return items.map((it, i) => {
      const c = compra[i];
      const clase = clases[i] ?? null;
      const precioBase = c?.precioBase ?? null;
      const oferta =
        c?.vendible === true && c.excluidoDeDescuentos === false && precioBase !== null && clase !== null
          ? mejorOferta(eventos, clase, ahora)
          : null;
      const detalle = oferta === null || precioBase === null ? null : aOfertaEvento(oferta, precioBase);
      return {
        idVariante: it.idVariante,
        idColor: it.idColor,
        vendible: c?.vendible === true,
        precioBase,
        precioConOferta: detalle?.precioConOferta ?? precioBase,
        oferta: detalle,
      };
    });
  }

  async ofertasDeProductos(idsProducto: readonly number[], momento?: string): Promise<OfertaProducto[]> {
    if (idsProducto.length > MAXIMO_PRODUCTOS_OFERTA) {
      throw errores.parametroInvalido(`Se pueden consultar hasta ${MAXIMO_PRODUCTOS_OFERTA} productos a la vez.`);
    }
    const ahora = this.ahora(momento);
    const eventos = await this.eventosActivos(ahora);
    const sinOferta = (idProducto: number): OfertaProducto => ({ idProducto, idVariante: null, oferta: null });
    if (eventos.length === 0) return idsProducto.map(sinOferta);

    const variantes = await this.dep.catalogo.variantesActivasDeProductos(idsProducto);
    // Sin color elegido (tarjeta): las excepciones de color se ignoran (R8).
    const candidatas = variantes
      .filter((v) => !v.excluidoDeDescuentos)
      .map((v) => ({ v, oferta: mejorOferta(eventos, { ...v, idColor: null, idFamiliaColor: null }, ahora) }))
      .filter((c) => c.oferta !== null);
    if (candidatas.length === 0) return idsProducto.map(sinOferta);

    const compra = await this.consultarCompra(candidatas.map((c) => ({ idVariante: c.v.idVariante, idColor: null })));
    const mejorPorProducto = new Map<number, OfertaProducto & { precio: number }>();
    candidatas.forEach((c, i) => {
      const l = compra[i];
      const o = c.oferta;
      if (o === null || l === undefined || l.precioBase === null || l.excluidoDeDescuentos) return;
      const detalle = aOfertaEvento(o, l.precioBase);
      const previo = mejorPorProducto.get(c.v.idProducto);
      if (previo === undefined || detalle.precioConOferta < previo.precio) {
        mejorPorProducto.set(c.v.idProducto, {
          idProducto: c.v.idProducto,
          idVariante: c.v.idVariante,
          oferta: detalle,
          precio: detalle.precioConOferta,
        });
      }
    });
    return idsProducto.map((id) => {
      const m = mejorPorProducto.get(id);
      return m === undefined ? sinOferta(id) : { idProducto: m.idProducto, idVariante: m.idVariante, oferta: m.oferta };
    });
  }

  async idsProductosEnOferta(momento?: string): Promise<number[]> {
    const ahora = this.ahora(momento);
    const eventos = await this.eventosActivos(ahora);
    if (eventos.length === 0) return [];
    const ids = new Set<number>();
    for (const v of await this.dep.catalogo.variantesActivasDelCatalogo()) {
      if (ids.has(v.idProducto) || v.excluidoDeDescuentos) continue;
      if (mejorOferta(eventos, { ...v, idColor: null, idFamiliaColor: null }, ahora) !== null) ids.add(v.idProducto);
    }
    return [...ids].sort((a, b) => a - b);
  }

  registrarUsoCupon(entrada: EntradaUsoCupon): Promise<ResultadoUsoCupon> {
    return this.dep.cupones.registrarUso(entrada, this.reloj());
  }

  liberarUsoCupon(referencia: string): Promise<void> {
    return this.dep.cupones.liberarUso(referencia, this.reloj());
  }
}
