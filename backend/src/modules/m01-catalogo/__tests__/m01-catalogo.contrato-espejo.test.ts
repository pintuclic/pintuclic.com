import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M01 (`contracts/`) es la voz de la verdad; los DTOs del backend son
 * su espejo. Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function sinEncabezado(texto: string): string {
  const inicio = texto.indexOf('/**');
  const fin = texto.indexOf('*/', inicio) + 2;
  return (texto.slice(0, inicio) + texto.slice(fin)).replace(/\s+/g, ' ').trim();
}

function contenidoSinEncabezados(texto: string): string {
  // Quita todos los comentarios de bloque iniciales y el import propio del espejo.
  return sinEncabezado(texto).replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
}

const PARES = [
  { contrato: 'contracts/m01-catalogo.contract.ts', dto: 'dtos/m01-catalogo.dto.ts' },
  { contrato: 'contracts/m01-catalogo-productos.contract.ts', dto: 'dtos/m01-catalogo-productos.dto.ts' },
];

describe('M01 · los DTOs del backend son espejo del contrato', () => {
  for (const par of PARES) {
    it(`${par.dto} coincide con ${par.contrato}`, () => {
      const contrato = readFileSync(resolve(RAIZ, par.contrato), 'utf8');
      const dto = readFileSync(resolve(__dirname, '..', par.dto), 'utf8')
        .replace("'./m01-catalogo.dto'", "'./m01-catalogo.contract'");
      expect(contenidoSinEncabezados(dto)).toBe(contenidoSinEncabezados(contrato));
    });
  }
});
