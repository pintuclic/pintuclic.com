import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M06 (`contracts/`) es la voz de la verdad; el DTO del backend es su espejo.
 * Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function sinComentarios(texto: string): string {
  return texto
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M06 · el DTO del backend es espejo del contrato', () => {
  it('dtos/m06-precios.dto.ts coincide con contracts/m06-precios.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m06-precios.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m06-precios.dto.ts'), 'utf8');
    expect(sinComentarios(dto)).toBe(sinComentarios(contrato));
  });
});
