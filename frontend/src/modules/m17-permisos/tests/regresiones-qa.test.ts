import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import { editarEmpleadoDto, telefonoSchema } from '../dtos/empleados.dto';
import { mensajeDeError } from '../services/mensaje-error';

/**
 * ==============================================================================
 * Pruebas de regresión de los hallazgos de la revisión de pares — M17
 * ==============================================================================
 * Cada caso de aquí reproduce un defecto que las compuertas automatizadas
 * (tsc, ESLint, check:no-any) dejaban pasar porque no son detectables en
 * compilación: solo se manifiestan al ejecutar el límite exacto.
 */

vi.mock('../services/configuracion.service', () => ({
  obtenerCatalogoParametros: vi.fn(() => Promise.resolve({ parametros: [] })),
  actualizarParametro: vi.fn(() =>
    Promise.resolve({ clave: 'comercial.iva_porcentaje', valor: 19 }),
  ),
}));

describe('M17 — Regresiones de la revisión de pares', () => {
  describe('HU-ADM-01: edición de colaborador sin teléfono', () => {
    it('acepta el teléfono vacío de un colaborador con telefono null', () => {
      // El modal precarga `empleado.telefono || ''`. Con `telefonoSchema
      // .optional()` este caso fallaba el mínimo de 7 y la edición quedaba
      // bloqueada incluso para cambiar solo el nombre.
      const res = editarEmpleadoDto.safeParse({ nombre: 'Laura Gómez', telefono: '' });
      expect(res.success).toBe(true);
    });

    it('permite cambiar solo el nombre sin tocar el teléfono', () => {
      const res = editarEmpleadoDto.safeParse({ nombre: 'Laura Gómez' });
      expect(res.success).toBe(true);
    });

    it('sigue rechazando un teléfono presente pero demasiado corto', () => {
      const res = editarEmpleadoDto.safeParse({ nombre: 'Laura Gómez', telefono: '123' });
      expect(res.success).toBe(false);
    });

    it('rechaza un teléfono de solo espacios en blanco (anti-bypass)', () => {
      expect(telefonoSchema.safeParse('        ').success).toBe(false);
    });
  });

  describe('Traducción de errores de la API', () => {
    function errorConEnvelope(mensaje: string): AxiosError {
      const error = new AxiosError('Request failed with status code 409');
      // Fixture mínimo: solo `data` participa en la traducción del mensaje.
      error.response = {
        data: {
          success: false,
          error: { code: 'SOLICITUD_DUPLICADA', message: mensaje, details: null },
        },
      } as unknown as AxiosResponse<unknown>;
      return error;
    }

    it('prefiere el mensaje de dominio del envelope sobre el texto de axios', () => {
      const err = errorConEnvelope('El correo ya está registrado en el sistema');
      expect(mensajeDeError(err, 'respaldo')).toBe(
        'El correo ya está registrado en el sistema',
      );
    });

    it('usa el respaldo cuando la respuesta no trae envelope legible', () => {
      const err = new AxiosError('Request failed with status code 500');
      expect(mensajeDeError(err, 'Error al crear colaborador')).toBe(
        'Error al crear colaborador',
      );
    });

    it('conserva el mensaje de un Error de dominio que no viene de axios', () => {
      expect(mensajeDeError(new Error('Permiso denegado'), 'respaldo')).toBe(
        'Permiso denegado',
      );
    });

    it('cae al respaldo ante un valor lanzado que no es Error', () => {
      expect(mensajeDeError('fallo suelto', 'respaldo')).toBe('respaldo');
    });
  });

  describe('HU-ADM-05: confirmación de guardado de parámetros', () => {
    beforeEach(async () => {
      const { useConfiguracionStore } = await import('../store/configuracionStore');
      useConfiguracionStore.setState({ error: null, exitoMensaje: null, parametros: [] });
    });

    it('conserva el mensaje de éxito después del refresco del catálogo', async () => {
      // `cargarParametros` limpia `exitoMensaje` al arrancar. Fijar el mensaje
      // antes del refresco lo borraba y el banner nunca llegaba a verse.
      const { useConfiguracionStore } = await import('../store/configuracionStore');
      const ok = await useConfiguracionStore
        .getState()
        .guardarParametro('comercial.iva_porcentaje', 19);

      expect(ok).toBe(true);
      expect(useConfiguracionStore.getState().exitoMensaje).toBe(
        'Parámetro comercial.iva_porcentaje actualizado correctamente',
      );
      expect(useConfiguracionStore.getState().actualizando).toBe(false);
    });
  });
});
