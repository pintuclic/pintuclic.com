import {
  ADVERTENCIA_CALCULO,
  type CalcularRequest,
  type CalculadoraProducto,
  type ListarProductosCalculablesQuery,
  type PresentacionCalculable,
  type ResultadoCalculo,
  type ResultadoPresentacion,
} from '../dtos/m03-asesoria.dto';
import type {
  CalculadoraRepositoryPort,
  ConfiguracionCalculadoraPort,
  PaginaProductosCalculables,
  PresentacionCruda,
  ProductoConRendimiento,
} from '../interfaces/calculadora.interface';
import {
  aNumero,
  deEntero,
  esPositivo,
  exacto,
  type Exacto,
  multiplicar,
  pisoDivisionEscalada,
  redondearEscalado,
  techoDivision,
} from './decimal-exacto';
import { recursoNoDisponible } from './asesoria.error';

/** Decimales con los que se publica el rendimiento (m², cifras grandes). */
const DECIMALES_MOSTRADOS = 2;
/**
 * El volumen se publica con cuatro: un envase de 300 ml son 0,0793 galones y con dos
 * decimales quedaría en 0,08, y uno más pequeño caería a 0,00.
 */
const DECIMALES_VOLUMEN = 4;
/** K4: la cobertura se publica con un decimal, recortado hacia abajo. */
const DECIMALES_COBERTURA = 1;
/**
 * K9 — último recurso para las manos, cuando ni la ficha del producto ni la configuración
 * del panel traen una. Dos manos es lo que indica la mayoría de fichas técnicas y lo que
 * asume el mockup. Existe para que la calculadora nunca se quede sin número que aplicar:
 * lo normal es que mande la ficha, y si no, la configuración, que el panel puede cambiar.
 */
const MANOS_ULTIMO_RECURSO = 2;

/** El rendimiento de una presentación, exacto y sin redondear (M03 · K2). */
interface PresentacionResuelta {
  readonly idVariante: number;
  readonly presentacion: string;
  /** Galones de la presentación: `medida.valor × equivalencia_galones`. */
  readonly volumenGalones: Exacto;
  /** m² por unidad y por mano, con el rendimiento mínimo y el máximo del producto. */
  readonly rendimientoMin: Exacto;
  readonly rendimientoMax: Exacto;
}

/**
 * HU-ASE-02 — Calculadora de pintura.
 *
 * Un solo motor para las dos entradas del contrato (D5): la de la ficha de un producto y la
 * general de la landing. Y los dos sentidos: cuánto comprar para un área (`cantidad`, K3) y
 * cuánta área cubre una cantidad (`cobertura`, K4).
 *
 * No usa inteligencia artificial: funciona aunque el servicio de IA esté caído (K11, I6).
 */
export class CalculadoraService {
  constructor(
    private readonly repo: CalculadoraRepositoryPort,
    private readonly configuracion: ConfiguracionCalculadoraPort,
  ) {}

  /** K10: el selector con buscador de la calculadora general. Solo productos con calculadora. */
  async listarProductos(query: ListarProductosCalculablesQuery): Promise<PaginaProductosCalculables> {
    return this.repo.listarCalculables({
      ...(query.q === undefined ? {} : { q: query.q }),
      pagina: query.pagina,
      limite: query.limite,
    });
  }

  /**
   * Datos de la calculadora de un producto. Si no cumple K1 responde el 404 opaco y la ficha
   * no muestra la calculadora (RF-ASE-02-07, CA-ASE-02-07).
   */
  async obtenerDeProducto(idProducto: number): Promise<CalculadoraProducto> {
    const producto = await this.repo.obtenerConRendimiento(idProducto);
    if (producto === null) throw recursoNoDisponible();

    const presentaciones = this.resolverPresentaciones(producto);
    const manosAplicadas = await this.resolverManosAplicadas(producto.manosFicha);

    return {
      idProducto: producto.idProducto,
      nombre: producto.nombre,
      rendimientoMin: this.aMostrado(exacto(producto.rendimientoMinTexto)),
      rendimientoMax: this.aMostrado(exacto(producto.rendimientoMaxTexto)),
      manosAplicadas,
      presentaciones: presentaciones.map((p) => this.publicarPresentacion(p)),
      advertencia: ADVERTENCIA_CALCULO,
    };
  }

  /** Calcula en el sentido pedido (K3 o K4) y añade siempre la advertencia (K7). */
  async calcular(peticion: CalcularRequest): Promise<ResultadoCalculo> {
    const producto = await this.repo.obtenerConRendimiento(peticion.idProducto);
    if (producto === null) throw recursoNoDisponible();

    const presentaciones = this.resolverPresentaciones(producto);
    const elegida = presentaciones.find((p) => p.idVariante === peticion.idVariante);
    // Una presentación que no es de este producto, o que no es de volumen, es un 404 igual
    // que un producto inexistente: no se informa en qué falló (ADR-003).
    if (elegida === undefined) throw recursoNoDisponible();

    if (peticion.sentido === 'cobertura') {
      return {
        sentido: 'cobertura',
        seleccionada: this.cobertura(elegida, peticion.unidades, peticion.manos),
        // K6: el equivalente en otras presentaciones solo tiene sentido al comprar.
        equivalencias: [],
        advertencia: ADVERTENCIA_CALCULO,
      };
    }

    return {
      sentido: 'cantidad',
      seleccionada: this.cantidad(elegida, peticion.area, peticion.manos),
      equivalencias: presentaciones
        .filter((p) => p.idVariante !== elegida.idVariante)
        .map((p) => this.cantidad(p, peticion.area, peticion.manos)),
      advertencia: ADVERTENCIA_CALCULO,
    };
  }

