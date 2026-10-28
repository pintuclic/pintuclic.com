import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M13 (`contracts/`) es la voz de la verdad; el DTO del frontend es su espejo.
 * Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function normalizar(texto: string): string {
  return texto
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M13 · el DTO del frontend es espejo del contrato', () => {
  it('dtos/m13-inventario.dto.ts coincide con contracts/m13-inventario.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m13-inventario.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m13-inventario.dto.ts'), 'utf8');
    expect(normalizar(dto)).toBe(normalizar(contrato));
  });
});
