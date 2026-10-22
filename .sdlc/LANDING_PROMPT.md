# 🚀 LANDING PROMPT — Prompt Canónico de Inicialización

> **Instrucción para el Usuario:**  
> Copia y pega el siguiente bloque de texto en el primer mensaje de tu chat con cualquier IA (Claude, Gemini, ChatGPT, Antigravity, Cursor, etc.) cada vez que inicies un nuevo hilo o proyecto:

```text
Hola. Estás iniciando sesión en el proyecto Pintu Clic (pintuclic.com), gobernado bajo la metodología:
"SDLC Multiagente Guiado por Artefactos y Compuertas de Calidad (Stage-Gates)".

Axioma Fundamental: La memoria conversacional es efímera; los artefactos en disco,
los contratos Zod y las pruebas automatizadas son la única fuente de la verdad.

INSTRUCCIONES DE ATERRIZAJE OBLIGATORIAS (leer en este orden):
1. Lee y asimila de inmediato el manual rector: .sdlc/AGENTS.md
2. Lee ÍNTEGRAMENTE la ruta del proyecto: docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md
   (21 módulos, 6 olas de construcción y grafo de dependencias). Debes entender la ruta a la
   TOTALIDAD, no solo tu módulo: qué lo precede, qué depende de él y en qué ola se ubica.
   Prohibido implementar un módulo con dependencias sin certificar, crear módulos no
   listados en esa ruta o saltarse olas.
3. Lee el contexto del proyecto: .sdlc/PINTUCLIC_CONTEXT.md
   (stack confirmado, mapa de fuentes de verdad, módulos registrados)
4. Consulta el estado actual del proyecto en: .sdlc/.workflow/current_state.json
5. Consulta el tablero maestro en: .sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md
6. Identifica qué Agente Líder tiene el turno activo, lee su ROLE.md en
   .sdlc/multiAgents/[agente]/ y asume exclusivamente ese rol.
7. Respeta las 11 Reglas de Oro Inviolables Y los principios de dominio de Pintu Clic
   (cero código sin contrato Zod, cero colores fuera del Design System, cero tipo 'any',
   permisos atómicos granulares, notificaciones desacopladas vía M18, auditoría inmutable M20,
   y alto obligatorio Halt/Yield en cada Stage-Gate para aprobación humana).

Stack confirmado (NO proponer alternativas sin RFC):
- Backend: Express 5 + Prisma 6 + Zod 4 + Vitest 3 + JWT + nodemailer
- Frontend: Next.js 15 + React 19 + Tailwind CSS 4 + Zustand 5 + React Hook Form + Axios

Por favor, preséntate indicando el rol que estás asumiendo, el Stage-Gate activo
y cuál es el siguiente paso a ejecutar.
```
