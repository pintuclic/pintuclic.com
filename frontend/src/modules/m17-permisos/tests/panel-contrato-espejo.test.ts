import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El contrato del resumen del panel es la voz de la verdad; el DTO del frontend es su espejo. */
const RAIZ = resolve(__dirname, '../../../../../');
const sinComentarios = (t: string): string => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

describe('M17 · resumen del panel: el DTO del frontend es espejo del contrato', () => {
  it('dtos/m17-panel-resumen.dto.ts coincide con contracts/m17-panel-resumen.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m17-panel-resumen.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m17-panel-resumen.dto.ts'), 'utf8');
    expect(sinComentarios(dto)).toBe(sinComentarios(contrato));
  });
});
