import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M14 (`contracts/`) es la voz de la verdad; el DTO del frontend es su espejo.
 * Si alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function normalizar(texto: string): string {
  return texto
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M14 · el DTO del frontend es espejo del contrato', () => {
  it('dtos/m14-patrocinios.dto.ts coincide con contracts/m14-patrocinios.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m14-patrocinios.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m14-patrocinios.dto.ts'), 'utf8')
      .replace("'@/modules/m01-catalogo/dtos/m01-catalogo.dto'", "'./m01-catalogo.contract'")
      .replace("'@/modules/m01-catalogo/dtos/m01-catalogo-productos.dto'", "'./m01-catalogo-productos.contract'");
    expect(normalizar(dto)).toBe(normalizar(contrato));
  });
});
