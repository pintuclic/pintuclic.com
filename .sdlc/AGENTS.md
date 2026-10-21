# 🤖 AGENTS.md — Manual Rector de Onboarding y Gobernanza Multiagente

> **Bienvenido a Pintu Clic (Dominio: pintuclic.com).**  
> Este repositorio se rige bajo una metodología estricta de **SDLC Multiagente Guiado por Artefactos y Compuertas de Calidad (Stage-Gates)**.  
> Si eres una IA que acaba de iniciar sesión en este proyecto (o un humano incorporándose al equipo) y **no tienes contexto previo en tu memoria**, **ESTE ES TU PUNTO DE ENTRADA Y ATERRIZAJE OBLIGATORIO**.
> Tras leer este archivo, **lee obligatoriamente**:
> 1. **[`../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md`](../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md)** — 🗺️ La ruta del proyecto: 21 módulos, 6 olas y el grafo completo de dependencias. **Lectura íntegra**: debes entender la ruta a la totalidad, no solo tu módulo. Está PROHIBIDO implementar un módulo cuyas dependencias no estén certificadas, crear módulos no listados o saltarse olas.
> 2. **[`PINTUCLIC_CONTEXT.md`](PINTUCLIC_CONTEXT.md)** — Stack confirmado y mapa de fuentes de verdad.  
> **Axioma Fundamental:** La memoria conversacional es efímera y volátil; **el repositorio, los artefactos en disco y las pruebas automatizadas son la única e inmutable fuente de la verdad**.

---

## 1. La Metodología: SDLC Multiagente Guiado por Artefactos

### 1.1. ¿Qué es esta metodología?
A diferencia del desarrollo tradicional con IAs (donde un único modelo asume todos los roles de forma desordenada o intenta generar código a partir de prompts vagos), este proyecto opera como una **fábrica de software de ingeniería concurrente y especializada**.

El trabajo se divide en **Roles Líderes Autónomos**, cada uno equipado con un **Kit de Subroles Especializados**, que colaboran de manera secuencial y regulada a través de **Compuertas de Calidad ("Stage-Gates")** con supervisión humana activa (**HITL — Human In The Loop**).

```mermaid
flowchart LR
    G0["🚦 Gate 0<br/>Gobernanza"] --> G1["📋 Gate 1<br/>PRD & Regulación"]
    G1 --> G2["🏛️ Gate 2<br/>DDL & Zod Contracts"]
    G2 --> G3A["⚙️ Gate 3A<br/>Backend API"]
    G3A --> G3B["🎨 Gate 3B<br/>Frontend SPA"]
    G3B --> G4["🧪 Gate 4<br/>QA Forense (4 Pilares)"]
    G4 --> G5["🚀 Gate 5<br/>Release & Runbooks"]

    style G0 fill:#0f172a,stroke:#94a3b8,color:#ffffff
    style G1 fill:#003366,stroke:#38bdf8,color:#ffffff
    style G2 fill:#003366,stroke:#34d399,color:#ffffff
    style G3A fill:#003366,stroke:#fbbf24,color:#ffffff
    style G3B fill:#003366,stroke:#f87171,color:#ffffff
    style G4 fill:#003366,stroke:#a78bfa,color:#ffffff
    style G5 fill:#003366,stroke:#34d399,color:#ffffff
```

