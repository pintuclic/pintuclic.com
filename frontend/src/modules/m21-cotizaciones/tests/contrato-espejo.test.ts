import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * El contrato de M21 (`contracts/`) es la voz de la verdad; el DTO del frontend es su espejo.
 * Solo cambian las rutas de los `import` (apuntan a los espejos de M01, M05 y M06 del frontend).
 */
const RAIZ = resolve(__dirname, '../../../../../');

function cuerpo(texto: string): string {
  return texto
    .replace(/^import[\s\S]*?;\s*$/gm, '')
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M21 · el DTO del frontend es espejo del contrato', () => {
  it('dtos/m21-cotizaciones.dto.ts coincide con contracts/m21-cotizaciones.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m21-cotizaciones.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m21-cotizaciones.dto.ts'), 'utf8');
    expect(cuerpo(dto)).toBe(cuerpo(contrato));
  });
});
