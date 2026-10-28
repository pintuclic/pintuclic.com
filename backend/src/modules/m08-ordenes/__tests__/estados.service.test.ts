import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EstadoOrden, ModoEntrega } from '../dtos/m08-ordenes.dto';
import type { EstadosRepository, EstadosTx, OrdenParaEstado } from '../interfaces/estados.interface';
import type { EventosOrdenPort } from '../interfaces/eventos-orden.port';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';
import { EstadoOrdenError, EstadosService } from '../services/estados.service';

interface FilaHistorial {
  codigo: string;
  estadoAnterior: EstadoOrden;
  estadoNuevo: EstadoOrden;
  idUsuarioAutor: number;
  motivo: string | null;
}

class RepoMemoria implements EstadosRepository {
  ordenes = new Map<string, OrdenParaEstado>();
  historial: FilaHistorial[] = [];
  /** Simula que otra persona cambió el estado justo entre la lectura y la actualización. */
  perderCarrera = false;

  async enTransaccion<T>(trabajo: (tx: EstadosTx) => Promise<T>): Promise<T> {
    const copiaOrdenes = new Map([...this.ordenes].map(([k, v]) => [k, { ...v }]));
    const copiaHistorial = [...this.historial];
    try {
      return await trabajo({
        buscarOrden: async (codigo) => {
          const orden = this.ordenes.get(codigo);
          return orden ? { ...orden } : null;
        },
        actualizarEstadoSiCoincide: async (codigo, desde, hacia) => {
          const orden = this.ordenes.get(codigo);
          if (this.perderCarrera || !orden || orden.estado !== desde) return false;
          orden.estado = hacia;
          return true;
        },
        registrarHistorial: async (fila) => {
          this.historial.push(fila);
        },
      });
    } catch (error) {
      this.ordenes = copiaOrdenes;
      this.historial = copiaHistorial;
      throw error;
    }
  }
}

function orden(estado: EstadoOrden, modoEntrega: ModoEntrega | null = 'domicilio'): OrdenParaEstado {
  return { codigo: 'PC-2026-00001', estado, modoEntrega, idUsuario: 7 };
}

