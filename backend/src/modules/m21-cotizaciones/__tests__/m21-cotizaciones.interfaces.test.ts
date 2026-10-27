import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

describe('M21 · aislamiento de interfaces', () => {
  it('interfaces/ contiene únicamente tipos (0 código runtime al transpilar)', () => {
    const fuente = readFileSync(resolve(__dirname, '..', 'interfaces/cotizaciones.interface.ts'), 'utf8');
    const transpilado = ts.transpileModule(fuente, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    const limpio = transpilado.outputText
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/export\s*\{\s*\};?/g, '')
      .trim();
    expect(limpio).toBe('');
  });
});
