import type {
  SolicitarCancelacionRequest,
  SolicitarDevolucionRequest,
  ResolverSolicitudRequest,
  RegistrarReembolsoRequest,
  ListarMisSolicitudesRequest,
  ListarGestionPostventaRequest,
  SolicitudPostventaResumen,
  SolicitudPostventaDetalle,
  EstadoPostventa,
  Paginacion,
} from '../dtos/m11-postventa.dto';

export interface PostventaServicePort {
  solicitarCancelacion(
    idUsuario: number,
    input: SolicitarCancelacionRequest
  ): Promise<SolicitudPostventaDetalle>;

  solicitarDevolucion(
    idUsuario: number,
    input: SolicitarDevolucionRequest
  ): Promise<SolicitudPostventaDetalle>;

  consultarMisSolicitudes(
    idUsuario: number,
    query: ListarMisSolicitudesRequest
  ): Promise<{ data: SolicitudPostventaResumen[]; pagination: Paginacion }>;

  consultarMiSolicitud(
    idUsuario: number,
    codigo: string
  ): Promise<SolicitudPostventaDetalle>;

  listarGestion(
    query: ListarGestionPostventaRequest
  ): Promise<{ data: SolicitudPostventaResumen[]; pagination: Paginacion }>;

  obtenerResumenGestion(): Promise<Array<{ estado: EstadoPostventa; cantidad: number }>>;

  consultarGestionPorCodigo(codigo: string): Promise<SolicitudPostventaDetalle>;

  resolverSolicitud(
    idEmpleado: number,
    codigo: string,
    input: ResolverSolicitudRequest
  ): Promise<SolicitudPostventaDetalle>;

  registrarReembolso(
    idEmpleado: number,
    codigo: string,
    input: RegistrarReembolsoRequest
  ): Promise<SolicitudPostventaDetalle>;
}

export interface OrdenesPortM11 {
  obtenerOrdenParaPostventa(codigoOrden: string): Promise<{
    idOrden: number;
    codigoVisible: string;
    idUsuario: number;
    estado: string;
    fecha: Date;
    total: number;
    lineas: Array<{
      idLineaOrden: number;
      nombreProducto: string;
      varianteCopia: string;
      cantidad: number;
      precioAplicado: number;
      esEntonado: boolean;
      skuVendido: string | null;
      colorSolicitado: string | null;
    }>;
  } | null>;

  actualizarEstadoOrden(
    codigoOrden: string,
    estadoActual: string,
    estadoNuevo: 'cancelado' | 'devuelto',
    motivo: string,
    idUsuarioAutor: number
  ): Promise<void>;
}
