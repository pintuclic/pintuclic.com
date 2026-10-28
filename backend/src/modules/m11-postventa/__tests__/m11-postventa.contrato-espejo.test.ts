import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M11 (`contracts/`) es la voz de la verdad; el DTO del backend es su espejo.
 * Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function sinComentariosDeBloque(texto: string): string {
  return texto
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M11 · el DTO del backend es espejo del contrato', () => {
  it('dtos/m11-postventa.dto.ts coincide con contracts/m11-postventa.contract.ts', () => {
    const contrato = readFileSync(
      resolve(RAIZ, 'contracts/m11-postventa.contract.ts'),
      'utf8'
    );
    const dto = readFileSync(
      resolve(__dirname, '../dtos/m11-postventa.dto.ts'),
      'utf8'
    );
    expect(sinComentariosDeBloque(dto)).toBe(sinComentariosDeBloque(contrato));
  });
});
