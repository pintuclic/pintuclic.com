import type {
  EnvioCliente,
  EnvioDetallePersonal,
  EnvioOrden,
  EstadoEnvio,
  ServicioEnviosPort,
  WebhookEnvioOutput,
} from '../dtos/m10-entrega.dto';
import { CODIGOS_ERROR_M10 } from '../dtos/m10-entrega.dto';
import type {
  EnvioGuardado,
  EnviosRepositoryPort,
  OrdenParaEnvio,
  OrdenesParaEnvioPort,
  OrigenEnvioPort,
} from '../interfaces/entrega.interface';
import { destinoDesdeTexto } from './destino';
import { EnvioError, ProveedorEnvioError } from './envio.error';

const LARGO_MAXIMO_ERROR = 500;
const ESTADOS_REINTENTABLES: readonly EstadoEnvio[] = ['pendiente', 'fallido'];

function noDisponible(): EnvioError {
  return new EnvioError('El recurso solicitado no está disponible.', CODIGOS_ERROR_M10.RECURSO_NO_DISPONIBLE, 404);
}

function aEnvioOrden(e: EnvioGuardado): EnvioOrden {
  return {
    codigoOrden: e.codigoOrden,
    proveedor: e.proveedor,
    estado: e.estado,
    numeroGuia: e.numeroGuia,
    urlSeguimiento: e.urlSeguimiento,
    urlEtiqueta: e.urlEtiqueta,
    ultimoError: e.ultimoError,
    fechaCreacion: e.fechaCreacion.toISOString(),
    fechaActualizacion: e.fechaActualizacion.toISOString(),
  };
}

export class EnviosService {
  constructor(
    private readonly proveedor: ServicioEnviosPort,
    private readonly repo: EnviosRepositoryPort,
    private readonly ordenes: OrdenesParaEnvioPort,
    private readonly origen: OrigenEnvioPort,
  ) {}

  /**
   * R3: M08 emitió un cambio de estado. Solo `despachado` de una orden a domicilio crea el envío. R4: si el proveedor
   * falla el envío queda `pendiente` con el motivo y el despacho no se toca.
   */
  async alCambiarEstado(evento: { codigo: string; estadoNuevo: string }): Promise<void> {
    if (evento.estadoNuevo !== 'despachado') return;
    const orden = await this.ordenes.buscarPorCodigo(evento.codigo);
    if (orden === null || orden.modoEntrega === 'recogida') return;
    if ((await this.repo.buscarPorCodigoOrden(evento.codigo)) !== null) return;
    await this.crear(orden);
  }

  /** R9: el personal con `ventas.gestionar` reintenta (o crea a mano) el envío de una orden a domicilio. */
  async reintentar(codigo: string): Promise<EnvioOrden> {
    const orden = await this.ordenes.buscarPorCodigo(codigo);
    if (orden === null || orden.modoEntrega === 'recogida') throw noDisponible();
    const existente = await this.repo.buscarPorCodigoOrden(codigo);
    if (existente !== null && !ESTADOS_REINTENTABLES.includes(existente.estado)) return aEnvioOrden(existente);
    return aEnvioOrden(await this.crear(orden));
  }

  /** R5: el cliente solo ve el envío de SU pedido; cualquier otro caso es el mismo 404. */
  async paraCliente(idUsuario: number, codigo: string): Promise<EnvioCliente> {
    const orden = await this.ordenes.buscarPorCodigo(codigo);
    if (orden === null || orden.idUsuario !== idUsuario) throw noDisponible();
    const envio = await this.repo.buscarPorCodigoOrden(codigo);
    if (envio === null) throw noDisponible();
    const { urlEtiqueta: _etiqueta, ultimoError: _error, ...visible } = aEnvioOrden(envio);
    return visible;
  }

  async paraPersonal(codigo: string): Promise<EnvioDetallePersonal> {
    if ((await this.ordenes.buscarPorCodigo(codigo)) === null) throw noDisponible();
    const envio = await this.repo.buscarPorCodigoOrden(codigo);
    if (envio === null) return { envio: null, novedades: [] };
    const novedades = await this.repo.listarNovedades(envio.idEnvio);
    return {
      envio: aEnvioOrden(envio),
      novedades: novedades.map((n) => ({ idNovedad: n.idNovedad, detalle: n.detalle, fecha: n.fecha.toISOString() })),
    };
  }

  /** R6 y R7: el proveedor reporta un cambio. Una novedad se guarda; el estado de la orden no se toca. */
  async procesarWebhook(proveedor: string, cuerpo: unknown): Promise<WebhookEnvioOutput> {
    if (proveedor !== this.proveedor.proveedor) throw noDisponible();
    const evento = this.proveedor.interpretarWebhook(cuerpo);
    if (evento === null) return { procesado: false };
    const envio = await this.repo.buscarPorProveedorYExterno(proveedor, evento.idExterno);
    if (envio === null) return { procesado: false };

    await this.repo.actualizarEstado(envio.idEnvio, evento.estado);
    if (evento.estado === 'con_novedad' && evento.detalle) {
      await this.repo.registrarNovedad(envio.idEnvio, evento.detalle);
    }
    return { procesado: true };
  }

  private async crear(orden: OrdenParaEnvio): Promise<EnvioGuardado> {
    const base = { codigoOrden: orden.codigo, proveedor: this.proveedor.proveedor };
    try {
      const resultado = await this.proveedor.crearEnvio({
        codigoOrden: orden.codigo,
        origen: await this.origen.obtener(),
        destino: destinoDesdeTexto(orden.direccion ?? ''),
        bultos: orden.lineas.map((l) => ({
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          pesoGramos: null,
          altoCm: null,
          anchoCm: null,
          largoCm: null,
          valorDeclarado: l.valor,
        })),
        servicio: null,
      });
      return await this.repo.guardar({
        ...base,
        proveedor: resultado.proveedor,
        estado: 'creado',
        idExterno: resultado.idExterno,
        numeroGuia: resultado.numeroGuia,
        urlSeguimiento: resultado.urlSeguimiento,
        urlEtiqueta: resultado.urlEtiqueta,
        ultimoError: null,
      });
    } catch (error: unknown) {
      const motivo = error instanceof ProveedorEnvioError ? error.message : 'El proveedor de envíos no respondió.';
      return this.repo.guardar({
        ...base,
        estado: 'pendiente',
        idExterno: null,
        numeroGuia: null,
        urlSeguimiento: null,
        urlEtiqueta: null,
        ultimoError: motivo.slice(0, LARGO_MAXIMO_ERROR),
      });
    }
  }
}
