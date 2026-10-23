import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🔍 Verificador AST Estricto: Erradicación del tipo 'any' en Backend
 * 
 * Regla de Gobernanza:
 * Queda estrictamente prohibido el uso del tipo `any` en cualquier parte del código
 * TypeScript (`: any`, `as any`, `<any>`). Si detecta un solo caso, el proceso
 * termina con código de salida 1, bloqueando `npm run build` y activando veto en QA.
 */

const targetDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.resolve(process.cwd(), 'src');

interface AnyOccurrence {
  filePath: string;
  line: number;
  character: number;
  snippet: string;
}

const occurrences: AnyOccurrence[] = [];
let filesAuditedCount = 0;

function walkDir(dir: string, callback: (file: string) => void) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walkDir(fullPath, callback);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      callback(fullPath);
    }
  }
}

function checkSourceFile(sourceFile: ts.SourceFile, filePath: string) {
  function visit(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const lineStart = sourceFile.getPositionOfLineAndCharacter(line, 0);
      const nextLineStart = line + 1 < sourceFile.getLineStarts().length
        ? sourceFile.getPositionOfLineAndCharacter(line + 1, 0)
        : sourceFile.text.length;
      const snippet = sourceFile.text.slice(lineStart, nextLineStart).trim();

      occurrences.push({
        filePath,
        line: line + 1,
        character: character + 1,
        snippet,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.log(`\n🔍 [CHECK-NO-ANY-BACKEND] Auditando archivos TypeScript en: ${targetDir}`);

walkDir(targetDir, (filePath) => {
  filesAuditedCount++;
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  checkSourceFile(sourceFile, filePath);
});

if (occurrences.length > 0) {
  console.error(`\n❌ [CHECK-NO-ANY-BACKEND] FALLO: Se detectaron ${occurrences.length} usos prohibidos del tipo ANY:`);
  console.error('─'.repeat(80));
  for (const occ of occurrences) {
    console.error(`  📍 ${path.relative(process.cwd(), occ.filePath)}:${occ.line}:${occ.character}`);
    console.error(`     Snippet: ${occ.snippet}`);
  }
  console.error('─'.repeat(80));
  console.error('💡 Regla de Gobernanza: Reemplace `any` con contratos Zod, tipos explícitos o `unknown` con type guards.\n');
  process.exit(1);
} else {
  console.log(`✅ [CHECK-NO-ANY-BACKEND] PASS: ${filesAuditedCount} archivos auditados. 0 usos del tipo ANY.\n`);
  process.exit(0);
}
