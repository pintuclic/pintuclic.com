# WALKTHROUGH DE IMPLEMENTACIÓN — CAPA FRONTEND

> **Módulo:** `M20 — Seguridad, Auditoría y Protección de Datos` (infraestructura Core Kit)
> **Versión de la entrega:** `v0.3.2`
> **Fecha:** 2026-10-21
> **Autor / Responsable:** Jorge Alejandro Peña Motta (@DanExl24)
> **Apoyo de IA:** Claude Opus 5 (Claude Code) — asistencia en revisión e implementación, nunca como autor.
> **Naturaleza:** Remediación de los 2 defectos de accesibilidad del Core Kit compartido elevados al Director Humano en `v0.3.1`.

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

| Campo | Valor |
| :--- | :--- |
| Ola | 1 (Seguridad y Administración) |
| Capa | Frontend (Next.js 15 + React 19) |
| Alcance | `frontend/src/core/components/` (Core Kit compartido) |
| Archivos creados | 2 |
| Archivos modificados | 3 |
| Tests Vitest frontend | 57/57 PASS (9 suites) — eran 47 |
| Tests Vitest backend | 68/68 PASS — sin afectación |
| Total automatizado | **125/125 PASS** — eran 115 |

### Ubicación de esta entrega (por qué M20 y no M17)

Los defectos fueron **reportados** por la revisión de pares de M17, pero los archivos corregidos
viven en `frontend/src/core/`, que es entregable de infraestructura frontend de **M20** según el
semáforo de `PROJECT_STATUS.md` ("Frontend M20 — infraestructura core y tokens"). M17 es consumidor
del Core Kit, no su propietario.

### Autorización del alcance (Directivas #1 y #3)

Estos 2 defectos viven **fuera** de `m17-permisos` y por eso `v0.3.1` los reportó sin tocarlos.
Esta entrega los corrige bajo tres habilitantes concurrentes:

1. **Instrucción explícita del Director Humano** de corregirlos (2026-10-21).
2. **Ticket técnico emitido por QA** en `.sdlc/docs/qa/M17/v0.3.1/QA_REPORT.md` §4.1, que asigna
   formalmente el defecto de `Modal.tsx` al custodio del Core Kit: `04_frontend_engineer`.
3. **Elevación previa registrada** en el WORKLOG de `04_frontend_engineer`, conforme a la Directiva #3.

---

## 2. DEFECTOS REMEDIADOS

### 2.1 `Modal.tsx` — diálogo sin nombre accesible ni gestión de foco

**Síntoma verificado.** El contenedor declaraba `role="dialog"` y `aria-modal="true"` pero:

- **Sin nombre accesible:** ningún `aria-labelledby`, de modo que un lector de pantalla anunciaba
  un diálogo anónimo aunque el modal tuviera título visible. Incumple WCAG 2.2 — 4.1.2.
- **Sin foco inicial:** al abrir, el foco permanecía en el disparador detrás del fondo. El usuario
  de teclado tenía que tabular a ciegas hasta entrar en el diálogo.
- **Sin retorno de foco:** al cerrar, el foco caía al `<body>` y la navegación por teclado se
  reiniciaba desde el principio del documento. Incumple WCAG 2.2 — 2.4.3.
- **Sin trampa de foco:** `Tab` desde el último control salía del diálogo hacia la página de detrás,
  que seguía siendo tabulable bajo el fondo opaco. Incumple WCAG 2.2 — 2.1.2.
- **Defecto adicional detectado durante la corrección:** `role="dialog"` estaba sobre el **fondo**
  (el `div` del *backdrop*), no sobre el panel. La región del diálogo abarcaba por tanto toda la
  pantalla, incluido el área decorativa exterior.

**Corrección.**

1. `role="dialog"`, `aria-modal`, `tabIndex={-1}` y los atributos de etiquetado se trasladan al
   **panel**; el fondo queda como contenedor puramente decorativo.
2. `useId()` genera los identificadores del título y del subtítulo. El panel referencia
   `aria-labelledby` cuando hay `title` y `aria-describedby` cuando hay `subtitle`.
