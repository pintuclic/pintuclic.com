import type { AvisoPrivacidad, ConsentimientoUsuario, SolicitudSupresion } from '@prisma/client';
import type { PrivacidadRepository } from '../repositories/privacidad.repository';

/** HU-SEG-05 — Protección de datos personales (alcance parcial). */

export class AvisoNoVigenteError extends Error {
  constructor() {
    super('La versión del aviso indicada no es la vigente.');
    this.name = 'AvisoNoVigenteError';
  }
}

export class SolicitudDuplicadaError extends Error {
  constructor() {
    super('Ya existe una solicitud de supresión en trámite.');
    this.name = 'SolicitudDuplicadaError';
  }
}

export class PrivacidadService {
  constructor(private readonly repo: PrivacidadRepository) {}

  /** RF-SEG-05-03. Accesible sin autenticarse. */
  async obtenerAvisoVigente(): Promise<AvisoPrivacidad | null> {
    return this.repo.obtenerAvisoVigente();
  }

  /**
   * RF-SEG-05-01/02 — Consentimiento versionado.
   *
   * Se rechaza consentir una versión que ya no es la vigente: de lo contrario el
   * sistema conservaría la aceptación de un aviso obsoleto y CA-SEG-05-02 quedaría
   * sin valor probatorio.
   */
  async otorgarConsentimiento(
    idUsuario: number,
    idAvisoPrivacidad: number,
  ): Promise<ConsentimientoUsuario> {
    const vigente = await this.repo.obtenerAvisoVigente();
    if (vigente === null || vigente.idAvisoPrivacidad !== idAvisoPrivacidad) {
      throw new AvisoNoVigenteError();
    }
    const previo = await this.repo.buscarConsentimiento(idUsuario, idAvisoPrivacidad);
    if (previo !== null) {
      return previo;
    }
    return this.repo.registrarConsentimiento(idUsuario, idAvisoPrivacidad);
  }

  /** CA-SEG-05-01. El registro no puede completarse sin consentimiento vigente. */
  async tieneConsentimientoVigente(idUsuario: number): Promise<boolean> {
    const vigente = await this.repo.obtenerAvisoVigente();
    if (vigente === null) {
      return false;
    }
    const consentimiento = await this.repo.buscarConsentimiento(
      idUsuario,
      vigente.idAvisoPrivacidad,
    );
    return consentimiento !== null;
  }

  /**
   * RF-SEG-05-06 / CA-SEG-05-04. Registra la solicitud y confirma su recepción.
   * La resolución —conservación legal y desvinculación de identidad— es un acto
   * administrativo posterior, no automático.
   */
  async solicitarSupresion(idUsuario: number): Promise<SolicitudSupresion> {
    const pendiente = await this.repo.buscarSolicitudPendiente(idUsuario);
    if (pendiente !== null) {
      throw new SolicitudDuplicadaError();
    }
    return this.repo.crearSolicitudSupresion(idUsuario);
  }

  async listarSolicitudes(idUsuario: number): Promise<SolicitudSupresion[]> {
    return this.repo.listarSolicitudesDeUsuario(idUsuario);
  }
}
