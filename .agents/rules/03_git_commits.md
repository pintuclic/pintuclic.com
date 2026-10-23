# 📦 REGLAS OBLIGATORIAS: COMMITS Y CONTROL DE VERSIONES

Fuente única de verdad: `docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md`.

---

## 1. Convención de Formato (Conventional Commits)
- Formato del mensaje: `tipo(scope): descripcion`
- Todo en minúsculas y modo imperativo.
- **Sin prefijo de versión** ni en el commit ni en el título de la PR (el tag lo calcula `release.yml`).

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

## 4. Antes del Commit y del PR
1. Correr los checks de calidad: `npm run lint -- --max-warnings=0`, `npm run check:types`, `npm run check:no-any` y `npm test` (en `backend/` y `frontend/`), más `npm run test:contracts` en la raíz.
2. Actualizar el contrato en `contracts/` si cambió la API.
3. El PR lleva una descripción de máximo 10 líneas: qué hace, qué tocó fuera del módulo y cómo se probó.
