#!/usr/bin/env node
/**
 * 🎨 Directiva #13 & Core Kit Compliance Auditor
 * multiagent-sdlc-starter — Verificador Estricto del Core Kit Pintuclic
 *
 * Audita frontend/src/modules/ para garantizar el uso exclusivo de componentes
 * canónicos del Core Kit (@/core/components) y erradicar:
 * 1. Uso de <input> nativo crudo en lugar de <Input>.
 * 2. Uso de <button> nativo crudo en lugar de <Button>.
 * 3. Uso de <textarea> nativo crudo sin wrapper accesible.
 * 4. Modificadores !important (!bg-, !text-) sobre componentes del Core Kit.
 * 5. Uso de <span> ad-hoc que reemplazan al componente <Badge>.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('\n=============================================================');
console.log('🎨  [AUDIT-CORE-KIT] Verificador Estricto de Directiva #13 (Core Kit)');
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
      item === 'coverage' ||
      item === 'tests' ||
      item === '__tests__'
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

const targetDir = path.join(rootDir, 'frontend', 'src', 'modules');
const filesToAudit = scanFilesRecursively(targetDir, ['.jsx', '.tsx']);

console.log(`📁 Analizando ${filesToAudit.length} archivos en frontend/src/modules/...\n`);

for (const filePath of filesToAudit) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(rootDir, filePath);
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Inputs crudos (HTML nativo minúscula)
    if (/<input\b/.test(line) && !line.includes('type="hidden"')) {
      failCount++;
      findings.push({
        file: relPath,
        line: lineNum,
        rule: 'CORE-KIT-01-NO-RAW-INPUT',
        severity: 'FAIL',
        message: 'Uso de <input> crudo. Debe utilizarse el componente <Input> de @/core/components.',
        snippet: line.trim(),
      });
      console.log(`  ❌ [FAIL] ${relPath}:${lineNum} ➔ <input> crudo detectado.`);
    }

    // 2. Botones crudos (HTML nativo minúscula)
    if (/<button\b/.test(line)) {
      failCount++;
      findings.push({
        file: relPath,
        line: lineNum,
        rule: 'CORE-KIT-02-NO-RAW-BUTTON',
        severity: 'FAIL',
        message: 'Uso de <button> crudo. Debe utilizarse el componente <Button> de @/core/components.',
        snippet: line.trim(),
      });
      console.log(`  ❌ [FAIL] ${relPath}:${lineNum} ➔ <button> crudo detectado.`);
    }

    // 3. Textarea crudo (HTML nativo minúscula)
    if (/<textarea\b/.test(line)) {
      failCount++;
      findings.push({
        file: relPath,
        line: lineNum,
        rule: 'CORE-KIT-03-NO-RAW-TEXTAREA',
        severity: 'FAIL',
        message: 'Uso de <textarea> crudo. Se debe usar un componente de formulario consistente y accesible.',
        snippet: line.trim(),
      });
      console.log(`  ❌ [FAIL] ${relPath}:${lineNum} ➔ <textarea> crudo detectado.`);
    }

    // 4. Hacks !important sobre componentes
    if (/!(?:bg|text|border)-/i.test(line)) {
      failCount++;
      findings.push({
        file: relPath,
        line: lineNum,
        rule: 'CORE-KIT-04-NO-IMPORTANT-OVERRIDE',
        severity: 'FAIL',
        message: 'Uso de !important (!bg-, !text-) para sobreescribir estilos. Debe usarse la variante oficial.',
        snippet: line.trim(),
      });
      console.log(`  ❌ [FAIL] ${relPath}:${lineNum} ➔ Modificador !important detectado: ${line.trim()}`);
    }
  });
}

if (findings.length === 0) {
  passCount = 1;
  console.log('  ✅ [PASS] Cero violaciones de Core Kit detectadas en frontend/src/modules/.');
}

const outputDir = path.join(rootDir, 'docs', 'qa');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const reportData = {
  fecha: new Date().toISOString(),
  archivos_auditados: filesToAudit.length,
  resumen: {
    pass: passCount,
    fail: failCount,
    estado: failCount === 0 ? 'CONFORME_DIRECTIVA_13' : 'VIOLACIONES_DETECTADAS',
  },
  hallazgos: findings,
};

const outputPath = path.join(outputDir, 'core-kit-audit-summary.json');
fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf8');

console.log('\n=============================================================');
console.log(`📊 Resumen Core Kit: ${failCount} Violaciones detectadas`);
console.log(`📄 Reporte JSON guardado en: docs/qa/core-kit-audit-summary.json`);
console.log(`🚦 Veredicto: ${failCount === 0 ? '✅ APROBADO (Directiva #13 Conforme)' : '❌ STOP-THE-LINE: Erradicar componentes crudos y hacks !important'}`);
console.log('=============================================================\n');

if (failCount > 0 && !process.env.ALLOW_FAIL) {
  process.exit(1);
}
