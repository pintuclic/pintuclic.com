# 📦 REGLAS OBLIGATORIAS: COMMITS Y CONTROL DE VERSIONES

Fuente única de verdad: `docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md`.

---

## 1. Convención de Formato (Conventional Commits)
- Formato del mensaje: `tipo(scope): descripcion`
- Todo en minúsculas y modo imperativo.
- **Sin prefijo de versión en el commit** (la versión solo va en el título de la PR: `tipo(scope) [X.Y.Z.W]: mensaje`).

---

## 2. 🔴 Regla Crítica: `feat` Exige una Historia de Usuario (HU)
- El tipo `feat` se reserva **exclusivamente** para código de negocio verificable end-to-end que satisface una Historia de Usuario formal.
- **Si no puedes citar un código `HU-XXX-NN` concreto, el commit NO ES `feat`**.
- Scaffolding, carpetas, contratos Zod sin implementar, configuraciones o schema son `chore` o `docs`, nunca `feat`.

---

## 3. Tipos Permitidos (12 sin excepciones)
`feat`, `fix`, `security`, `perf`, `refactor`, `test`, `docs`, `style`, `chore`, `ci`, `build`, `revert`.
*Prohibidos:* `update`, `add`, `change`, `improve`, `WIP`, `misc`.

---

## 4. Artefactos Previos al Commit
1. **Walkthrough Obligatorio:** Crear walkthrough en `docs/walkthroughs/M[XX]/walkthrough_v[X.Y.Z.W]_[MXX]_[descripcion]_[backend|frontend].md`.
2. **Autoría Real:** El autor registrado en CHANGELOG y walkthrough DEBE ser la persona real (`@usuario`), nunca el agente IA.
3. **Actualización de Estado:**
   - `.sdlc/multiAgents/[tu_rol]/WORKLOG.md`
   - `.sdlc/.workflow/current_state.json` (si avanzó la fase/gate)
   - `.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md` (si el módulo avanzó de estado)
