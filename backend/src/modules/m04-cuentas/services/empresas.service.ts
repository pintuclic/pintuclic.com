import { createHash } from 'node:crypto';
import { derivarContrasena } from '../../../core/utils/crypto';
import type { CuentaEmpresaConTipo, CuentasRepository } from '../repositories/cuentas.repository';
import type { SolicitudesEmpresaRepository } from '../repositories/solicitudes-empresa.repository';
import type { AlmacenDocumentosPort } from '../interfaces/almacen-documentos.port';
import type { TiposClientePort } from '../interfaces/tipos-cliente.port';
import type { EntidadDocumentoSoporte, MisSolicitudesEmpresa } from '../interfaces/cuentas.interfaces';
import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
import type {
  CuentaEmpresaAdminItem,
  DictamenCuentaEmpresaRequest,
  DictamenRenovacionNitRequest,
  ListarCuentasEmpresaQuery,
  ListarCuentasEmpresaResponse,
  ListarSolicitudesEmpresaQuery,
  ListarTiposClienteEmpresaResponse,
  RegistroEmpresaRequest,
  SolicitarAscensoEmpresaRequest,
  SolicitarRenovacionNitRequest,
} from '../dtos/m04-cuentas.dto';

/** RN-CUE-17: longitud mínima del motivo al rechazar un registro de empresa. */
const MOTIVO_MINIMO_REGISTRO = 10;

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
    private readonly tiposCliente: TiposClientePort,
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
      throw new EmpresasError('Ya existe una solicitud pendiente de validación para este NIT.', 'SOLICITUD_PENDIENTE_EXISTENTE', 409);
    }

    // 2. Validar que el correo no esté ocupado ni tenga una solicitud pendiente
    const correoOcupado = await this.cuentasRepo.buscarPorCorreo(correoNormalizado);
    if (correoOcupado && correoOcupado.estado !== 'pendiente') {
      throw new EmpresasError('El correo electrónico ya se encuentra registrado.', 'CORREO_YA_REGISTRADO', 409);
    }
    if (correoOcupado) {
      const pendienteCorreo = await this.solicitudesRepo.buscarPendientePorUsuario(correoOcupado.idUsuario);
      if (pendienteCorreo) {
        throw new EmpresasError(
          'Ya existe una solicitud pendiente de validación para este correo.',
          'SOLICITUD_PENDIENTE_EXISTENTE',
          409,
        );
      }
    }

    // 3. Custodiar archivo RUT si viene adjunto
    if (archivoRut) {
      await this.almacenDocumentos.guardarDocumento(
        archivoRut.originalname,
        archivoRut.mimeType,
        archivoRut.buffer,
      );
    }

    // 4. Crear usuario en estado pendiente (o actualizar sus datos si reintenta tras un rechazo previo).
    //    RN-CUE-15 / HU-CUE-03 E5: hasta la aprobación la cuenta sigue siendo de tipo `normal`;
    //    solo la decisión administrativa la convierte en `empresa`.
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
    } else {
      await this.cuentasRepo.actualizarContrasena(usuario.idUsuario, contrasenaHash, false);
      usuario = await this.cuentasRepo.actualizarDatosPerfil(usuario.idUsuario, {
        nombre: input.nombreEmpresa,
        telefono: input.telefono,
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
      throw new EmpresasError('Usuario no encontrado.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    if (usuario.tipo === 'empresa') {
      throw new EmpresasError('La cuenta ya es de tipo corporativa (empresa).', 'PERMISO_DENEGADO', 400);
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
      throw new EmpresasError('Solicitud de empresa no encontrada.', 'RECURSO_NO_ENCONTRADO', 404);
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
      throw new EmpresasError('Solicitud de renovación de NIT no encontrada.', 'RECURSO_NO_ENCONTRADO', 404);
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
      throw new EmpresasError('Documento no encontrado.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    const huella = createHash('sha256').update(documento.contenido).digest('hex');
    if (huella !== documento.sha256) {
      throw new EmpresasError(
        'No fue posible verificar la integridad del documento.',
        'ARCHIVO_NO_PERMITIDO',
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
    dictamen: DictamenCuentaEmpresaRequest,
  ) {
    const solicitud = await this.solicitudesRepo.buscarPorId(idSolicitud);
    if (!solicitud) {
      throw new EmpresasError('Solicitud de empresa no encontrada.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    if (solicitud.estado !== 'pendiente') {
      throw this.errorSolicitudYaDecidida();
    }

    const estado = dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada';

    // RN-CUE-17: el motivo es obligatorio (mínimo 10 caracteres) solo al rechazar un
    // REGISTRO de empresa; en ascensos es opcional. La regla vive aquí y no en el DTO
    // porque depende del tipo de solicitud, que solo conoce el servidor.
    const motivo = this.normalizarMotivo(dictamen.motivoRechazo);
    if (
      estado === 'rechazada' &&
      solicitud.tipoSolicitud === 'registro' &&
      (motivo === null || motivo.length < MOTIVO_MINIMO_REGISTRO)
    ) {
      throw new EmpresasError(
        `El motivo de rechazo es obligatorio (mínimo ${MOTIVO_MINIMO_REGISTRO} caracteres) al rechazar un registro de empresa.`,
        'DATOS_INVALIDOS',
        400,
      );
    }

    // M06 · D8: al aprobar se elige el tipo de cliente empresa (fija el descuento de la cuenta). Se valida antes de
    // decidir para no dejar la solicitud decidida con un tipo que no existe o está desactivado.
    let idSubRolEmpresa: number | null = null;
    if (estado === 'aprobada') {
      idSubRolEmpresa = await this.exigirTipoActivo(dictamen.idSubRolEmpresa);
    }

    const decision = await this.solicitudesRepo.decidirSolicitud(idSolicitud, {
      estado,
      idAdminRevisor: idAdmin,
      motivoRechazo: motivo,
      fechaRevision: new Date(),
      idSubRolEmpresa,
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
        motivo ?? undefined,
      );
    }

    return {
      solicitud: decision.solicitud,
      mensaje: `Solicitud corporativa ${estado === 'aprobada' ? 'aprobada y cuenta activada' : 'rechazada'} exitosamente.`,
    };
  }

  /** El tipo elegido debe existir y estar activo; si no, 400 TIPO_CLIENTE_INVALIDO (M06 · D8). */
  private async exigirTipoActivo(idSubRolEmpresa: number | undefined): Promise<number> {
    if (idSubRolEmpresa === undefined) {
      throw new EmpresasError('Elija el tipo de cliente empresa para aprobar la solicitud.', 'DATOS_INVALIDOS', 400);
    }
    if (!(await this.tiposCliente.existeActivo(idSubRolEmpresa))) {
      throw new EmpresasError(
        'El tipo de cliente empresa elegido no existe o está desactivado.',
        'TIPO_CLIENTE_INVALIDO',
        400,
      );
    }
    return idSubRolEmpresa;
  }

  /** Tipos de cliente empresa activos, para el selector del panel. */
  async listarTiposCliente(): Promise<ListarTiposClienteEmpresaResponse> {
    return (await this.tiposCliente.listarActivos()).map((t) => ({
      idSubRolEmpresa: t.idSubRolEmpresa,
      nombre: t.nombre,
      porcentaje: t.porcentaje,
      montoMinimoCompra: t.montoMinimoCompra,
    }));
  }

  private aItemCuenta(c: CuentaEmpresaConTipo): CuentaEmpresaAdminItem {
    const tipo = c.subRolEmpresa;
    const d = tipo?.descuento ?? null;
    return {
      idUsuario: c.idUsuario,
      nit: c.nit,
      nombreEmpresa: c.nombreEmpresa,
      nombreRepresentante: c.nombreRepresentante,
      correoEmpresarial: c.correoEmpresarial,
      telefono: c.telefono,
      fechaAprobacion: c.fechaAprobacion.toISOString(),
      tipoCliente:
        tipo === undefined || tipo === null || d === null
          ? null
          : {
              idSubRolEmpresa: tipo.idSubRolEmpresa,
              nombre: tipo.nombre,
              porcentaje: Number(d.porcentajeDescuento),
              estado: tipo.estado,
            },
    };
  }

  /** Cuentas empresa aprobadas con su tipo; `sinTipo` deja solo las que están sin descuento. */
  async listarCuentas(query: ListarCuentasEmpresaQuery): Promise<ListarCuentasEmpresaResponse> {
    const { items, total } = await this.cuentasRepo.listarCuentasEmpresa({
      ...(query.busqueda === undefined ? {} : { busqueda: query.busqueda }),
      ...(query.sinTipo === undefined ? {} : { sinTipo: query.sinTipo }),
      page: query.page,
      limit: query.limit,
    });
    return { items: items.map((c) => this.aItemCuenta(c)), total };
  }

  /** Cambia el tipo de cliente de una cuenta empresa; desde ese momento rige su nuevo descuento. */
  async cambiarTipoCuenta(idUsuario: number, idSubRolEmpresa: number): Promise<CuentaEmpresaAdminItem> {
    if ((await this.cuentasRepo.buscarCuentaEmpresaPorIdUsuario(idUsuario)) === null) {
      throw new EmpresasError('Cuenta empresa no encontrada.', 'RECURSO_NO_ENCONTRADO', 404);
    }
    await this.exigirTipoActivo(idSubRolEmpresa);
    await this.cuentasRepo.asignarTipoCuentaEmpresa(idUsuario, idSubRolEmpresa);
    const cuenta = await this.cuentasRepo.buscarCuentaEmpresaConTipo(idUsuario);
    if (cuenta === null) throw new EmpresasError('Cuenta empresa no encontrada.', 'RECURSO_NO_ENCONTRADO', 404);
    return this.aItemCuenta(cuenta);
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
      throw new EmpresasError('La cuenta no tiene un perfil empresarial activo.', 'PERMISO_DENEGADO', 403);
    }

    const nitNuevoNormalizado = input.nitNuevo.trim();
    if (cuentaEmpresa.nit === nitNuevoNormalizado) {
      throw new EmpresasError(
        'El nuevo NIT no puede ser idéntico al NIT actual.',
        'DATOS_INVALIDOS',
        400,
      );
    }

    // Verificar si ya tiene una solicitud de renovación pendiente
    const pendiente = await this.solicitudesRepo.buscarRenovacionPendientePorUsuario(idUsuario);
    if (pendiente) {
      throw new EmpresasError(
        'Ya tiene una solicitud de renovación de NIT pendiente de resolución.',
        'SOLICITUD_PENDIENTE_EXISTENTE',
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
      throw new EmpresasError('Solicitud de renovación de NIT no encontrada.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    if (solicitud.estado !== 'pendiente') {
      throw this.errorSolicitudYaDecidida();
    }

    const estado = dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada';

    const decision = await this.solicitudesRepo.decidirRenovacionNit(idSolicitud, {
      estado,
      idAdminRevisor: idAdmin,
      motivoRechazo: this.normalizarMotivo(dictamen.motivoRechazo), // opcional (RN-CUE-17)
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

  /** Un motivo vacío o solo de espacios equivale a "sin motivo". */
  private normalizarMotivo(motivo: string | undefined): string | null {
    const limpio = motivo?.trim();
    return limpio === undefined || limpio.length === 0 ? null : limpio;
  }

  /** CA-CUE-09-04: una solicitud decidida no se vuelve a decidir (409). */
  private errorSolicitudYaDecidida(): EmpresasError {
    return new EmpresasError(
      'La solicitud ya fue decidida y no admite una nueva decisión.',
      'RECURSO_NO_ENCONTRADO',
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
