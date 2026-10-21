# 📈 PLANTILLA: Plan de Mejora Continua Kaizen (Ishikawa, Pareto & Priorización)

> **Ubicación del Artefacto:** `docs/quality/IMPROVEMENT_PLAN_v[X.Y.Z].md`  
> **Versión Evaluada:** `v[X.Y.Z]`  
> **Fecha de Emisión:** AAAA-MM-DD  
> **Comité de Calidad Responsable:** 
> - 🚀 **DevOps & Release Engineer:** [Nombre / Agente]
> - 🧪 **QA Lead & Security Director:** [Nombre / Agente]
> - 🏛️ **Software Architect:** [Nombre / Agente]
> - 📋 **Product Manager Lead:** [Nombre / Agente]

---

## 1. Diagnóstico del Ciclo y Balance DAFO Técnico

### 1.1. Fortalezas Consolidadas en la Versión
1. [Ej. 100% de contratos tipados con validación Zod perimetral sin fugas].
2. [Ej. Suites de integración de Vitest ejecutándose en menos de 500ms].
3. [Ej. Cero ocurrencias del tipo `any` certificadas por el verificador AST].

### 1.2. Debilidades e Inestabilidades Detectadas
1. [Ej. Alta recurrencia de errores en el parseo y serialización de fechas en frontend].
2. [Ej. Retrasos en pruebas E2E por inconsistencias en los seeds de la base de datos].
3. [Ej. Excepciones no controladas ante respuestas 409 en formularios de alta densidad].

---

## 2. Análisis Causal con Diagrama de Ishikawa (Espina de Pescado)

A continuación se descomponen las causas raíz del principal problema técnico detectado en el ciclo:

```
[MÉTODOS DE TRABAJO]                          [HERRAMIENTAS & PIPELINES]
 Falta de checklist previo en PRs ──────┐      ┌────── Linter no bloqueaba helpers sueltos
 Criterios BDD sin casos de timezone ───┴──┬───┴────── Seeds desactualizados en Docker
                                           │
                                           ├────────► [PROBLEMA CENTRAL DETECTADO]
                                           │          (Ej. Inestabilidad en registros
 Falta de capacitación en mock date ───┬───┴───┬────── con marcas de tiempo)
 Ambigüedad en formato UTC/Local ──────┘      └────── Ausencia de helper universal
[PERSONAS & CAPACITACIÓN]                     [ARQUITECTURA & CÓDIGO]
```

### Detalle de Factores Contribuyentes:
* **Métodos:** [Procesos o pasos de revisión que fallaron o se omitieron].
* **Herramientas:** [Configuraciones de linters, pipelines CI o herramientas de prueba insuficientes].
* **Personas / Capacitación:** [Brechas de conocimiento técnico en el equipo o supuestos erróneos].
* **Arquitectura / Código:** [Deuda técnica acumulada, falta de abstracciones o duplicación].

---

## 3. Análisis de Pareto (Regla del 80/20 de Incidencias)

Distribución de los defectos cerrados durante el ciclo para identificar el 20% de causas que generaron el 80% de los incidentes:

| Categoría de Incidencia | Frecuencia (N.º Bugs) | % del Total | % Acumulado | Acción Inmediata |
| :--- | :---: | :---: | :---: | :---: |
| **Desajuste de Fechas / Timezones** | 8 | 53.3% | 53.3% | 🎯 Foco Prioritario (Pareto 80/20) |
| **Inconsistencias de Seeds en Tests** | 4 | 26.7% | 80.0% | 🎯 Foco Prioritario (Pareto 80/20) |
| **Validaciones UI en Formularios** | 2 | 13.3% | 93.3% | Monitoreo secundario |
| **Errores de Tipado Menores** | 1 | 6.7% | 100.0% | Monitoreo secundario |
| **TOTAL** | **15** | **100.0%** | — | — |

> 💡 **Conclusión Pareto:** El 80% de las incidencias están concentradas en dos áreas: **Manejo temporal** e **Idempotencia de seeds**. Los esfuerzos de mejora del siguiente sprint deben enfocarse exclusivamente en estas dos áreas.

---

## 4. Formulación de Objetivos de Mejora
1. **Objetivo 1:** Estandarizar una única utilidad de manejo de fechas UTC en `backend/` y `frontend/` para reducir a cero las discrepancias horarias.
2. **Objetivo 2:** Automatizar el refresco de fixtures y seeds en el contenedor de pruebas antes de cada corrida de Playwright.

---

## 5. Matriz de Priorización de Acciones (Dificultad vs Plazo vs Impacto)

| N.º | Acción de Mejora Propuesta | Dificultad | Plazo | Impacto | Categorización Estratégica |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | Crear helper institucional `dateUtils.ts` tipado | Poca | Inmediato | Mucho | ⚡ **Quick Win (Prioridad 1)** |
| **2** | Script de reset idempotente en Docker para E2E | Poca | Corto | Mucho | ⚡ **Quick Win (Prioridad 1)** |
| **3** | Migrar formularios complejos a composables reactivos | Bastante | Medio | Bastante | 🏛️ **Proyecto Estratégico (P2)** |
| **4** | Refactorizar capa de persistencia completa | Mucha | Largo | Poco | 🛑 **Descartado / Pospuesto** |

---

## 6. Estructura del Plan de Seguimiento y Compromisos

| Acción de Mejora | Tareas Concretas | Responsable | Plazo (Inicio - Fin) | Recursos Necesarios | Financiación / Presupuesto | Indicador KPI de Éxito | Responsable de Seguimiento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Estandarización de Fechas** | 1. Implementar helper<br/>2. Reemplazar `new Date()` | 03_Backend Lead & 04_Frontend Lead | Sprint N+1 (Día 1 a Día 3) | Repositorio, linter custom | Horas equipo desarrollo | 0 bugs de fecha en el siguiente reporte QA | 05_QA Lead |
| **Idempotencia de Seeds** | 1. Crear comando `db:reset:test`<br/>2. Hook en CI | 06_DevOps Release | Sprint N+1 (Día 2 a Día 4) | Docker Compose, runner CI | Horas equipo DevOps | 100% de corridas E2E sin fallas de seed | 00_Orquestador |

### Firmas del Comité de Calidad Kaizen:
- **DevOps & Release Lead:** `[APROBADO]` el AAAA-MM-DD
- **QA Lead & Security Director:** `[APROBADO]` el AAAA-MM-DD
- **Software Architect:** `[APROBADO]` el AAAA-MM-DD
- **Product Manager Lead:** `[RECIBIDO COMO INSUMO PARA SPRINT N+1]` el AAAA-MM-DD