  /**
   * K3 — cuánto comprar: `techo(área × manos ÷ rendimiento de la presentación)`.
   *
   * Con rango, el MÍNIMO se calcula con el rendimiento MÁXIMO (rinde más, se necesita menos)
   * y el máximo al contrario (RF-ASE-02-03). Siempre unidades enteras y hacia arriba: nadie
   * puede comprar 1,2 galones (CA-ASE-02-03).
   */
  private cantidad(p: PresentacionResuelta, area: number, manos: number): ResultadoPresentacion {
    const necesario = multiplicar(exacto(area.toFixed(2)), deEntero(manos));
    return {
      idVariante: p.idVariante,
      presentacion: p.presentacion,
      minimo: Number(techoDivision(necesario, p.rendimientoMax)),
      maximo: Number(techoDivision(necesario, p.rendimientoMin)),
    };
  }

  /**
   * K4 — cuánta área cubre: `unidades × rendimiento de la presentación ÷ manos`.
   *
   * Aquí el mínimo usa el rendimiento MÍNIMO, porque es el área que el producto garantiza.
   * Se recorta HACIA ABAJO a un decimal: prometer más área de la que cubre haría que la
   * persona comprara de menos.
   */
  private cobertura(p: PresentacionResuelta, unidades: number, manos: number): ResultadoPresentacion {
    const porManos = deEntero(manos);
    const area = (rendimiento: Exacto): number =>
      aNumero(
        pisoDivisionEscalada(multiplicar(rendimiento, deEntero(unidades)), porManos, DECIMALES_COBERTURA),
        DECIMALES_COBERTURA,
      );

    return {
      idVariante: p.idVariante,
      presentacion: p.presentacion,
      minimo: area(p.rendimientoMin),
      maximo: area(p.rendimientoMax),
    };
  }

  /**
   * K2 — rendimiento de cada presentación: el registrado por galón y por mano, multiplicado
   * por los galones que lleva el envase. Así se deriva de la presentación sin capturarlo una
   * por una (RF-CAT-10-03).
   *
   * No se reutiliza `rendimientoDeMedida` de M01: ese redondea a dos decimales y opera con
   * coma flotante porque solo alimenta la ficha. Aquí el valor se divide después y redondea
   * hacia arriba, así que un error en la última cifra cambia el resultado (K5).
   */
  private resolverPresentaciones(producto: ProductoConRendimiento): PresentacionResuelta[] {
    const rendimientoMin = exacto(producto.rendimientoMinTexto);
    const rendimientoMax = exacto(producto.rendimientoMaxTexto);

    const resueltas: PresentacionResuelta[] = [];
    for (const cruda of producto.presentaciones) {
      const volumen = this.volumenEnGalones(cruda);
      if (!esPositivo(volumen)) continue;

      const porPresentacionMin = multiplicar(rendimientoMin, volumen);
      const porPresentacionMax = multiplicar(rendimientoMax, volumen);
      // RF-CAT-10-05 exige rendimiento mayor que cero; si la base trae algo que no lo
      // cumple, la presentación se omite en lugar de devolver una división imposible.
      if (!esPositivo(porPresentacionMin) || !esPositivo(porPresentacionMax)) continue;

      resueltas.push({
        idVariante: cruda.idVariante,
        presentacion: cruda.presentacion,
        volumenGalones: volumen,
        rendimientoMin: porPresentacionMin,
        rendimientoMax: porPresentacionMax,
      });
    }

    // K1: sin una sola presentación utilizable, el producto no ofrece calculadora.
    if (resueltas.length === 0) throw recursoNoDisponible();
    return resueltas;
  }

  private volumenEnGalones(cruda: PresentacionCruda): Exacto {
    return multiplicar(exacto(cruda.valorTexto), exacto(cruda.equivalenciaGalonesTexto));
  }

  /**
   * K9 — las manos que aplica la calculadora, en orden: la de la ficha del producto, la de
   * la configuración del panel y, si no hay ninguna, `MANOS_ULTIMO_RECURSO`.
   *
   * El valor se resuelve AQUÍ y no en la pantalla para que haya un solo sitio que lo decida:
   * la pantalla solo lo muestra y lo devuelve al calcular.
   */
  private async resolverManosAplicadas(manosFicha: number | null): Promise<number> {
    const candidata = manosFicha ?? (await this.configuracion.obtenerManosPorDefecto());
    if (candidata === null) return MANOS_ULTIMO_RECURSO;
    return Number.isInteger(candidata) && candidata >= 1 && candidata <= 10
      ? candidata
      : MANOS_ULTIMO_RECURSO;
  }

  private publicarPresentacion(p: PresentacionResuelta): PresentacionCalculable {
    return {
      idVariante: p.idVariante,
      presentacion: p.presentacion,
      volumenGalones: this.aMostrado(p.volumenGalones, DECIMALES_VOLUMEN),
      rendimientoMin: this.aMostrado(p.rendimientoMin),
      rendimientoMax: this.aMostrado(p.rendimientoMax),
    };
  }

  /** Solo para mostrar: el cálculo siempre usa el valor exacto, nunca este redondeo. */
  private aMostrado(valor: Exacto, decimales: number = DECIMALES_MOSTRADOS): number {
    return aNumero(redondearEscalado(valor, decimales), decimales);
  }
}
