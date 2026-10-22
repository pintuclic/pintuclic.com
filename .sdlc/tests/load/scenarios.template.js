import http from 'k6/http';
import { check, sleep } from 'k6';

// ⏱️ Configuración de Escenarios y Umbrales SLA
export const options = {
  stages: [
    { duration: '10s', target: 20 },  // 1. Rampa de subida (Warm-up / Ramp-up)
    { duration: '30s', target: 50 },  // 2. Carga sostenida pico (Steady load)
    { duration: '10s', target: 0 },   // 3. Descenso gradual (Cool-down)
  ],
  thresholds: {
    // SLAs Mandatorios de Rendimiento (Stage-Gate 4)
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% de peticiones bajo 500ms
    http_req_failed: ['rate<0.01'],                  // Menos del 1% de errores HTTP 5xx
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // Simulación de interacción de usuario realista
  const res = http.get(`${BASE_URL}/api/health`, {
    headers: { 'Accept': 'application/json' },
  });

  check(res, {
    'status es 200': (r) => r.status === 200,
    'tiempo respuesta < 500ms': (r) => r.timings.duration < 500,
  });

  // Think-time realista para evitar saturación artificial
  sleep(1);
}

// 📊 Generación de Reporte Dual (HTML Interactivo + JSON para Agentes)
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  const p99 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0;
  const failRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const totalReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;

  const summaryJson = {
    fecha: new Date().toISOString(),
    objetivo: BASE_URL,
    total_solicitudes: totalReqs,
    metricas: {
      p95_ms: Number(p95.toFixed(2)),
      p99_ms: Number(p99.toFixed(2)),
      tasa_fallo_pct: Number((failRate * 100).toFixed(2)),
    },
    sla_cumplido: p95 <= 500 && failRate < 0.01,
  };

  const htmlReport = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Reporte de Carga k6 — multiagent-sdlc-starter</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
      .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
      h1 { color: #38bdf8; margin-top: 0; }
      .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; }
      .badge-pass { background: #065f46; color: #34d399; }
      .badge-fail { background: #991b1b; color: #f87171; }
      table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
      th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #334155; }
      th { color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>⏱️ Reporte Ejecutivo de Pruebas de Carga (k6)</h1>
      <p><strong>Objetivo:</strong> ${BASE_URL} | <strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
      <div style="margin: 1rem 0;">
        <span class="badge ${summaryJson.sla_cumplido ? 'badge-pass' : 'badge-fail'}">
          ${summaryJson.sla_cumplido ? '✅ SLA CUMPLIDO (PASS)' : '❌ SLA VIOLADO (FAIL)'}
        </span>
      </div>
      <table>
        <tr><th>Métrica</th><th>Valor Obtenido</th><th>Umbral Máximo</th><th>Estado</th></tr>
        <tr><td>Total Peticiones</td><td>${totalReqs}</td><td>N/A</td><td>✅</td></tr>
        <tr><td>Percentil 95 (p95)</td><td>${p95.toFixed(2)} ms</td><td>&lt; 500 ms</td><td>${p95 <= 500 ? '✅' : '❌'}</td></tr>
        <tr><td>Percentil 99 (p99)</td><td>${p99.toFixed(2)} ms</td><td>&lt; 1000 ms</td><td>${p99 <= 1000 ? '✅' : '❌'}</td></tr>
        <tr><td>Tasa de Fallos</td><td>${(failRate * 100).toFixed(2)} %</td><td>&lt; 1.0 %</td><td>${failRate < 0.01 ? '✅' : '❌'}</td></tr>
      </table>
    </div>
  </body>
  </html>
  `;

  return {
    'docs/qa/load-report.html': htmlReport,
    'docs/qa/load-summary.json': JSON.stringify(summaryJson, null, 2),
    stdout: `\n✅ Resumen k6: Total: ${totalReqs} reqs | p95: ${p95.toFixed(1)}ms | Fallos: ${(failRate*100).toFixed(2)}%\n`,
  };
}
