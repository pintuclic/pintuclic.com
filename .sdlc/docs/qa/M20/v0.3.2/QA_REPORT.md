# 🧪 REPORTE MODULAR DE QA Y AUDITORÍA DE SEGURIDAD

> **Módulo Auditado:** `M20 — Seguridad, Auditoría y Protección de Datos` (Infraestructura Frontend Core Kit)  
> **Versión Evaluada:** `v0.3.2` (Remediación de Accesibilidad del Core Kit Compartido)  
> **Fecha de Certificación:** 2026-10-21  
> **Auditor Responsable:** QA Lead & Security Compliance Director (`05_qa_security_tester`)  
> **Estado de la Compuerta:** 🟢 **APROBADO Y CERTIFICADO — EXCELENCIA TÉCNICA Y ACCESIBILIDAD WCAG 2.2**  

---

## 1. Ficha de Auditoría Técnica y Contexto de Gobernanza

* **Agente Evaluado:** Jorge Alejandro Peña Motta (@DanExl24) — Frontend Engineer (Asistencia: Claude Opus 5).
* **Insumo de Verificación:** [`docs/walkthroughs/M20/walkthrough_v0.3.2_M20_remediacion_accesibilidad_core_kit_frontend.md`](file:///c:/Users/alejo/Downloads/proyectos-dev/pintuclic.com/docs/walkthroughs/M20/walkthrough_v0.3.2_M20_remediacion_accesibilidad_core_kit_frontend.md).
* **Naturaleza del Cambio:** Remediación técnica y estructural de los 2 defectos de accesibilidad del Core Kit compartido detectados y elevados en `v0.3.1` (`Modal.tsx` y `ProductCard.tsx`), más la ampliación de la compuerta de accesibilidad estricta a todo el árbol de `src/core`.
* **Asignación y Aislamiento de Alcance (Directivas #1, #2 y #3):**
  * Los componentes del Core Kit compartido (`frontend/src/core/components/`) pertenecen contractualmente a la infraestructura frontend de **M20** según el semáforo rector de `PROJECT_STATUS.md`. M17 es un consumidor de estos componentes y carece de potestad para mutar el núcleo compartido sin autorización.
  * La intervención cuenta con triple habilitación formal:
    1. Instrucción directa del Director Humano (2026-10-21).
    2. Asignación técnica formal emitida por QA en `.sdlc/docs/qa/M17/v0.3.1/QA_REPORT.md` §4.1 al custodio del Core Kit (`04_frontend_engineer`).
    3. Elevación registrada en bitácoras de trabajo conforme a la Directiva #3.
* **Archivos Modificados:** 3 (`Modal.tsx`, `ProductCard.tsx`, `frontend/package.json`).
* **Archivos Creados:** 2 (`foco.ts`, `foco.test.ts`).

---

## 2. Resumen Consolidado de Pruebas y Batería de Gobernanza

El equipo de QA ejecutó de manera determinista e independiente la batería completa de verificación en el entorno local:

| Instrumento / Quality Gate | Cuadrante Ágil | Objetivo de Verificación | Resultado Obtenido | Observaciones |
| :--- | :---: | :--- | :---: | :--- |
| **Vitest Frontend** | **Q1 / Q2** | Stores, DTOs, regresiones y contrato de foco | **✅ 57/57 tests PASS** (9 suites) | +10 tests unitarios nuevos en `foco.test.ts` |
| **Vitest Backend** | **Q1** | Lógica de dominio, autenticación y base de datos | **✅ 68/68 tests PASS** (12 suites) | Cero afectación o regresión |
| **Total Tests Automatizados** | **Q1 / Q2** | Batería global del monorepo | **✅ 125/125 tests PASS** | Suites 100% limpias |
| **ESLint JSX-A11Y (`lint:a11y`)** | **Q2 / Q3** | Reglas de accesibilidad en `app`, `core` y `modules` | **✅ 0 errores, 0 warnings** | Revertida exclusión de `src/core` (de 2 errores a 0) |
| **Auditoría AST Cero ANY** | **Q4** | Verificador estricto `check:no-any` | **✅ 75 archivos PASS** (0 ANYs) | Frontend 100% fuertemente tipado |
| **TypeScript Strict (`tsc --noEmit`)** | **Q1** | Chequeo estricto de tipos en frontend | **✅ 0 errores** | Sin aserciones forzadas ni hacks |
| **ESLint Frontend (`next lint`)** | **Q1** | Conformidad con reglas oficiales Next.js | **✅ 0 errores, 0 warnings** | Conforme con `max-warnings=0` |
| **Auditoría Core Kit (Directiva #13)** | **Q3** | Inspección de elementos HTML nativos sin envoltorio | **✅ 0 violaciones** (13 archivos) | Verificado por `audit-core-kit.mjs` |
| **Auditoría Cadenas Zod (Anti-Bypass)**| **Q1** | Orden de sanitización `.trim().min()` | **✅ 0 violaciones** (14 archivos) | Verificado por `audit-zod-chains.mjs` |
| **Auditoría A11y (WCAG 2.1 AA)** | **Q2 / Q3** | Escaneo semántico estático | **✅ 0 violaciones** (28 archivos) | Verificado por `audit-a11y.mjs` |

---

## 3. Análisis Forense de los Defectos Remediados

### 3.1 `Modal.tsx` — Reestructuración Semántica y Trampa de Foco Cíclica (WCAG 2.2 — 2.1.2, 2.4.3, 4.1.2)
* **Defectos previos constatados:**
  1. *Región del diálogo desubicada:* `role="dialog"` y `aria-modal="true"` estaban colocados sobre el contenedor del fondo (*backdrop*), abarcando toda la pantalla y disparando violaciones de elementos no interactivos en ESLint.
  2. *Diálogo anónimo:* No existía vinculación accesible (`aria-labelledby`), anunciando un diálogo genérico en lectores de pantalla.
  3. *Pérdida de foco:* Al abrir, el foco permanecía en el disparador detrás del backdrop; al cerrar, el foco caía al `<body>`, perdiendo la posición de navegación por teclado.
  4. *Fuga de foco (Tab trapping inexistente):* Al tabular en el último control interactivo, el foco salía a la página de fondo.
* **Solución técnica auditada:**
  * Traslado de `role="dialog"`, `aria-modal="true"`, `tabIndex={-1}`, `aria-labelledby` y `aria-describedby` exclusivamente al contenedor del **panel** (`panelRef`).
  * Generación determinista de identificadores con `useId()` (`idTitulo`, `idSubtitulo`) y provisión de prop `ariaLabel` para modales sin título.
  * Módulo utilitario puro `frontend/src/core/components/overlays/foco.ts`: define `SELECTOR_FOCALIZABLES` y la función pura `siguienteIndiceDeFoco`, asegurando el ciclado de `Tab` (del último al primero) y `Shift+Tab` (del primero al último).
  * Desacoplamiento de hooks de efecto:
    * Efecto 1: apertura/cierre, bloqueo de scroll (`overflow: hidden`), captura de `elementoPrevio` y foco inicial en el primer elemento focalizable (o en el panel si no hay ninguno). Retorno de foco garantizado en la función de limpieza.
    * Efecto 2: listeners de eventos (`keydown` para `Escape` y `Tab`, y `pointerdown` en `document` para clic exterior), evitando re-ejecutar el foco inicial ante re-renders del componente padre.
  * **Blindaje de Credencial Temporal (`HU-SEG-06`):** Se comprobó que `CrearEmpleadoModal` mantiene la inmunidad contra cierres accidentales mediante `closeOnOutsideClick={!credencialVisible}` y `onClose={credencialVisible ? cierreIgnorado : handleCerrar}`.
* **Verificación QA:** 10 pruebas unitarias en `src/core/tests/foco.test.ts` cubren todas las ramas y casos de borde del ciclo de tabulación. `lint:a11y` sobre `Modal.tsx` pasa limpio.

### 3.2 `ProductCard.tsx` — Navegabilidad por Teclado en Acciones de Tarjeta (WCAG 2.2 — 2.1.1)
* **Defecto previo constatado:** El encabezado `<h3>` poseía `onClick` y `cursor-pointer` sin semántica de botón ni manejador de teclado (`onKeyDown`), siendo inalcanzable para usuarios de navegación por teclado.
* **Solución técnica auditada:** 
  * Se conserva la semántica de encabezado estructural `<h3>`.
  * La acción se delega a un elemento nativo `<button type="button">` que recibe foco natural en el flujo de tabulación y reacciona de forma nativa a las teclas `Enter` y `Espacio`.
  * Si `onViewDetails` es nulo/indefinido, se renderiza un `<span>` estático sin apariencia interactiva ni botón inerte.
* **Verificación QA:** `jsx-a11y` pasa de 1 violación a 0 violaciones en este archivo.

### 3.3 Extensión del Alcance de la Compuerta `lint:a11y`
* **Defecto previo:** En `v0.3.1`, `lint:a11y` debió acotarse a `src/app src/modules` para no bloquear el pipeline por los 2 fallos de `src/core`.
* **Solución técnica auditada:** Al subsanarse la causa raíz en `Modal.tsx` y `ProductCard.tsx`, el script en `frontend/package.json` fue actualizado a:
  ```json
  "lint:a11y": "eslint src/app src/core src/modules --max-warnings=0 --rule \"...\""
  ```
  La compuerta protege ahora todo el código fuente del frontend contra regresiones de accesibilidad.

---

## 4. Transparencia Radical: Brechas de Prueba Declaradas

Conforme a la Regla de Oro #8 (Transparencia Radical) y los mandatos del QA Lead:

1. **Entorno de Pruebas Node sin JSDOM:**
   * El proyecto frontend corre Vitest con `environment: 'node'` y no cuenta con `@testing-library/react` ni `jsdom` en sus dependencias.
   * Por consiguiente, la conexión de eventos DOM (`addEventListener`, `focus()`, `contains()`) fue validada mediante **auditoría estática de AST (`jsx-a11y`), revisión forense de código y análisis manual**, mientras que el algoritmo de orden de foco quedó cubierto al 100% mediante las pruebas de `foco.test.ts`.
   * **Recomendación para próximas fases:** Evaluar en mesa técnica la incorporación de `jsdom` y `@testing-library/react` como dependencias de desarrollo para pruebas de integración de componentes React.
2. **Protección de Configuración de ESLint:**
   * La integración nativa de las reglas de accesibilidad dentro de `frontend/eslint.config.mjs` permanece restringida por las políticas del entorno; el script `npm run lint:a11y` opera satisfactoriamente como compuerta de aseguramiento.

---

## 5. Dictamen Final de Certificación

* **Veredicto:** 🟢 **APROBADO Y RATIFICADO (Gate 4A - Mantenimiento de Infraestructura)**.
* **Impacto en el Ecosistema:**
  * La deuda técnica de accesibilidad del Core Kit queda formalmente cerrada.
  * Los 7 modales existentes de `M17` heredan inmediatamente la trampa de foco y accesibilidad sin necesidad de alterar su código interno.
  * Se despeja el camino para la construcción de **M04 (Cuentas, Autenticación y Perfil)** y **M01 (Catálogo)** sobre componentes base conformes y robustos.