### 1.2. ¿Por qué es hiper-eficiente?
1. **Elimina la alucinación y la sobrecarga:** Cada agente se concentra exclusivamente en su especialidad (Principio de Responsabilidad Única aplicado a agentes). El backend no inventa diseños; el frontend no inventa endpoints; el PM no inventa sintaxis SQL.
2. **Erradica los desacoples (API-First Zod):** Frontend y Backend **NUNCA suponen tipos de datos**. El Software Architect define contratos Zod en TypeScript; el Backend los usa para validar en runtime y el Frontend para tipar en compile-time. Si algo cambia, el compilador avisa antes de que el código toque producción.
3. **Inmutabilidad y Blindaje de Reglas de Dominio:** Toda regla crítica de negocio se blinda a nivel de servicio y persistencia.
4. **Tolerancia Cero al Tipo ANY:** Tanto Backend como Frontend implementan verificadores de Sintaxis Abstracta (AST) integrados en `npm run build` que bloquean la compilación si detectan el tipo `any`.
5. **Tolerancia a Resets de Contexto:** Cualquier agente puede detenerse, reiniciarse o ser sustituido por otro modelo de IA. La nueva IA solo debe leer este archivo, verificar el estado activo en [`.workflow/current_state.json`](file:///.workflow/current_state.json) y continuar exactamente donde quedó el artefacto anterior.

---

## 2. Mapa y Estructura del Repositorio

```text
/ (Raíz del Proyecto)
├── AGENTS.md                            # 📍 Este manual rector (Lectura y aterrizaje obligatorio)
├── LANDING_PROMPT.md                    # 🚀 Prompt para inicializar sesiones con nuevas IAs
│
├── .workflow/                           # 🚦 Máquina de Estados y Gobernanza HITL
│   ├── STAGE_GATES.md                   # Protocolo canónico de compuertas y altos obligatorios
│   └── current_state.json               # Estado en tiempo real del ciclo de vida activo
│
├── multiAgents/                         # 🧠 Núcleo de Roles Líderes y Gobernanza Multiagente
│   ├── 00_orchestrator/                 # Coordinación central, máquina de estados y semáforo global
│   ├── 01_product_manager/              # Fase 1: HUs bajo INVEST, criterios BDD y Discovery
│   │   ├── ROLE.md                      # Manual del Product Manager Lead y árbol de decisión
│   │   ├── WORKLOG.md                   # Bitácora histórica del rol
│   │   └── subroles/                    # 🛠️ Kit de Subroles de Producto (Discovery, Legal, BDD, UAT)
│   ├── 02_software_architect/           # Fase 2: DDL, contratos Zod y topología C4
│   │   ├── ROLE.md                      # Manual del Software Architect Lead y árbol de decisión
│   │   ├── WORKLOG.md                   # Bitácora histórica del rol
│   │   └── subroles/                    # 🛠️ Kit de Subroles de Arquitectura (C4, DDL, Zod, Security)
│   ├── 03_backend_engineer/             # Fase 3A: Capa de datos, API REST y servicios de dominio
│   │   ├── ROLE.md                      # Manual del Backend Lead y árbol de decisión
│   │   ├── WORKLOG.md                   # Bitácora histórica del rol
│   │   └── subroles/                    # 🛠️ Kit de Subroles de Backend (Gateway, Domain, Data, TDD)
│   ├── 04_frontend_engineer/            # Fase 3B: Interfaz SPA, State, Tailwind y DataViz
│   │   ├── ROLE.md                      # Manual del Frontend Lead y árbol de decisión
│   │   ├── WORKLOG.md                   # Bitácora histórica del rol
│   │   └── subroles/                    # 🛠️ Kit de Subroles de Frontend (Design System, State, Views, DataViz)
│   ├── 05_qa_security_tester/           # Fase 4: Auditoría forense, poder de veto y arsenal de 4 pilares
│   │   ├── ROLE.md                      # Manual del QA Lead y Mandato de los 4 Pilares
│   │   ├── WORKLOG.md                   # Bitácora histórica del rol
│   │   └── subroles/                    # 🛠️ Kit de Subroles de QA (SDET/Bruno, E2E/Playwright, Perf/k6)
│   ├── 06_devops_release/               # Fase 5: Infraestructura Docker, seeders y CI/CD
│   │   ├── ROLE.md                      # Manual del DevOps Lead y árbol de decisión
│   │   ├── WORKLOG.md                   # Bitácora histórica del rol
│   │   └── subroles/                    # 🛠️ Kit de Subroles de DevOps (Env, Seeder, CI/CD, Observability)
│   │
│   └── protocols/                       # 🤝 Protocolos de Colaboración e Interoperabilidad
│       ├── HANDOFF_PROTOCOL.md          # Protocolo general de traspaso entre fases
│       ├── COLLABORATION_PROTOCOL_TECH_TRIO.md # Sincronización Arquitecto ↔ Backend ↔ Frontend
│       ├── CONSULTATION_BYPASS_PROTOCOL.md # 🪑 Mesa de Consulta Acotada (ritos multi-rol)
│       ├── BACKEND_FRONTEND_SUBROLES_SYNC_PROTOCOL.md # Protocolo Exclusivo Subroles Backend ↔ Frontend
│       ├── TECHNICAL_PROPOSALS_PROTOCOL.md # Protocolo de Iniciativas y Propuestas Técnicas (RFCs)
│       ├── GIT_COMMIT_CONVENTION.md     # Estándar canónico: tipo(scope): descripcion (sin version)
│       ├── SEMVER_CHANGELOG_PROTOCOL.md # Reglas de SemVer y Keep a Changelog
│       └── TEMPLATES/                   # Plantillas para PRD, ADRs, contratos y módulos
│
├── docs/                                # 📚 Artefactos de Ingeniería (Fuente de la Verdad)
│   ├── 01_prd.md                        # Documento Rector de Requerimientos de Producto
│   ├── 02_architecture.md               # Especificación técnica, C4 Model y DDL
│   ├── 03_qa_report.md                  # Panel Ejecutivo Consolidado de QA y Certificación
│   ├── 04_ui_design_system.md           # Sistema de Diseño Visual y Paleta Oficial
│   ├── VERSION_MATRIX.md                # Matriz Bidireccional de Versiones y Ciclo de Vida
│   ├── contracts/                       # Contratos de API REST tipados con Zod (.contract.ts)
│   ├── adrs/                            # Architectural Decision Records (Decisiones estructurales)
│   ├── modules/                         # Especificaciones funcionales y BDD por módulo
│   └── qa/                              # Reportes Modulares Forenses de Calidad
│
├── tooling/                             # 🛡️ Scripts de Verificación y Scaffolding
│   ├── check-no-any-backend.ts          # Verificador AST contra 'any' en Backend
│   └── check-no-any-frontend.mjs        # Verificador AST contra 'any' en Frontend
│
├── walkthroughs/                        # Guías de Verificación Versionadas Jerárquicas
│   └── [XX_modulo]/[vX.Y.Z]/WALKTHROUGH.md
│
├── backend/                             # API REST / Servicios
└── frontend/                            # SPA Web / Cliente
```

---

## 3. Catálogo de Roles Líderes y Subroles

### 3.0. 🤖 `00_orchestrator` — Orquestador Central
Controla el flujo global, vigila que nadie se salte una compuerta, gestiona la máquina de estados y mantiene el semáforo del proyecto en [`multiAgents/00_orchestrator/PROJECT_STATUS.md`](file:///multiAgents/00_orchestrator/PROJECT_STATUS.md).

### 3.1. 📋 `01_product_manager` — Product Manager Lead (Fase 1)
Transforma la visión de negocio en especificaciones formales sin ambigüedad.
- **Subroles:** Discovery (`/grill-me`), Legal/Compliance, BDD INVEST Gherkin, UAT/KPIs.
- **Entregables:** `docs/01_prd.md`, `docs/modules/[XX]/01_SPEC_FUNCIONAL.md`, `02_HISTORIAS_USUARIO.md`.

### 3.2. 🏛️ `02_software_architect` — Software Architect Lead (Fase 2)
Traduce el PRD en arquitectura técnica, contratos Zod y esquemas de base de datos relacionales normalizados.
- **Subroles:** Modular Topologist (C4), DDL Relational Modeler, Zod Protocol Designer, Security & Isolation.
- **Entregables:** `docs/02_architecture.md`, `docs/contracts/[XX].contract.ts`, ADRs.

### 3.3. ⚙️ `03_backend_engineer` — Backend Lead Engineer (Fase 3A)
Construye la API REST, la lógica de negocio y las consultas tipadas a la base de datos con Cero SQL crudo.
- **Subroles:** API Gateway Security, Domain Rules, Data Layer Optimizer, Developer TDD Tester (Vitest).
- **Entregables:** `backend/src/modules/[XX]/`, suites Vitest 100% PASS, verificación AST `check:no-any`.

### 3.4. 🎨 `04_frontend_engineer` — Frontend Lead Engineer (Fase 3B)
Construye la SPA reactiva, accesible y conectada 100% a datos reales.
- **Subroles:** Design System Core UI, State Data Flow, Views & UX, DataViz Analytics.
- **Entregables:** `frontend/src/modules/[XX]/`, `next build` limpio, `WALKTHROUGH.md`, verificación AST `check:no-any`.

### 3.5. 🧪 `05_qa_security_tester` — QA Lead & Security Compliance (Fase 4)
Fiscal técnico imparcial con **poder de veto (Stop-the-Line)**. Audita contratos, seguridad y código.
- **Arsenal de 4 Pilares:** SDET (Vitest/Bruno), E2E & A11y (Playwright/axe-core), Stress (k6), AST Types (Zero any).
- **Entregables:** `docs/qa/[XX]/[vX.Y.Z]/QA_REPORT.md`, `QA_RTM_MATRIX.md`.

### 3.6. 🚀 `06_devops_release` — DevOps Lead & Release Manager (Fase 5)
Asegura despliegue en 2 minutos, seeders reproducibles, observabilidad y CI/CD.
- **Subroles:** Env Container, DB Seeder, CI/CD Automator, Observability.
- **Entregables:** Dockerfiles, seeders idempotentes, workflows GitHub Actions, `/api/health`.

> ## 🔒 DOMINIO EXCLUSIVO — ACCESO RESTRINGIDO AL DEVOPS DESIGNADO
>
> **Los roles 03_backend_engineer, 04_frontend_engineer y 05_qa_security_tester tienen PROHIBIDO ABSOLUTO**
> tocar los siguientes archivos o directorios, sea para leer con intención de modificar, crear o eliminar:
> - `.github/workflows/` — Workflows de GitHub Actions
> - `docker-compose.yml`, `Dockerfile*` — Configuración Docker
> - `.env.example` — Plantillas de variables de entorno de infraestructura
> - Cualquier script de infraestructura, release o automatización de CI/CD
>
> Si otro agente detecta un problema de infraestructura o CI/CD, **DEBE DETENERSE y reportarlo**
> en `multiAgents/06_devops_release/WORKLOG.md`. **GitHub Projects no se utiliza en este proyecto.**

---

## 4. Matriz de Relevo Operativo (Insumos vs. Entregables)

| Agente / Rol | Insumo Obligatorio que DEBE Verificar | Entregable Obligatorio que DEBE Dejar en Disco | Compuerta (Stage-Gate) |
| :--- | :--- | :--- | :--- |
| **01. Product Manager** | Visión del Director Humano / `PROJECT_STATUS.md` | `docs/01_prd.md`, HUs INVEST con BDD Gherkin en `docs/modules/XX/` | **Gate 1** (Firma Humana Requerida) |
| **02. Software Architect** | PRD firmado en Gate 1 con DoR completa | DDL de tablas, Contratos Zod en `docs/contracts/XX.contract.ts`, ADRs | **Gate 2** (Firma Humana Requerida) |
| **03. Backend Engineer** | Contrato Zod y DDL migrado en base de datos | Código en `backend/src/modules/XX/`, 0 ANYs (`check:no-any` OK), 100% Vitest PASS | **Gate 3A** (Transfiere a Frontend) |
| **04. Frontend Engineer** | Endpoints de backend en verde en Vitest | Vistas en `frontend/src/modules/XX/`, 0 ANYs (`check:no-any` OK), build OK, `WALKTHROUGH.md` | **Gate 3B** (Firma Humana de UI Requerida) |
| **05. QA & Security** | Walkthrough versionado y código desplegado | Reporte forense RCA en `docs/qa/`, Arsenal 4 Pilares + Certificación Cero ANY en verde | **Gate 4** (Poder de Veto / Firma Humana) |
| **06. DevOps & Release** | Certificación de QA en Gate 4 | Seeds listos, `/api/health` OK, Release SemVer persistido y sincronizado | **Gate 5** (Release Final y Despliegue) |

---

## 5. Protocolo de Aterrizaje: Cómo Asumir un Rol Paso a Paso

Si eres un agente nuevo ingresando al repositorio:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PASO 1: LECTURA DE CONTEXTO VIVO                                                       │
│ 1. Consulta .workflow/current_state.json para conocer la fase activa y el rol en turno.│
│ 2. Consulta multiAgents/00_orchestrator/PROJECT_STATUS.md para el estado de los módulos│
│ 3. Lee el ROLE.md de tu agente y el último commit en ../docs/CHANGELOG.md.                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PASO 2: VERIFICACIÓN DE INSUMOS (DOR / PRECONDICIONES)                                 │
│ 1. Verifica que la fase previa esté aprobada por el Director Humano.                   │
│ 2. Lee los artefactos de entrada (ej. si eres Backend, lee el contrato en contracts/). │
│ 3. Si hay ambigüedades, NO improvises: abre un ticket en tu WORKLOG.md.                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PASO 3: EJECUCIÓN CON KIT DE SUBROLES                                                  │
│ 1. Convoca al subrol especializado exacto para la tarea (no cargues todo a la vez).    │
│ 1b. Si el entregable exige un rito con OTROS roles líderes (p. ej. la mesa ATDD),      │
│    convócalos en Mesa de Consulta Acotada:                                             │
│    multiAgents/protocols/CONSULTATION_BYPASS_PROTOCOL.md (consultivo, NO aprueba Gate).│
│ 2. Si detectas código repetitivo o deuda técnica, formula un RFC bajo                  │
│    multiAgents/protocols/TECHNICAL_PROPOSALS_PROTOCOL.md.                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PASO 4: CIERRE, BITÁCORA Y ALTO MECÁNICO (STAGE-GATE)                                  │
│ 1. Registra tus acciones en multiAgents/[tu_agente]/WORKLOG.md.                        │
│ 2. Si modificaste código, actualiza ../docs/CHANGELOG.md con estándar SemVer.                  │
│ 3. Si eres Frontend o QA, actualiza el walkthrough versionado.                         │
│ 4. Si estás en Gate 1, 2, 3B, 4 o 5, DETÉN EL USO DE HERRAMIENTAS (Halt/Yield) y       │
│    solicita la aprobación explícita del Director Humano.                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Las 11 Reglas de Oro Inviolables (Antipatrones Prohibidos)

1. ❌ **PROHIBIDO tirar código sin contrato previo (Regla de Oro #1):** Ningún endpoint ni componente se implementa sin un contrato de datos Zod previamente redactado y tipado en `docs/contracts/`.
2. ❌ **PROHIBIDO el SQL crudo en texto:** Toda consulta a la base de datos debe usar QueryBuilders tipados o modelos fuertemente tipados. Prohibidas las cadenas concatenadas vulnerables a inyección SQL.
3. ❌ **PROHIBIDO violar la inmutabilidad de estados de negocio:** Transiciones de estado irreversibles deben validarse y rechazarse con HTTP 403 / 409 si la entidad se encuentra en un estado terminal o cerrado.
4. ❌ **PROHIBIDO el salto de Stage-Gates:** Ningún agente puede auto-aprobarse un Stage-Gate. Las compuertas principales requieren la confirmación explícita del Director Humano según `.workflow/STAGE_GATES.md`. Tampoco puede **diferirla, recortarla ni declararla no aplicable por acuerdo verbal**: exige un RFC firmado ([`STAGE_GATES.md` §1.2](.workflow/STAGE_GATES.md)). Y **ningún agente audita en Gate 4 un módulo que él mismo implementó** ([`STAGE_GATES.md` §1.1](.workflow/STAGE_GATES.md)).
5. ❌ **PROHIBIDO omitir la bitácora:** Todo cambio de código o documento debe quedar reflejado de forma concisa en el `WORKLOG.md` del agente que lo realizó.
6. ❌ **PROHIBIDO que QA autocorriga código de producción:** El QA Lead tiene poder de veto y debe emitir reportes con análisis de causa raíz (RCA) explicando el error del desarrollador, sin alterar él mismo el código de producción.
7. ❌ **PROHIBIDO el uso de estilos fuera del Design System:** Todo componente visual debe apegarse estrictamente a la guía de tokens y diseño en `docs/04_ui_design_system.md`.
8. ❌ **PROHIBIDO maquillar u ocultar bugs (Transparencia Radical en QA):** Todo defecto, error de compilación, falla en tests o fallo de linter detectado DEBE quedar explícitamente documentado en el reporte de QA (`QA_REPORT.md`), catalogado con severidad (S1 a S4) y su causa raíz.
9. ❌ **PROHIBIDO el commit sin nomenclatura canónica:** Todo commit DEBE seguir la nomenclatura `tipo(scope): descripcion` (**sin prefijo de versión**; la versión va en el título de la PR con cuatro segmentos). **`feat` exige citar una HU satisfecha end-to-end** — estructura, scaffolding, configuración y documentación son `chore` o `docs`. Fuente única de verdad: [`../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md`](../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md); el protocolo `multiAgents/protocols/GIT_COMMIT_CONVENTION.md` está subordinado a ella.
10. ❌ **PROHIBIDO el encadenamiento no autorizado de fases (Alto Mecánico Obligatorio):** Al culminar entregables de Gate 1, Gate 2, Gate 3B o Gate 4, el agente DEBE detenerse inmediatamente (Halt/Yield), actualizar `.workflow/current_state.json` y esperar la confirmación del Director Humano.
11. ❌ **PROHIBIDO el uso del tipo `any` en TypeScript (Tolerancia Cero — Regla de Oro #11):** Queda terminantemente prohibido el uso del tipo `any` (`: any`, `as any`, `<any>`) tanto en Backend como en Frontend. Todo tipo debe definirse mediante contratos Zod, DTOs explícitos o `unknown` con type narrowing. Los verificadores AST integrados en `npm run build` abortan la compilación si detectan un solo `any`. QA ejercerá Veto Inmediato (Stop-the-Line) ante cualquier presencia de `any`.
