import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { contrasenaSchema as contrasenaM20 } from '../../m20-seguridad/dtos/credenciales.dto';
import type { EntidadParametro } from '../interfaces/configuracion.port';
import {
  AlmacenConfiguracionMemoria,
  PrismaConfiguracionRepository,
} from '../repositories/configuracion.repository';
import { ConfiguracionService } from '../services/configuracion.service';

function crearFixturesPrueba(): EntidadParametro[] {
  let pisoM20 = 0;
  for (let n = 1; n <= 64; n += 1) {
    if (contrasenaM20.safeParse('a'.repeat(n)).success) {
      pisoM20 = n;
      break;
    }
  }

  return [
    {
      clave: 'auth.vigencia_codigo_registro_minutos',
      area: 'autenticacion',
      tipoDato: 'numero',
      valor: 15,
      descripcion: 'Tiempo de vida en minutos del código OTP para confirmación de registro',
      valorPorDefecto: 15,
      rangoMinimo: 5,
      rangoMaximo: 60,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'auth.intentos_codigo_registro',
      area: 'autenticacion',
      tipoDato: 'numero',
      valor: 3,
      descripcion: 'Cantidad máxima de intentos fallidos antes de invalidar el código OTP',
      valorPorDefecto: 3,
      rangoMinimo: 1,
      rangoMaximo: 10,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'auth.complejidad_minima_contrasena',
      area: 'autenticacion',
      tipoDato: 'numero',
      valor: 12,
      descripcion: 'Longitud mínima exigida para contraseñas de cuentas',
      valorPorDefecto: 12,
      rangoMinimo: pisoM20,
      rangoMaximo: 32,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'auth.vigencia_enlace_recuperacion_minutos',
      area: 'autenticacion',
      tipoDato: 'numero',
      valor: 30,
      descripcion: 'Vigencia máxima del token o enlace para restablecimiento de contraseña',
      valorPorDefecto: 30,
      rangoMinimo: 10,
      rangoMaximo: 120,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'auth.intentos_fallidos_bloqueo',
      area: 'autenticacion',
      tipoDato: 'numero',
      valor: 5,
      descripcion: 'Número de intentos erróneos consecutivos que disparan el bloqueo temporal',
      valorPorDefecto: 5,
      rangoMinimo: 3,
      rangoMaximo: 10,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'auth.duracion_bloqueo_minutos',
      area: 'autenticacion',
      tipoDato: 'numero',
      valor: 15,
      descripcion: 'Duración en minutos del bloqueo por intentos fallidos de autenticación',
      valorPorDefecto: 15,
      rangoMinimo: 5,
      rangoMaximo: 1440,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'comms.reintentos_envio_transaccional',
      area: 'comunicaciones',
      tipoDato: 'numero',
      valor: 3,
      descripcion: 'Reintentos automáticos ante fallas transitorias de entrega SMTP',
      valorPorDefecto: 3,
      rangoMinimo: 1,
      rangoMaximo: 5,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'comercial.iva_porcentaje',
      area: 'comercial',
      tipoDato: 'numero',
      valor: 19,
      descripcion: 'Porcentaje general de impuesto al valor agregado (IVA) aplicable a ventas',
      valorPorDefecto: 19,
      rangoMinimo: 0,
      rangoMaximo: 50,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'comercial.costo_envio_base',
      area: 'comercial',
      tipoDato: 'numero',
      valor: 15000,
      descripcion: 'Tarifa base de despacho estándar a domicilio',
      valorPorDefecto: 15000,
      rangoMinimo: 0,
      fechaActualizacion: new Date(),
    },
    {
      clave: 'comercial.umbral_envio_gratis',
      area: 'comercial',
      tipoDato: 'numero',
      valor: 200000,
      descripcion: 'Monto mínimo de compra para exoneración de costos de envío',
      valorPorDefecto: 200000,
      rangoMinimo: 0,
      fechaActualizacion: new Date(),
    },
  ];
}

