import { describe, expect, it, vi } from 'vitest';
import { AuditoriaRegistroTecnico } from '../services/auditoria.service';

/** ADR-002 — El adaptador vigente del puerto de auditoría. */

describe('RN-SEG-15 · Puerto de auditoría con adaptador no-op', () => {
  it('emite el acceso denegado al registro técnico interno', async () => {
    const espia = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const adaptador = new AuditoriaRegistroTecnico();

    await adaptador.registrarAccesoDenegado({
      idUsuario: 10,
      operacionIntentada: 'POST /api/v1/productos',
      permisoRequerido: 'catalogo.producto.crear',
      fecha: new Date('2026-10-21T12:00:00.000Z'),
      ipOrigen: '203.0.113.7',
    });

    expect(espia).toHaveBeenCalledOnce();
    expect(espia.mock.calls[0]?.[0]).toBe('[ACCESO-DENEGADO]');
  });

  it('⚠️ CA-SEG-03-05 NO se certifica aquí: esto es emisión, no persistencia', () => {
    // Condición que el QA Lead impuso en la mesa ATDD. Mientras HU-SEG-04 siga
    // aplazada, el RTM de Gate 4 debe mostrar CA-SEG-03-05 como
    // "NO CUBIERTO — dependencia aplazada", nunca como omitido ni como pasado.
    const adaptador = new AuditoriaRegistroTecnico();
    expect(adaptador).toBeInstanceOf(AuditoriaRegistroTecnico);
  });
});
