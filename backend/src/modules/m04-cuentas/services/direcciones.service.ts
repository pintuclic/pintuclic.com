import type { DireccionCliente } from '@prisma/client';
import type { DireccionesRepository } from '../repositories/direcciones.repository';
import type { ActualizarDireccionRequest, CrearDireccionRequest } from '../dtos/m04-cuentas.dto';

const MAX_DIRECCIONES_POR_CLIENTE = 1;

const MENSAJE_LIMITE =
  'Ya tienes una dirección de entrega guardada. Edítala o elimínala para registrar otra.';

/** Violación de una restricción única de la BD (carrera entre dos peticiones): código Prisma P2002. */
function esViolacionUnica(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

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
   * HU-CUE-07: Crear la dirección de entrega. Cada cuenta guarda una sola (RF-CUE-07-04) y,
   * al ser la única, queda siempre como predeterminada (RN-CUE-07).
   */
  async crear(idUsuario: number, input: CrearDireccionRequest): Promise<DireccionCliente> {
    const totalActual = await this.direccionesRepo.contarPorUsuario(idUsuario);
    if (totalActual >= MAX_DIRECCIONES_POR_CLIENTE) {
      throw new DireccionesError(MENSAJE_LIMITE, 'LIMITE_DIRECCIONES_ALCANZADO', 400);
    }

    try {
      return await this.direccionesRepo.crear({
        idUsuario,
        direccion: input.direccion,
        barrio: input.barrio,
        apartamentoCasa: input.apartamentoCasa ?? null,
        municipio: input.municipio ?? null,
        departamento: input.departamento ?? null,
        nombreApellido: input.nombreApellido,
        telefono: input.telefono,
        esPredeterminada: true,
        latitud: input.latitud ?? null,
        longitud: input.longitud ?? null,
      });
    } catch (error) {
      // Dos peticiones simultáneas pasan el conteo; el índice único de la BD frena la segunda.
      if (esViolacionUnica(error)) {
        throw new DireccionesError(MENSAJE_LIMITE, 'LIMITE_DIRECCIONES_ALCANZADO', 400);
      }
      throw error;
    }
  }

  /**
   * HU-CUE-07: Actualizar dirección existente. La marca de predeterminada no se toca: la única siempre lo es.
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
      municipio?: string | null;
      departamento?: string | null;
      nombreApellido?: string;
      telefono?: string;
      latitud?: number | null;
      longitud?: number | null;
    } = {};

    if (input.direccion !== undefined) datosActualizacion.direccion = input.direccion;
    if (input.barrio !== undefined) datosActualizacion.barrio = input.barrio;
    if (input.municipio !== undefined) datosActualizacion.municipio = input.municipio;
    if (input.departamento !== undefined) datosActualizacion.departamento = input.departamento;
    if (input.apartamentoCasa !== undefined) datosActualizacion.apartamentoCasa = input.apartamentoCasa;
    if (input.nombreApellido !== undefined) datosActualizacion.nombreApellido = input.nombreApellido;
    if (input.telefono !== undefined) datosActualizacion.telefono = input.telefono;
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
}
