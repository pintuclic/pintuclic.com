# Registro de Cambios y Versiones (CHANGELOG) - PINTU CLIC

Todas las modificaciones, nuevas funcionalidades y refactorizaciones del proyecto deben registrarse en este archivo siguiendo el estándar [SemVer](https://semver.org/lang/es/) y la [Guía de Versionado y Walkthroughs](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md).

> **Repositorio oficial:** `pintuclic/pintuclic.com`  
> **Formato de Versiones:** `[vMAJOR.MINOR.PATCH]` - `AAAA-MM-DD`  
> **Stack tecnológico oficial:** Express 5 + Prisma 6 + PostgreSQL + Next.js 15 + React 19 + Tailwind CSS 4 + Zustand 5

---

## [v0.3.2] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `160b077` — `fix(ui): cerrar defectos de accesibilidad de modal y tarjeta del core kit`
- **Hito:** ♿ **Cierre de la deuda de accesibilidad del Core Kit compartido.** La compuerta de accesibilidad pasa a cubrir todo el frontend.

### Core Kit compartido — M20, infraestructura frontend

Los 2 defectos que la revisión de pares de `v0.3.1` dejó abiertos vivían fuera de `m17-permisos`,
en `frontend/src/core/`, y se reportaron sin tocar conforme a la Directiva #3. Esta entrega los
cierra con autorización explícita del Director Humano y sobre el ticket técnico que QA asignó al
custodio del Core Kit.

**Diálogo modal accesible.** `Modal.tsx` declaraba `role="dialog"` y `aria-modal` pero sin nombre
accesible, sin foco inicial, sin retorno de foco y sin trampa de foco: `Tab` desde el último control
salía del diálogo hacia la página de detrás, que seguía siendo tabulable bajo el fondo opaco. Se
añaden `aria-labelledby` y `aria-describedby` mediante `useId()`, la prop opcional `ariaLabel` para
modales sin título, foco inicial, retorno del foco al disparador y trampa de foco cíclica. Los 7
consumidores de M17 pasan `title`, así que ninguno requirió cambios.

**Tercer defecto corregido, no reportado antes.** El `role="dialog"` estaba sobre el **fondo**
decorativo y no sobre el panel, de modo que la región del diálogo abarcaba toda la pantalla.

**Causa raíz del lint, no su síntoma.** El cierre por clic exterior pasa de un `onClick` en el fondo
a un escucha de `pointerdown` en `document` —el mismo patrón que `AdminLayout.tsx` ya usaba en
`v0.3.1`—, con lo que el contenedor decorativo deja de necesitar semántica interactiva.

**Tarjeta de producto operable por teclado.** El `<h3>` de `ProductCard.tsx` llevaba `onClick` sin
manejador de teclado: "ver producto" era inalcanzable sin ratón. El encabezado conserva su semántica
y delega la acción a un `<button>` real, que obtiene `Enter`, `Espacio`, foco y anuncio de rol de
forma nativa. Sin `onViewDetails` se renderiza un `<span>` en lugar de un botón inerte.

**La compuerta de accesibilidad se amplía.** `v0.3.1` había acotado `lint:a11y` a `src/app` y
`src/modules` precisamente porque estas 2 violaciones habrían dejado el lint en rojo para todo el
equipo. Cerradas, el alcance incorpora `src/core`: una reaparición ahora rompe la verificación.

**Verificación.** `eslint-plugin-jsx-a11y` sobre `src/core` pasa de **2 errores a 0**. 57/57 pruebas
Vitest de frontend (eran 47) con 10 nuevas sobre el contrato de recorrido del foco; 68/68 de backend
sin afectación, **125/125 en total**; `tsc`, ESLint y `check:no-any` (75 archivos) limpios; los tres
auditores del repositorio sin violaciones. Se preserva la protección de la credencial de un solo uso
de `HU-SEG-06`.

**Brecha declarada.** El proyecto no tiene `jsdom` ni Testing Library y `vitest.config.ts` corre en
`environment: node`. Las pruebas nuevas cubren el **contrato de recorrido** de la trampa de foco y el
instrumento externo cubre la ausencia de manejador de teclado, pero el cableado DOM —`querySelectorAll`,
la llamada efectiva a `focus()`, el retorno del foco y la resolución de `aria-labelledby` por un lector
de pantalla— queda **verificado por inspección, no por prueba automatizada**. Se recomienda incorporar
`jsdom` y `@testing-library/react` como dependencias de desarrollo; es un cambio de dependencias del
proyecto y excedía el alcance autorizado de esta remediación.

**Sin cambios.** Sigue bloqueada la integración nativa de las 8 reglas en `frontend/eslint.config.mjs`
por el hook de protección de configuración del entorno. No se declara ninguna compuerta aprobada.

---

## [v0.3.1] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `cb21b6a` — `fix(m17): cerrar hallazgos de revision de pares en dtos stores y accesibilidad`
- **Hito:** 🔎 **Primera remediación guiada por revisión de pares.** Cierra defectos que las compuertas estáticas no podían detectar.

### Módulo M17 — Administración, Empleados y Permisos (remediación de frontend)

Una revisión de pares sobre `v0.3.0` registró 1 defecto bloqueante y 12 mayores. El ciclo
*Stop-the-Line* de QA resolvió 4 de ellos; esta entrega cierra **6 de los 8 restantes**, todos dentro
de los límites de `m17-permisos`.

**Corrección de datos y contrato.** Un colaborador con `telefono: null` no podía editarse —ni para
cambiarle solo el nombre— porque el modal precarga la cadena vacía y `telefonoSchema.optional()` solo
admite `undefined`. Se introduce `telefonoEdicionSchema`, que acepta el vacío y conserva el rango
7–20 cuando hay valor, y la vista omite el campo del payload, ya que el contrato del backend tampoco
acepta la cadena vacía.

**Mensajes de error reales.** 15 puntos del módulo leían `err.message` de un `AxiosError`, que
también es un `Error`, de modo que el usuario veía "Request failed with status code 409" en lugar del
motivo de negocio. El nuevo helper `mensajeDeError` prefiere el mensaje del envelope canónico
mediante `esRespuestaError`.

**Consistencia de los listados.** Contador de secuencia por store que descarta las respuestas
obsoletas —antes una respuesta lenta sobrescribía una más reciente y la tabla dejaba de corresponder
a los filtros visibles— y debounce de 300 ms que sustituye a una petición por pulsación de tecla.

**Accesibilidad de la navegación.** El menú de perfil solo se cerraba con `onMouseLeave`, inalcanzable
con teclado o en pantalla táctil; el sidebar móvil oculto seguía siendo tabulable. Se añaden cierre
por `Escape` y por puntero externo, `inert` condicionado por `matchMedia`, y los atributos
`aria-expanded`, `aria-controls`, `aria-haspopup` y `aria-current`.

**Protección de la credencial de un solo uso (`HU-SEG-06`).** `Escape` o un clic en el fondo
destruían la clave temporal sin recuperación posible; ahora solo la descarta el botón explícito, y el
fallo del portapapeles se informa en vez de silenciarse.

**Confirmación de guardado (`HU-ADM-05`).** El banner de éxito de configuración nunca llegaba a verse
porque el refresco posterior lo borraba. Se corrige el orden.

**Verificación.** 47/47 pruebas Vitest de frontend (eran 38) con **9 pruebas de regresión nuevas** que
ejercitan el límite exacto de cada defecto; `tsc`, ESLint y `check:no-any` (73 archivos) limpios; los
tres scripts de auditoría del repositorio sin violaciones; y `eslint-plugin-jsx-a11y` ejecutado como
instrumento externo con **0 errores en M17** por primera vez.

**Pendiente declarado.** Quedan abiertos 2 defectos de accesibilidad del Core Kit compartido
(`Modal.tsx` sin trampa de foco, `ProductCard.tsx` sin manejador de teclado), reportados sin tocar
conforme a la Directiva #3, y 2 hallazgos bloqueados por dependencias: la identidad simulada del
panel exige la sesión real de M04, y los KPIs agregados exigen ampliar el contrato de M17.

> **Nota:** la entrega `v0.3.0` (implementación inicial de M17, backend y frontend) no tiene entrada
> propia en este registro. Sus walkthroughs sí están publicados en `docs/walkthroughs/M17/`.

---

## [v0.2.0] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `c5e6492` — `feat(m20-seguridad): implementar la infraestructura de seguridad del frontend`
- **Hito:** 🥇 **Primer feature del sistema.** Primera entrega con código de aplicación, no solo documentación.

### Módulo M20 — Seguridad, Auditoría y Protección de Datos (parcial)

Primer módulo recorrido por el ciclo SDLC formal: Gate 0 → Gate 1 → Gate 2 → Fase 3A → Gate 3B.
M20 es la raíz absoluta del grafo de construcción, de la que dependen los 20 módulos restantes.

**Requerimientos (Gate 1).** 5 historias formalizadas en INVEST con **36 escenarios BDD** trazados
uno a uno a su criterio de aceptación, 15 reglas inmutables (`RN-SEG-01`…`RN-SEG-15`) y los 6
diagramas contractuales transcritos a Mermaid.

**Arquitectura (Gate 2).** Contrato Zod API-First en `.sdlc/docs/contracts/m20-seguridad.contract.ts`
y 4 ADRs. Hallazgo principal: **M20 no requiere ningún cambio de DDL**, porque sus cuatro tablas ya
existían en `bd/sql/schema_pintuclic.sql`. Prisma pasa a mapear ese DDL con `@@map` en lugar de
describir un modelo paralelo incompatible.

**Backend (Fase 3A).** Derivación BCrypt con coste ajustable y verificación en tiempo constante; la
máquina de 8 estados de la sesión con ventana deslizante e invalidación en masa con causa; el
validador central de autorización que resuelve permisos en cada petición; y el manejador global de
errores sin detalle interno. **36 pruebas Vitest.**

**Frontend (Gate 3B, acotado).** Guarda de rutas que conserva el destino pretendido, interceptor
`401`, DTOs transversales de seguridad y traducción de errores sin fugas. La sesión viaja en cookie
`HttpOnly`: ni el cliente HTTP ni el store tocan el identificador. **19 pruebas Vitest.**

**Gobernanza.** Se incorporó `CONSULTATION_BYPASS_PROTOCOL.md` (Mesa de Consulta Acotada) para los
ritos que exigen varios roles a la vez, como la mesa ATDD. Se absorbió el submódulo `.sdlc` en el
repositorio principal y se eliminó el residuo del clon en `backend/` y `frontend/` — que, entre otras
cosas, impedía instalar el frontend por un conflicto de dependencias.

> ⚠️ **Entrega parcial y sin certificar.** Alcance: 5 de 6 historias — **HU-SEG-04 (auditoría) está
> aplazada por el Product Owner**, y con ella `CA-SEG-03-05` queda **NO CUBIERTO**. **Gate 4 (QA) está
> diferido**: M20 está probado unitariamente pero nunca se ha ejecutado contra una sesión real,
> porque no existe login hasta M04. Se certificará junto a M17 y M04.

- 🔗 **Walkthrough:** [walkthroughs/M20/walkthrough_v0.2.0_M20_seguridad_frontend.md](./walkthroughs/M20/walkthrough_v0.2.0_M20_seguridad_frontend.md)

---

## [v0.1.8] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `081066e` — `docs(arquitectura): agregar RUTA_DEL_PROYECTO.md como ruta maestra`
- **Release:** [Release v0.1.8](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.8)

### Documentación y Arquitectura
- **Ruta Maestra del Proyecto:** Adición de [`docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md`](./00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md), formalizando el mapa de 21 módulos (`M01` a `M21`) organizados en 6 olas secuenciales según el contrato oficial del Product Owner.
- **Grafo de Dependencias:** Integración del diagrama Mermaid como contrato vinculante de orden de construcción (`A --> B` indica que B depende estrictamente de A).
- **Inventario de Módulos:** Definición detallada de scopes canónicos (`m[xx]-[nombre-modulo]`), olas de pertenencia, dependencias y estado de especificación funcional.
- **Camino Crítico:** Trazado de la cadena crítica de 9 módulos (`M20 → M17 → M01 → M05 → M21 → M07 → M08 → M09 → M10`).
- **Observaciones Técnicas:** Registro de 4 puntos de atención para decisión del Product Owner (ciclo `M18-M04-M07-M08`, dependencias cruzadas entre Ola 4 y Ola 5, independencia de `M16`, y asignación de estilos por dominio).
- **Gobernanza de Agentes:** Inclusión obligatoria del Paso 0 y Directiva #5.1 en [`AGENTS.md`](../AGENTS.md).
- **Catálogo de Scopes:** Ampliación a 21 scopes modulares en [`GUIA_GIT_COMMITS_Y_PUSH.md`](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md) y actualización de índices en [`docs/README.md`](./README.md).
- **Submódulo SDLC:** Actualización de puntero en `.sdlc`.

---

## [v0.1.7] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `d3a91f9` — `chore(sdlc): actualizar puntero del submodulo a a089113`
- **Release:** [Release v0.1.7](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.7)

### SDLC y Design System
- **Puntero SDLC:** Actualización del puntero del submódulo `.sdlc` al commit `a089113`.
- **Alineación de Diseño:** Reemplazo de paleta hardcodeada en las especificaciones del Design System por los 13 tokens oficiales de `PINTUCLIC_COLORS` definidos en `frontend/src/core/theme/colors.ts`.
- **Tipografía Oficial:** Estandarización de tipografía a Poppins (marca y títulos) e Inter (interfaz y cuerpo).

---

## [v0.1.6] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `9428ab3` — `chore(sdlc): actualizar puntero del submodulo a 5660c39`
- **Release:** [Release v0.1.6](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.6)

### Metodología SDLC
- **Puntero SDLC:** Actualización del puntero del submódulo `.sdlc` al commit `5660c39`.
- **Alineación de Stack Multiagente:** Actualización de 27 archivos de roles, subroles, protocolos y plantillas para reflejar el stack tecnológico de `pintuclic.com`:
  - Kysely sustituido por Prisma 6.
  - Pinia sustituido por Zustand 5.
  - Vue / vue-tsc sustituido por Next.js 15, React 19 y TypeScript (`tsc --noEmit`).

---

## [v0.1.5] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `0602e0e` — `docs(gobernanza): establecer reglas globales de nomenclatura de commits`
- **Release:** [Release v0.1.5](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.5)

### Gobernanza y Flujo Git
- **Fuente Única de Verdad para Commits:** Publicación de [`GUIA_GIT_COMMITS_Y_PUSH.md`](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md).
- **Regla de Oro:** El tipo `feat` exige estrictamente una Historia de Usuario verificable end-to-end (`HU-XXX-NN`).
- **Convenciones de Commits:** Estandarización de 12 tipos permitidos, árbol de decisión Mermaid, catálogo de scopes canónicos y tabla de antipatrones.
- **Formato Canónico:** Distinción estricta entre commits (`tipo(scope): descripcion`) y títulos de Pull Request (`tipo(scope) [X.Y.Z.W]: mensaje`).
- **Alineación Documental:** Actualización de Directiva #7 en [`AGENTS.md`](../AGENTS.md), sección de commits en [`CONTRIBUTING.md`](../CONTRIBUTING.md) y corrección de referencias en [`docs/README.md`](./README.md).

---

## [v0.1.4] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `c8ba780` — `docs(arquitectura): agregar seccion QA tooling en ARQUITECTURA_GENERAL.md`
- **Release:** [Release v0.1.4](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.4)

### Calidad y Pruebas (QA)
- **Arsenal de QA:** Integración de la Sección 5 "Capa de Calidad y Testing (QA)" en [`ARQUITECTURA_GENERAL.md`](./00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_GENERAL.md).
- **Herramientas de Validación:** Especificación de Vitest (unitarias e integración), Bruno (contratos de API REST), Playwright (flujos E2E), axe-core (accesibilidad a11y), k6 (pruebas de carga) y OWASP ZAP (seguridad DAST).
- **Scripts de Análisis Estático:** Inventario de validaciones AST en `.sdlc/tooling/`.
- **Gobernanza QA Lead:** Definición de los 4 Pilares del Arsenal QA y facultades de veto técnico sin corrección directa.

---

## [v0.1.3] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `ac6d075` — `chore(sdlc): actualizar puntero del submodulo .sdlc`
- **Release:** [Release v0.1.3](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.3)

### Metodología SDLC
- **Puntero SDLC:** Actualización del puntero del submódulo `.sdlc` al commit `c8ea314`.
- **Blindaje DevOps:** Delimitación estricta del dominio DevOps, eliminación del subrol de GitHub Projects y corrección de validaciones de compilación con `tsc`.

---

## [v0.1.2] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `8e0ae18` — `docs(root): refactorizar AGENTS.md, CONTRIBUTING.md y DEPLOY.md para SDLC`
- **Release:** [Release v0.1.2](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.2)

### Documentación Raíz
- **AGENTS.md:** Banner de entrada obligatorio con protocolo de aterrizaje, corrección del stack hacia Express 5 + Prisma 6 + Next.js 15, y actualización obligatoria de artefactos SDLC en el Paso 10.
- **CONTRIBUTING.md:** Integración formal del flujo Git Flow con compuertas de calidad Stage-Gates y versionamiento semántico.
- **DEPLOY.md:** Actualización de directivas de despliegue a Next.js 15, variables de entorno (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`), repositorio oficial y compuerta Gate 4 como prerrequisito de producción.

---

## [v0.1.1] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `3662350` — `chore(sdlc): update submodule to pintuclic.com-adapted version`
- **Release:** [Release v0.1.1](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.1)

### SDLC Multiagente
- **Adaptación a pintuclic.com:** Sincronización del submódulo `.sdlc` al commit `a36f3bd`.
- **Fuentes de Verdad:** Incorporación de `PINTUCLIC_CONTEXT.md` y enlaces directos a las especificaciones en `docs/` y base de datos en `bd/`.
- **Mapeo de Módulos:** Registro de los módulos M01 a M20 en el estado inicial del orquestador.

---

## [v0.1.0] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `2f029b7` — `feat: add full project structure (backend, frontend, bd, docs)`
- **Release:** [Release v0.1.0](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.0)

### Estructura Inicial del Proyecto
- **Backend:** Configuración inicial de la API modular en Node.js, Express 5, TypeScript, Prisma 6, Zod, JWT, BCrypt, Vitest y Nodemailer.
- **Frontend:** Estructura modular en Next.js 15 (App Router), React 19, Tailwind CSS 4 y Zustand 5.
- **Base de Datos:** DDL SQL (`schema_pintuclic.sql`), datos semilla de prueba (`seed_pintuclic.sql`) y diagramas entidad-relación en `bd/`.
- **Documentación Centralizada:** Arquitectura de software, especificaciones funcionales modulares, políticas de seguridad transversales y plantillas de control de calidad.

---

## [v0.0.3] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `8eaa3ce` — `chore: add multiagent-sdlc-starter as git submodule`
- **Release:** [Release v0.0.3](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.0.3)

### Infraestructura SDLC
- **Submódulo Multiagente:** Integración del repositorio `multiagent-sdlc-starter` como submódulo Git en `.sdlc/` para la gestión ágil y gobernanza asistida por IA.

---

## [v0.0.2] - 2026-10-20
- **Autor:** one-centavo (@one-centavo)
- **Commit:** `3ba9b03` — `ci(github): configure semantic release workflow and dependabot`
- **Release:** [Release v0.0.2](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.0.2)

### CI/CD Inicial
- **Automatización de Releases:** Creación de `.github/workflows/release.yml` para etiquetado semántico y generación automática de GitHub Releases (`mathieudutour/github-tag-action@v7`).
- **Seguridad y Dependencias:** Configuración de `.github/dependabot.yml` para monitoreo de vulnerabilidades y dependencias en GitHub Actions y paquetes npm.
