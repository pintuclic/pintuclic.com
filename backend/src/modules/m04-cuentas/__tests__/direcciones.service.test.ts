import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DireccionCliente } from '@prisma/client';
import type { DireccionesRepository } from '../repositories/direcciones.repository';
import { DireccionesError, DireccionesService } from '../services/direcciones.service';

describe('DireccionesService (HU-CUE-07)', () => {
  let direccionesRepo: DireccionesRepository;
  let service: DireccionesService;

  const fechaBase = new Date('2026-10-21T12:00:00Z');

  beforeEach(() => {
    direccionesRepo = {
      listarPorUsuario: vi.fn().mockResolvedValue([]),
      buscarPorId: vi.fn().mockResolvedValue(null),
      contarPorUsuario: vi.fn().mockResolvedValue(0),
      crear: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idDireccion: 'dir-uuid-1',
          idUsuario: datos.idUsuario,
          direccion: datos.direccion,
          barrio: datos.barrio,
          apartamentoCasa: datos.apartamentoCasa ?? null,
          nombreApellido: datos.nombreApellido,
          telefono: datos.telefono,
          esPredeterminada: datos.esPredeterminada ?? false,
          latitud: datos.latitud ?? null,
          longitud: datos.longitud ?? null,
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as DireccionCliente)
      ),
      actualizar: vi.fn().mockImplementation((idDireccion, idUsuario, datos) =>
        Promise.resolve({
          idDireccion,
          idUsuario,
          direccion: datos.direccion ?? 'Calle 10 # 20-30',
          barrio: datos.barrio ?? 'Centro',
          apartamentoCasa: datos.apartamentoCasa ?? null,
          nombreApellido: datos.nombreApellido ?? 'Juan',
          telefono: datos.telefono ?? '3001234567',
          esPredeterminada: datos.esPredeterminada ?? false,
          latitud: datos.latitud ?? null,
          longitud: datos.longitud ?? null,
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as DireccionCliente)
      ),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };

    service = new DireccionesService(direccionesRepo);
  });

  it('lista las direcciones del usuario', async () => {
    vi.mocked(direccionesRepo.listarPorUsuario).mockResolvedValueOnce([
      { idDireccion: 'dir-1', direccion: 'Carrera 7 # 32-16' } as DireccionCliente,
    ]);

    const res = await service.listar(5);
    expect(res).toHaveLength(1);
    expect(res[0]?.direccion).toBe('Carrera 7 # 32-16');
  });

  it('guarda la primera dirección como predeterminada aunque el cliente envíe false (RN-CUE-07)', async () => {
    vi.mocked(direccionesRepo.contarPorUsuario).mockResolvedValueOnce(0);

    const res = await service.crear(5, {
      direccion: 'Calle 100 # 15-20',
      barrio: 'Chicó',
      nombreApellido: 'Laura Gomez',
      telefono: '3109876543',
      esPredeterminada: false,
    });

    expect(res.esPredeterminada).toBe(true);
    expect(direccionesRepo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ esPredeterminada: true })
    );
  });

  it('rechaza una segunda dirección: el máximo por cuenta es una (RF-CUE-07-04)', async () => {
    vi.mocked(direccionesRepo.contarPorUsuario).mockResolvedValueOnce(1);

    await expect(
      service.crear(5, {
        direccion: 'Calle 100 # 15-20',
        barrio: 'Chicó',
        nombreApellido: 'Laura Gomez',
        telefono: '3109876543',
        esPredeterminada: false,
      })
    ).rejects.toMatchObject({ codigo: 'LIMITE_DIRECCIONES_ALCANZADO', statusCode: 400 });

    expect(direccionesRepo.crear).not.toHaveBeenCalled();
  });

  it('responde el mismo límite si la BD frena una creación simultánea (P2002)', async () => {
    vi.mocked(direccionesRepo.contarPorUsuario).mockResolvedValueOnce(0);
    vi.mocked(direccionesRepo.crear).mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    await expect(
      service.crear(5, {
        direccion: 'Calle 100 # 15-20',
        barrio: 'Chicó',
        nombreApellido: 'Laura Gomez',
        telefono: '3109876543',
        esPredeterminada: true,
      })
    ).rejects.toMatchObject({ codigo: 'LIMITE_DIRECCIONES_ALCANZADO', statusCode: 400 });
  });

  it('propaga cualquier otro error de la BD sin disfrazarlo de límite', async () => {
    vi.mocked(direccionesRepo.contarPorUsuario).mockResolvedValueOnce(0);
    vi.mocked(direccionesRepo.crear).mockRejectedValueOnce(new Error('conexión perdida'));

    await expect(
      service.crear(5, {
        direccion: 'Calle 100 # 15-20',
        barrio: 'Chicó',
        nombreApellido: 'Laura Gomez',
        telefono: '3109876543',
        esPredeterminada: true,
      })
    ).rejects.toThrow('conexión perdida');
  });

  it('actualiza dirección existente del usuario', async () => {
    vi.mocked(direccionesRepo.buscarPorId).mockResolvedValueOnce({
      idDireccion: 'dir-1',
      idUsuario: 5,
    } as DireccionCliente);

    const res = await service.actualizar('dir-1', 5, {
      barrio: 'Nuevo Barrio',
    });

    expect(res.idDireccion).toBe('dir-1');
    expect(direccionesRepo.actualizar).toHaveBeenCalledWith('dir-1', 5, {
      barrio: 'Nuevo Barrio',
    });
  });

  it('no deja quitar la marca de predeterminada a la única dirección', async () => {
    vi.mocked(direccionesRepo.buscarPorId).mockResolvedValueOnce({
      idDireccion: 'dir-1',
      idUsuario: 5,
    } as DireccionCliente);

    await service.actualizar('dir-1', 5, { esPredeterminada: false, barrio: 'Otro' });

    expect(direccionesRepo.actualizar).toHaveBeenCalledWith('dir-1', 5, { barrio: 'Otro' });
  });

  it('rechaza actualizar dirección si no existe o no pertenece al usuario', async () => {
    vi.mocked(direccionesRepo.buscarPorId).mockResolvedValueOnce(null);

    await expect(
      service.actualizar('dir-ajena', 5, {
        barrio: 'Nuevo Barrio',
      })
    ).rejects.toThrow(DireccionesError);
  });

  it('elimina dirección perteneciente al usuario', async () => {
    vi.mocked(direccionesRepo.buscarPorId).mockResolvedValueOnce({
      idDireccion: 'dir-1',
      idUsuario: 5,
    } as DireccionCliente);

    const res = await service.eliminar('dir-1', 5);
    expect(res.mensaje).toContain('eliminada exitosamente');
    expect(direccionesRepo.eliminar).toHaveBeenCalledWith('dir-1', 5);
  });
});
