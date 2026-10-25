import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M08 (`contracts/`) es la voz de la verdad; el DTO del frontend es su
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

describe('M08 · el DTO del frontend es espejo del contrato', () => {
  it('dtos/m08-ordenes.dto.ts coincide con contracts/m08-ordenes.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m08-ordenes.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m08-ordenes.dto.ts'), 'utf8');
    expect(normalizar(dto)).toBe(normalizar(contrato));
  });
});
