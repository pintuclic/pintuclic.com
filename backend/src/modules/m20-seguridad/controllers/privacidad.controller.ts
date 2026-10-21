import type { Request, Response } from 'express';
import {
  construirError,
  responderExito,
  responderRecursoNoDisponible,
} from '../../../core/utils/apiResponse';
import {
  crearSolicitudSupresionSchema,
  otorgarConsentimientoSchema,
} from '../dtos/privacidad.dto';
import {
  AvisoNoVigenteError,
  PrivacidadService,
  SolicitudDuplicadaError,
} from '../services/privacidad.service';

export class PrivacidadController {
  constructor(private readonly privacidad: PrivacidadService) {}

  /** RF-SEG-05-03 — Público: accesible sin autenticarse. */
  avisoVigente = async (_req: Request, res: Response): Promise<void> => {
    const aviso = await this.privacidad.obtenerAvisoVigente();
    if (aviso === null) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, {
      idAvisoPrivacidad: aviso.idAvisoPrivacidad,
      version: aviso.version,
      descripcion: aviso.descripcion,
      esVigente: aviso.esVigente,
    });
  };

  otorgarConsentimiento = async (req: Request, res: Response): Promise<void> => {
    const parseo = otorgarConsentimientoSchema.safeParse(req.body);
    const actor = req.actor;
    if (!parseo.success || actor === undefined) {
      res
        .status(422)
        .json(construirError('CONSENTIMIENTO_REQUERIDO', 'Datos de consentimiento inválidos.'));
      return;
    }
    try {
      const consentimiento = await this.privacidad.otorgarConsentimiento(
        actor.idUsuario,
        parseo.data.idAvisoPrivacidad,
      );
      responderExito(
        res,
        {
          idConsentimiento: consentimiento.idConsentimiento,
          idAvisoPrivacidad: consentimiento.idAvisoPrivacidad,
          fecha: consentimiento.fecha.toISOString(),
        },
        'Consentimiento registrado.',
        201,
      );
    } catch (error) {
      if (error instanceof AvisoNoVigenteError) {
        res
          .status(409)
          .json(construirError('CONSENTIMIENTO_REQUERIDO', 'Debe aceptar el aviso vigente.'));
        return;
      }
      throw error;
    }
  };

  solicitarSupresion = async (req: Request, res: Response): Promise<void> => {
    const parseo = crearSolicitudSupresionSchema.safeParse(req.body ?? {});
    const actor = req.actor;
    if (!parseo.success || actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    try {
      const solicitud = await this.privacidad.solicitarSupresion(actor.idUsuario);
      responderExito(
        res,
        {
          idSolicitudSupresion: solicitud.idSolicitudSupresion,
          estado: solicitud.estado,
          fechaSolicitud: solicitud.fechaSolicitud.toISOString(),
          fechaResolucion: null,
        },
        'Hemos recibido su solicitud de supresión.',
        201,
      );
    } catch (error) {
      if (error instanceof SolicitudDuplicadaError) {
        res
          .status(409)
          .json(construirError('SOLICITUD_DUPLICADA', 'Ya tiene una solicitud en trámite.'));
        return;
      }
      throw error;
    }
  };

  /** RF-SEG-06-03 — Solo las solicitudes del propio titular. */
  misSolicitudes = async (req: Request, res: Response): Promise<void> => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const solicitudes = await this.privacidad.listarSolicitudes(actor.idUsuario);
    responderExito(
      res,
      solicitudes.map((s) => ({
        idSolicitudSupresion: s.idSolicitudSupresion,
        estado: s.estado,
        fechaSolicitud: s.fechaSolicitud.toISOString(),
        fechaResolucion: s.fechaResolucion?.toISOString() ?? null,
      })),
    );
  };
}
