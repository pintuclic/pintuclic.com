import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

/**
 * El contrato de M07 (`contracts/`) es la voz de la verdad; el DTO del backend es su espejo.
 * Solo cambian las rutas de los `import` (el DTO importa los espejos de M01, M04, M05, M06 y M08). Si
 * alguien edita uno sin el otro, esta prueba falla.
 */
const RAIZ = resolve(__dirname, '../../../../../');

function cuerpo(texto: string): string {
  return texto
    .replace(/^import[\s\S]*?;\s*$/gm, '')
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nombresImportados(texto: string): string[] {
  const fuente = ts.createSourceFile('x.ts', texto, ts.ScriptTarget.ES2022);
  return fuente.statements
    .filter(ts.isImportDeclaration)
    .flatMap((d) => {
      const nombres = d.importClause?.namedBindings;
      return nombres !== undefined && ts.isNamedImports(nombres) ? nombres.elements.map((e) => e.name.text) : [];
    })
    .sort();
}

describe('M07 · el DTO del backend es espejo del contrato', () => {
  const contrato = readFileSync(resolve(RAIZ, 'contracts/m07-checkout.contract.ts'), 'utf8');
  const dto = readFileSync(resolve(__dirname, '../dtos/m07-checkout.dto.ts'), 'utf8');

  it('dtos/m07-checkout.dto.ts coincide con contracts/m07-checkout.contract.ts', () => {
    expect(cuerpo(dto)).toBe(cuerpo(contrato));
  });

  it('importa los mismos nombres', () => {
    expect(nombresImportados(dto)).toEqual(nombresImportados(contrato));
  });
});
