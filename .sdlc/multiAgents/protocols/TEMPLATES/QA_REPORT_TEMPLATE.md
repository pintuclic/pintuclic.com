# 📊 PLANTILLA: Reporte de Calidad, Pruebas y Seguridad (QA Report)

> **Documento:** `docs/03_qa_report.md`  
> **Versión:** 1.0.0  
> **Autor:** QA Lead & Security Compliance Director  
> **Resultado Global:** [APROBADO (PASS) / BLOQUEADO (FAIL)]  
> **Enfoque Metodológico:** Auditoría Integral en los 4 Cuadrantes Ágiles de Testing

---

## 1. Resumen Ejecutivo de la Evaluación
- **Total Casos de Prueba Ejecutados:** [X]
- **Casos Exitosos (Pass):** [X]
- **Casos Fallidos (Fail):** 0
- **Casos Bloqueados:** 0
- **Auditoría AST (Zero ANY):** 0 violaciones detectadas
- **Defectos Críticos Abiertos (S1/S2):** 0
- **Cobertura de Código (Coverage):**
  - Backend: XX%
  - Frontend: XX%

---

## 2. Herramientas de QA Empleadas y Desglose por Cuadrante

### 2.1 Criterio de Selección Crítica (Proporcionalidad del Cambio)
- **Tamaño del Cambio Evaluado:** [Small (Parche) / Medium (Feature/Endpoint) / Large (Módulo Completo)]
- **Herramientas Convocadas:** [Detallar herramientas activadas de los 4 cuadrantes y su justificación técnica].
- **Herramientas Omitidas y Justificación de Eficiencia:** [Detallar herramientas no requeridas para optimizar ciclos].

### 2.2 Desglose de Pruebas Ejecutadas por Cuadrante
| Cuadrante | Herramienta / Comando | Sub-Rol Responsable | Suites / Archivos Ejecutados | Casos Probados | Artefacto Generado / Resultado |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **Q1** | **AST Parser (`npm run check:no-any`)** | SDET / Architecture Guard | `tooling/check-no-any-*.{ts,mjs}` | Backend + Frontend | ✅ 0 ANY detectados |
| **Q1** | **Validador Contratos (`npm run test:contracts`)** | SDET | `docs/contracts/*.contract.ts` | Contratos DTO Zod | `docs/qa/contracts-audit-summary.json` |
| **Q1** | **Vitest / TDD Unitario** | SDET | `backend/tests/modules/XX_*.test.ts` | X tests | ✅ PASS (X ms) |
| **Q2** | **Bruno CLI / API Integration** | SDET | `tests/bruno/XX_*/` | X endpoints | ✅ PASS |
| **Q2/Q3** | **Playwright E2E** | E2E Specialist | `frontend/tests/e2e/XX_*.spec.ts` | X suites | ✅ PASS (X s) |
| **Q3** | **Auditor A11y (`npm run audit:a11y`)** | A11y Specialist | `tooling/audit-a11y.mjs` | Vistas y Modales | `docs/qa/a11y-audit-summary.json` |
| **Q3** | **Test Charters (Heurísticas)** | Exploratory Specialist | `tests/exploratory/CHARTER-*.md` | X charters | ✅ PASS |
| **Q4** | **k6 Load Stress (`npm run test:load`)** | Performance Auditor | `tests/load/scenarios.template.js` | X VUs / p95 | `docs/qa/load-summary.json` + HTML |
| **Q4** | **DAST Scanner (`npm run audit:dast`)** | Security Auditor | `tooling/audit-security-runtime.mjs` | Endpoints API | `docs/qa/dast-audit-summary.json` |

---

## 3. Matriz de Ejecución de Pruebas Automatizadas

| ID Caso | Cuadrante | Herramienta | Escenario Evaluado | Tipo | Resultado | Tiempo |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **TC-XX-01** | Q1 | Vitest | Happy Path nominal según contrato Zod | Funcional | ✅ PASS | XXms |
| **TC-XX-02** | Q1 | Vitest | Boundary Value Analysis (BVA) & Payload inválido | Límite / Zod | ✅ PASS | XXms |
| **TC-XX-03** | Q1 | npm run test:contracts | Validación canónica de contratos DTO Zod y Envelopes | Contrato | ✅ PASS | XXms |
| **TC-XX-04** | Q2 | Bruno | Códigos HTTP semánticos y Envelope `{ success, data }` | Contrato | ✅ PASS | XXms |
| **TC-XX-05** | Q2/Q3 | Playwright | Flujo interactivo de usuario en navegador real | E2E | ✅ PASS | XXs |
| **TC-XX-06** | Q3 | npm run audit:a11y | Accesibilidad WCAG 2.1 AA en interfaz de usuario | A11y | ✅ PASS | XXs |
| **TC-XX-07** | Q3 | Test Charter | Resistencia a cancelaciones y dobles clics | Heurístico UX | ✅ PASS | XX min |
| **TC-XX-08** | Q4 | npm run audit:dast | Inyección SQL, XSS, headers HSTS/CSP, cookies seguras | Seguridad DAST | ✅ PASS | XXs |
| **TC-XX-09** | Q4 | npm run test:load | Carga concurrente y latencia p95 < 500ms | SLA Performance| ✅ PASS | XXs |

---

## 4. Auditoría de Seguridad (OWASP & Multi-Tenant)
- [ ] Aislamiento Multi-Tenant estricto (Anti-IDOR verificado por token JWT): **[CONFORME]**
- [ ] Validación perimetral Zod en 100% de los endpoints (Rechazo 400 ante campos extra o tipos incorrectos): **[CONFORME]**
- [ ] Sanitización contra inyección SQL / XSS: **[CONFORME]**
- [ ] Gestión segura de credenciales y expiración de sesión: **[CONFORME]**
- [ ] Escaneo dinámico DAST (`npm run audit:dast`) limpio: **[CONFORME (`docs/qa/dast-audit-summary.json`)]**
- [ ] Pruebas de estrés k6 (`npm run test:load`) dentro de SLA: **[CONFORME (`docs/qa/load-summary.json`)]**

---

## 5. Registro de Defectos y Ciclo de Incidencias (Estándar 10 Campos)
*(Si se identificaron fallos durante el ciclo, cada uno debe contar con su ficha individual en `docs/qa/incidents/BUG-[MOD]-[NUM].md` siguiendo `protocols/TEMPLATES/INCIDENT_DEFECT_TEMPLATE.md`)*

| ID Defecto | Título Conciso | Severidad | Agente Asignado | Estado en Máquina (7 Estados) | Test en Rojo Asociado |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **BUG-XX-01** | [Descripción breve del fallo] | S1 Blocker | Backend Lead | VERIFICADO | `tests/modules/XX_bug_01.test.ts` |
| **BUG-XX-02** | [Descripción breve del fallo] | S3 Major | Frontend Lead | CERRADO | `frontend/src/.../__tests__/bug_02.spec.ts` |

---

## 6. Dictamen de Aprobación para Despliegue (Stage-Gate 4)
- **Dictamen del QA Lead:** [APROBADO PARA DESPLIEGUE (PASS)]
- **Cero Defectos S1/S2 Abiertos:** [CERTIFICADO]
- **Auditoría AST Cero ANY:** [0 VIOLACIONES]
- **Fecha de Certificación:** AAAA-MM-DD
