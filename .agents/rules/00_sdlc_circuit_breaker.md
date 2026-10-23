# 🛑 GUARDARRÁIL RECTOR SDLC MULTIAGENTE (CIRCUIT BREAKER - INVIOLABLE)

Este proyecto está gobernado estrictamente por la metodología **SDLC Multiagente con Stage-Gates**.
Cualquier agente de IA que opere en este repositorio DEBE cumplir de forma estricta las siguientes directrices antes de cualquier acción:

---

## 1. Paso 0 Obligatorio: Verificación de Estado Activo
Antes de sugerir, planificar o ejecutar modificaciones:
1. **Lee `.sdlc/.workflow/current_state.json`**.
2. Identifica:
   - `modulo_en_curso` (ej: `M04`)
   - `fase_activa` (ej: `FASE_1_PRD`, `FASE_2_ARQUITECTURA`, `FASE_3A_BACKEND`, `FASE_3B_FRONTEND`, `FASE_4_QA`, `FASE_5_RELEASE`)
   - `gate_activo` y `estado`
   - `rol_en_turno`

---

## 2. ⛔ Prohibiciones Absolutas de Codificación y Traspaso
1. **Prohibido codificar sin Gate previo aprobado:**
   - En `FASE_1_PRD`: Solo se generan especificaciones funcionales, HUs con escenarios BDD, diagramas y ATDD en `.sdlc/docs/modules/M[XX]/`. **Prohibido tocar `backend/src/` o `frontend/src/`**.
   - En `FASE_2_ARQUITECTURA`: Solo se definen contratos Zod (`dtos/`), interfaces TypeScript (`interfaces/`) y DDL/ADRs. **Prohibido implementar servicios, controladores, repositorios o componentes de UI**.
   - En `FASE_3A_BACKEND`: Solo se implementa la API y lógica backend del módulo en curso. No tocar frontend.
   - En `FASE_3B_FRONTEND`: Solo se implementan vistas, stores y componentes frontend del módulo en curso.
2. **Aislamiento Estricto de Módulo (Directiva #1):**
   - Tu código vive exclusivamente dentro de `src/modules/m[xx]-[nombre]`.
   - Está terminantemente PROHIBIDO modificar archivos de otros módulos o de infraestructura compartida sin autorización explícita.
   - Si requieres tocar un archivo externo, **DETÉN LA EJECUCIÓN INMEDIATAMENTE y reporta**.
3. **Alto Mecánico ante Espera Humana:**
   - Si `estado === "ESPERANDO_APROBACION_HUMANA"`, no continúes con fases siguientes hasta que el Director Humano firme la compuerta.
4. **Respeto a la Ruta del Proyecto (Directiva #5.1):**
   - Consulta `docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md`.
   - Prohibido construir un módulo si sus dependencias no están cerradas y certificadas en `.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md`.
