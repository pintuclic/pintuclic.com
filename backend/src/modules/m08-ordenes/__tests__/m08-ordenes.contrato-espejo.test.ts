import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M08 (`contracts/`) es la voz de la verdad; el DTO del backend es
 * su espejo. Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function sinComentariosDeBloque(texto: string): string {
  return texto
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M08 · el DTO del backend es espejo del contrato', () => {
  it('dtos/m08-ordenes.dto.ts coincide con contracts/m08-ordenes.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m08-ordenes.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m08-ordenes.dto.ts'), 'utf8');
    expect(sinComentariosDeBloque(dto)).toBe(sinComentariosDeBloque(contrato));
  });
});
