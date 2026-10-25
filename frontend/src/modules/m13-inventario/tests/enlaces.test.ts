import { describe, expect, it } from 'vitest';
import { enlaceSeccion, filtrosHistorialDesdeUrl, leerSeccion, nuevoIdCarga } from '../services/enlaces';

describe('M13 · enlaces', () => {
  it('lee la sección y cae en existencias si no se reconoce', () => {
    expect(leerSeccion('historial')).toBe('historial');
    expect(leerSeccion('otra')).toBe('existencias');
    expect(leerSeccion(null)).toBe('existencias');
  });

  it('arma el enlace del historial filtrado y lo vuelve a leer', () => {
    const id = nuevoIdCarga();
    const url = enlaceSeccion('historial', { idVariante: 7, idCarga: id });
    expect(url).toBe(`/admin/inventario?seccion=historial&idVariante=7&idCarga=${id}`);
    expect(filtrosHistorialDesdeUrl(new URL(url, 'http://x').searchParams)).toEqual({ idVariante: '7', idCarga: id });
  });

  it('descarta filtros inválidos de la URL', () => {
    const params = new URLSearchParams({ idVariante: 'abc', idCarga: 'no-es-uuid' });
    expect(filtrosHistorialDesdeUrl(params)).toEqual({ idVariante: '', idCarga: '' });
    expect(filtrosHistorialDesdeUrl(new URLSearchParams({ idVariante: '0' })).idVariante).toBe('');
  });

  it('genera identificadores de carga con forma de uuid v4, distintos entre sí', () => {
    const a = nuevoIdCarga();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(nuevoIdCarga()).not.toBe(a);
  });
});
