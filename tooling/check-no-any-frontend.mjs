import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Cargar typescript desde el directorio de trabajo (cwd) o fallback a importación directa
let ts;
try {
  const requireFromCwd = createRequire(path.join(process.cwd(), 'package.json'));
  ts = requireFromCwd('typescript');
} catch {
  const mod = await import('typescript');
  ts = mod.default || mod;
}

/**
 * 🔍 Verificador AST Estricto: Erradicación del tipo 'any' (.ts, .tsx, .vue)
 *
 * Regla de Gobernanza:
 * Inspecciona los bloques <script> de componentes Vue y archivos TypeScript.
 * Si detecta ts.SyntaxKind.AnyKeyword, aborta la compilación con código 1.
 */

const candidateDirs = process.argv.slice(2).length > 0
  ? process.argv.slice(2).map(d => path.resolve(process.cwd(), d))
  : ['src', 'frontend/src', 'backend/src', 'contracts']
      .map(d => path.resolve(process.cwd(), d))
      .filter(d => fs.existsSync(d));

const targetDirs = candidateDirs.length > 0 ? candidateDirs : [path.resolve(process.cwd())];

const occurrences = [];
let filesAuditedCount = 0;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git' && entry.name !== 'coverage') {
        walkDir(fullPath, callback);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.vue'].includes(ext)) {
        callback(fullPath);
      }
    }
  }
}

function extractScriptContent(vueContent) {
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let accumulatedScript = '';
  let lineOffset = 0;

  while ((match = scriptRegex.exec(vueContent)) !== null) {
    const matchIndex = match.index;
    const linesBefore = vueContent.slice(0, matchIndex).split('\n').length - 1;
    const scriptBlock = match[1];

    accumulatedScript += '\n'.repeat(linesBefore - lineOffset);
    accumulatedScript += scriptBlock;
    lineOffset = accumulatedScript.split('\n').length - 1;
  }

  return accumulatedScript || null;
}

function checkSourceFile(sourceFile, filePath) {
  function visit(node) {
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

console.log(`\n🔍 [CHECK-NO-ANY] Auditando rutas activas:`);
for (const dir of targetDirs) {
  console.log(`  📁 ${path.relative(process.cwd(), dir) || '.'}`);
  walkDir(dir, (filePath) => {
    filesAuditedCount++;
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    let tsCode = rawContent;

    if (filePath.endsWith('.vue')) {
      const extracted = extractScriptContent(rawContent);
      if (!extracted) return;
      tsCode = extracted;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      tsCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    checkSourceFile(sourceFile, filePath);
  });
}

if (occurrences.length > 0) {
  console.error(`\n❌ [CHECK-NO-ANY] FALLO: Se detectaron ${occurrences.length} usos prohibidos del tipo ANY:`);
  console.error('─'.repeat(80));
  for (const occ of occurrences) {
    console.error(`  📍 ${path.relative(process.cwd(), occ.filePath)}:${occ.line}:${occ.character}`);
    console.error(`     Snippet: ${occ.snippet}`);
  }
  console.error('─'.repeat(80));
  console.error('💡 Regla de Gobernanza: Reemplace `any` con contratos tipados, DTOs o `unknown` con type guards.\n');
  process.exit(1);
} else {
  console.log(`\n✅ [CHECK-NO-ANY] PASS: ${filesAuditedCount} archivos auditados. 0 usos del tipo ANY.\n`);
  process.exit(0);
}
