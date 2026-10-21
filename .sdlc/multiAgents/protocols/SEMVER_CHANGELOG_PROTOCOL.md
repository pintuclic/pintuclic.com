# 🏷️ PROTOCOLO DE VERSIONAMIENTO SEMVER, CHANGELOG Y WALKTHROUGHS

> **Propósito:** Definir el estándar formal de versionamiento (`SemVer`), registro de cambios (`CHANGELOG.md`) y guías de verificación paso a paso (`walkthroughs/`) para garantizar auditoría forense del desarrollo.

---

## 1. SemVer (Semantic Versioning 2.0.0)

El formato de versión es: `MAJOR.MINOR.PATCH` (ejemplo: `v0.1.0`, `v1.0.0`).

### ¿Cuándo incrementar cada dígito?
1. **`MAJOR` (v1.0.0 -> v2.0.0):**
   - Cambios de arquitectura incompatibles con versiones previas.
   - Refactorización de esquemas de base de datos que rompe datos históricos.
   - Migración de frameworks o contratos base de API.
   - **Hito:** La finalización del sistema base marca el paso a `v1.0.0`.
2. **`MINOR` (v0.1.0 -> v0.2.0):**
   - Incorporación de un nuevo módulo funcional del sistema (ej. Módulo 01 Auth completado, Módulo 02 Operaciones completado).
   - Nuevos endpoints o vistas que no rompen lo existente.
3. **`PATCH` (v0.1.0 -> v0.1.1):**
   - Corrección de bugs identificados en las suites de pruebas de QA.
   - Correcciones de estilos, textos o pequeños ajustes de validadores Zod.
   - Parches de seguridad de dependencias.

---

## 2. Estándar de CHANGELOG (`CHANGELOG.md`)

Todo cambio que impacte el código debe registrarse bajo las siguientes categorías oficiales de *Keep a Changelog*:
- **`[Added]`**: Nuevas funcionalidades o vistas.
- **`[Changed]`**: Cambios en comportamiento existente.
- **`[Deprecated]`**: Elementos que se marcaron como obsoletos.
- **`[Removed]`**: Código o módulos eliminados.
- **`[Fixed]`**: Errores y bugs solucionados.
- **`[Security]`**: Correcciones de vulnerabilidades o políticas RBAC.

### Formato de Entrada:
```markdown
## [0.2.0] - 2026-10-XX
### Added
- Módulo 01: Flujo completo de autenticación JWT y refresh con JTI Blacklist.
- Middleware RBAC con verificación de roles en Express.
- Vista de Login responsiva en React 19 con validación de formularios vía React Hook Form.

### Security
- Cifrado de contraseñas con Bcrypt cost factor 12.
```

---

## 3. Estándar de Walkthroughs (`walkthroughs/`)

Cada módulo o hito significativo debe incluir un archivo en `walkthroughs/` con el nombre:
`WALKTHROUGH_[MODULO]_[NOMBRE].md` (ej. `WALKTHROUGH_01_AUTH.md`).

### Contenido Obligatorio de un Walkthrough:
1. **Objetivo:** Qué se está demostrando.
2. **Precondiciones:** Usuarios o datos de prueba necesarios (referenciando `seed-credentials.md`).
3. **Pasos de Prueba Paso a Paso:**
   - URL o Endpoint a invocar.
   - Payload o acciones en la UI.
   - Respuesta esperada o pantallazo/diagrama del estado final.
4. **Validación de Criterios:** Checklist rápido para que el Director Humano o QA marque "Aprobado".

---

## 4. Estándar de Mensajes de Commit (Git Enriquecido con Versión y Módulo)

> **Manual de Referencia Oficial:** Consulta [`multiAgents/protocols/GIT_COMMIT_CONVENTION.md`](file:///multiAgents/protocols/GIT_COMMIT_CONVENTION.md) para el catálogo exhaustivo de scopes, reglas y checklist pre-commit.

Todo commit en el repositorio debe seguir la estructura canónica obligatoria:
```text
[vX.Y.Z] <tipo>(<módulo>): <descripción concisa>
```

### Tipos Permitidos:
- **`feat`**: Nueva funcionalidad en un módulo.
- **`fix`**: Corrección de bugs o ajustes a reglas de negocio.
- **`docs`**: Artefactos de arquitectura, HUs, PRD o walkthroughs.
- **`test`**: Nuevos casos de prueba automatizados.
- **`style`**: Ajustes cosméticos o de espaciado según Design System (Modo Blanco).
- **`refactor`**: Refactorización de código sin alterar lógica externa.
- **`chore`**: Configuración de dependencias, scripts o migraciones.

### Ejemplos Canónicos:
- `[v0.2.1] fix(m01-auth): allow username and document login without mandatory email`
- `[v0.3.0] feat(m02-tenants): implement organization registration and validation`
- `[v0.4.0] feat(m03-operations): complete core operations and workflow management`
- `[v0.5.0] feat(ui): responsive widescreen layout with accessible navigation`

