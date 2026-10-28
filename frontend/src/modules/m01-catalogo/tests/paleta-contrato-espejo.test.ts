import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El contrato de la paleta de color es la voz de la verdad; el DTO del frontend es su espejo. */
const RAIZ = resolve(__dirname, '../../../../../');
const normalizar = (t: string): string => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

describe('M01 · paleta de color: el DTO del frontend es espejo del contrato', () => {
  it('dtos/m01-catalogo-paleta.dto.ts coincide con contracts/m01-catalogo-paleta.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m01-catalogo-paleta.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m01-catalogo-paleta.dto.ts'), 'utf8').replace(
      "'./m01-catalogo.dto'",
      "'./m01-catalogo.contract'",
    );
    expect(normalizar(dto)).toBe(normalizar(contrato));
  });
});
