import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import {
  CODIGOS_ERROR_M17,
  type BuscarClientesQuery,
  type DesactivarClienteInput,
  type FichaClienteOutput,
  type ResumenCotizacionCliente,
  type ResumenOrdenCliente,
} from '../dtos/m17-permisos.dto';
import type { ClientesAdminRepositoryPort } from '../interfaces/clientes-admin.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import { EmpleadoError } from './empleados.service';

export class ClientesAdminService {
  constructor(
    private readonly clientesRepo: ClientesAdminRepositoryPort,
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
    private readonly sesionService: SesionService,
  ) {}

  async buscar(query: BuscarClientesQuery): Promise<{
    clientes: Array<{
      idUsuario: number;
      nombre: string;
      correo: string;
      telefono: string | null;
      tipo: string;
      estado: string;
      fechaRegistro: string;
    }>;
    total: number;
    pagina: number;
    totalPaginas: number;
  }> {
    const { clientes, total } = await this.clientesRepo.buscar({
      termino: query.termino,
      tipo: query.tipo,
      pagina: query.pagina,
      limite: query.limite,
    });

    const lista = clientes.map((c) => ({
      idUsuario: c.idUsuario,
      nombre: c.nombre,
      correo: c.correo,
      telefono: c.telefono,
      tipo: c.tipo,
      estado: c.estado,
      fechaRegistro: c.fechaCreacion.toISOString(),
    }));

    return {
      clientes: lista,
      total,
      pagina: query.pagina,
      totalPaginas: Math.ceil(total / query.limite),
    };
  }

  async obtenerFicha(idUsuario: number): Promise<FichaClienteOutput> {
    const cliente = await this.clientesRepo.obtenerPorId(idUsuario);
    if (!cliente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.CLIENTE_NO_ENCONTRADO,
        'El cliente solicitado no existe en el sistema.',
        404,
      );
    }

    const [ordenes, cotizaciones] = await Promise.all([
      this.clientesRepo.obtenerOrdenesRecientes(idUsuario),
      this.clientesRepo.obtenerCotizacionesRecientes(idUsuario),
    ]);

    const ordenesRecientes: ResumenOrdenCliente[] = ordenes.map((o) => ({
      idOrden: o.idOrden,
      codigoVisible: o.codigoVisible,
      fecha: o.fecha.toISOString(),
      estado: o.estado,
      total: o.total,
    }));

    const cotizacionesRecientes: ResumenCotizacionCliente[] = cotizaciones.map((c) => ({
      idCotizacion: c.idCotizacion,
      fecha: c.fecha.toISOString(),
      estado: c.estado,
      total: c.total,
    }));

    return {
      idUsuario: cliente.idUsuario,
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono,
      tipo: cliente.tipo,
      estado: cliente.estado,
      fechaRegistro: cliente.fechaCreacion.toISOString(),
      ordenesRecientes,
      cotizacionesRecientes,
    };
  }

  async desactivar(idCliente: number, input: DesactivarClienteInput): Promise<void> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (admin && admin.idUsuario === idCliente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.OPERACION_BLOQUEADA_ADMIN,
        'La cuenta administradora no puede ser desactivada como cliente.',
        403,
      );
    }

    const cliente = await this.clientesRepo.obtenerPorId(idCliente);
    if (!cliente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.CLIENTE_NO_ENCONTRADO,
        'El cliente solicitado no existe en el sistema.',
        404,
      );
    }

    if (!input.motivo || input.motivo.trim().length < 5) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.MOTIVO_REQUERIDO,
        'Debe suministrar un motivo justificado para desactivar la cuenta del cliente (RN-ADM-14).',
        400,
      );
    }

    await this.clientesRepo.desactivar(idCliente, input.motivo.trim());
    await this.sesionService.invalidarTodas(idCliente, 'cuenta_desactivada');
  }
}
