# Contribución a Pintu Clic

> **Repositorio:** `pintuclic/pintuclic.com` | **Stack:** Express 5 + Prisma 6 + Next.js 15 + React 19
>
> ## 🚦 PUNTO DE ENTRADA — METODOLOGÍA SDLC MULTIAGENTE
> Antes de escribir cualquier código, todo colaborador (humano o IA) debe:
> 1. Leer [`.sdlc/AGENTS.md`](.sdlc/AGENTS.md) — Manual rector y reglas inviolables
> 2. Leer [`.sdlc/PINTUCLIC_CONTEXT.md`](.sdlc/PINTUCLIC_CONTEXT.md) — Stack confirmado, fuentes de verdad
> 3. Consultar [`.sdlc/.workflow/current_state.json`](.sdlc/.workflow/current_state.json) — Fase y Gate activos
> 4. Consultar [`.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md`](.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md) — Semáforo de módulos
>
> El trabajo de desarrollo se rige por el SDLC. No se inicia código fuera del Gate correspondiente.

---

## Versionamiento

El esquema de versiones es semántico de **cuatro segmentos** `X.Y.Z.W`:

| Versión | Nombre | Descripción |
|:-----|:------|:------|
| `1.X.X.X` | **Mayor** | Versión estable, todo funcional |
| `X.1.X.X` | **Minor estable** | Versión estable de minor-feat |
| `X.X.1.X` | **Minor-feat** | Cambios que aportan funcionalidad a la web |
| `X.X.X.1` | **Patch** | Arreglos pequeños para el funcionamiento de la web |

La versión se declara en el **título de la PR** con el formato `tipo(scope) [X.Y.Z.W]: mensaje` y debe coincidir con el contenido de `.github/version.txt`.

Ejemplo partiendo de `0.4.7.3`:
```
feat(carrito) [0.4.8.0]: agregar panel lateral del carrito
```
```
0.4.8.0
```

| Si el cambio es | Avanza el segmento | Ejemplo desde `0.4.7.3` |
|:-----|:------|:------|
| **Mayor** | 1º (`1.X.X.X`) | `1.0.0.0` |
| **Minor estable** | 2º (`X.1.X.X`) | `0.5.0.0` |
| **Minor-feat** | 3º (`X.X.1.X`) | `0.4.8.0` |
| **Patch** | 4º (`X.X.X.1`) | `0.4.7.4` |

Solo se avanza **un** segmento por PR; el lint bloquea saltos (ej. `0.4.9.0` o `0.4.8.1` desde `0.4.7.3`).

---

## Flujo de trabajo (Git Flow + SDLC)

1. Verificar en [`.sdlc/.workflow/current_state.json`](.sdlc/.workflow/current_state.json) que el Gate correspondiente al módulo está abierto.
2. Crear rama desde `develop` con el formato `feature/m[xx]-[nombre-modulo]` o `fix/[descripcion]`.
3. Trabajar respetando las **11 Reglas de Oro** del SDLC (ver [`.sdlc/AGENTS.md`](.sdlc/AGENTS.md)).
4. Abrir la PR contra `develop` (o `main` para hotfixes) con el título `tipo(scope) [X.Y.Z.W]: mensaje`.
5. La PR debe actualizar `.github/version.txt` con el mismo número del título.
6. Agregar en `docs/CHANGELOG.md` la entrada con fecha y autor real:
```
## [v0.4.8.0] - 2026-10-14
- **Autor:** Nombre Apellido (@usuario)
```
El autor es la persona que realiza la entrega (nunca la IA).

---

## Revisión de pull requests

- Partir de la versión en `develop` (`.github/version.txt`); si el número del título no es el siguiente paso exacto, el lint rechaza la PR.
- Ver el código y qué se implementa; verificar que cumple con el cambio de versión correspondiente.
- Si hay errores, mencionar al usuario que abrió la PR.
- Al fusionar, el workflow `Version` revalida el título y `.github/version.txt`, crea el tag `vX.Y.Z.W` y publica el Release (pre-release en `develop`, estable en `main`).
- Todo aquel con acceso a PR que acepte sin revisar el código y la versión pierde el permiso de aceptar PRs.

---

## Convenciones de commits (Conventional Commits + SDLC)

Formato SDLC: `[vX.Y.Z] tipo(scope): descripcion`

Tipos válidos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`.

Al finalizar un ciclo de trabajo, actualizar los artefactos SDLC:
- `.sdlc/docs/worklog/WORKLOG.md` — registrar el trabajo realizado
- `.sdlc/.workflow/current_state.json` — avanzar el estado si aplica
- `.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md` — actualizar semáforo del módulo