3. Nueva prop opcional `ariaLabel` para los modales que se abran **sin** `title`, de modo que el
   diálogo nunca quede sin nombre. Los 7 consumidores actuales pasan `title`, así que ninguno
   requirió cambios.
4. Foco inicial sobre el primer elemento focalizable del panel, o sobre el panel mismo si no hay
   ninguno.
5. Retorno del foco al elemento que abrió el diálogo, capturado en la apertura.
6. Trampa de foco cíclica en `Tab` / `Shift+Tab`, delegada al helper puro `foco.ts`.
7. **Dos efectos separados a propósito:** el de apertura depende solo de `isOpen`; el de escucha de
   teclado y puntero depende además de `onClose`. Unificarlos haría que recrear `onClose` en el
   componente padre —lo habitual con una función en línea— volviese a ejecutar el foco inicial en
   cada render y le robase el foco al usuario mientras escribe.
8. El cierre por clic exterior pasa de un `onClick` en el fondo a un escucha de `pointerdown` en
   `document` que compara contra el panel. Es el mismo patrón que `AdminLayout.tsx` ya usaba en
   `v0.3.1`, y elimina la causa raíz del error de lint: el contenedor decorativo deja de necesitar
   semántica interactiva.

**Compatibilidad preservada.** `CrearEmpleadoModal` protege la credencial de un solo uso mediante
`onClose={credencialVisible ? cierreIgnorado : handleCerrar}` y `closeOnOutsideClick={!credencialVisible}`.
Ambos caminos siguen neutralizados con la nueva implementación: `Escape` sigue cayendo en el no-op y
el puntero exterior sigue bloqueado por la bandera. La protección de `HU-SEG-06` no se degrada.

### 2.2 `ProductCard.tsx` — encabezado interactivo sin teclado

**Síntoma verificado.** El `<h3>` del nombre del producto llevaba `onClick` y `cursor-pointer` sin
`onKeyDown`, `tabIndex` ni `role`: la acción "ver producto" era inalcanzable por teclado y el
elemento no aparecía en el orden de tabulación. Incumple WCAG 2.2 — 2.1.1.

**Corrección.** El encabezado conserva su semántica de `<h3>` y la acción se delega a un `<button>`
real en su interior, que obtiene `Enter`, `Espacio`, foco y anuncio de rol de forma nativa. Cuando
`onViewDetails` no se provee, se renderiza un `<span>` sin afordancia falsa en lugar de un botón
inerte. El recorte a dos líneas (`line-clamp-2`) se reubica sobre el nodo que contiene el texto para
no alterar la altura de la tarjeta.

---

## 3. CIERRE DE LA COMPUERTA DE ACCESIBILIDAD

`v0.3.1` dejó `npm run lint:a11y` acotado a `src/app` y `src/modules`, excluyendo `src/core`
**porque sus 2 violaciones habrían dejado el lint en rojo para todo el equipo**. Cerrados los
defectos, el alcance se amplía a `src/core`:

| | Alcance de `lint:a11y` |
| :--- | :--- |
| Antes | `eslint src/app src/modules --max-warnings=0` |
| Después | `eslint src/app src/core src/modules --max-warnings=0` |

La compuerta cubre ahora todo el frontend, de modo que una reaparición de cualquiera de los 2
defectos rompe la verificación en lugar de pasar inadvertida.

> **Pendiente que NO cambia:** integrar las 8 reglas en `frontend/eslint.config.mjs` para que
> `npm run lint` las aplique de forma nativa sigue bloqueado por el hook de protección de
> configuración del entorno. El script dedicado continúa siendo el instrumento.

---

## 4. MÉTRICAS DE CALIDAD

| Instrumento | Resultado |
| :--- | :--- |
| `eslint-plugin-jsx-a11y` sobre `src/core` — **antes** | ❌ **2 errores** (`Modal.tsx:70`, `ProductCard.tsx:88`) |
| `eslint-plugin-jsx-a11y` sobre `src/app src/core src/modules` — **después** | ✅ **0 errores** |
| Vitest frontend | ✅ **57/57 PASS** (9 suites) — 10 pruebas nuevas |
| Vitest backend | ✅ 68/68 PASS (12 suites) — sin afectación |
| TypeScript `tsc --noEmit` | ✅ 0 errores |
| ESLint `next lint --max-warnings=0` | ✅ 0 errores, 0 advertencias |
| `check:no-any` | ✅ 75 archivos, 0 usos de `any` |
| `audit-a11y.mjs` | ✅ 0 violaciones |
| `audit-core-kit.mjs` | ✅ 0 violaciones |
| `audit-zod-chains.mjs` | ✅ 0 violaciones |

