#!/usr/bin/env node
/**
 * 📋 API & DTO Contracts Validator
 * multiagent-sdlc-starter — Herramienta de Auditoría Estática de Contratos Zod
 *
 * Audita los contratos en contracts/:
 * 1. Existencia y completitud de Schemas Zod de Entrada (Request DTO).
 * 2. Existencia y completitud de Envelopes Canónicos de Salida (Response DTO).
 * 3. Prohibición absoluta de z.any() o tipos any en contratos.
 * 4. Tipado derivado mediante z.infer para garantizar sincronización estricta.
 *
 * Salida:
 * - Reporte estructurado en docs/qa/contracts-audit-summary.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n=============================================================');
console.log('📋  [AUDIT-CONTRACTS] Validador de Contratos Zod API ↔ SPA');
console.log('=============================================================\n');

const contractsDir = path.join(rootDir, 'contracts');

if (!fs.existsSync(contractsDir)) {
  console.error(`❌ Directorio de contratos no encontrado en: ${contractsDir}`);
  process.exit(1);
}

const contractFiles = fs.readdirSync(contractsDir).filter((f) => f.endsWith('.contract.ts') || f.endsWith('.contract.js'));

if (contractFiles.length === 0) {
  console.warn('⚠️  No se encontraron archivos de contrato en contracts/');
  process.exit(0);
}

const findings = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;

for (const file of contractFiles) {
  const filePath = path.join(contractsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`🔍 Auditando contrato: contracts/${file}`);

  let hasZodImport = false;
  let hasRequestSchema = false;
  let hasResponseEnvelope = false;
  let hasZodInfer = false;
  let hasAnyType = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    if (/import\s+.*zod/i.test(line)) hasZodImport = true;
    if (/(?:RequestSchema|InputSchema|create.*Schema|update.*Schema)\s*=/i.test(line)) hasRequestSchema = true;
    if (/(?:ResponseEnvelopeSchema|ResponseSchema|EnvelopeSchema)\s*=/i.test(line)) hasResponseEnvelope = true;
    if (/z\.infer<typeof/i.test(line)) hasZodInfer = true;

    // Chequeo de any en contratos
    if (/z\.any\(\)/.test(line) || /:\s*any\b/.test(line)) {
      hasAnyType = true;
      failCount++;
      findings.push({
        file,
        line: lineNum,
        rule: 'ZERO-ANY-IN-CONTRACTS',
        status: 'FAIL',
        details: `Uso de tipo 'any' o 'z.any()' en contrato: ${line.trim()}`,
      });
      console.log(`  ❌ [FAIL] Línea ${lineNum}: Prohibido 'any' en contratos.`);
    }
  });

  if (!hasZodImport) {
    warnCount++;
    findings.push({ file, rule: 'ZOD-IMPORT', status: 'WARN', details: 'No se detectó importación formal de zod.' });
    console.log('  ⚠️  [WARN] Falta importación formal de Zod.');
  }

  if (hasRequestSchema) {
    passCount++;
    console.log('  ✅ [PASS] Request DTO schema presente.');
  } else {
    warnCount++;
    findings.push({ file, rule: 'REQUEST-DTO', status: 'WARN', details: 'No se identificó schema claro de Request.' });
    console.log('  ⚠️  [WARN] No se identificó Request DTO schema explícito.');
  }

  if (hasResponseEnvelope) {
    passCount++;
    console.log('  ✅ [PASS] Response Envelope canónico presente.');
  } else {
    warnCount++;
    findings.push({ file, rule: 'RESPONSE-ENVELOPE', status: 'WARN', details: 'Falta Response Envelope canónico.' });
    console.log('  ⚠️  [WARN] Falta Response Envelope canónico.');
  }

  if (hasZodInfer) {
    passCount++;
    console.log('  ✅ [PASS] Tipos derivados con z.infer presentes.');
  }

  if (!hasAnyType) {
    passCount++;
    console.log('  ✅ [PASS] Cero usos de any / z.any() verificado.');
  }
}

const outputDir = path.join(rootDir, 'docs', 'qa');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const reportData = {
  fecha: new Date().toISOString(),
  contratos_auditados: contractFiles.length,
  resumen: {
    pass: passCount,
    warn: warnCount,
    fail: failCount,
    estado_contratos: failCount === 0 ? 'CONTRATOS_VALIDADOS' : 'DISCREPANCIAS_O_ANY_DETECTADO',
  },
  archivos: contractFiles,
  hallazgos: findings,
};

const outputPath = path.join(outputDir, 'contracts-audit-summary.json');
fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf8');

console.log('\n=============================================================');
console.log(`📊 Resumen Contratos: ${passCount} Validaciones Exitosas | ${warnCount} Advertencias | ${failCount} Fallos`);
console.log(`📄 Reporte JSON guardado en: docs/qa/contracts-audit-summary.json`);
console.log(`🚦 Veredicto: ${failCount === 0 ? '✅ APROBADO (Contratos Blindados)' : '❌ STOP-THE-LINE: Corregir contratos de datos'}`);
console.log('=============================================================\n');

if (failCount > 0 && !process.env.ALLOW_FAIL) {
  process.exit(1);
}
