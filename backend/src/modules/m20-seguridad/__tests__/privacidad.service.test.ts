import { describe, expect, it, vi } from 'vitest';
import type { AvisoPrivacidad, ConsentimientoUsuario, SolicitudSupresion } from '@prisma/client';
import {
  AvisoNoVigenteError,
  PrivacidadService,
  SolicitudDuplicadaError,
} from '../services/privacidad.service';
import type { PrivacidadRepository } from '../repositories/privacidad.repository';

/** HU-SEG-05 — Protección de datos personales (alcance parcial). */

const AVISO_VIGENTE: AvisoPrivacidad = {
  idAvisoPrivacidad: 2,
  version: 'v2.0',
  descripcion: 'Aviso de privacidad vigente',
  esVigente: true,
};

function construir(over: Partial<Record<keyof PrivacidadRepository, unknown>> = {}) {
  const repo = {
    obtenerAvisoVigente: vi.fn().mockResolvedValue(AVISO_VIGENTE),
    registrarConsentimiento: vi.fn(
      async (idUsuario: number, idAviso: number): Promise<ConsentimientoUsuario> => ({
        idConsentimiento: 1,
        idUsuario,
        idAvisoPrivacidad: idAviso,
        fecha: new Date('2026-10-21T12:00:00.000Z'),
      }),
    ),
    buscarConsentimiento: vi.fn().mockResolvedValue(null),
    crearSolicitudSupresion: vi.fn(
      async (idUsuario: number): Promise<SolicitudSupresion> => ({
        idSolicitudSupresion: 9,
        idUsuario,
        fechaSolicitud: new Date('2026-10-21T12:00:00.000Z'),
        fechaResolucion: null,
        estado: 'pendiente',
      }),
    ),
    buscarSolicitudPendiente: vi.fn().mockResolvedValue(null),
    listarSolicitudesDeUsuario: vi.fn().mockResolvedValue([]),
    ...over,
  } as unknown as PrivacidadRepository;
  return { servicio: new PrivacidadService(repo), repo };
}

describe('HU-SEG-05 · Protección de datos personales', () => {
  it('Escenario 6 (RF-SEG-05-03): el aviso vigente se obtiene sin autenticarse', async () => {
    const { servicio } = construir();
    await expect(servicio.obtenerAvisoVigente()).resolves.toEqual(AVISO_VIGENTE);
  });

  it('Escenario 2 (CA-SEG-05-02): el consentimiento conserva fecha y versión', async () => {
    const { servicio } = construir();

    const c = await servicio.otorgarConsentimiento(42, AVISO_VIGENTE.idAvisoPrivacidad);

    expect(c.idAvisoPrivacidad).toBe(AVISO_VIGENTE.idAvisoPrivacidad);
    expect(c.fecha).toBeInstanceOf(Date);
  });

  it('rechaza consentir una versión que ya no es la vigente', async () => {
    const { servicio } = construir();
    await expect(servicio.otorgarConsentimiento(42, 1)).rejects.toBeInstanceOf(AvisoNoVigenteError);
  });

  it('es idempotente: consentir dos veces no duplica el registro', async () => {
    const previo: ConsentimientoUsuario = {
      idConsentimiento: 5,
      idUsuario: 42,
      idAvisoPrivacidad: 2,
      fecha: new Date('2026-10-01T00:00:00.000Z'),
    };
    const { servicio, repo } = construir({
      buscarConsentimiento: vi.fn().mockResolvedValue(previo),
    });

    const c = await servicio.otorgarConsentimiento(42, 2);

    expect(c).toEqual(previo);
    expect(repo.registrarConsentimiento).not.toHaveBeenCalled();
  });

  it('Escenario 1 (CA-SEG-05-01): sin consentimiento vigente el registro no procede', async () => {
    const { servicio } = construir();
    await expect(servicio.tieneConsentimientoVigente(42)).resolves.toBe(false);
  });

  it('CA-SEG-05-01: con consentimiento del aviso vigente, procede', async () => {
    const { servicio } = construir({
      buscarConsentimiento: vi.fn().mockResolvedValue({
        idConsentimiento: 5,
        idUsuario: 42,
        idAvisoPrivacidad: 2,
        fecha: new Date(),
      }),
    });
    await expect(servicio.tieneConsentimientoVigente(42)).resolves.toBe(true);
  });

  it('Escenario 4 (CA-SEG-05-04): la solicitud nace pendiente y se confirma', async () => {
    const { servicio } = construir();

    const s = await servicio.solicitarSupresion(42);

    expect(s.estado).toBe('pendiente');
    expect(s.fechaResolucion).toBeNull();
  });

  it('no admite dos solicitudes de supresión en trámite a la vez', async () => {
    const { servicio } = construir({
      buscarSolicitudPendiente: vi.fn().mockResolvedValue({
        idSolicitudSupresion: 1,
        idUsuario: 42,
        fechaSolicitud: new Date(),
        fechaResolucion: null,
        estado: 'pendiente',
      }),
    });

    await expect(servicio.solicitarSupresion(42)).rejects.toBeInstanceOf(SolicitudDuplicadaError);
  });
});
