import { derivarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { SolicitudesEmpresaRepository } from '../repositories/solicitudes-empresa.repository';
import type { AlmacenDocumentosPort } from '../interfaces/almacen-documentos.port';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import type {
  DictamenRenovacionNitRequest,
  DictamenSolicitudEmpresaRequest,
  ListarSolicitudesEmpresaQuery,
  RegistroEmpresaRequest,
  SolicitarAscensoEmpresaRequest,
  SolicitarRenovacionNitRequest,
} from '../dtos/m04-cuentas.dto';

export class EmpresasError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'EmpresasError';
  }
}

export class EmpresasService {
  constructor(
    private readonly cuentasRepo: CuentasRepository,
    private readonly solicitudesRepo: SolicitudesEmpresaRepository,
    private readonly almacenDocumentos: AlmacenDocumentosPort,
    private readonly notificaciones: NotificacionesPort,
  ) {}

  /**
   * HU-CUE-03: Registro directo de Empresa B2B (estado inicial: pendiente)
   */
  async registrarEmpresa(
    input: RegistroEmpresaRequest,
    archivoRut?: { buffer: Buffer; mimeType: string; originalname: string },
  ) {
    const nitNormalizado = input.nit.trim();
    const correoNormalizado = input.correoEmpresarial.trim().toLowerCase();

    // 1. Validar si el NIT ya pertenece a una cuenta aprobada o tiene solicitud pendiente
    const empresaExistente = await this.cuentasRepo.buscarCuentaEmpresaPorNit(nitNormalizado);
    if (empresaExistente) {
      throw new EmpresasError('El NIT ya se encuentra registrado con una cuenta corporativa.', 'NIT_YA_REGISTRADO', 409);
    }

    const pendienteNit = await this.solicitudesRepo.buscarPendientePorNit(nitNormalizado);
    if (pendienteNit) {
      throw new EmpresasError('Ya existe una solicitud pendiente de validación para este NIT.', 'SOLICITUD_NIT_PENDIENTE', 409);
    }

    // 2. Validar que el correo no esté ocupado
    const correoOcupado = await this.cuentasRepo.buscarPorCorreo(correoNormalizado);
    if (correoOcupado && correoOcupado.estado === 'activo') {
      throw new EmpresasError('El correo electrónico ya se encuentra registrado.', 'CORREO_YA_REGISTRADO', 409);
    }

    // 3. Custodiar archivo RUT si viene adjunto
    if (archivoRut) {
      await this.almacenDocumentos.guardarDocumento(
        archivoRut.originalname,
        archivoRut.mimeType,
        archivoRut.buffer,
      );
    }

    // 4. Crear usuario en estado pendiente y tipo empresa
    const contrasenaHash = await derivarContrasena(input.contrasena);
    let usuario = correoOcupado;
    if (!usuario) {
      usuario = await this.cuentasRepo.crearUsuarioCliente({
        nombre: input.nombreEmpresa,
        correo: correoNormalizado,
        contrasenaHash,
        telefono: input.telefono,
        estado: 'pendiente',
        tipo: 'empresa',
      });
    }

    // 5. Crear solicitud de empresa formal
    const solicitud = await this.solicitudesRepo.crearSolicitud({
      idUsuario: usuario.idUsuario,
      nombreEmpresa: input.nombreEmpresa,
      nombreRepresentante: input.nombreRepresentante,
      correoEmpresarial: correoNormalizado,
      telefono: input.telefono,
      nit: nitNormalizado,
      tipoSolicitud: 'registro',
    });

    return {
      idSolicitud: solicitud.idSolicitud,
      mensaje: 'Solicitud corporativa recibida. Su cuenta será activada una vez validada la documentación.',
    };
  }

  /**
   * HU-CUE-06: Solicitar ascenso de cliente B2C a cuenta Empresa B2B
   */
  async solicitarAscensoEmpresa(
    idUsuario: number,
    input: SolicitarAscensoEmpresaRequest,
    archivoRut?: { buffer: Buffer; mimeType: string; originalname: string },
  ) {
    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario) {
      throw new EmpresasError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
    }

    if (usuario.tipo === 'empresa') {
      throw new EmpresasError('La cuenta ya es de tipo corporativa (empresa).', 'CUENTA_YA_ES_EMPRESA', 400);
    }

