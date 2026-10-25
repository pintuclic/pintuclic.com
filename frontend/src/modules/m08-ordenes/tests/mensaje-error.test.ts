import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { codigoDeError, mensajeDeError } from '../services/mensaje-error';

describe('mensajes de error de M08', () => {
  it('una respuesta que no cumple el contrato muestra el texto de respaldo, no el JSON de Zod', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fallo = z.object({ codigo: z.string().regex(/^PC-/) }).safeParse({ codigo: 'ORD-1' });
    if (fallo.success) throw new Error('el esquema debía fallar');

    const mensaje = mensajeDeError(fallo.error, 'No pudimos cargar los pedidos.');

    expect(mensaje).toBe('No pudimos cargar los pedidos.');
    expect(mensaje).not.toMatch(/regex|invalid_format|pattern|path/);
    expect(consola).toHaveBeenCalledTimes(1);
  });

  it('prefiere el mensaje de dominio que envía la API', () => {
    const error = new AxiosError('fallo', 'ERR', undefined, undefined, {
      status: 409,
      data: { success: false, error: { code: 'ESTADO_CAMBIADO', message: 'La orden cambió de estado.', details: null } },
    } as AxiosResponse);

    expect(mensajeDeError(error, 'respaldo')).toBe('La orden cambió de estado.');
    expect(codigoDeError(error)).toBe('ESTADO_CAMBIADO');
  });

  it('sin mensaje utilizable cae al respaldo', () => {
    expect(mensajeDeError('algo raro', 'respaldo')).toBe('respaldo');
    expect(codigoDeError(new Error('x'))).toBeNull();
  });
});
