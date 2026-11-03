import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El contrato FP-02 (`contracts/`) es la voz de la verdad; el DTO del frontend es su espejo (sin los comentarios de bloque). */
const RAIZ = resolve(__dirname, '../../../../');
const cuerpo = (t: string): string => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

describe('FP-02 · el DTO del frontend es espejo del contrato', () => {
  it('core/notificaciones/fp02-notificaciones.dto.ts coincide con contracts/fp02-notificaciones-internas.contract.ts', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/fp02-notificaciones-internas.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../notificaciones/fp02-notificaciones.dto.ts'), 'utf8');
    expect(cuerpo(dto)).toBe(cuerpo(contrato));
  });
});
