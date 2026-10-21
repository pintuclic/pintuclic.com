#!/usr/bin/env node
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, defaultValue) {
  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    content = content.replace(regex, value);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function main() {
  console.log('\n================================================================');
  console.log('🤖  INICIALIZADOR DE PROYECTO MULTIAGENTE (SDLC STAGE-GATES)   ');
  console.log('================================================================\n');
  console.log('Este asistente configurará los documentos rectores y gobernanza');
  console.log('para tu nuevo proyecto.\n');

  const projectName = await ask('1. Nombre del Proyecto', 'MiNuevoProyecto');
  const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const projectDesc = await ask('2. Descripción breve', 'Aplicación empresarial construida con ingeniería multiagente');
  const projectDomain = await ask('3. Dominio de negocio (ej. Fintech, Salud, E-commerce, Educación)', 'SaaS General');
  const backendStack = await ask('4. Stack Backend preferido', 'Express 5 + TypeScript + Prisma 6 + PostgreSQL');
  const frontendStack = await ask('5. Stack Frontend preferido', 'Next.js 15 + React 19 + Zustand 5 + Tailwind CSS 4');
  const author = await ask('6. Autor u Organización', 'Equipo de Desarrollo');

  console.log('\n⚙️  Configurando archivos y artefactos de gobernanza...');

  const replacements = {
    PROJECT_NAME: projectName,
    PROJECT_SLUG: projectSlug,
    PROJECT_DESC: projectDesc,
    PROJECT_DOMAIN: projectDomain,
    BACKEND_STACK: backendStack,
    FRONTEND_STACK: frontendStack,
    AUTHOR: author,
    INIT_DATE: new Date().toISOString().split('T')[0],
  };

  // Reemplazar en archivos clave
  const filesToProcess = [
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'AGENTS.md'),
    path.join(rootDir, 'README.md'),
    path.join(rootDir, 'LANDING_PROMPT.md'),
    path.join(rootDir, '.workflow', 'current_state.json'),
    path.join(rootDir, '.workflow', 'STAGE_GATES.md'),
    path.join(rootDir, 'multiAgents', '00_orchestrator', 'PROJECT_STATUS.md'),
    path.join(rootDir, 'docs', '01_prd.md'),
    path.join(rootDir, 'docs', '02_architecture.md'),
    path.join(rootDir, 'docs', 'VERSION_MATRIX.md'),
  ];

  for (const file of filesToProcess) {
    replaceInFile(file, replacements);
  }

  // Asegurar directorios requeridos
  const dirsToEnsure = [
    path.join(rootDir, 'docs', 'contracts'),
    path.join(rootDir, 'docs', 'adrs'),
    path.join(rootDir, 'docs', 'modules'),
    path.join(rootDir, 'docs', 'qa'),
    path.join(rootDir, 'walkthroughs'),
    path.join(rootDir, 'backend'),
    path.join(rootDir, 'frontend'),
  ];

  for (const dir of dirsToEnsure) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  console.log('✅ Archivos configurados con éxito.');
  console.log('\n================================================================');
  console.log('🚀  PROYECTO INICIALIZADO: ' + projectName);
  console.log('================================================================\n');
  console.log('📋  PROMPT DE ATERRIZAJE PARA TU PRIMERA IA (Copia y Pega):');
  console.log('----------------------------------------------------------------');
  console.log(`Hola. Estás iniciando sesión en el proyecto "${projectName}" (${projectDomain}).`);
  console.log('Este repositorio se rige bajo la metodología estricta de:');
  console.log('"SDLC Multiagente Guiado por Artefactos y Compuertas de Calidad (Stage-Gates)".');
  console.log('Tu lectura obligatoria e inmutable de aterrizaje es AGENTS.md.');
  console.log('Por favor consulta .workflow/current_state.json para conocer la fase activa,');
  console.log('asume el rol correspondiente y preséntate como el Agente en turno.');
  console.log('----------------------------------------------------------------\n');
  console.log('💡  Próximo paso: Inicia tu primer chat con tu IA favorita pegando el prompt anterior.\n');

  rl.close();
}

main().catch((err) => {
  console.error('Error al inicializar el proyecto:', err);
  rl.close();
  process.exit(1);
});