describe('EstadosService (HU-ORD-03)', () => {
  let repo: RepoMemoria;
  let eventos: EventosOrdenPort;
  let notificaciones: NotificacionesOrdenPort;
  let servicio: EstadosService;
  const ahora = new Date('2026-10-24T15:00:00Z');
  const actor = { idUsuario: 21 };

  beforeEach(() => {
    repo = new RepoMemoria();
    eventos = { emitirCambioEstado: vi.fn().mockResolvedValue(undefined) };
    notificaciones = {
      notificarOrdenCreada: vi.fn().mockResolvedValue(undefined),
      notificarOrdenDespachada: vi.fn().mockResolvedValue(undefined),
    };
    servicio = new EstadosService(repo, eventos, notificaciones, { ahora: () => ahora });
  });

  function cargar(estado: EstadoOrden, modo: ModoEntrega | null = 'domicilio'): void {
    repo.ordenes.set('PC-2026-00001', orden(estado, modo));
  }

  it('avanza la orden, registra autor y emite el evento sin enviar correo (CA-ORD-03-01, 03-04)', async () => {
    cargar('orden_confirmada');

    const resultado = await servicio.cambiarEstado(
      'PC-2026-00001',
      { estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' },
      actor,
    );

    expect(resultado).toEqual({
      codigo: 'PC-2026-00001',
      estadoAnterior: 'orden_confirmada',
      estadoNuevo: 'revision_disponibilidad',
    });
    expect(repo.ordenes.get('PC-2026-00001')?.estado).toBe('revision_disponibilidad');
    expect(repo.historial).toEqual([
      {
        codigo: 'PC-2026-00001',
        estadoAnterior: 'orden_confirmada',
        estadoNuevo: 'revision_disponibilidad',
        idUsuarioAutor: 21,
        motivo: null,
      },
    ]);
    expect(eventos.emitirCambioEstado).toHaveBeenCalledWith({
      codigo: 'PC-2026-00001',
      idUsuario: 7,
      estadoAnterior: 'orden_confirmada',
      estadoNuevo: 'revision_disponibilidad',
      idUsuarioAutor: 21,
      fecha: ahora,
    });
    expect(notificaciones.notificarOrdenDespachada).not.toHaveBeenCalled();
  });

  it('al despachar avisa al cliente por correo una sola vez (D05)', async () => {
    cargar('preparada', 'domicilio');

    await servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'preparada', estadoNuevo: 'despachado' }, actor);

    expect(notificaciones.notificarOrdenDespachada).toHaveBeenCalledTimes(1);
    expect(notificaciones.notificarOrdenDespachada).toHaveBeenCalledWith({ codigo: 'PC-2026-00001', idUsuario: 7 });
  });

  it('en recogida la orden queda Entregada con quién la marcó, sin despacho previo (CA-ORD-03-03)', async () => {
    cargar('preparada', 'recogida');

    await servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'preparada', estadoNuevo: 'entregado' }, actor);

    expect(repo.ordenes.get('PC-2026-00001')?.estado).toBe('entregado');
    expect(repo.historial.map((h) => h.estadoNuevo)).toEqual(['entregado']);
    expect(repo.historial[0]?.idUsuarioAutor).toBe(21);
    expect(notificaciones.notificarOrdenDespachada).not.toHaveBeenCalled();
  });

  it('en recogida no admite Despachado (TRANSICION_NO_PERMITIDA)', async () => {
    cargar('preparada', 'recogida');

    await expect(
      servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'preparada', estadoNuevo: 'despachado' }, actor),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA', statusCode: 409 });
  });

  it('volver de preparada a en preparación exige motivo y lo guarda', async () => {
    cargar('preparada');

    await expect(
      servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'preparada', estadoNuevo: 'en_preparacion' }, actor),
    ).rejects.toMatchObject({ codigo: 'MOTIVO_REQUERIDO', statusCode: 422 });

    await servicio.cambiarEstado(
      'PC-2026-00001',
      { estadoActual: 'preparada', estadoNuevo: 'en_preparacion', motivo: 'Falta una lata' },
      actor,
    );
    expect(repo.historial[0]?.motivo).toBe('Falta una lata');
  });

  it('cancelar y devolver responden OPERACION_NO_HABILITADA hasta la política de M11 (R9)', async () => {
    cargar('preparada');
    await expect(
      servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'preparada', estadoNuevo: 'cancelado', motivo: 'x' }, actor),
    ).rejects.toMatchObject({ codigo: 'OPERACION_NO_HABILITADA', statusCode: 409 });

    cargar('entregado');
    await expect(
      servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'entregado', estadoNuevo: 'devuelto', motivo: 'x' }, actor),
    ).rejects.toMatchObject({ codigo: 'OPERACION_NO_HABILITADA' });
    expect(repo.historial).toHaveLength(0);
  });

  it('si el estado real ya no es el que el empleado veía, responde ESTADO_CAMBIADO y no sobrescribe', async () => {
    cargar('en_preparacion');

    await expect(
      servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'revision_disponibilidad', estadoNuevo: 'en_preparacion' }, actor),
    ).rejects.toMatchObject({ codigo: 'ESTADO_CAMBIADO', statusCode: 409 });

    expect(repo.ordenes.get('PC-2026-00001')?.estado).toBe('en_preparacion');
    expect(repo.historial).toHaveLength(0);
  });

  it('si otra persona cambia el estado entre la lectura y la escritura, pierde la carrera sin dejar rastro (CA-ORD-05-08)', async () => {
    cargar('orden_confirmada');
    repo.perderCarrera = true;

    await expect(
      servicio.cambiarEstado('PC-2026-00001', { estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' }, actor),
    ).rejects.toMatchObject({ codigo: 'ESTADO_CAMBIADO' });

    expect(repo.historial).toHaveLength(0);
    expect(eventos.emitirCambioEstado).not.toHaveBeenCalled();
  });

  it('una orden inexistente responde RECURSO_NO_DISPONIBLE (404)', async () => {
    await expect(
      servicio.cambiarEstado('PC-2026-99999', { estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' }, actor),
    ).rejects.toMatchObject({ codigo: 'RECURSO_NO_DISPONIBLE', statusCode: 404 });
  });

  it('un fallo del evento o del correo no revierte el cambio ya confirmado', async () => {
    cargar('preparada', 'domicilio');
    eventos = { emitirCambioEstado: vi.fn().mockRejectedValue(new Error('bus caído')) };
    notificaciones = {
      notificarOrdenCreada: vi.fn(),
      notificarOrdenDespachada: vi.fn().mockRejectedValue(new Error('smtp caído')),
    };
    servicio = new EstadosService(repo, eventos, notificaciones, { ahora: () => ahora });

    const resultado = await servicio.cambiarEstado(
      'PC-2026-00001',
      { estadoActual: 'preparada', estadoNuevo: 'despachado' },
      actor,
    );

    expect(resultado.estadoNuevo).toBe('despachado');
    expect(repo.ordenes.get('PC-2026-00001')?.estado).toBe('despachado');
    expect(repo.historial).toHaveLength(1);
  });

  it('EstadoOrdenError conserva código y estado HTTP', () => {
    const error = new EstadoOrdenError('x', 'ESTADO_CAMBIADO', 409);
    expect(error).toMatchObject({ codigo: 'ESTADO_CAMBIADO', statusCode: 409, name: 'EstadoOrdenError' });
  });
});
