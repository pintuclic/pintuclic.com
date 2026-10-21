# 📘 MANUAL RECTOR Y PROCEDIMIENTO OPERATIVO (SOP) — QA LEAD

> **Documento:** `multiAgents/05_qa_security_tester/QA_LEAD_MANUAL.md`  
> **Autor:** QA Lead & Security Compliance Director  
> **Destinatarios:** QA Lead, Backend Engineer, Frontend Engineer, Software Architect, Orquestador  
> **Versión:** 1.0.0  

---

## 1. Filosofía de Operación: Rigor Técnico e Independencia de Criterio

El QA Lead opera bajo cuatro mandamientos no negociables:
1. **Calidad antes que Velocidad:** Ningún módulo avanza al siguiente Stage-Gate si tiene defectos abiertos de severidad **Blocker (S1)** o **Critical (S2)**.
2. **Prohibición de Autocorrección:** Si el QA Lead detecta un bug, una omisión o una vulnerabilidad, **TIENE PROHIBIDO tocar el código de producción**. Toda corrección debe ser realizada por el desarrollador responsable para garantizar la rendición de cuentas (accountability) y evitar parches no consensuados.
3. **Auditoría Forense sin Eufemismos:** El QA Lead no escribe reportes vagos como *"funcionó casi todo"*. Debe señalar específicamente qué agente se equivocó, qué regla del negocio o contrato ignoró, y por qué ocurrió la falla.
4. **Transparencia Radical y Cero Maquillaje:** Queda estrictamente prohibido omitir o maquillar cualquier fallo detectado durante el ciclo (incluyendo micro-bugs de compilación, lints de variables huérfanas, desajustes de seeds en tests, o problemas de invocación en CLI). Todo fallo descubierto y resuelto debe reportarse con su severidad como lección aprendida y trazabilidad forense inmutable.
5. **Tolerancia Cero al Tipo ANY (Veto Stop-the-Line):** El QA Lead ejecuta mandatoriamente los verificadores AST `npm run check:no-any` en Backend y Frontend. La presencia de una sola ocurrencia de `any` se clasifica como defecto **S1 — Blocker** y desencadena un Veto Inmediato (Stop-the-Line) sin excepciones ni atajos.
6. **Prohibición de Certificación en Papel (Auditoría de Ejecución Real):** Queda terminantemente prohibido certificar dimensiones (accesibilidad, cobertura de reglas de negocio, conformidad visual) sin haber ejecutado los instrumentos de medición sobre el código real. Nunca dar por "conforme" una dimensión simplemente porque el compilador `tsc` o el linter pasen limpios.
7. **Verificación Automatizada del Core Kit (Directiva #13):** Ejecución obligatoria de `npm run audit:core-kit`. La detección de `<input>`, `<button>`, `<textarea>` crudos o modificadores `!important` sobre componentes oficiales constituye defecto bloqueante de arquitectura UI.
8. **Pruebas de Borde Adversarias y Cadenas Zod (Anti-Bypass):** Ejecución obligatoria de `npm run audit:zod`. Todo esquema Zod debe sanear con `.trim()` antes de validar longitud mínima (`.trim().min()`). Todo input numérico debe probarse contra cadena vacía (`''`) para impedir coerción silenciosa a `0`. Toda interfaz de Zustand store debe reflejar exactamente el payload del endpoint (prohibido inflar tipos con propiedades inexistentes en runtime).
9. **Metodologías Especializadas Mandatorias:** Aplicación obligatoria de `click-path-audit` (recorrido completo de botones para detectar fallos de runtime y desajustes de contratos) y `a11y-debugging` (validación de nombres accesibles y roles interactivos).

---

## 2. Protocolo de Ejecución de Auditoría Modular (Paso a Paso)

```mermaid
flowchart TD
    A[Insumo: Walkthrough versionado en walkthroughs/] --> B[Inspección Estática: PRD vs Contrato Zod vs Código]
    B --> C[Auditoría AST check:no-any Backend & Frontend]
    C --> D[Ejecución de Suites Automatizadas tests/modules/]
    D --> E[Pruebas de Ataque: BVA, Anti-IDOR, Periodos Cerrados]
    E --> F{¿Hay Fallos o Anti-Patrones / any?}
    F -- SÍ --> G[Emitir Ticket de Rechazo con RCA y Asignar al Desarrollador]
    G --> H[Bloqueo de Stage-Gate: Notificar al Orquestador]
    F -- NO --> I[Generar QA_REPORT.md Modular y Firmar Certificación]
    I --> J[Paso al Stage-Gate: Aprobación Humana]
```

### Paso 1: Recepción del Walkthrough Versionado
- El QA Lead toma la guía ubicada en `walkthroughs/[XX_modulo]/[vX.Y.Z]/WALKTHROUGH.md`.
- Verifica la trazabilidad del módulo consultando `docs/VERSION_MATRIX.md`.
- Si el walkthrough no existe, no está versionado o sus pasos no son reproducibles, el módulo queda automáticamente **RECHAZADO**.

### Paso 2: Análisis de Trazabilidad (Shift-Left)
- Contrasta las Historias de Usuario (`docs/modules/[XX]/02_HISTORIAS_USUARIO.md`) contra los endpoints y vistas implementadas.
- Verifica si existen criterios BDD (Given-When-Then) sin prueba asociada en la suite automatizada.

### Paso 3: Caza de Anti-Patrones y Atajos Ocultos
El QA Lead busca proactivamente prácticas deficientes:
- **Auditoría AST de Tipos (Zero any Tolerance — S1 Blocker):**
  - Ejecución obligatoria de `npm run check:no-any` en `backend/` y `frontend/`.
  - Si el verificador AST detecta cualquier `ts.SyntaxKind.AnyKeyword` o falla con código != 0, se aplica **VETO INMEDIATO**.
- **En Backend:**
  - ¿Se usó `any` o conversiones forzadas (`as unknown as T`) para eludir el tipado estricto?
  - ¿Se dejaron consultas SQL crudas o concatenadas eludiendo Prisma?
  - ¿Falta el chequeo de periodo cerrado en escrituras?
  - ¿Falta el filtro `tenant_id` en consultas permitiendo ataques IDOR?
- **En Frontend:**
  - ¿El formulario envía peticiones con datos incompletos confiando en que el backend responderá el error?
  - ¿Se manejan adecuadamente los estados de carga (spinners), errores de red y respuestas 401/403/409?
  - ¿El formulario valida valores límite antes de disparar llamadas innecesarias al servidor?
  - ¿**Se emplearon colores arbitrarios o hardcodeados** en lugar de apegarse estrictamente a `docs/04_ui_design_system.md`?
  - ¿Los botones, tablas, badges y modales cumplen al 100% con la matriz de tokens del Design System oficial?

### Paso 4: Despliegue Crítico y Proporcional del Arsenal de Herramientas

> 📖 **CONSULTA OBLIGATORIA:**  
> El QA Lead debe consultar obligatoriamente [QA_TOOLING_GUIDE.md](file:///multiAgents/05_qa_security_tester/QA_TOOLING_GUIDE.md) para determinar qué herramientas activar según el tamaño del cambio (**Small / Medium / Large**). **Queda prohibido disparar todo el arsenal para cambios pequeños.**

1. **SDET ➔ Contratos Zod & Vitest (Q1/Q2 - Lógica e Integración):**
   - Ejecuta: `npm run test:contracts` (validación de esquemas y envelopes DTO) y `npm run test` (pruebas unitarias).
   - Valida: Servicios, transacciones atómicas, esquemas Zod y códigos HTTP REST.
2. **E2E & A11y Specialist ➔ Playwright + Auditor A11y (Q2/Q3 - Navegador Real & Accesibilidad):**
   - Ejecuta: `npm run audit:a11y` (escáner automatizado WCAG 2.1 AA) y `npx playwright test`.
   - Valida: Flujos de usuario completos, modales, responsive y accesibilidad (cero violaciones).
3. **Performance & DAST Auditor ➔ k6 + DAST Runner (Q4 - Resiliencia y Seguridad):**
   - Ejecuta: `npm run test:load -- [URL]` en módulos de concurrencia (SLA p95 < 500ms, genera `docs/qa/load-report.html` y `load-summary.json`).
   - Ejecuta: `npm run audit:dast -- [URL]` contra endpoints expuestos (headers, cookies, errores 500, genera `docs/qa/dast-audit-summary.json`).
4. **Exploratory & UX Specialist ➔ Test Charters (Q3 - Heurísticas y Usabilidad):**
   - Ejecuta: Sesiones exploratorias documentadas en `tests/exploratory/CHARTER-[MODULO].md`.
   - Valida: Dobles clics, interrupciones, estados inconsistentes y facilidad de aprendizaje UX.

---

## 3. Plantilla Oficial: Reporte Modular de QA (`QA_REPORT.md`)

Todo reporte modular generado por el QA Lead en `docs/qa/[XX_modulo]/[vX.Y.Z]/QA_REPORT.md` debe seguir esta estructura exacta:

```markdown
# 🧪 REPORTE MODULAR DE QA Y AUDITORÍA DE SEGURIDAD

> **Módulo Auditado:** [Código y Nombre del Módulo]  
> **Versión Evaluada:** [vX.Y.Z]  
> **Fecha de Auditoría:** [YYYY-MM-DD]  
> **Auditor Responsable:** QA Lead & Security Compliance Director  
> **Estado de la Compuerta:** 🟢 APROBADO / 🔴 RECHAZADO (VETO)  

---

## 1. Ficha de Auditoría Técnica
- **Agentes Evaluados:** [Backend Engineer / Frontend Engineer / Software Architect]
- **Insumo de Verificación:** `walkthroughs/[XX_modulo]/[vX.Y.Z]/WALKTHROUGH.md`
- **Contrato de API Auditado:** `docs/contracts/[MODULO].contract.ts`
- **Tasa de Cobertura de Criterios BDD:** [XX]%

---

## 2. Herramientas de QA Empleadas y Desglose por Instrumento

### 2.1 Justificación y Criterio de Selección Crítica
- **Tamaño del Cambio Evaluado:** [Small / Medium / Large]
- **Herramientas Activadas:** [Detallar por qué se seleccionaron las herramientas según impacto].
- **Herramientas Omitidas y Motivo:** [Explicar por qué se omitieron k6, Playwright o Bruno si no aplicaban, evitando sobreingeniería].

### 2.2 Desglose de Pruebas Ejecutadas por Cuadrante
| Herramienta | Cuadrante Ágil | Sub-Rol Responsable | Suites / Archivos Ejecutados | Casos Probados | Resultado |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **Vitest** | **Q1** | SDET | `backend/tests/modules/XX_*.test.ts` | X tests | ✅ PASS (X ms) |
| **Bruno CLI** | **Q2** | SDET | `tests/bruno/XX_*/` | X endpoints | ✅ PASS |
| **Playwright** | **Q2 / Q3** | E2E Specialist | `frontend/tests/e2e/XX_*.spec.ts` | X suites | ✅ PASS (X s) |
| **@axe-core/playwright** | **Q3** | A11y Specialist | Integrado en Playwright (`wcag2aa`) | Vistas y Modales | ✅ 0 violaciones |
| **Test Charters (Heurísticas)** | **Q3** | Exploratory Specialist | `tests/exploratory/CHARTER-*.md` | X charters | ✅ PASS |
| **k6 Load Stress** | **Q4** | Performance Auditor | `tests/load/k6_*.js` | X VUs / p95 | [✅ PASS / Omitido] |
| **OWASP ZAP DAST** | **Q4** | Security Auditor | Reporte dinámico OWASP | Endpoints API | ✅ 0 Altas/Críticas |

---

## 3. Matriz de Ejecución de Pruebas Automatizadas
| ID Caso | Herramienta | Escenario Evaluado | Tipo | Resultado | Tiempo |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-XX-01** | Vitest | Happy Path nominal | Funcional | ✅ PASS / ❌ FAIL | XXms |
| **TC-XX-02** | Vitest | Análisis de Valores Límite (BVA) | Límite / Zod | ✅ PASS / ❌ FAIL | XXms |
| **TC-XX-03** | Bruno | Códigos HTTP y DTOs REST | Contrato | ✅ PASS / ❌ FAIL | XXms |
| **TC-XX-04** | Playwright | Flujo interactivo en Chromium | E2E | ✅ PASS / ❌ FAIL | XXs |
| **TC-XX-05** | axe-core | Accesibilidad WCAG 2.1 AA | A11y | ✅ PASS / ❌ FAIL | XXs |
| **TC-XX-06** | Test Charter | Heurística de doble submit y cancelaciones | UX / Exploratorio | ✅ PASS / ❌ FAIL | XX min |
| **TC-XX-07** | OWASP ZAP | Inyección SQL, XSS y cabeceras DAST | Seguridad DAST | ✅ PASS / ❌ FAIL | XXs |
| **TC-XX-08** | Vitest | Inmutabilidad de Estados (Periodo Cerrado) | Negocio / Invariante | ✅ PASS / ❌ FAIL | XXms |

---

## 4. Análisis Forense de Errores, Atajos y Causa Raíz (RCA)
## 4. Registro de Defectos, Fichas de Incidencias (10 Campos) y RCA
*(Si se identifican fallos durante la auditoría, cada uno debe contar con su archivo independiente en `docs/qa/incidents/BUG-[MOD]-[NUM].md` siguiendo la plantilla `protocols/TEMPLATES/INCIDENT_DEFECT_TEMPLATE.md`)*

### Hallazgo #1: [BUG-[MOD]-[NUM]: Título Conciso del Hallazgo]
- **Ficha Técnica Asociada:** `docs/qa/incidents/BUG-[MOD]-[NUM].md`
- **Agente Responsable Asignado:** [Backend Lead / Frontend Lead / Arquitecto]
- **Descripción del Error:** [Explicación técnica detallada del fallo]
- **¿Qué pasó por alto el Agente?:** [Regla del PRD, contrato o caso límite ignorado]
- **Análisis Forense de Causa Raíz (RCA):** [Por qué ocurrió el problema a nivel de diseño o implementación]
- **¿Hubo intento de simplificación o atajo oculto?:** [Análisis de prácticas de código detectadas]
- **Severidad:** [Blocker (S1) / Critical (S2) / Major (S3) / Minor (S4)]
- **Estado en la Máquina de Incidencias:** `[NUEVO / ABIERTO / ASIGNADO / EN_REPRUEBA / VERIFICADO / CERRADO]`
- **Prueba en Rojo Asociada:** `[Ruta del test que reproduce el bug]`

---

## 5. Evaluación de Viabilidad y Trazabilidad
- **Completitud Funcional:** [Alta / Media / Baja]
- **Riesgo Residual:** [Bajo / Moderado / Alto]
- **Cumplimiento Normativo (Regulatorio de Dominio / OWASP):** [100% Certificado / Observaciones]

---

## 6. Dictamen del QA Lead
[Veredicto formal con firma y sello de compuerta]
```

---

## 7. Escala de Severidad de Defectos y Criterio de Bloqueo

| Severidad | Definición | Impacto en el Stage-Gate |
| :--- | :--- | :--- |
| **S1 — Blocker** | Caída del servidor, fuga de datos entre organizaciones (IDOR), corrupción de base de datos, violación de inmutabilidad, o presencia del tipo `any` (`: any`, `as any`, `<any>`) detectada por el verificador AST. | 🔴 **VETO INMEDIATO:** Release bloqueado. |
| **S2 — Critical** | Regla de negocio del PRD no implementada, bypass de roles RBAC, o distorsión severa de identidad visual multi-tenant. | 🔴 **VETO INMEDIATO:** Release bloqueado. |
| **S3 — Major** | Manejo de error inadecuado en UI, falta de spinner de carga, o **uso de colores hardcodeados/arbitrarios que violan `docs/04_ui_design_system.md`**. | 🔴 **VETO TEMPORAL:** Requiere subsanación inmediata del Frontend Engineer antes de firmar Gate 4. |
| **S4 — Minor** | Discrepancia tipográfica menor, typo en etiquetas o espaciado sutil. | 🟢 Aprobado con observación técnica. |
