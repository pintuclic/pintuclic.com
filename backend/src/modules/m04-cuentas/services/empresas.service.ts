import { createHash } from 'node:crypto';
import { derivarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { SolicitudesEmpresaRepository } from '../repositories/solicitudes-empresa.repository';
import type { AlmacenDocumentosPort } from '../interfaces/almacen-documentos.port';
import type { EntidadDocumentoSoporte, MisSolicitudesEmpresa } from '../interfaces/cuentas.interfaces';
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

    // 4. Crear usuario en estado pendiente. RN-CUE-15 / HU-CUE-03 E5: hasta la
    //    aprobación la cuenta sigue siendo de tipo `normal`; solo la decisión
    //    administrativa la convierte en `empresa`.
    const contrasenaHash = await derivarContrasena(input.contrasena);
    let usuario = correoOcupado;
    if (!usuario) {
      usuario = await this.cuentasRepo.crearUsuarioCliente({
        nombre: input.nombreEmpresa,
        correo: correoNormalizado,
        contrasenaHash,
        telefono: input.telefono,
        estado: 'pendiente',
        tipo: 'normal',
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
   * HU-CUE-03 E6 / HU-CUE-10 E3: el cliente consulta el estado de SUS solicitudes.
   *
   * Proyección explícita: no se devuelve el revisor, el correo ni ningún dato
   * interno; el motivo solo viaja si la solicitud fue rechazada (RNF-CUE-10-01).
   */
  async consultarMisSolicitudes(idUsuario: number): Promise<MisSolicitudesEmpresa> {
    const [solicitud, renovacion] = await Promise.all([
      this.solicitudesRepo.buscarUltimaPorUsuario(idUsuario),
      this.solicitudesRepo.buscarUltimaRenovacionPorUsuario(idUsuario),
    ]);

    return {
      solicitudEmpresa:
        solicitud === null
          ? null
          : {
              idSolicitud: solicitud.idSolicitud,
              tipoSolicitud: solicitud.tipoSolicitud,
              estado: solicitud.estado,
              motivoRechazo: solicitud.estado === 'rechazada' ? solicitud.motivoRechazo : null,
              fechaSolicitud: solicitud.fechaSolicitud,
              fechaRevision: solicitud.fechaRevision,
            },
      renovacionNit:
        renovacion === null
          ? null
          : {
              idSolicitud: renovacion.idSolicitud,
              nitVigente: renovacion.nitAnterior,
              nitSolicitado: renovacion.nitNuevo,
              estado: renovacion.estado,
              motivoRechazo: renovacion.estado === 'rechazada' ? renovacion.motivoRechazo : null,
              fechaSolicitud: renovacion.fechaSolicitud,
              fechaRevision: renovacion.fechaRevision,
            },
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
   * HU-CUE-09 (RF-CUE-09-08): vista independiente de renovaciones de NIT.
   * Nunca incluye el contenido del RUT (RNF-CUE-10-01): solo su metadato.
   */
  async listarRenovaciones(query: ListarSolicitudesEmpresaQuery) {
    return this.solicitudesRepo.listarRenovaciones({
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.page !== undefined ? { page: query.page } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    });
  }

  async obtenerDetalleRenovacion(idSolicitud: string) {
    const renovacion = await this.solicitudesRepo.buscarRenovacionPorId(idSolicitud);
    if (!renovacion) {
      throw new EmpresasError('Solicitud de renovación de NIT no encontrada.', 'SOLICITUD_NO_ENCONTRADA', 404);
    }
    return renovacion;
  }

  /**
   * HU-CUE-09 E14 / RN-CUE-20: entrega del RUT custodiado a personal autorizado.
   * La autorización (`empresas.validar`) la aplica el router; aquí se garantiza la
   * integridad: la huella SHA-256 recalculada debe coincidir con la registrada.
   */
  async obtenerDocumentoRut(idDocumento: string): Promise<EntidadDocumentoSoporte> {
    const documento = await this.almacenDocumentos.obtenerDocumentoCompleto(idDocumento);
    if (documento === null) {
      throw new EmpresasError('Documento no encontrado.', 'DOCUMENTO_NO_ENCONTRADO', 404);
    }

    const huella = createHash('sha256').update(documento.contenido).digest('hex');
    if (huella !== documento.sha256) {
      throw new EmpresasError(
        'No fue posible verificar la integridad del documento.',
        'DOCUMENTO_INTEGRIDAD_NO_VERIFICADA',
        500,
      );
    }
    return documento;
  }

  /**
   * HU-CUE-09: Dictamen administrativo de solicitud de empresa (aprobar o rechazar)
   *
   * La decisión es atómica en el repositorio (RNF-CUE-09-01): ante dos decisiones
   * simultáneas prospera exactamente una y la otra recibe SOLICITUD_YA_DECIDIDA.
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
      throw this.errorSolicitudYaDecidida();
    }

    const estado = dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada';

    // RN-CUE-17: el motivo es obligatorio solo al rechazar un REGISTRO de empresa;
    // en ascensos es opcional.
    const motivoVacio = !dictamen.motivoRechazo || dictamen.motivoRechazo.trim().length === 0;
    if (estado === 'rechazada' && solicitud.tipoSolicitud === 'registro' && motivoVacio) {
      throw new EmpresasError(
        'El motivo de rechazo es obligatorio para dictámenes negativos.',
        'MOTIVO_RECHAZO_REQUERIDO',
        400,
      );
    }

    const decision = await this.solicitudesRepo.decidirSolicitud(idSolicitud, {
      estado,
      idAdminRevisor: idAdmin,
      motivoRechazo: dictamen.motivoRechazo ?? null,
      fechaRevision: new Date(),
    });

    if (decision.resultado === 'ya_decidida') {
      throw this.errorSolicitudYaDecidida();
    }
    if (decision.resultado === 'nit_ocupado') {
      throw this.errorNitOcupadoAlDecidir();
    }

    if (estado === 'aprobada') {
      await this.notificaciones.notificarDictamenEmpresa(solicitud.correoEmpresarial, 'aprobada');
    } else {
      await this.notificaciones.notificarDictamenEmpresa(
        solicitud.correoEmpresarial,
        'rechazada',
        dictamen.motivoRechazo,
      );
    }

    return {
      solicitud: decision.solicitud,
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
   * HU-CUE-10: Dictamen de renovación de NIT (atómico, igual que el de solicitudes)
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
      throw this.errorSolicitudYaDecidida();
    }

    const estado = dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada';

    const decision = await this.solicitudesRepo.decidirRenovacionNit(idSolicitud, {
      estado,
      idAdminRevisor: idAdmin,
      motivoRechazo: dictamen.motivoRechazo ?? null,
      fechaRevision: new Date(),
    });

    if (decision.resultado === 'ya_decidida') {
      throw this.errorSolicitudYaDecidida();
    }
    if (decision.resultado === 'nit_ocupado') {
      throw this.errorNitOcupadoAlDecidir();
    }

    return {
      solicitud: decision.solicitud,
      mensaje: `Renovación de NIT ${estado === 'aprobada' ? 'aprobada' : 'rechazada'} exitosamente.`,
    };
  }

  /** CA-CUE-09-04: una solicitud decidida no se vuelve a decidir (409). */
  private errorSolicitudYaDecidida(): EmpresasError {
    return new EmpresasError(
      'La solicitud ya fue decidida y no admite una nueva decisión.',
      'SOLICITUD_YA_DECIDIDA',
      409,
    );
  }

  /** El NIT quedó en manos de otra cuenta mientras la solicitud esperaba; nada cambió. */
  private errorNitOcupadoAlDecidir(): EmpresasError {
    return new EmpresasError(
      'El NIT pertenece ahora a otra cuenta empresa; la solicitud no se modificó.',
      'NIT_YA_REGISTRADO',
      409,
    );
  }
}
