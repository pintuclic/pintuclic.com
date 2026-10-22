import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🚦 Verificador de Integridad de la Máquina de Stage-Gates
 *
 * Regla de Gobernanza (AGENTS.md §5, STAGE_GATES.md):
 * El estado vivo del ciclo SDLC reside en .workflow/current_state.json. Si el archivo
 * falta o no declara la fase y la compuerta activas, ningún agente puede saber en qué
 * punto del ciclo está, por lo que el pipeline se detiene con código 1.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.join(path.resolve(__dirname, '..'), '.workflow', 'current_state.json');

if (!fs.existsSync(statePath)) {
  console.error(`❌ [VERIFY-STATE] No se encontró la máquina de estados en: ${statePath}`);
  process.exit(1);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
} catch (error) {
  console.error(`❌ [VERIFY-STATE] current_state.json no es JSON válido: ${error.message}`);
  process.exit(1);
}

const activePhase = state.fase_activa ?? state.ciclo_vida?.fase_actual;
const activeGate = state.gate_activo ?? state.ciclo_vida?.gate_actual;

if (!activePhase || !activeGate) {
  console.error('❌ [VERIFY-STATE] Formato inválido: faltan fase_activa o gate_activo.');
  process.exit(1);
}

console.log(`✅ [VERIFY-STATE] Máquina de estados válida.`);
console.log(`   Fase activa : ${activePhase}`);
console.log(`   Gate activo : ${activeGate}`);
console.log(`   Rol en turno: ${state.rol_en_turno ?? '(no declarado)'}`);
console.log(`   Módulo      : ${state.modulo_en_curso ?? '(ninguno)'}`);
