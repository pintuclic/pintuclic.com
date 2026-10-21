import { describe, expect, it } from 'vitest';
import { contrasenaSchema as contrasenaM20 } from '../../m20-seguridad/dtos/credenciales.dto';
import { AlmacenConfiguracionMemoria } from '../repositories/configuracion.repository';
import { ConfiguracionService } from '../services/configuracion.service';

describe('HU-ADM-05 y HU-ADM-07 · Configuración General del Sistema (ADR-007)', () => {
  it('Obtiene catálogo completo de parámetros del sistema', async () => {
    const repo = new AlmacenConfiguracionMemoria();
    const servicio = new ConfiguracionService(repo);

    const { parametros } = await servicio.obtenerCatalogo();

    expect(parametros).toHaveLength(10);
    const iva = parametros.find((p) => p.clave === 'comercial.iva_porcentaje');
    expect(iva).toBeDefined();
    expect(iva?.valor).toBe(19);
    expect(iva?.area).toBe('comercial');
  });

  it('RN-ADM-15: Actualiza parámetro en caliente dentro de rango permitido', async () => {
    const repo = new AlmacenConfiguracionMemoria();
    const servicio = new ConfiguracionService(repo);

    const resultado = await servicio.actualizarParametro('comercial.iva_porcentaje', { valor: 16 });

    expect(resultado.clave).toBe('comercial.iva_porcentaje');
    expect(resultado.valorAnterior).toBe(19);
    expect(resultado.valorNuevo).toBe(16);

    // Verificar persistencia en caliente
    const { parametros } = await servicio.obtenerCatalogo();
    const ivaActualizado = parametros.find((p) => p.clave === 'comercial.iva_porcentaje');
    expect(ivaActualizado?.valor).toBe(16);
  });

  it('RN-ADM-15: Rechaza actualización si el valor supera el rango máximo', async () => {
    const repo = new AlmacenConfiguracionMemoria();
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('comercial.iva_porcentaje', { valor: 90 }),
    ).rejects.toThrow('supera el máximo permitido (50)');
  });

  it('RN-ADM-15: Rechaza actualización si el valor es menor que el rango mínimo', async () => {
    const repo = new AlmacenConfiguracionMemoria();
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('auth.vigencia_codigo_registro_minutos', { valor: 2 }),
    ).rejects.toThrow('menor que el mínimo permitido (5)');
  });

  it('RN-ADM-15: Rechaza valor nulo o indefinido', async () => {
    const repo = new AlmacenConfiguracionMemoria();
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('comercial.iva_porcentaje', { valor: null as unknown as number }),
    ).rejects.toThrow('El valor del parámetro no puede ser nulo');
  });

  it('RN-SEG-01: el mínimo de complejidad de contraseña no puede fijarse por debajo de 12', async () => {
    const repo = new AlmacenConfiguracionMemoria();
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('auth.complejidad_minima_contrasena', { valor: 11 }),
    ).rejects.toThrow('menor que el mínimo permitido (12)');

    const limite = await servicio.actualizarParametro('auth.complejidad_minima_contrasena', { valor: 12 });
    expect(limite.valorNuevo).toBe(12);

    await expect(
      servicio.actualizarParametro('auth.complejidad_minima_contrasena', { valor: 33 }),
    ).rejects.toThrow('supera el máximo permitido (32)');
  });

  it('el piso del catálogo coincide con el mínimo real de contraseña de M20 (no pueden volver a divergir)', async () => {
    // Se deduce el mínimo que M20 realmente impone, en lugar de copiar el número aquí.
    let pisoM20 = 0;
    for (let n = 1; n <= 64; n += 1) {
      if (contrasenaM20.safeParse('a'.repeat(n)).success) { pisoM20 = n; break; }
    }
    expect(pisoM20).toBeGreaterThan(0);

    const repo = new AlmacenConfiguracionMemoria();
    const parametro = await repo.obtener('auth.complejidad_minima_contrasena');

    expect(parametro?.rangoMinimo).toBe(pisoM20);
    expect(parametro?.valorPorDefecto).toBeGreaterThanOrEqual(pisoM20);
  });
});
