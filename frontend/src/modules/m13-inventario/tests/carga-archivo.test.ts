import { describe, expect, it } from 'vitest';
import { MAXIMO_FILAS_BLOQUE } from '../dtos/m13-inventario.dto';
import { decodificarCsv, dividirEnBloques, dividirLinea, leerCarga, normalizar } from '../services/carga-archivo';

const ENCABEZADO = 'marca;producto;medida;sku;existencia_actual;existencia';

describe('M13 · normalizar (igual que el servidor, R5)', () => {
  it('ignora mayúsculas, tildes, espacios sobrantes y el apóstrofo de las fórmulas', () => {
    expect(normalizar('  Galón   MATE ')).toBe('galon mate');
    expect(normalizar("'=SKU")).toBe('=sku');
    expect(normalizar("'Hola")).toBe("'hola");
  });
});

describe('M13 · leerCarga', () => {
  it('lee la plantilla: manda el SKU, ignora existencia_actual y omite las celdas vacías (R9)', () => {
    const r = leerCarga(`﻿${ENCABEZADO}\r\nViniltex;Mate;1 Galón;VM-1;7;12\r\nViniltex;Mate;1/4;VM-2;3;\r\n`);
    expect(r.formatoInvalido).toBeNull();
    expect(r.filas).toEqual([{ linea: 2, fila: { sku: 'VM-1', existencia: 12 } }]);
    expect(r.omitidas).toBe(1);
    expect(r.errores).toEqual([]);
  });

  it('sin SKU usa marca + producto + medida', () => {
    const r = leerCarga(`${ENCABEZADO}\nViniltex;Mate;1 Galón;;7;9`);
    expect(r.filas[0]?.fila).toEqual({ marca: 'Viniltex', producto: 'Mate', medida: '1 Galón', existencia: 9 });
  });

  it('funciona con coma o tabulador, con comillas y con una columna de nota', () => {
    expect(leerCarga('sku,existencia\nA-1,5').filas[0]?.fila).toEqual({ sku: 'A-1', existencia: 5 });
    expect(leerCarga('sku\texistencia\tnota\nA-1\t5\tConteo').filas[0]?.fila).toEqual({
      sku: 'A-1',
      existencia: 5,
      nota: 'Conteo',
    });
    expect(leerCarga('sku;existencia;nota\nA-1;5;"Bodega; fila 2"').filas[0]?.fila.nota).toBe('Bodega; fila 2');
  });

  it('explica por línea lo que no se puede enviar', () => {
    const r = leerCarga(
      `${ENCABEZADO}\n;;;;1;5\nV;P;;;1;5\n;;;S-1;1;abc\n;;;S-2;1;-4\n;;;S-3;1;1,5\n;;;S-4;1;99999999999\n;;;S-5;1;0`,
    );
    expect(r.filas.map((f) => f.linea)).toEqual([8]);
    expect(r.errores.map((e) => e.linea)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(r.errores[0]?.mensaje).toContain('Falta el SKU');
    expect(r.errores[2]?.mensaje).toContain('"abc"');
  });

  it('una variante repetida se rechaza en todas sus líneas, aunque se nombre distinto en mayúsculas o tildes (R10)', () => {
    const r = leerCarga(
      `${ENCABEZADO}\n;;;AB-1;;5\n;;;ab-1 ;;6\nViniltex;Mate;Galón;;;1\nVINILTEX;mate;galon;;;2\n;;;OTRO;;3`,
    );
    expect(r.filas.map((f) => f.linea)).toEqual([6]);
    expect(r.errores.map((e) => e.linea)).toEqual([2, 3, 4, 5]);
    expect(r.errores[0]?.mensaje).toContain('líneas 2, 3');
  });

  it('un archivo sin las columnas de la plantilla se explica en vez de fallar callado', () => {
    expect(leerCarga('nombre;color\nA;B').formatoInvalido).toContain('plantilla');
    expect(leerCarga('marca;producto;existencia\nA;B;1').formatoInvalido).not.toBeNull();
    expect(leerCarga('sku;nombre\nA;1').formatoInvalido).not.toBeNull();
  });

  it('ignora líneas vacías, las que Excel rellena con ;;;; y las filas con solo la existencia_actual', () => {
    const r = leerCarga(`${ENCABEZADO}\n\n;;;;;\n;;;S-1;4;4\n\n`);
    expect(r.filas).toHaveLength(1);
    expect(r.errores).toEqual([]);
  });

  it('texto vacío no es un error', () => {
    expect(leerCarga('   ')).toEqual({ filas: [], errores: [], omitidas: 0, formatoInvalido: null });
  });

  it('un salto de línea dentro de comillas no parte la fila y la numeración sigue al archivo', () => {
    const r = leerCarga('sku;existencia;nota\nA-1;5;"dos\nlíneas"\nB-1;x;');
    expect(r.filas[0]?.fila.nota).toBe('dos\nlíneas');
    expect(r.errores[0]?.linea).toBe(4);
  });
});

describe('M13 · decodificarCsv', () => {
  it('lee UTF-8', () => {
    expect(decodificarCsv(new TextEncoder().encode('Galón').buffer)).toBe('Galón');
  });

  it('lee Windows-1252 (el "CSV" de Excel en español) sin romper las tildes', () => {
    const bytes = Uint8Array.from([0x47, 0x61, 0x6c, 0xf3, 0x6e]); // "Galón" en 1252
    expect(decodificarCsv(bytes.buffer)).toBe('Galón');
  });
});

describe('M13 · bloques y líneas', () => {
  it(`parte en bloques de ${MAXIMO_FILAS_BLOQUE}`, () => {
    const filas = Array.from({ length: 1201 }, (_u, i) => i);
    expect(dividirEnBloques(filas).map((b) => b.length)).toEqual([500, 500, 201]);
    expect(dividirEnBloques([])).toEqual([]);
  });

  it('divide respetando comillas', () => {
    expect(dividirLinea('a;"b;c";"d""e"', ';')).toEqual(['a', 'b;c', 'd"e']);
  });
});