    // Validar si el usuario ya tiene una solicitud pendiente
    const pendienteUsuario = await this.solicitudesRepo.buscarPendientePorUsuario(idUsuario);
    if (pendienteUsuario) {
      throw new EmpresasError(
        'Ya tiene una solicitud de cuenta corporativa en proceso de revisión.',
        'SOLICITUD_PENDIENTE_EXISTENTE',
        400,
      );
    }

    const nitNormalizado = input.nit.trim();
    const nitOcupado = await this.cuentasRepo.buscarCuentaEmpresaPorNit(nitNormalizado);
    if (nitOcupado) {
      throw new EmpresasError('El NIT ya se encuentra registrado por otra empresa.', 'NIT_YA_REGISTRADO', 409);
    }

    if (archivoRut) {
      await this.almacenDocumentos.guardarDocumento(
        archivoRut.originalname,
        archivoRut.mimeType,
        archivoRut.buffer,
      );
    }

    const solicitud = await this.solicitudesRepo.crearSolicitud({
      idUsuario,
      nombreEmpresa: input.nombreEmpresa,
      nombreRepresentante: input.nombreRepresentante,
      correoEmpresarial: input.correoEmpresarial,
      telefono: input.telefono,
      nit: nitNormalizado,
      tipoSolicitud: 'ascenso_particular',
    });

