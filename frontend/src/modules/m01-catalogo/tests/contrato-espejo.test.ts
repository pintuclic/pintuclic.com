import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M01 (`contracts/`) es la voz de la verdad; los DTOs del frontend son su
 * espejo. Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

/** Quita comentarios de bloque y espacios: el encabezado del espejo es lo único que cambia. */
function normalizar(texto: string): string {
  return texto
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const PARES = [
  { contrato: 'contracts/m01-catalogo.contract.ts', dto: 'dtos/m01-catalogo.dto.ts' },
  { contrato: 'contracts/m01-catalogo-productos.contract.ts', dto: 'dtos/m01-catalogo-productos.dto.ts' },
  { contrato: 'contracts/m01-catalogo-entrega3.contract.ts', dto: 'dtos/m01-catalogo-entrega3.dto.ts' },
];

describe('M01 · los DTOs del frontend son espejo del contrato', () => {
  for (const par of PARES) {
    it(`${par.dto} coincide con ${par.contrato}`, () => {
      const contrato = readFileSync(resolve(RAIZ, par.contrato), 'utf8')
        .replace("'./m01-catalogo.contract'", "'./m01-catalogo.dto'")
        .replace("'./m01-catalogo-productos.contract'", "'./m01-catalogo-productos.dto'");
      const dto = readFileSync(resolve(__dirname, '..', par.dto), 'utf8');
      expect(normalizar(dto)).toBe(normalizar(contrato));
    });
  }
});
