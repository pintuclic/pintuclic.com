import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

/**
 * El contrato de M16 (`contracts/m16-contenido.contract.ts`) es la fuente de verdad;
 * el DTO del backend es su espejo fiel. Además verifica que `interfaces/` no emita
 * código de ejecución (0 bytes runtime).
 */
const RAIZ = resolve(__dirname, '../../../../../');

function sinEncabezado(texto: string): string {
  const inicio = texto.indexOf('/**');
  const fin = texto.indexOf('*/', inicio) + 2;
  return (texto.slice(0, inicio) + texto.slice(fin)).replace(/\s+/g, ' ').trim();
}

function contenidoSinEncabezados(texto: string): string {
  return sinEncabezado(texto)
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('M16 · espejo del contrato y aislamiento de interfaces', () => {
  it('dtos/m16-contenido.dto.ts coincide exactamente con contracts/m16-contenido.contract.ts', () => {
    const contrato = readFileSync(
      resolve(RAIZ, 'contracts/m16-contenido.contract.ts'),
      'utf8',
    );
    const dto = readFileSync(
      resolve(__dirname, '..', 'dtos/m16-contenido.dto.ts'),
      'utf8',
    );
    expect(contenidoSinEncabezados(dto)).toBe(contenidoSinEncabezados(contrato));
  });

  it('interfaces/ contiene únicamente tipos (0 código runtime al transpilar)', () => {
    const archivos = [
      'interfaces/contenido.interface.ts',
      'interfaces/contenido-faq.port.ts',
    ];
    for (const rel of archivos) {
      const fuente = readFileSync(resolve(__dirname, '..', rel), 'utf8');
      const transpilado = ts.transpileModule(fuente, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      });
      const limpio = transpilado.outputText
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/export\s*\{\s*\};?/g, '')
        .trim();
      expect(limpio).toBe('');
    }
  });
});