describe('HU-ADM-05 y HU-ADM-07 · Configuración General del Sistema (ADR-007 / RFC-M17-001)', () => {
  it('Obtiene catálogo completo de parámetros del sistema', async () => {
    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
    const servicio = new ConfiguracionService(repo);

    const { parametros } = await servicio.obtenerCatalogo();

    expect(parametros).toHaveLength(10);
    const iva = parametros.find((p) => p.clave === 'comercial.iva_porcentaje');
    expect(iva).toBeDefined();
    expect(iva?.valor).toBe(19);
    expect(iva?.area).toBe('comercial');
  });

  it('RN-ADM-15: Actualiza parámetro en caliente dentro de rango permitido y registra idAdmin', async () => {
    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
    const servicio = new ConfiguracionService(repo);

    const resultado = await servicio.actualizarParametro(
      'comercial.iva_porcentaje',
      { valor: 16 },
      1, // idAdmin
    );

    expect(resultado.clave).toBe('comercial.iva_porcentaje');
    expect(resultado.valorAnterior).toBe(19);
    expect(resultado.valorNuevo).toBe(16);

    // Verificar persistencia y autor
    const parametroActualizado = await repo.obtener('comercial.iva_porcentaje');
    expect(parametroActualizado?.valor).toBe(16);
    expect(parametroActualizado?.idUsuarioActualizo).toBe(1);
  });

  it('RN-ADM-15: Rechaza actualización si el valor supera el rango máximo', async () => {
    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('comercial.iva_porcentaje', { valor: 90 }),
    ).rejects.toThrow('supera el máximo permitido (50)');
  });

  it('RN-ADM-15: Rechaza actualización si el valor es menor que el rango mínimo', async () => {
    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('auth.vigencia_codigo_registro_minutos', { valor: 2 }),
    ).rejects.toThrow('menor que el mínimo permitido (5)');
  });

  it('RN-ADM-15: Rechaza valor nulo o indefinido', async () => {
    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
    const servicio = new ConfiguracionService(repo);

    await expect(
      servicio.actualizarParametro('comercial.iva_porcentaje', { valor: null as unknown as number }),
    ).rejects.toThrow('El valor del parámetro no puede ser nulo');
  });

  it('RN-SEG-01: el mínimo de complejidad de contraseña no puede fijarse por debajo de 12', async () => {
    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
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
    let pisoM20 = 0;
    for (let n = 1; n <= 64; n += 1) {
      if (contrasenaM20.safeParse('a'.repeat(n)).success) {
        pisoM20 = n;
        break;
      }
    }
    expect(pisoM20).toBeGreaterThan(0);

    const repo = new AlmacenConfiguracionMemoria(crearFixturesPrueba());
    const parametro = await repo.obtener('auth.complejidad_minima_contrasena');

    expect(parametro?.rangoMinimo).toBe(pisoM20);
    expect(parametro?.valorPorDefecto).toBeGreaterThanOrEqual(pisoM20);
  });
});

describe('PrismaConfiguracionRepository · Persistencia en BD y Caché Corta (RFC-M17-001)', () => {
  it('gestiona lecturas con caché de 30s e invalida la caché tras actualizar', async () => {
    const mockFila = {
      idParametro: 1,
      clave: 'comercial.iva_porcentaje',
      area: 'comercial' as const,
      tipoDato: 'numero' as const,
      descripcion: 'Porcentaje general de IVA',
      valor: 19,
      valorPorDefecto: 19,
      rangoMinimo: new Prisma.Decimal(0),
      rangoMaximo: new Prisma.Decimal(50),
      fechaActualizacion: new Date(),
      idUsuarioActualizo: null,
    };

    const findManySpy = vi.spyOn(prisma.parametroSistema, 'findMany').mockResolvedValue([mockFila]);
    const findUniqueSpy = vi.spyOn(prisma.parametroSistema, 'findUnique').mockResolvedValue(mockFila);
    const updateSpy = vi.spyOn(prisma.parametroSistema, 'update').mockResolvedValue({
      ...mockFila,
      valor: 16,
      idUsuarioActualizo: 1,
    });

    const repo = new PrismaConfiguracionRepository(30_000);

    // 1. Primera llamada: consulta la base de datos
    const lista1 = await repo.listar();
    expect(lista1).toHaveLength(1);
    expect(findManySpy).toHaveBeenCalledTimes(1);

    // 2. Segunda llamada dentro del TTL: responde desde la caché (no incrementa llamadas a prisma)
    const lista2 = await repo.listar();
    expect(lista2).toHaveLength(1);
    expect(findManySpy).toHaveBeenCalledTimes(1);

    // 3. Consulta individual: aprovecha la caché cargada
    const parametro = await repo.obtener('comercial.iva_porcentaje');
    expect(parametro?.valor).toBe(19);
    expect(findUniqueSpy).not.toHaveBeenCalled();

    // 4. Actualización: persiste con idAdmin e invalida la caché
    const actualizado = await repo.actualizar('comercial.iva_porcentaje', 16, 1);
    expect(actualizado.valor).toBe(16);
    expect(actualizado.idUsuarioActualizo).toBe(1);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { clave: 'comercial.iva_porcentaje' },
      data: {
        valor: 16,
        idUsuarioActualizo: 1,
      },
    });

    // 5. Tras actualización, la caché está invalidada: la siguiente lista vuelve a consultar Prisma
    await repo.listar();
    expect(findManySpy).toHaveBeenCalledTimes(2);

    findManySpy.mockRestore();
    findUniqueSpy.mockRestore();
    updateSpy.mockRestore();
  });
});
