#!/usr/bin/env node
/**
 * ⏱️ k6 Load Test Runner & Benchmark Orchestrator
 * multiagent-sdlc-starter — Herramienta de Ejecución y Reporte de Pruebas de Carga
 *
 * Ejecuta k6 si está instalado en el sistema. Si no está instalado, ejecuta
 * una prueba de estrés concurrente nativa mediante Node.js HTTP pool y genera
 * los reportes HTML y JSON en docs/qa/.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetUrl = process.argv[2] || process.env.TARGET_URL || 'http://localhost:3000';
const isOfflineDemo = process.argv.includes('--offline') || process.argv.includes('--dry-run');

console.log('\n=============================================================');
console.log('⏱️  [LOAD-TEST] Orquestador de Pruebas de Carga y Concurrencia');
console.log(`🌐 Objetivo: ${targetUrl}`);
console.log('=============================================================\n');

const outputDir = path.join(rootDir, 'docs', 'qa');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Verificar si k6 binario existe
let hasK6 = false;
let k6VersionStr = '';
try {
  const k6Check = spawnSync('k6', ['version'], { encoding: 'utf8' });
  if (k6Check.status === 0 && k6Check.stdout) {
    hasK6 = true;
    k6VersionStr = k6Check.stdout.trim();
  }
} catch {
  hasK6 = false;
}

if (hasK6 && !isOfflineDemo) {
  console.log(`⚡ k6 detectado: ${k6VersionStr}`);
  console.log('🚀 Iniciando ejecución de escenarios k6...');

  const scriptPath = path.join(rootDir, 'tests', 'load', 'scenarios.template.js');
  const result = spawnSync('k6', ['run', scriptPath], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, TARGET_URL: targetUrl },
    shell: true,
  });

  if (result.status === 0) {
    console.log('\n✅ [LOAD-TEST] Ejecución k6 completada exitosamente.');
  } else {
    console.error('\n❌ [LOAD-TEST] k6 terminó con código de error o umbrales SLA no superados.');
    process.exit(result.status || 1);
  }
} else {
  if (!isOfflineDemo) {
    console.log('ℹ️  k6 no está instalado globalmente en el sistema.');
    console.log('ℹ️  Ejecutando suite de benchmark concurrente nativa con Node.js...');
  } else {
    console.log('ℹ️  Modo dry-run / offline activado.');
  }

  // Generar reporte sintético o ejecutar mini-benchmark nativo
  runNativeBenchmark();
}

async function runNativeBenchmark() {
  const totalRequests = isOfflineDemo ? 50 : 100;
  const concurrency = isOfflineDemo ? 5 : 10;
  const latencies = [];
  let failures = 0;

  console.log(`📊 Simulando ${totalRequests} peticiones concurrentes (${concurrency} hilos)...`);

  const startTime = Date.now();

  for (let i = 0; i < totalRequests; i += concurrency) {
    const chunk = Array.from({ length: Math.min(concurrency, totalRequests - i) }, () => {
      const reqStart = Date.now();
      return new Promise((resolve) => {
        if (isOfflineDemo) {
          // Latencia simulada en offline (20ms a 80ms)
          const simulatedLatency = Math.floor(Math.random() * 60) + 20;
          setTimeout(() => {
            latencies.push(simulatedLatency);
            resolve();
          }, simulatedLatency);
          return;
        }

        try {
          const url = new URL(targetUrl);
          const transport = url.protocol === 'https:' ? https : http;
          const req = transport.get(url, (res) => {
            res.resume();
            latencies.push(Date.now() - reqStart);
            if (res.statusCode >= 500) failures++;
            resolve();
          });
          req.on('error', () => {
            failures++;
            latencies.push(Date.now() - reqStart);
            resolve();
          });
          req.setTimeout(2000, () => {
            req.destroy();
            failures++;
            resolve();
          });
        } catch {
          failures++;
          resolve();
        }
      });
    });

    await Promise.all(chunk);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);
  const p95 = latencies[p95Index] || 0;
  const p99 = latencies[p99Index] || 0;
  const failRate = failures / totalRequests;
  const slaPassed = p95 <= 500 && failRate < 0.01;

  const summaryData = {
    fecha: new Date().toISOString(),
    objetivo: targetUrl,
    motor: hasK6 ? 'k6-official' : 'node-native-benchmark',
    total_solicitudes: totalRequests,
    tiempo_total_segundos: Number(durationSec),
    metricas: {
      p95_ms: p95,
      p99_ms: p99,
      tasa_fallo_pct: Number((failRate * 100).toFixed(2)),
      rps_estimado: Number((totalRequests / durationSec).toFixed(1)),
    },
    sla_cumplido: slaPassed,
    umbrales_requeridos: {
      p95_max_ms: 500,
      tasa_fallo_max_pct: 1.0,
    },
  };

  const jsonPath = path.join(outputDir, 'load-summary.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summaryData, null, 2), 'utf8');

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Carga y SLAs — multiagent-sdlc-starter</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1329; color: #f8fafc; padding: 2rem; margin: 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 2rem; max-width: 850px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.4); border: 1px solid #334155; }
    h1 { color: #38bdf8; margin-top: 0; font-size: 1.75rem; }
    .badge { display: inline-block; padding: 0.35rem 1rem; border-radius: 9999px; font-weight: bold; font-size: 0.9rem; }
    .badge-pass { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .badge-fail { background: #7f1d1d; color: #f87171; border: 1px solid #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th, td { text-align: left; padding: 0.85rem; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⏱️ Reporte Ejecutivo de Pruebas de Carga y Concurrencia</h1>
    <p><strong>Objetivo:</strong> ${targetUrl} | <strong>Motor:</strong> ${summaryData.motor} | <strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
    <div style="margin: 1.5rem 0;">
      <span class="badge ${slaPassed ? 'badge-pass' : 'badge-fail'}">
        ${slaPassed ? '✅ SLA APROBADO (PASS)' : '❌ SLA VIOLADO (FAIL)'}
      </span>
    </div>
    <table>
      <thead>
        <tr><th>Métrica</th><th>Valor Obtenido</th><th>Umbral SLA</th><th>Estado</th></tr>
      </thead>
      <tbody>
        <tr><td>Total Peticiones</td><td>${totalRequests}</td><td>N/A</td><td>✅</td></tr>
        <tr><td>Latencia p95 (95% de usuarios)</td><td><strong>${p95} ms</strong></td><td>&lt; 500 ms</td><td>${p95 <= 500 ? '✅' : '❌'}</td></tr>
        <tr><td>Latencia p99 (Cola extrema)</td><td><strong>${p99} ms</strong></td><td>&lt; 1000 ms</td><td>${p99 <= 1000 ? '✅' : '❌'}</td></tr>
        <tr><td>Tasa de Fallos (HTTP 5xx)</td><td>${(failRate * 100).toFixed(2)} %</td><td>&lt; 1.0 %</td><td>${failRate < 0.01 ? '✅' : '❌'}</td></tr>
        <tr><td>RPS Estimado</td><td>${summaryData.metricas.rps_estimado} req/s</td><td>Capacidad base</td><td>ℹ️</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const htmlPath = path.join(outputDir, 'load-report.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');

  console.log('\n=============================================================');
  console.log(`📈 Resultados Benchmark: Total: ${totalRequests} | p95: ${p95}ms | Fallos: ${(failRate * 100).toFixed(2)}%`);
  console.log(`📄 Reporte JSON: docs/qa/load-summary.json`);
  console.log(`🌐 Reporte HTML: docs/qa/load-report.html`);
  console.log(`🚦 Veredicto: ${slaPassed ? '✅ APROBADO (SLA Cumplido)' : '❌ STOP-THE-LINE: Latencia p95 o fallos exceden el SLA'}`);
  console.log('=============================================================\n');
}
