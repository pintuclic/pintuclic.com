import crypto from 'node:crypto';
import { derivarContrasena } from '../../../core/utils/crypto';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import {
  CODIGOS_ERROR_M17,
  type CrearEmpleadoInput,
  type CrearEmpleadoOutput,
  type EditarEmpleadoInput,
  type ListarEmpleadosOutput,
  type ListarEmpleadosQuery,
  type ResumenEmpleado,
} from '../dtos/m17-permisos.dto';
import type { EmpleadosRepositoryPort, EntidadEmpleado } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';

export class EmpleadoError extends Error {
  constructor(
    public readonly code: keyof typeof CODIGOS_ERROR_M17,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'EmpleadoError';
  }
}

export class EmpleadosService {
  constructor(
    private readonly empleadosRepo: EmpleadosRepositoryPort,
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
    private readonly sesionService: SesionService,
  ) {}

  async listar(query: ListarEmpleadosQuery): Promise<ListarEmpleadosOutput> {
    const { empleados, total } = await this.empleadosRepo.listar({
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.busqueda !== undefined ? { busqueda: query.busqueda } : {}),
      pagina: query.pagina,
      limite: query.limite,
    });

    const resumenes: ResumenEmpleado[] = await Promise.all(
      empleados.map(async (emp) => {
        const cantidadPermisos = await this.empleadosRepo.contarPermisos(emp.idUsuario);
        return {
          idUsuario: emp.idUsuario,
          nombre: emp.nombre,
          correo: emp.correo,
          telefono: emp.telefono,
          estado: emp.estado,
          fechaCreacion: emp.fechaCreacion.toISOString(),
          fechaUltimoAcceso: emp.fechaUltimoAcceso ? emp.fechaUltimoAcceso.toISOString() : null,
          cantidadPermisos,
        };
      }),
    );

    const totalPaginas = Math.ceil(total / query.limite);

    return {
      empleados: resumenes,
      total,
      pagina: query.pagina,
      totalPaginas,
    };
  }

  async obtenerPorId(idUsuario: number): Promise<EntidadEmpleado> {
    const emp = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!emp) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'El colaborador solicitado no existe.',
        404,
      );
    }
    return emp;
  }

  async crear(input: CrearEmpleadoInput): Promise<CrearEmpleadoOutput> {
    const existente = await this.empleadosRepo.obtenerPorCorreo(input.correo);
    if (existente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.CORREO_DUPLICADO,
        'El correo electrónico ya está registrado en el sistema.',
        409,
      );
    }

    const credencialTemporal = `Pintu#${crypto.randomBytes(6).toString('hex')}!`;
    const hashContrasena = await derivarContrasena(credencialTemporal);

    const creado = await this.empleadosRepo.crear({
      nombre: input.nombre,
      correo: input.correo,
      telefono: input.telefono,
      contrasenaHash: hashContrasena,
    });

    return {
      idUsuario: creado.idUsuario,
      nombre: creado.nombre,
      correo: creado.correo,
      telefono: creado.telefono,
      estado: creado.estado,
      primerAccesoPendiente: true,
      fechaCreacion: creado.fechaCreacion.toISOString(),
      credencialTemporal,
    };
  }

  async editar(idUsuario: number, input: EditarEmpleadoInput): Promise<EntidadEmpleado> {
    const existente = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!existente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'El colaborador solicitado no existe.',
        404,
      );
    }

    const datosActualizar: { nombre?: string; telefono?: string } = {};
    if (input.nombre !== undefined) datosActualizar.nombre = input.nombre;
    if (input.telefono !== undefined) datosActualizar.telefono = input.telefono;

    return this.empleadosRepo.actualizarContacto(idUsuario, datosActualizar);
  }

  async desactivar(idUsuario: number): Promise<void> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (admin && admin.idUsuario === idUsuario) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.OPERACION_BLOQUEADA_ADMIN,
        'La cuenta de administrador principal no puede ser desactivada.',
        403,
      );
    }

    const existente = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!existente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'El colaborador solicitado no existe.',
        404,
      );
    }

    await this.empleadosRepo.actualizarEstado(idUsuario, 'inactivo');
    await this.sesionService.invalidarTodas(idUsuario, 'cuenta_desactivada');
  }

  async reactivar(idUsuario: number): Promise<void> {
    const existente = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!existente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'El colaborador solicitado no existe.',
        404,
      );
    }

    await this.empleadosRepo.actualizarEstado(idUsuario, 'activo');
  }
}
