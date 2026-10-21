# Protocolo de Gobernanza para Gemini / Antigravity - PINTU CLIC

> 🛑 **ALTO OBLIGATORIO (PASO 0 - INVIOLABLE):**
> Este proyecto se rige bajo la metodología **SDLC Multiagente con Stage-Gates**.
> Existe un **guardarraíl mecánico activo en `.agents/hooks.json`** que bloquea automáticamente intentos indebidos de edición de código.

---

## 1. Verificación Previa Ineludible
Antes de planificar, sugerir o modificar código:
1. Abre y lee [`.sdlc/.workflow/current_state.json`](.sdlc/.workflow/current_state.json).
2. Revisa la compuerta activa y tu rol en turno.
3. Consulta las reglas modulares en:
   - [`.agents/rules/00_sdlc_circuit_breaker.md`](.agents/rules/00_sdlc_circuit_breaker.md)
   - [`.agents/rules/01_backend_standards.md`](.agents/rules/01_backend_standards.md)
   - [`.agents/rules/02_frontend_design_system.md`](.agents/rules/02_frontend_design_system.md)
   - [`.agents/rules/03_git_commits.md`](.agents/rules/03_git_commits.md)

---

## 2. Restricciones Críticas
- **Fase 1 (PRD):** PROHIBIDO escribir código en `backend/src/` o `frontend/src/` o modificar la base de datos.
- **Fase 2 (Arquitectura):** Solo se crean contratos Zod (`dtos/`), interfaces TypeScript y DDL. No implementar controladores, servicios o componentes.
- **Aislamiento de Módulo:** Prohibido modificar archivos fuera del módulo activo en `current_state.json`.
- **Espera Humana:** Si el estado es `ESPERANDO_APROBACION_HUMANA`, detén la ejecución y solicita la firma del Director Humano.
