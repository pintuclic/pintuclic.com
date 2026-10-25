import { describe, expect, it } from 'vitest';
import { MAXIMO_FILAS_PLANTILLA } from '../dtos/m13-inventario.dto';
import type { FilaPlantilla, InventarioRepositoryPort } from '../interfaces/inventario.interface';
import { InventarioError } from '../services/inventario-error';
import { InventarioService } from '../services/inventario.service';
import { clavePorNombre, normalizar } from '../services/normalizar';
import { construirPlantillaCsv } from '../services/plantilla';

describe('M13 · normalizar (R5)', () => {
  it('ignora mayúsculas, tildes y espacios sobrantes', () => {
    expect(normalizar('  PINTURA   Acrílica\tMATE ')).toBe('pintura acrilica mate');
    expect(normalizar('Galón')).toBe(normalizar('galon'));
  });

  it("ignora el apóstrofo que la plantilla pone ante '=', '+', '-' y '@' (D4), y solo ese", () => {
    expect(normalizar("'=SKU-1")).toBe('=sku-1');
    expect(normalizar("'-5")).toBe('-5');
    expect(normalizar("'Hola")).toBe("'hola");
  });

  it('la clave por nombre distingue marca, producto y medida', () => {
    expect(clavePorNombre('Viniltex', 'Mate', '1 Galón')).toBe(clavePorNombre(' viniltex ', 'MATE', '1 galon'));
    expect(clavePorNombre('A', 'B C', 'D')).not.toBe(clavePorNombre('A B', 'C', 'D'));
  });
});

describe('M13 · plantilla CSV (D4, R6)', () => {
  const fila = (extra: Partial<FilaPlantilla> = {}): FilaPlantilla => ({
    marca: 'Viniltex',
    producto: 'Mate',
    medida: '1 Galón',
    sku: 'VM-1',
    existenciaReferencial: 7,
    ...extra,
  });

  it('empieza con BOM, usa ; y trae la existencia actual en las dos últimas columnas', () => {
    const csv = construirPlantillaCsv([fila()]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'marca;producto;medida;sku;existencia_actual;existencia',
      'Viniltex;Mate;1 Galón;VM-1;7;7',
      '',
    ]);
  });

  it('entrecomilla celdas con ; comillas o saltos de línea', () => {
    const csv = construirPlantillaCsv([fila({ producto: 'A;B "C"\nD' })]);
    expect(csv).toContain('"A;B ""C""\nD"');
  });

  it("antepone ' a las celdas que una hoja de cálculo leería como fórmula", () => {
    const csv = construirPlantillaCsv([fila({ producto: '=1+1', sku: '-X', marca: '+M', medida: '@m' })]);
    expect(csv).toContain("'+M;'=1+1;'@m;'-X;7;7");
  });

  it('sin variantes devuelve solo el encabezado', () => {
    expect(construirPlantillaCsv([]).slice(1)).toBe('marca;producto;medida;sku;existencia_actual;existencia\r\n');
  });
});

describe('M13 · plantilla demasiado grande (D4)', () => {
  function repoCon(total: number): InventarioRepositoryPort {
    const noUsado = (): never => {
      throw new Error('no debe llamarse');
    };
    return {
      resumen: noUsado,
      listar: noUsado,
      obtener: noUsado,
      historial: noUsado,
      obtenerAjuste: noUsado,
      ajustar: noUsado,
      variantesBuscables: noUsado,
      aplicarCarga: noUsado,
      contarParaPlantilla: () => Promise.resolve(total),
      filasParaPlantilla: () => Promise.resolve([]),
    };
  }

  it(`acepta exactamente ${MAXIMO_FILAS_PLANTILLA} variantes`, async () => {
    const csv = await new InventarioService(repoCon(MAXIMO_FILAS_PLANTILLA)).plantilla({});
    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('con una más responde 409 PLANTILLA_DEMASIADA_GRANDE', async () => {
    const error: unknown = await new InventarioService(repoCon(MAXIMO_FILAS_PLANTILLA + 1))
      .plantilla({})
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InventarioError);
    expect(error).toMatchObject({ code: 'PLANTILLA_DEMASIADO_GRANDE', status: 409 });
  });
});
