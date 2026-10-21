#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lee stdin completo
async function readStdin() {
  if (process.stdin.isTTY) {
    return '';
  }
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

function allow() {
  process.stdout.write(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(JSON.stringify({ decision: 'deny', reason }));
  process.exit(0);
}

async function main() {
  let rawInput = '';
  try {
    rawInput = await readStdin();
  } catch (err) {
    allow();
  }

  if (!rawInput || rawInput.trim() === '') {
    allow();
  }

  let payload;
  try {
    payload = JSON.parse(rawInput);
  } catch (err) {
    allow();
  }

  const toolName = payload?.toolCall?.name;
  const args = payload?.toolCall?.args || {};

  // Solo interceptamos herramientas que modifican archivos
  const editingTools = ['write_to_file', 'replace_file_content', 'multi_replace_file_content'];
  if (!editingTools.includes(toolName)) {
    allow();
  }

  const rawTargetFile = args.TargetFile || args.targetFile || args.filePath || args.path || '';
  if (!rawTargetFile) {
    allow();
  }

  const targetFile = rawTargetFile.replace(/\\/g, '/');

  // Localizar la raíz del proyecto
  let projectRoot = path.resolve(__dirname, '../../');
  if (payload.workspacePaths && payload.workspacePaths.length > 0) {
    projectRoot = payload.workspacePaths[0].replace(/\\/g, '/');
  }

  const statePath = path.join(projectRoot, '.sdlc', '.workflow', 'current_state.json');
  if (!fs.existsSync(statePath)) {
    allow();
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (err) {
    allow();
  }

  if (state.bypass_guardrails === true) {
    allow();
  }

  const faseActiva = state.fase_activa || '';
  const gateActivo = state.gate_activo || '';
  const estado = state.estado || '';
  const moduloEnCurso = (state.modulo_en_curso || '').toLowerCase(); // ej: 'm04'

  // Regla 1: Bloqueo en docs/reviews (Directiva #9)
  if (targetFile.includes('/docs/reviews/') || targetFile.includes('docs/reviews/')) {
    if (state.rol_en_turno !== '02_software_architect' && state.rol_en_turno !== 'tech_lead') {
      deny(
        '🛑 BLOQUEO MECÁNICO SDLC (Directiva #9 - Exclusividad de Reviews): Solo el Líder Técnico (Tech Lead) puede crear o editar archivos en docs/reviews/. Si eres implementador, tu entregable termina en docs/walkthroughs/.'
      );
    }
  }

  // Regla 2: Modificación de Base de Datos Canónica en Fase 1
  const isDbCanonical =
    targetFile.endsWith('/backend/prisma/schema.prisma') ||
    targetFile.endsWith('/bd/sql/schema_pintuclic.sql') ||
    targetFile.includes('/backend/prisma/schema.prisma') ||
    targetFile.includes('/bd/sql/schema_pintuclic.sql');

  if (isDbCanonical && faseActiva === 'FASE_1_PRD') {
    deny(
      `🛑 BLOQUEO MECÁNICO SDLC: El módulo ${state.modulo_en_curso} está en FASE_1_PRD (${gateActivo}). En esta fase está PROHIBIDO modificar el schema canónico de BD o Prisma. Cualquier propuesta de cambio debe documentarse en .sdlc/docs/modules/${state.modulo_en_curso}/RFC-...md y aprobarse en Gate 2.`
    );
  }

  // Regla 3: Edición de código fuente en backend/src o frontend/src
  const isBackendSrc = targetFile.includes('/backend/src/') || targetFile.includes('backend/src/');
  const isFrontendSrc = targetFile.includes('/frontend/src/') || targetFile.includes('frontend/src/');
  const isSourceCode = isBackendSrc || isFrontendSrc;

  if (isSourceCode) {
    // Si el estado general es ESPERANDO_APROBACION_HUMANA
    if (estado === 'ESPERANDO_APROBACION_HUMANA') {
      deny(
        `🛑 BLOQUEO MECÁNICO SDLC (Gate Activo: ${gateActivo}): El proyecto se encuentra en estado ESPERANDO_APROBACION_HUMANA para el módulo ${state.modulo_en_curso}. NO puedes escribir ni modificar código hasta que el Director Humano apruebe la compuerta actual.`
      );
    }

    // Aislamiento estricto de módulo (Directiva #1)
    const moduleMatch = targetFile.match(/\/modules\/(m\d{2}-[a-z0-9-]+)\//i);
    if (moduleMatch && moduleMatch[1]) {
      const targetModulePrefix = moduleMatch[1].substring(0, 3).toLowerCase(); // ej: 'm17', 'm20', 'm04'
      if (moduloEnCurso && targetModulePrefix !== moduloEnCurso) {
        deny(
          `🛑 BLOQUEO MECÁNICO SDLC (Directiva #1 - Aislamiento Estricto de Módulo): El módulo activo en el SDLC es ${state.modulo_en_curso.toUpperCase()}, pero intentas modificar un archivo de ${moduleMatch[1]}. Está TERMINANTEMENTE PROHIBIDO modificar archivos de otros módulos. Detén la ejecución inmediatamente y reporta la necesidad al equipo humano.`
        );
      }
    }

    // Si la fase activa es Fase 1 (PRD)
    if (faseActiva === 'FASE_1_PRD') {
      deny(
        `🛑 BLOQUEO MECÁNICO SDLC: El módulo ${state.modulo_en_curso} está en FASE_1_PRD (${gateActivo}). La codificación solo está permitida en FASE_3A_BACKEND y FASE_3B_FRONTEND, una vez aprobados Gate 1 (PRD) y Gate 2 (Arquitectura/DDL/Zod). Detén la codificación y genera los artefactos de producto en .sdlc/docs/modules/${state.modulo_en_curso}/.`
      );
    }

    // Si la fase activa es Fase 2 (Arquitectura)
    if (faseActiva === 'FASE_2_ARQUITECTURA') {
      const isContractOrInterface =
        targetFile.includes('/dtos/') ||
        targetFile.includes('/interfaces/') ||
        targetFile.endsWith('.dto.ts') ||
        targetFile.endsWith('.interface.ts');

      if (!isContractOrInterface) {
        deny(
          `🛑 BLOQUEO MECÁNICO SDLC: El módulo ${state.modulo_en_curso} está en FASE_2_ARQUITECTURA (${gateActivo}). En esta fase solo se permite definir contratos Zod (dtos/) e interfaces TypeScript estáticas (interfaces/). La implementación de controladores, servicios, repositorios, vistas y componentes solo se autoriza en FASE_3A y FASE_3B tras certificar el Gate 2.`
        );
      }
    }

    // Si la fase activa es Fase 3A (Backend) pero intentan codificar frontend
    if (faseActiva === 'FASE_3A_BACKEND' && isFrontendSrc) {
      deny(
        `🛑 BLOQUEO MECÁNICO SDLC: La fase activa es FASE_3A_BACKEND. El desarrollo de vistas y componentes frontend debe esperar a FASE_3B_FRONTEND (Gate 3B), una vez que los endpoints del backend estén implementados y verificados con pruebas unitarias.`
      );
    }

    // Si la fase activa es Fase 3B (Frontend) pero intentan alterar backend
    if (faseActiva === 'FASE_3B_FRONTEND' && isBackendSrc) {
      deny(
        `🛑 BLOQUEO MECÁNICO SDLC: La fase activa es FASE_3B_FRONTEND. La capa backend ya concluyó su Gate 3A. Si requieres un cambio en la API backend, debes solicitar una mesa técnica o RFC según el protocolo de interoperabilidad.`
      );
    }
  }

  allow();
}

main().catch(() => allow());
