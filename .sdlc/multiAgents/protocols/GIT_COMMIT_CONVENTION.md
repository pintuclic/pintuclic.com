# 📌 PROTOCOLO DE CONVENCIÓN DE COMMITS GIT (CANONICAL COMMIT NOMENCLATURE)

> **Documento Rector:** `multiAgents/protocols/GIT_COMMIT_CONVENTION.md`  
> **Ámbito de Aplicación:** Obligatorio para **TODOS** los agentes de IA (Orquestador, PM, Arquitecto, Backend, Frontend, QA, DevOps) y desarrolladores humanos.  
> **Estatus:** Regla de Gobernanza Activa — Subordinada a la guía del proyecto.

---

> ## ⚖️ ESTE PROTOCOLO ESTÁ SUBORDINADO A LA GUÍA DEL PROYECTO
>
> **La fuente única de verdad sobre tipos de commit, scopes y nomenclatura es:**
> **[`../../../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md`](../../../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md)**
>
> Pintu Clic es un proyecto real con CI activo (`pr-title-lint.yml`, `version.yml`) y un esquema
> de versionado de **cuatro segmentos** (`X.Y.Z.W`). Las reglas genéricas de la plantilla SDLC
> **NO aplican** cuando contradicen la guía del proyecto. Lee esa guía antes de cualquier commit.

---

## 1. La Regla de Oro de Nomenclatura (Pintu Clic)

Todo commit DEBE seguir la estructura canónica del proyecto:

```text
tipo(scope): descripción concisa en minúsculas y modo imperativo
```

> [!IMPORTANT]
> **El commit NO lleva prefijo de versión.** Queda **prohibido** el formato `[vX.Y.Z] tipo(scope): ...`
> que usaba la plantilla genérica del SDLC.
>
> La versión del proyecto vive **exclusivamente** en `.github/version.txt` y se declara en el
> **título de la Pull Request** con el formato `tipo(scope) [X.Y.Z.W]: mensaje` (cuatro segmentos).

| Artefacto | Formato | Lleva versión |
| :--- | :--- | :---: |
| **Commit** | `tipo(scope): descripcion` | ❌ NO |
| **Título de PR** | `tipo(scope) [X.Y.Z.W]: mensaje` | ✅ SÍ |

---

## 2. 🔴 REGLA CRÍTICA: `feat` EXIGE UNA HISTORIA DE USUARIO

> **`feat` se reserva EXCLUSIVAMENTE para funcionalidad real de negocio que satisface una o más
> Historias de Usuario (HU) con código verificable end-to-end.**
>
> **Si no puedes citar un código `HU-XXX-NN` concreto que esta entrega satisface, NO ES `feat`.**

Casos que los agentes etiquetan mal con frecuencia:

| Trabajo realizado | ❌ Incorrecto | ✅ Correcto |
| :--- | :--- | :--- |
| Estructura de carpetas, scaffolding, arquitectura | `feat` | `chore(estructura)` |
| Documentos de arquitectura, specs, diagramas | `feat` | `docs(arquitectura)` |
| Contratos Zod sin endpoints implementados | `feat` | `docs(contratos)` |
| Schema Prisma sin lógica de negocio | `feat` | `chore(bd)` |
| Configuración, dependencias, tooling | `feat` | `chore(config)` / `chore(deps)` |
| Integración del submódulo SDLC | `feat` | `chore(sdlc)` |
| Workflows de GitHub Actions | `feat` | `ci(workflows)` |
| Tests sobre código existente | `feat` | `test(mXX-nombre)` |

El catálogo completo, el árbol de decisión y los antipatrones están en la
[guía del proyecto](../../../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md).

---

## 3. Tipos de Commit Permitidos

Los 12 tipos válidos son los definidos en la guía del proyecto:

`feat` · `fix` · `security` · `perf` · `refactor` · `test` · `docs` · `style` · `chore` · `ci` · `build` · `revert`

> ⛔ Cualquier tipo fuera de esta lista queda **rechazado**. No existen `update`, `add`, `change`,
> `improve`, `WIP` ni `misc`.

---

## 4. Scopes

Los scopes válidos (módulos `m[xx]-[nombre]` y transversales como `estructura`, `arquitectura`,
`contratos`, `bd`, `core`, `ui`, `qa`, `devops`, `workflows`, `sdlc`, `gobernanza`, `deps`, `config`)
están catalogados en la **Sección 5** de la
[guía del proyecto](../../../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md).

El scope es **siempre obligatorio** y debe coincidir con el nombre de la carpeta del módulo
en `backend/src/modules/` y `frontend/src/modules/`.

---

## 5. Ejemplos Correctos

- `feat(m04-cuentas): implementar login con jwt y validacion zod HU-CUE-04`
- `chore(estructura): crear estructura modular de backend y frontend`
- `docs(arquitectura): agregar seccion de herramientas qa`
- `fix(core): resolver timeout en pool de conexiones de prisma`
- `test(m04-cuentas): agregar bateria de pruebas de integracion vitest`
- `security(m20-seguridad): elevar costo de salt bcrypt a 12`
- `ci(workflows): configurar lint de titulo de pr`

### ❌ Antipatrones Rechazados

- ❌ `[v1.0.0] feat(m04-cuentas): implementar login` — *el prefijo de versión no va en el commit.*
- ❌ `feat: add full project structure` — *scaffolding no es `feat`; falta scope; está en inglés.*
- ❌ `feat(m04-cuentas): modulo de cuentas` — *no cita HU; descripción vaga.*
- ❌ `feat(docs): agregar documentacion` — *documentación nunca es `feat`.*
- ❌ `update(m04): cambios varios` — *`update` no es un tipo permitido.*
- ❌ `WIP: avanzando` — *inaceptable bajo estándares de ingeniería.*

---

## 6. Lista de Chequeo Pre-Commit para Agentes

Antes de proponer o ejecutar un `git commit`, el agente DEBE validar:

1. [ ] ¿Recorrí el árbol de decisión de la guía del proyecto para elegir el tipo?
2. [ ] Si usé `feat`, ¿puedo citar un código `HU-XXX-NN` satisfecho end-to-end?
3. [ ] ¿El mensaje **NO** empieza con `[vX.Y.Z]`?
4. [ ] ¿El scope entre paréntesis está en el catálogo y es obligatorio?
5. [ ] ¿La descripción está en minúsculas, modo imperativo y sin punto final?
6. [ ] ¿Actualicé las bitácoras `WORKLOG.md`, `current_state.json` y `PROJECT_STATUS.md`?
7. [ ] ¿Verifiqué que solo toqué archivos de mi módulo asignado?
