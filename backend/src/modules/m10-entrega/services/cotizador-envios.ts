import {
  PROVEEDOR_ENVIO_PROPIO,
  type OpcionEnvio,
  type ServicioEnviosPort,
  type SolicitudCotizacion,
} from '../dtos/m10-entrega.dto';
import type { OrigenEnvioPort, VariantesParaEnvioPort } from '../interfaces/entrega.interface';
import { destinoDesdeTexto } from './destino';
import { ProveedorEnvioError } from './envio.error';

const TIEMPO_MAXIMO_MS = 8_000;

export interface EntradaCotizacionEnvio {
  /** Texto de la dirección de M07 · R14; null si aún no hay dirección (se estima). */
  direccion: string | null;
  totalMercancia: number;
  lineas: ReadonlyArray<{ idVariante: number; cantidad: number; valor: number }>;
}

export interface CotizacionEnvio {
  costo: number;
  servicio: string;
  proveedor: string;
  /** true si el proveedor no pudo cotizar y el costo salió de la tarifa de respaldo. */
  esEstimado: boolean;
}

function conTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new ProveedorEnvioError('El proveedor de envíos tardó demasiado en responder.')), ms);
    promesa.then(
      (valor) => {
        clearTimeout(reloj);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(reloj);
        rechazar(error);
      },
    );
  });
}

const masBarata = (opciones: readonly OpcionEnvio[]): OpcionEnvio | null =>
  opciones.reduce<OpcionEnvio | null>((mejor, o) => (mejor === null || o.costo < mejor.costo ? o : mejor), null);

/**
 * El costo de envío a domicilio lo calcula el proveedor con el origen, el destino y el peso y las medidas de cada
 * bulto. Aquí solo se arma esa petición y se protege el checkout: si el proveedor falla, tarda o faltan datos, se
 * cae a la tarifa de respaldo (entrega propia) y la cotización se marca como estimada. Nunca bloquea la compra.
 */
export class CotizadorEnvios {
  constructor(
    private readonly proveedor: ServicioEnviosPort,
    private readonly respaldo: ServicioEnviosPort,
    private readonly variantes: VariantesParaEnvioPort,
    private readonly origen: OrigenEnvioPort,
    private readonly tiempoMaximoMs: number = TIEMPO_MAXIMO_MS,
  ) {}

  async cotizarDomicilio(entrada: EntradaCotizacionEnvio): Promise<CotizacionEnvio> {
    const solicitud = await this.armar(entrada);
    const sinRespaldo = this.proveedor.proveedor === this.respaldo.proveedor;

    if (!sinRespaldo) {
      try {
        this.exigirDatosCompletos(solicitud);
        const elegida = masBarata(await conTiempo(this.proveedor.cotizar(solicitud), this.tiempoMaximoMs));
        if (elegida === null) throw new ProveedorEnvioError('El proveedor no ofreció ninguna opción.');
        return { costo: elegida.costo, servicio: elegida.servicio, proveedor: elegida.proveedor, esEstimado: false };
      } catch {
        // Cae a la tarifa de respaldo: el cliente puede comprar y el costo se marca como estimado.
      }
    }

    const respaldo = masBarata(await this.respaldo.cotizar(solicitud));
    if (respaldo === null) throw new ProveedorEnvioError('No hay ninguna tarifa de envío disponible.');
    return { costo: respaldo.costo, servicio: respaldo.servicio, proveedor: respaldo.proveedor, esEstimado: !sinRespaldo };
  }

  /** Un proveedor real cotiza por peso y destino: sin ellos cotizaría mal. La entrega propia no los necesita. */
  private exigirDatosCompletos(solicitud: SolicitudCotizacion): void {
    if (this.proveedor.proveedor === PROVEEDOR_ENVIO_PROPIO) return;
    if (solicitud.destino.municipio === null) throw new ProveedorEnvioError('Falta el municipio de entrega.');
    if (solicitud.bultos.some((b) => b.pesoGramos === null)) throw new ProveedorEnvioError('Falta el peso de algún producto.');
  }

  private async armar(entrada: EntradaCotizacionEnvio): Promise<SolicitudCotizacion> {
    const [origen, variantes] = await Promise.all([
      this.origen.obtener(),
      this.variantes.porIds(entrada.lineas.map((l) => l.idVariante)),
    ]);
    return {
      origen,
      destino: destinoDesdeTexto(entrada.direccion ?? ''),
      totalMercancia: entrada.totalMercancia,
      bultos: entrada.lineas.map((l) => {
        const v = variantes.get(l.idVariante);
        return {
          descripcion: v?.descripcion ?? `Variante ${l.idVariante}`,
          cantidad: l.cantidad,
          pesoGramos: v?.pesoGramos ?? null,
          altoCm: v?.altoCm ?? null,
          anchoCm: v?.anchoCm ?? null,
          largoCm: v?.largoCm ?? null,
          valorDeclarado: l.valor,
        };
      }),
    };
  }
}