### 4.1 Alcance real de las pruebas — declaración explícita

El proyecto **no tiene `jsdom` ni Testing Library instalados** y `vitest.config.ts` corre en
`environment: 'node'`. No es posible, sin ampliar las dependencias del proyecto, escribir una prueba
que monte el `Modal` y compruebe el movimiento del foco en un DOM real.

En consecuencia, la cobertura de esta entrega se reparte así, **sin sobre-afirmar**:

- **Cubierto por 10 pruebas unitarias** (`src/core/tests/foco.test.ts`): el contrato completo del
  recorrido de la trampa de foco — el ciclo al pulsar `Tab` en el último elemento, el ciclo inverso
  con `Shift+Tab` en el primero, la entrada desde fuera en ambos sentidos, el contenedor vacío y el
  caso de un único elemento focalizable.
- **Cubierto por el instrumento externo** (`jsx-a11y`, de 2 errores a 0): la ausencia de manejador de
  teclado en elementos no interactivos, que es la forma verificable de ambos defectos.
- **Verificado por inspección, NO por prueba automatizada:** el cableado DOM de `querySelectorAll`,
  la llamada efectiva a `focus()` en la apertura, el retorno del foco al cerrar y la resolución de
  `aria-labelledby` por parte de un lector de pantalla.

**Recomendación al equipo:** incorporar `jsdom` y `@testing-library/react` como dependencias de
desarrollo para cerrar esa última brecha. Es un cambio de dependencias del proyecto y por tanto
excede el alcance autorizado de esta remediación.

---

## 5. REGISTRO DE ARCHIVOS

### Creados (2)

| Archivo | Propósito |
| :--- | :--- |
| `frontend/src/core/components/overlays/foco.ts` | Selector de focalizables y recorrido puro de la trampa de foco |
| `frontend/src/core/tests/foco.test.ts` | 10 pruebas del contrato de recorrido del foco |

### Modificados (3)

| Archivo | Cambio |
| :--- | :--- |
| `frontend/src/core/components/overlays/Modal.tsx` | `role="dialog"` al panel; `aria-labelledby` / `aria-describedby` / `ariaLabel`; foco inicial; retorno de foco; trampa de foco; cierre exterior por `pointerdown` |
| `frontend/src/core/components/data-display/ProductCard.tsx` | El encabezado delega la acción a un `<button>` real; `line-clamp-2` reubicado |
| `frontend/package.json` | `lint:a11y` amplía su alcance a `src/core` |

### Dependencias externas

**Consume:** nada nuevo. No se añadieron dependencias de producción ni de desarrollo.
**Habilita:** retira la deuda de accesibilidad que bloqueaba el cierre del Core Kit y que afectaba
transversalmente a los 7 modales de M17. Todo módulo futuro que use `Modal` o `ProductCard`
—señaladamente **M04** (cuentas y autenticación) y **M01** (catálogo)— hereda la gestión de foco
conforme sin trabajo adicional.
**No modifica** ningún archivo de `frontend/src/modules/`, ni del backend, ni de la base de datos.

---

## 6. DICTAMEN

Los 2 defectos elevados en `v0.3.1` quedan cerrados y la compuerta de accesibilidad se amplía para
impedir su reaparición. Se corrigió además un tercer defecto no reportado: el `role="dialog"` estaba
sobre el fondo decorativo en lugar del panel.

**No se declara ninguna compuerta aprobada.** La certificación de Gate 4 es potestad exclusiva del
QA Lead; esta entrega es trabajo de implementación y su alcance termina en este walkthrough y el
commit correspondiente. Queda explícitamente declarado en §4.1 qué parte del comportamiento **no**
está cubierta por pruebas automatizadas, para que QA decida si esa brecha es aceptable.
