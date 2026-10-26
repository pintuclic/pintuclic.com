import { afterEach, describe, expect, it, vi } from 'vitest';
import { direccionDesdeCoordenadas, motivoFalloUbicacion, sugerirDireccion } from '../services/geocodificacion';

describe('M04 Frontend — dirección a partir de la ubicación (CA-CUE-07-04)', () => {
  describe('sugerirDireccion', () => {
    it('arma la dirección con el formato colombiano y toma el barrio más fino', () => {
      expect(
        sugerirDireccion({
          address: { road: 'Calle 12', house_number: '5-37', neighbourhood: 'San Pedro', city_district: 'Comuna 3' },
        }),
      ).toEqual({ direccion: 'Calle 12 # 5-37', barrio: 'San Pedro' });
    });

    it('sin número de casa deja solo la vía, y sin barrio recurre al sector o a la comuna', () => {
      expect(sugerirDireccion({ address: { road: 'Avenida Carrera 7', suburb: 'Chapinero' } })).toEqual({
        direccion: 'Avenida Carrera 7',
        barrio: 'Chapinero',
      });
      expect(sugerirDireccion({ address: { road: 'Calle 1', city_district: 'Comuna 3' } }).barrio).toBe('Comuna 3');
    });

    it('un número sin calle no se usa y una respuesta vacía no inventa nada', () => {
      expect(sugerirDireccion({ address: { house_number: '5-37' } })).toEqual({ direccion: null, barrio: null });
      expect(sugerirDireccion({})).toEqual({ direccion: null, barrio: null });
    });
  });

  describe('direccionDesdeCoordenadas', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const responder = (cuerpo: unknown, ok = true) =>
      vi.fn().mockResolvedValue({ ok, json: async () => cuerpo } as Response);

    it('consulta el servicio en español con las coordenadas y devuelve los campos', async () => {
      const fetchMock = responder({ address: { road: 'Calle 12', house_number: '5-37', neighbourhood: 'San Pedro' } });
      vi.stubGlobal('fetch', fetchMock);

      const resultado = await direccionDesdeCoordenadas(3.4516, -76.532);

      expect(resultado).toEqual({ direccion: 'Calle 12 # 5-37', barrio: 'San Pedro' });
      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.searchParams.get('lat')).toBe('3.4516');
      expect(url.searchParams.get('lon')).toBe('-76.532');
      expect(url.searchParams.get('accept-language')).toBe('es');
    });

    it('devuelve null si el servicio falla, no responde o no conoce el lugar', async () => {
      vi.stubGlobal('fetch', responder({}, false));
      expect(await direccionDesdeCoordenadas(0, 0)).toBeNull();

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
      expect(await direccionDesdeCoordenadas(0, 0)).toBeNull();

      vi.stubGlobal('fetch', responder({ error: 'Unable to geocode' }));
      expect(await direccionDesdeCoordenadas(0, 0)).toBeNull();
    });
  });

  describe('motivoFalloUbicacion', () => {
    it('distingue permiso denegado, posición no disponible y tiempo agotado', () => {
      expect(motivoFalloUbicacion(1, true)).toBe('permiso');
      expect(motivoFalloUbicacion(2, true)).toBe('no-disponible');
      expect(motivoFalloUbicacion(3, true)).toBe('tiempo');
      expect(motivoFalloUbicacion(null, true)).toBe('no-disponible');
    });

    it('sin conexión segura la causa es el https, sea cual sea el código', () => {
      expect(motivoFalloUbicacion(1, false)).toBe('conexion-insegura');
      expect(motivoFalloUbicacion(3, false)).toBe('conexion-insegura');
    });
  });
});
