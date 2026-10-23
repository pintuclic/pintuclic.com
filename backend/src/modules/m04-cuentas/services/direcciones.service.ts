import type { DireccionCliente } from '@prisma/client';
import type { DireccionesRepository } from '../repositories/direcciones.repository';
import type { ActualizarDireccionRequest, CrearDireccionRequest } from '../dtos/m04-cuentas.dto';

const MAX_DIRECCIONES_POR_CLIENTE = 10;

export class DireccionesError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DireccionesError';
  }
}

export class DireccionesService {
  constructor(private readonly direccionesRepo: DireccionesRepository) {}

  /**
   * HU-CUE-07: Listar libreta de direcciones del usuario
   */
  async listar(idUsuario: number): Promise<DireccionCliente[]> {
    return this.direccionesRepo.listarPorUsuario(idUsuario);
  }

  /**
   * HU-CUE-07: Crear nueva dirección respetando límite de 10
   */
  async crear(idUsuario: number, input: CrearDireccionRequest): Promise<DireccionCliente> {
    const totalActual = await this.direccionesRepo.contarPorUsuario(idUsuario);
    if (totalActual >= MAX_DIRECCIONES_POR_CLIENTE) {
      throw new DireccionesError(
        `Ha alcanzado el límite máximo de ${MAX_DIRECCIONES_POR_CLIENTE} direcciones de entrega registradas.`,
        'LIMITE_DIRECCIONES_ALCANZADO',
        400,
      );
    }

    // Si es la primera dirección registrada, se fuerza como predeterminada (RN-CUE-07)
    const esPredeterminada = totalActual === 0 ? true : Boolean(input.esPredeterminada);

    return this.direccionesRepo.crear({
      idUsuario,
      direccion: input.direccion,
      barrio: input.barrio,
      apartamentoCasa: input.apartamentoCasa ?? null,
      nombreApellido: input.nombreApellido,
      telefono: input.telefono,
      esPredeterminada,
      latitud: input.latitud ?? null,
      longitud: input.longitud ?? null,
    });
  }

  /**
   * HU-CUE-07: Actualizar dirección existente
   */
  async actualizar(
    idDireccion: string,
    idUsuario: number,
    input: ActualizarDireccionRequest,
  ): Promise<DireccionCliente> {
    const direccion = await this.direccionesRepo.buscarPorId(idDireccion, idUsuario);
    if (!direccion) {
      throw new DireccionesError('Dirección no encontrada o no pertenece a la cuenta.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    const datosActualizacion: {
      direccion?: string;
      barrio?: string;
      apartamentoCasa?: string | null;
      nombreApellido?: string;
      telefono?: string;
      esPredeterminada?: boolean;
      latitud?: number | null;
      longitud?: number | null;
    } = {};

    if (input.direccion !== undefined) datosActualizacion.direccion = input.direccion;
    if (input.barrio !== undefined) datosActualizacion.barrio = input.barrio;
    if (input.apartamentoCasa !== undefined) datosActualizacion.apartamentoCasa = input.apartamentoCasa;
    if (input.nombreApellido !== undefined) datosActualizacion.nombreApellido = input.nombreApellido;
    if (input.telefono !== undefined) datosActualizacion.telefono = input.telefono;
    if (input.esPredeterminada !== undefined) datosActualizacion.esPredeterminada = input.esPredeterminada;
    if (input.latitud !== undefined) datosActualizacion.latitud = input.latitud;
    if (input.longitud !== undefined) datosActualizacion.longitud = input.longitud;

    return this.direccionesRepo.actualizar(idDireccion, idUsuario, datosActualizacion);
  }

  /**
   * HU-CUE-07: Eliminar dirección
   */
  async eliminar(idDireccion: string, idUsuario: number): Promise<{ mensaje: string }> {
    const direccion = await this.direccionesRepo.buscarPorId(idDireccion, idUsuario);
    if (!direccion) {
      throw new DireccionesError('Dirección no encontrada o no pertenece a la cuenta.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    await this.direccionesRepo.eliminar(idDireccion, idUsuario);
    return { mensaje: 'Dirección eliminada exitosamente.' };
  }

  /**
   * HU-CUE-07: Designar dirección como predeterminada única
   */
  async establecerPredeterminada(idDireccion: string, idUsuario: number): Promise<DireccionCliente> {
    const direccion = await this.direccionesRepo.buscarPorId(idDireccion, idUsuario);
    if (!direccion) {
      throw new DireccionesError('Dirección no encontrada o no pertenece a la cuenta.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    return this.direccionesRepo.establecerPredeterminada(idDireccion, idUsuario);
  }
}
