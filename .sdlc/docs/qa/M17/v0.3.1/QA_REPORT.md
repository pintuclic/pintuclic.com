# 🧪 REPORTE MODULAR DE QA Y AUDITORÍA DE SEGURIDAD

> **Módulo Auditado:** `M17 — Administración, Empleados y Permisos`  
> **Versión Evaluada:** `v0.3.1` (Remediación Quirúrgica Frontend)  
> **Fecha de Certificación:** 2026-10-21  
> **Auditor Responsable:** QA Lead & Security Compliance Director (Fase 4 — QA)  
> **Estado de la Compuerta:** 🟢 **APROBADO Y CERTIFICADO — EXCELENCIA TÉCNICA**  

---

## 1. Ficha de Auditoría Técnica y Alcance de la Entrega

* **Agente Evaluado:** Jorge Alejandro Peña Motta (@DanExl24) — Frontend Engineer.
* **Insumo de Verificación:** [`docs/walkthroughs/M17/walkthrough_v0.3.1_M17_remediacion_hallazgos_revision_pares_frontend.md`](file:///c:/Users/alejo/Downloads/proyectos-dev/pintuclic.com/docs/walkthroughs/M17/walkthrough_v0.3.1_M17_remediacion_hallazgos_revision_pares_frontend.md).
* **Naturaleza del Cambio:** Remediación quirúrgica de los defectos identificados en la revisión de pares de `v0.3.0`, cerrando 6 hallazgos de comportamiento de borde que no eran detectables por análisis estático pasivo.
* **Aislamiento de Módulo (Directiva #1 y #2):** Conforme al 100%. Las modificaciones residen exclusivamente en `frontend/src/modules/m17-permisos/` (2 archivos creados, 9 modificados). Ningún archivo compartido fue alterado indebidamente.

---

## 2. Resumen Consolidado de Pruebas y Batería de Gobernanza

El equipo de QA ejecutó directamente la batería completa de verificación determinista en el entorno local:

| Instrumento / Quality Gate | Cuadrante Ágil | Objetivo de Verificación | Resultado Obtenido | Observaciones |
| :--- | :---: | :--- | :---: | :--- |
| **Vitest Frontend** | **Q1 / Q2** | Esquemas Zod 4, Stores Zustand y Regresiones QA | **✅ 47/47 tests PASS** (8 suites) | +9 pruebas nuevas de regresión en `regresiones-qa.test.ts` |
| **Vitest Backend** | **Q1** | Lógica de dominio, adaptadores DB y rutas REST | **✅ 68/68 tests PASS** (12 suites) | 32 tests específicos de M17 sin afectación |
| **Total Tests Automatizados** | **Q1 / Q2** | Suite global combinada | **✅ 115/115 tests PASS** | Cero regresiones introducidas |
| **Auditoría AST Cero ANY** | **Q4** | Eliminación del tipo `any` (`check:no-any`) | **✅ 140 archivos PASS** (0 ANYs) | Frontend (73 archivos), Backend (67 archivos) |
| **Validación de Contratos Zod** | **Q1** | Envelopes canónicos, request/response DTOs | **✅ 12/12 validaciones PASS** | Contratos tipados y blindados en `docs/contracts/` |
| **TypeScript Strict (Frontend)** | **Q1** | Compilación estricta Next.js 15 `tsc --noEmit` | **✅ 0 errores** | Tipado fuerte e inferencia Zod sin atajos |
| **TypeScript Strict (Backend)** | **Q1** | Compilación estricta Express 5 `tsc --noEmit` | **✅ 0 errores** | Conforme con Prisma 6 |
| **ESLint Frontend (`next lint`)** | **Q1** | Reglas de estilo, hooks y Core Web Vitals | **✅ 0 errores, 0 warnings** | Conforme con `max-warnings=0` |
| **ESLint Backend (`eslint src`)** | **Q1** | Buenas prácticas y variables sin uso | **✅ 0 errores, 0 warnings** | Conforme |
| **Auditoría Core Kit (Directiva #13)** | **Q3** | Uso estricto de componentes canónicos | **✅ 0 violaciones** (13 archivos) | Verificado por `audit-core-kit.mjs` |
| **Auditoría Cadenas Zod (Anti-Bypass)**| **Q1** | Orden de sanitización `.trim().min()` | **✅ 0 violaciones** (14 archivos) | Verificado por `audit-zod-chains.mjs` |
| **Auditoría A11y (WCAG 2.1 AA)** | **Q2 / Q3** | Accesibilidad estática y semántica HTML | **✅ 0 violaciones** (28 archivos) | Verificado por `audit-a11y.mjs` |

---

## 3. Análisis Forense de los 6 Defectos Remediados

### 3.1 Edición de colaborador con `telefono: null` o vacío (`HU-ADM-01`)
* **Problema anterior:** El modal precargaba `empleado.telefono || ''`. Con `telefonoSchema.optional()`, la cadena vacía no era `undefined` y fallaba la longitud mínima de 7 caracteres, impidiendo guardar cualquier cambio (incluso si solo se editaba el nombre).
* **Solución auditada:** Creación de `telefonoEdicionSchema` en `dtos/empleados.dto.ts` usando `.refine((valor) => valor === '' || valor.length >= 7)`. El modal omite `telefono` si llega vacío (`telefono: data.telefono?.trim() ? data.telefono.trim() : undefined`), respetando el contrato del backend.
* **Verificación QA:** Test unitario en `regresiones-qa.test.ts` línea 25 (`acepta el teléfono vacío de un colaborador con telefono null`) pasando ✅.

### 3.2 Preservación de mensajes de error de la API (`HU-CUE-08` / `HU-ADM-03`)
* **Problema anterior:** 15 llamadas capturaban con `err instanceof Error ? err.message : '...'`. Al ser `AxiosError` una instancia de `Error`, el usuario recibía mensajes genéricos ("Request failed with status code 409") en vez del detalle real (e.g. "El correo ya está registrado").
* **Solución auditada:** Creación del servicio desacoplado `mensajeDeError(err, respaldo)` en `services/mensaje-error.ts`, que inspecciona el cuerpo mediante `esRespuestaError` de `core/api/apiClient`. Aplicado en los 3 stores (`empleadosStore.ts`, `clientesStore.ts`, `configuracionStore.ts`) y componentes con captura propia.
* **Verificación QA:** Tests unitarios en `regresiones-qa.test.ts` líneas 48-84 probando envelope de dominio, respaldo ante error 500, Error nativo y valores no-Error pasando ✅.

### 3.3 Mitigación de Race Conditions y Debounce en Listados (`HU-ADM-01` / `HU-ADM-04`)
* **Problema anterior:** Filtrar, paginar o teclear en los buscadores disparaba peticiones asíncronas concurrentes sin control de secuencia. Una respuesta lenta anterior podía sobrescribir una búsqueda más reciente. Además, se emitía una llamada por cada pulsación de tecla.
* **Solución auditada:** 
  1. Contador de secuencia monotónico (`peticionBusquedaActiva` en `clientesStore.ts` y `peticionListadoActiva` en `empleadosStore.ts`). Si el ID de petición ya no coincide al resolverse la promesa, la respuesta se descarta limpiamente (`if (idPeticion !== peticionBusquedaActiva) return;`).
  2. Estado local desacoplado (`terminoLocal`, `busquedaLocal`) con debounce de 300 ms en `ClientesTable.tsx` y `EmpleadosTable.tsx`.
* **Verificación QA:** Inspección de código y validación de debounce en UI pasando ✅.

### 3.4 Confirmación de guardado de parámetros visible (`HU-ADM-05`)
* **Problema anterior:** `guardarParametro` en `configuracionStore.ts` fijaba `exitoMensaje` antes de invocar `cargarParametros()`. Al arrancar, `cargarParametros` reseteaba el mensaje a `null`, destruyendo el banner de confirmación antes del renderizado.
* **Solución auditada:** El refresco del catálogo se ejecuta antes de emitir el mensaje de éxito. Si el refresco falla, se notifica el fallo en lugar de un éxito engañoso sobre una vista desactualizada.
* **Verificación QA:** Test unitario en `regresiones-qa.test.ts` línea 86 (`conserva el mensaje de éxito después del refresco del catálogo`) pasando ✅.

### 3.5 Accesibilidad Integral en Navegación Administrativa (`AdminLayout.tsx`)
* **Problema anterior:** El dropdown de perfil solo cerraba con `onMouseLeave` (inoperable por teclado o touch); el sidebar móvil fuera de pantalla permanecía en el orden de tabulación (`Tab` saltaba a elementos invisibles); faltaban atributos ARIA y `aria-current`.
* **Solución auditada:**
  1. Manejador de tecla `Escape` global y puntero fuera del menú (`pointerdown` sobre `document`).
  2. Detección de viewport móvil con `window.matchMedia('(min-width: 1024px)')` y aplicación del atributo `inert={!esEscritorio && !sidebarOpen}` al sidebar cuando está oculto.
  3. Atributos ARIA añadidos: `aria-expanded`, `aria-controls="admin-sidebar"`, `aria-haspopup="true"`, `aria-controls="admin-menu-perfil"`, y `aria-current={active ? 'page' : undefined}` en los enlaces activos.
* **Verificación QA:** `audit-a11y.mjs` y escáner de atributos ARIA pasando ✅.

### 3.6 Blindaje de Credencial Temporal de Un Solo Uso (`HU-SEG-06`)
* **Problema anterior:** En `CrearEmpleadoModal.tsx`, mientras se mostraba la contraseña temporal, pulsar `Escape` o hacer clic en el fondo cerraba el modal y ejecutaba `limpiarCredencialTemporal()`, destruyéndola irreversiblemente. Si `navigator.clipboard.writeText` fallaba, el error se silenciaba.
* **Solución auditada:**
  1. Cuando `credencialTemporalGenerada !== null`, `onClose` asigna un handler no-op (`cierreIgnorado`) y `closeOnOutsideClick={false}`. El diálogo solo puede cerrarse mediante el botón explícito "Entendido y Cerrar".
  2. Si el portapapeles falla (entornos no seguros / permisos denegados), se muestra un mensaje accesible con `role="alert"` (`"No se pudo copiar. Selecciona la credencial y cópiala manualmente."`).
* **Verificación QA:** Inspección lógica y validación de estados de modal pasando ✅.

---

## 4. Auditoría de Protocolo de Parada (Directiva #3) y Hallazgos Fuera de Alcance

El implementador aplicó rigurosamente la **Directiva #3 de AGENTS.md** (detenerse y no modificar archivos fuera del módulo asignado). QA valida y respalda formalmente esta decisión:

### 4.1 Defectos en el Core Kit Compartido (Fuera de `m17-permisos`)
1. **`frontend/src/core/components/overlays/Modal.tsx:70`:** Falta `aria-labelledby`, foco inicial automático y trampa de foco (`focus-trap`). Afecta a los modales del sistema de forma transversal.
   * **Acción QA:** Se emite ticket técnico de mejora para el custodio del Core Kit (`04_frontend_engineer`). No bloquea M17 ya que los modales de M17 cumplen semánticamente su estructura interna.
2. **`frontend/src/core/components/data-display/ProductCard.tsx:88`:** Elemento con `onClick` sin listeners de teclado (`onKeyDown`).
   * **Acción QA:** Defecto registrado en el Core Kit de catálogo. Fuera del ámbito de administración.

### 4.2 Hallazgos Bloqueados por Dependencias Externas
1. **Datos simulados de administrador ("Carlos Álvarez") en Topbar/Dashboard:**
   * **Dictamen:** No es un defecto de M17. La sesión dinámica real pertenece al módulo **M04 (Cuentas y Autenticación)**, aún no construido.
2. **KPIs en tablas de clientes y colaboradores calculados sobre página local:**
   * **Dictamen:** El endpoint actual solo pagina entidades. Devolver métricas agregadas globales requiere ampliar el contrato de backend de M17. Queda registrado como deuda de evolución para futuras versiones sin impacto bloqueante en la operativa actual.

---

## 5. Dictamen Final del QA Lead

🟢 **GATE 4A CERTIFICADO — M17 v0.3.1 APROBADO PARA RELEASE.**

La entrega `v0.3.1` demuestra un estándar superlativo de madurez técnica, disciplina metodológica y apego a las 11 Reglas de Oro del SDLC:
1. **Cero regresiones:** Los 115 tests del proyecto pasan al 100%.
2. **Cero `any`:** Rigurosamente verificado en 140 archivos TypeScript.
3. **Casos de borde blindados:** Resueltos los problemas de formularios con teléfonos nulos, errores de red amigables, race conditions de búsqueda y seguridad de credenciales temporales.
4. **Cumplimiento estricto del alcance:** Ni una sola línea fue modificada fuera de `frontend/src/modules/m17-permisos/`.

Se autoriza formalmente la convocatoria de **Gate 5 (DevOps / Release SemVer)** para consolidar el release `v0.3.1` y se ratifica el desbloqueo de la **Ola 2 (`M01 — Catálogo de Productos`)**.