    return {
      idSolicitud: solicitud.idSolicitud,
      mensaje: 'Solicitud de ascenso a cuenta corporativa radicada exitosamente.',
    };
  }

  /**
   * HU-CUE-09: Listar solicitudes corporativas para administración
   */
  async listarSolicitudes(query: ListarSolicitudesEmpresaQuery) {
    return this.solicitudesRepo.listar({
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.page !== undefined ? { page: query.page } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    });
  }

  /**
   * HU-CUE-09: Detalle de solicitud de empresa
   */
  async obtenerDetalleSolicitud(idSolicitud: string) {
    const solicitud = await this.solicitudesRepo.buscarPorId(idSolicitud);
    if (!solicitud) {
      throw new EmpresasError('Solicitud de empresa no encontrada.', 'SOLICITUD_NO_ENCONTRADA', 404);
    }
    return solicitud;
  }

  /**
   * HU-CUE-09: Dictamen administrativo de solicitud de empresa (aprobar o rechazar)
   */
  async dictaminarSolicitud(
    idSolicitud: string,
    idAdmin: number,
    dictamen: DictamenSolicitudEmpresaRequest,
  ) {
    const solicitud = await this.solicitudesRepo.buscarPorId(idSolicitud);
    if (!solicitud) {
      throw new EmpresasError('Solicitud de empresa no encontrada.', 'SOLICITUD_NO_ENCONTRADA', 404);
    }

    if (solicitud.estado !== 'pendiente') {
      throw new EmpresasError(
        `La solicitud ya fue tramitada previamente con estado '${solicitud.estado}'.`,
        'SOLICITUD_YA_TRAMITADA',
        400,
      );
    }

    const estado = dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada';

    if (estado === 'rechazada' && (!dictamen.motivoRechazo || dictamen.motivoRechazo.trim().length === 0)) {
      throw new EmpresasError(
        'El motivo de rechazo es obligatorio para dictámenes negativos.',
        'MOTIVO_RECHAZO_REQUERIDO',
        400,
      );
    }

    const solicitudActualizada = await this.solicitudesRepo.dictaminar(idSolicitud, {
      estado,
      idAdminRevisor: idAdmin,
      motivoRechazo: dictamen.motivoRechazo ?? null,
      fechaRevision: new Date(),
    });

    if (estado === 'aprobada') {
      // 1. Activar usuario y fijar tipo a 'empresa'
      await this.cuentasRepo.actualizarEstado(solicitud.idUsuario, 'activo');
      // 2. Crear fila 1:1 en cuenta_empresa (ADR-010 / RFC-M04-001 C-1)
      await this.cuentasRepo.crearCuentaEmpresa({
        idUsuario: solicitud.idUsuario,
        nit: solicitud.nit,
        nombreEmpresa: solicitud.nombreEmpresa,
        nombreRepresentante: solicitud.nombreRepresentante,
        correoEmpresarial: solicitud.correoEmpresarial,
        telefono: solicitud.telefono,
        idSolicitudOrigen: solicitud.idSolicitud,
      });

      await this.notificaciones.notificarDictamenEmpresa(solicitud.correoEmpresarial, 'aprobada');
    } else {
      await this.notificaciones.notificarDictamenEmpresa(
        solicitud.correoEmpresarial,
        'rechazada',
        dictamen.motivoRechazo,
      );
    }

    return {
      solicitud: solicitudActualizada,
      mensaje: `Solicitud corporativa ${estado === 'aprobada' ? 'aprobada y cuenta activada' : 'rechazada'} exitosamente.`,
    };
  }

  /**
   * HU-CUE-10: Solicitar renovación de NIT corporativo
   */
  async solicitarRenovacionNit(
    idUsuario: number,
    input: SolicitarRenovacionNitRequest,
    archivoRut?: { buffer: Buffer; mimeType: string; originalname: string },
  ) {
    const cuentaEmpresa = await this.cuentasRepo.buscarCuentaEmpresaPorIdUsuario(idUsuario);
    if (!cuentaEmpresa) {
      throw new EmpresasError('La cuenta no tiene un perfil empresarial activo.', 'CUENTA_NO_EMPRESA', 403);
    }

    const nitNuevoNormalizado = input.nitNuevo.trim();
    if (cuentaEmpresa.nit === nitNuevoNormalizado) {
      throw new EmpresasError(
        'El nuevo NIT no puede ser idéntico al NIT actual.',
        'NIT_IDENTICO',
        400,
      );
    }

    // Verificar si ya tiene una solicitud de renovación pendiente
    const pendiente = await this.solicitudesRepo.buscarRenovacionPendientePorUsuario(idUsuario);
    if (pendiente) {
      throw new EmpresasError(
        'Ya tiene una solicitud de renovación de NIT pendiente de resolución.',
        'RENOVACION_PENDIENTE_EXISTENTE',
        400,
      );
    }

    // Guardar RUT soporte en base de datos BYTEA (ADR-010)
    const buffer = archivoRut?.buffer ?? Buffer.from(input.contenidoBase64, 'base64');
    const mimeType = archivoRut?.mimeType ?? input.tipoMime;
    const originalname = archivoRut?.originalname ?? input.nombreOriginal;

    const doc = await this.almacenDocumentos.guardarDocumento(
      originalname,
      mimeType,
      buffer,
    );

    const solicitud = await this.solicitudesRepo.crearSolicitudRenovacionNit({
      idUsuario,
      nitAnterior: cuentaEmpresa.nit,
      nitNuevo: nitNuevoNormalizado,
      idDocumento: doc.idDocumento,
    });

    return {
      idSolicitud: solicitud.idSolicitud,
      mensaje: 'Solicitud de renovación de NIT radicada exitosamente con soporte documental.',
    };
  }

  /**
   * HU-CUE-10: Dictamen de renovación de NIT
   */
  async dictaminarRenovacionNit(
    idSolicitud: string,
    idAdmin: number,
    dictamen: DictamenRenovacionNitRequest,
  ) {
    const solicitud = await this.solicitudesRepo.buscarRenovacionPorId(idSolicitud);
    if (!solicitud) {
      throw new EmpresasError('Solicitud de renovación de NIT no encontrada.', 'SOLICITUD_NO_ENCONTRADA', 404);
    }

    if (solicitud.estado !== 'pendiente') {
      throw new EmpresasError('La solicitud de renovación ya fue resuelta previamente.', 'SOLICITUD_YA_TRAMITADA', 400);
    }

    const estado = dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada';

    const solicitudActualizada = await this.solicitudesRepo.dictaminarRenovacionNit(idSolicitud, {
      estado,
      idAdminRevisor: idAdmin,
      motivoRechazo: dictamen.motivoRechazo ?? null,
      fechaRevision: new Date(),
    });

    if (estado === 'aprobada') {
      // Actualizar el NIT vigente en cuenta_empresa manteniendo inmutable el histórico (C-1)
      await this.cuentasRepo.actualizarNitEmpresa(solicitud.idUsuario, solicitud.nitNuevo);
    }

    return {
      solicitud: solicitudActualizada,
      mensaje: `Renovación de NIT ${estado === 'aprobada' ? 'aprobada' : 'rechazada'} exitosamente.`,
    };
  }
}
