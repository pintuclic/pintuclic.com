import { describe, expect, it } from 'vitest';
import {
  aFilaContrato,
  dividirEnBloques,
  dividirLinea,
  leerFilasColores,
  normalizarHexadecimal,
  PLANTILLA_COLORES_CSV,
} from '../services/importacion-colores';

describe('M01 · lectura del archivo de colores (C8)', () => {
  it('lee CSV con punto y coma y encabezado en cualquier orden y con tildes', () => {
    const r = leerFilasColores('Hexadecimal;Nombre;Código;Acabado\n#d7263d;Rojo;12;Mate\n#FFFFFF;Blanco;;');
    expect(r.errores).toEqual([]);
    expect(r.filas.map((f) => f.borrador)).toEqual([
      { nombre: 'Rojo', codigo: '12', hexadecimal: '#D7263D', base: '', acabado: 'Mate', familia: '' },
      { nombre: 'Blanco', codigo: '', hexadecimal: '#FFFFFF', base: '', acabado: '', familia: '' },
    ]);
    expect(r.filas.map((f) => f.linea)).toEqual([2, 3]);
  });

  it('sin encabezado usa el orden nombre, código, hexadecimal, base, acabado, familia', () => {
    const r = leerFilasColores('Azul Cielo,A1,3b6ea5,Pastel,Brillante,Azules');
    expect(r.filas[0]?.borrador).toEqual({
      nombre: 'Azul Cielo',
      codigo: 'A1',
      hexadecimal: '#3B6EA5',
      base: 'Pastel',
      acabado: 'Brillante',
      familia: 'Azules',
    });
  });

  it('acepta tabulador (pegado desde una hoja), comillas con separadores y líneas vacías', () => {
    const r = leerFilasColores('﻿nombre\thex\n\n"Rojo, intenso"\t#B5242F\r\n');
    expect(r.filas.map((f) => f.borrador.nombre)).toEqual(['Rojo, intenso']);
  });

  it('señala la línea de cada fila inválida sin detener las demás', () => {
    const r = leerFilasColores('nombre;hexadecimal\nBueno;#112233\n;#112233\nMalo;rojo\nOtro;#AABBCC');
    expect(r.filas.map((f) => f.borrador.nombre)).toEqual(['Bueno', 'Otro']);
    expect(r.errores).toEqual([
      { linea: 3, mensaje: 'Falta el nombre del color.' },
      { linea: 4, mensaje: '"Malo": el hexadecimal debe tener el formato #RRGGBB.' },
    ]);
  });

  it('un texto vacío no produce filas ni errores', () => {
    expect(leerFilasColores('  \n \n')).toEqual({ filas: [], errores: [] });
  });

  it('la plantilla descargable se lee sin errores', () => {
    const r = leerFilasColores(PLANTILLA_COLORES_CSV);
    expect(r.errores).toEqual([]);
    expect(r.filas).toHaveLength(2);
  });

  it('divide líneas con comillas escapadas y normaliza hexadecimales', () => {
    expect(dividirLinea('a;"b;c";"d ""e"""', ';')).toEqual(['a', 'b;c', 'd "e"']);
    expect(normalizarHexadecimal('abc123')).toBe('#ABC123');
    expect(normalizarHexadecimal('#abc123')).toBe('#ABC123');
    expect(normalizarHexadecimal('xyz')).toBe('xyz');
  });

  it('lo vacío no viaja en la fila del contrato (no modifica un color existente)', () => {
    expect(
      aFilaContrato({ nombre: 'Rojo', codigo: '', hexadecimal: '#D7263D', base: '', acabado: 'Mate', familia: '' }),
    ).toEqual({ nombre: 'Rojo', hexadecimal: '#D7263D', acabado: 'Mate' });
  });

  it('divide en bloques de hasta 500 filas', () => {
    const filas = Array.from({ length: 1201 }, (_v, i) => i);
    expect(dividirEnBloques(filas).map((b) => b.length)).toEqual([500, 500, 201]);
    expect(dividirEnBloques([], 500)).toEqual([]);
  });
});
