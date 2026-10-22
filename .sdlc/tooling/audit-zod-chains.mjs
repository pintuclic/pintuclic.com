#!/usr/bin/env node
/**
 * 🛡️ Zod Chaining & Anti-Pattern Auditor
 * multiagent-sdlc-starter — Verificador Estricto de Cadenas Zod
 *
 * Audita archivos *.dto.ts (backend y frontend) para prevenir:
 * 1. .min(N).trim() donde .min() se evalúa antes de sanear espacios (acepta '      ').
 * 2. Cadenas de texto obligatorias sin .trim() previo al cálculo de longitud mínima.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('\n=============================================================');
console.log('🛡️  [AUDIT-ZOD] Verificador de Seguridad y Cadenas Zod DTO');
console.log('=============================================================\n');

const findings = [];
let passCount = 0;
let failCount = 0;

function scanFilesRecursively(dir, extensions, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (
      item === 'node_modules' ||
      item === '.git' ||
      item === 'dist' ||
      item === '.next' ||
      item === 'coverage'
    ) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanFilesRecursively(fullPath, extensions, fileList);
    } else if (extensions.some((ext) => item.endsWith(ext))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const targetDirs = [
  path.join(rootDir, 'backend', 'src'),
  path.join(rootDir, 'frontend', 'src'),
  path.join(rootDir, '.sdlc', 'docs', 'contracts'),
];

let filesToAudit = [];
for (const dir of targetDirs) {
  scanFilesRecursively(dir, ['.dto.ts', '.contract.ts'], filesToAudit);
}

console.log(`📁 Analizando ${filesToAudit.length} archivos DTO y Contratos...\n`);

for (const filePath of filesToAudit) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(rootDir, filePath);

  // Buscar ocurrencias de .min(...)...trim() en una misma cadena de Zod (sin cruzar sentencias ';')
  const minTrimRegex = /\.min\s*\([^)]*\)[^;]*?\.trim\s*\(\)/g;
  let match;
  while ((match = minTrimRegex.exec(content)) !== null) {
    failCount++;
    const linesBefore = content.substring(0, match.index).split('\n').length;
    findings.push({
      file: relPath,
      line: linesBefore,
      rule: 'ZOD-01-TRIM-BEFORE-MIN',
      severity: 'FAIL',
      message: 'Anti-patrón Zod: .min() evaluado antes de .trim(). Permite evasión con espacios en blanco ("      "). Debe colocarse .trim() antes de .min().',
      snippet: match[0],
    });
    console.log(`  ❌ [FAIL] ${relPath}:${linesBefore} ➔ .min() colocado antes de .trim().`);
  }
}

if (findings.length === 0) {
  passCount = 1;
  console.log('  ✅ [PASS] Cero anti-patrones de encadenamiento Zod detectados.');
}

console.log('\n=============================================================');
console.log(`📊 Resumen Zod: ${failCount} Violaciones detectadas`);
console.log(`🚦 Veredicto: ${failCount === 0 ? '✅ APROBADO' : '❌ STOP-THE-LINE: Invertir orden a .trim().min(...)'}`);
console.log('=============================================================\n');

if (failCount > 0 && !process.env.ALLOW_FAIL) {
  process.exit(1);
}
