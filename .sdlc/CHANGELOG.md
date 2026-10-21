# 📝 Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.2.0] - 2026-10-20

### Added
- **Suite Automatizada de Herramientas y Runners de Testing en `tooling/`:**
  - `audit-security-runtime.mjs` (`npm run audit:dast`): Escáner DAST en runtime de cabeceras de protección HTTP (CSP, HSTS, X-Content-Type, X-Frame), cookies de sesión (`HttpOnly`, `SameSite`), verificación CORS y enmascaramiento de errores 500, con reporte `docs/qa/dast-audit-summary.json`.
  - `run-load-test.mjs` (`npm run test:load`) + `tests/load/scenarios.template.js`: Orquestador de pruebas de carga k6 / benchmark concurrente con reporte visual interactivo `docs/qa/load-report.html` y resumen JSON `docs/qa/load-summary.json`.
  - `audit-a11y.mjs` (`npm run audit:a11y`): Auditor automatizado de conformidad WCAG 2.1/2.2 AA (elementos sin nombre accesible, inputs huérfanos, tabindex > 0), con reporte `docs/qa/a11y-audit-summary.json`.
  - `validate-contracts.mjs` (`npm run test:contracts`): Validador canónico de contratos DTO Zod en `docs/contracts/` con verificación de Envelopes y cero tolerancia a `any`.
- **Integración con Subroles de QA Lead y CI/CD:**
  - Actualización de `03_performance_security_auditor.md` y `02_e2e_a11y_specialist.md` con mandatos CLI explícitos.
  - Integración en `01_ci_quality_gates.yml` de validación de contratos y accesibilidad estática.
  - Actualización de `QA_REPORT_TEMPLATE.md` para adjuntar reportes JSON y HTML automatizados.

---

## [1.1.0] - 2026-10-19

### Fixed
- **Validación de la Máquina de Estados en CI/CD (`01_ci_quality_gates.yml`):**
  - Corrección de la lectura del esquema en `.workflow/current_state.json` (`fase_activa` y `gate_activo`) que ocasionaba fallos prematuros en GitHub Actions.

### Added
- **Ecosistema de Calidad Integral en `multiAgents/`:**
  - Rito de especificación previa **ATDD (Three Amigos)** en `01_product_manager` con plantilla `ATDD_SPEC_TEMPLATE.md`.
  - Construcción bilateral con **TDD en dos capas**: subrol `05_developer_component_tdd.md` en Frontend y ciclo Red-Green-Refactor estricto en Backend.
  - Marco de auditoría de pruebas estructurado bajo los **4 Cuadrantes de Calidad Ágil** en `05_qa_security_tester`.
  - Ficha técnica estandarizada de defectos (`INCIDENT_DEFECT_TEMPLATE.md`) con ciclo de vida canónico de bugs.
  - Protocolo de Mejora Continua (**Fase 6: Kaizen**) con Diagrama de Ishikawa en 5 ramas, análisis de Pareto 80/20 y plantilla `CONTINUOUS_IMPROVEMENT_TEMPLATE.md`.

---

## [1.0.1] - 2026-10-07

### Changed
- **Desacople y Generalización Universal de Subroles y Protocolos:**
  - Erradicación total de remanentes del caso piloto (AcademiaNeiva, Decretos 1290/1850/2247, Ley 115, SIMAT, términos escolares).
  - Generalización del C4 Model, DDL relacional 3FN multi-tenant, contratos Zod canónicos y RBAC corporativo en `multiAgents/02_software_architect/`.
  - Renombramiento y generalización de subroles de Backend (`02_domain_business_rules.md` y `03_data_layer_optimizer.md`).
  - Adaptación agnóstica de subroles de Frontend, QA, DevOps, Product Management y protocolos técnicos de sincronización.
  - Corrección de auditorías AST y verificación de cero ocurrencias de dominio específico mediante inspección estática.

---

## [1.0.0] - 2026-10-07

### Added
- **Gobernanza y Orquestación Multiagente:**
  - Manual rector [`AGENTS.md`](file:///AGENTS.md) con las 11 Reglas de Oro, arquitectura de roles y protocolo de Stage-Gates.
  - Máquina de estados en [`.workflow/current_state.json`](file:///.workflow/current_state.json) y compuertas en [`.workflow/STAGE_GATES.md`](file:///.workflow/STAGE_GATES.md).
  - Kit completo de 7 Roles Líderes y 26 Subroles especializados en `multiAgents/`.
  - Protocolos de colaboración técnica (`HANDOFF_PROTOCOL`, `COLLABORATION_PROTOCOL_TECH_TRIO`, `GIT_COMMIT_CONVENTION`, `SEMVER_CHANGELOG_PROTOCOL`).
- **Tooling y Compuertas Mecánicas AST:**
  - Asistente interactivo de personalización de proyectos [`tooling/init-project.mjs`](file:///tooling/init-project.mjs) (`npm run init:project`).
  - Auditor AST de TypeScript para Backend [`tooling/check-no-any-backend.ts`](file:///tooling/check-no-any-backend.ts).
  - Auditor AST de TypeScript y Vue para Frontend [`tooling/check-no-any-frontend.mjs`](file:///tooling/check-no-any-frontend.mjs) (`npm run check:no-any`).
- **Artefactos y Plantillas de Ingeniería:**
  - Plantillas rectoras en `docs/`: PRD (`01_prd.md`), Arquitectura (`02_architecture.md`), Reporte QA (`03_qa_report.md`), Design System (`04_ui_design_system.md`), y Matriz de Versiones (`VERSION_MATRIX.md`).
  - Plantillas modulares en `multiAgents/protocols/TEMPLATES/` y catálogo de ADRs.
  - Prompt canónico de bienvenida para agentes de IA en [`LANDING_PROMPT.md`](file:///LANDING_PROMPT.md).
