# WALKTHROUGH DE IMPLEMENTACIÓN — CAPA FRONTEND

> **Módulo:** `M17 — Administración, Empleados y Permisos`
> **Versión de la entrega:** `v0.3.1`
> **Fecha:** 2026-10-21
> **Autor / Responsable:** Jorge Alejandro Peña Motta (@DanExl24)
> **Apoyo de IA:** Claude Opus 5 (Claude Code) — asistencia en revisión e implementación, nunca como autor.
> **Naturaleza:** Remediación de defectos abiertos tras la revisión de pares de `v0.3.0`.

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

| Campo | Valor |
| :--- | :--- |
| Ola | 1 (Seguridad y Administración) |
| Capa | Frontend (Next.js 15 + React 19) |
| Alcance | `frontend/src/modules/m17-permisos/` exclusivamente |
| Archivos creados | 2 |
| Archivos modificados | 9 |
| Tests Vitest frontend | 47/47 PASS (8 suites) — eran 38 |
| Fuera de alcance | 2 defectos del Core Kit reportados sin tocar (Directiva #3) |

---

## 2. ORIGEN DE LA ENTREGA

La revisión de pares de `v0.3.0` registró 1 defecto bloqueante y 12 mayores. El ciclo
*Stop-the-Line* de QA remedió 4 de ellos (`BUG-M17-04` a `BUG-M17-07`). Esta entrega cierra
**6 de los 8 restantes**, todos dentro de los límites del módulo, y documenta por qué los
2 últimos no se tocan aquí.

Ninguno de estos defectos era detectable por `tsc`, ESLint ni `check:no-any`: todos se
manifiestan solo al ejecutar el límite exacto del dato o del evento.

---

## 3. DEFECTOS REMEDIADOS

### 3.1 Edición de colaborador sin teléfono (HU-ADM-01)

**Síntoma:** un colaborador con `telefono: null` no podía editarse, ni siquiera para
cambiarle solo el nombre. El modal precarga `empleado.telefono || ''` y
`telefonoSchema.optional()` solo admite `undefined`, así que la cadena vacía fallaba el
mínimo de 7 dígitos y el formulario mostraba error en un campo que el usuario no tocó.

**Corrección:** nuevo `telefonoEdicionSchema` que admite la cadena vacía y conserva el
rango 7–20 cuando hay valor. El payload omite el campo si llega vacío, porque
`editarEmpleadoInputSchema` del backend tampoco acepta la cadena vacía. Se añadió `.trim()`
a `telefonoSchema` por coherencia con la remediación anti-bypass de `v0.3.0`.

### 3.2 Mensajes de error de la API perdidos (HU-CUE-08 / HU-ADM-03)

**Síntoma:** 15 puntos del módulo usaban `err instanceof Error ? err.message : '...'`. Un
`AxiosError` también es un `Error`, así que el usuario leía "Request failed with status
code 409" en vez del motivo real: correo duplicado, permiso denegado o token inválido.

**Corrección:** nuevo helper `mensajeDeError` que prefiere el mensaje del envelope canónico
mediante el `esRespuestaError` que ya expone `core/api/apiClient`, y cae a un respaldo en
español cuando la respuesta no trae uno legible. Aplicado en los 3 stores y en los 2
componentes con captura propia.

### 3.3 Respuestas desordenadas en los listados (HU-ADM-01 / HU-ADM-04)

**Síntoma:** cada cambio de búsqueda, página o filtro lanzaba una consulta sin cancelar la
anterior. Una respuesta lenta que llegaba después de otra más reciente sobrescribía la
lista y dejaba la tabla mostrando datos que no correspondían a los filtros visibles.
Además se emitía una petición por pulsación de tecla.

**Corrección:** contador de secuencia por store (`peticionListadoActiva`,
`peticionBusquedaActiva`) que descarta toda respuesta obsoleta, y debounce de 300 ms en los
dos buscadores con estado local en el componente.

### 3.4 Confirmación de guardado invisible (HU-ADM-05)

**Síntoma:** `guardarParametro` fijaba `exitoMensaje` y acto seguido llamaba a
`cargarParametros`, que lo limpia al arrancar. El banner de confirmación nunca llegaba a
renderizarse y la rejilla parpadeaba a Skeleton.

**Corrección:** el refresco se ejecuta antes de anunciar el éxito. Si el refresco falla, se
informa ese fallo en lugar de un éxito engañoso sobre una lista obsoleta.

### 3.5 Accesibilidad de la navegación administrativa

**Síntoma:** el menú de perfil solo se cerraba con `onMouseLeave`, inalcanzable con teclado
o en pantalla táctil; el sidebar móvil fuera de pantalla seguía siendo tabulable; faltaban
`aria-expanded`, `aria-controls`, `aria-haspopup` y `aria-current`.

**Corrección:** cierre por `Escape` y por puntero fuera del menú, `inert` en el sidebar solo
cuando está oculto en móvil (detectado con `matchMedia`), y el juego completo de atributos
ARIA en el botón hamburguesa, el botón de perfil y los enlaces activos.

### 3.6 Credencial de un solo uso destruible por accidente (HU-SEG-06)

**Síntoma:** mientras se mostraba la credencial temporal, `Escape` o un clic en el fondo
llamaban a `handleCerrar`, que la borraba sin recuperación posible. El fallo del
portapapeles se tragaba en una captura vacía.

**Corrección:** ambos caminos de cierre quedan desactivados mientras la credencial está en
pantalla; solo el botón explícito "Entendido y Cerrar" la descarta. El fallo de copia se
informa con `role="alert"` e invita a copiarla manualmente.

---

## 4. FUERA DE ALCANCE — PROTOCOLO DE PARADA (DIRECTIVA #3)

Dos defectos verificados viven en el **Core Kit compartido**, fuera de `m17-permisos`, y
**no se han tocado**. Se reportan al equipo humano para que decida su dueño:

| Archivo | Línea | Defecto |
| :--- | :---: | :--- |
| `frontend/src/core/components/overlays/Modal.tsx` | 70 | `role="dialog" aria-modal` sin `aria-labelledby`, sin foco inicial, sin retorno de foco y sin trampa de foco: `Tab` sale hacia la página de detrás. Afecta a los 6 modales de M17. |
| `frontend/src/core/components/data-display/ProductCard.tsx` | 88 | Elemento no interactivo con `onClick` sin manejador de teclado. |

Dos hallazgos más quedan **bloqueados por dependencias de otros módulos**:

1. **Identidad y métricas simuladas en el panel** (`admin/page.tsx`, `AdminLayout.tsx`):
   "¡Hola, Carlos!", "Carlos Álvarez", `admin@pintuclic.com`, el badge de notificaciones y
   los KPIs `12` / `20` / `1.840`. La identidad real exige la sesión que entrega **M04**,
   aún no construido. Se recomienda además retirar las afirmaciones "100% verificado en
   servidor" y "Sesiones revocadas en 0ms", que no están respaldadas por el código.
2. **KPIs calculados sobre la página actual** (`clientes/page.tsx`, `empleados/page.tsx`):
   las tarjetas filtran las 10 filas ya paginadas junto a un "Total" que sí viene del
   servidor, de modo que las cifras se contradicen al paginar. La corrección correcta exige
   que el backend devuelva los agregados, lo que implica ampliar el contrato de M17.

---

## 5. MÉTRICAS DE CALIDAD

| Instrumento | Resultado |
| :--- | :--- |
| Vitest frontend | ✅ **47/47 PASS** (8 suites) — 9 pruebas de regresión nuevas |
| TypeScript `tsc --noEmit` | ✅ 0 errores |
| ESLint `next lint --max-warnings=0` | ✅ 0 errores, 0 advertencias |
| `check:no-any` | ✅ 73 archivos, 0 usos de `any` |
| `audit-a11y.mjs` | ✅ 0 violaciones |
| `audit-core-kit.mjs` | ✅ 0 violaciones |
| `audit-zod-chains.mjs` | ✅ 0 violaciones |
| `eslint-plugin-jsx-a11y` (instrumento externo) | ✅ **0 errores en M17** (quedan 2 en el Core Kit, §4) |

> **Nota de método:** las reglas de `jsx-a11y` no están activas en `eslint.config.mjs`
> —`next/core-web-vitals` solo habilita un subconjunto—, por lo que se ejecutaron de forma
> explícita. Se recomienda incorporarlas a la configuración para que la compuerta de lint
> no dependa únicamente del script propio del equipo.

---

## 6. REGISTRO DE ARCHIVOS

### Creados (2)

| Archivo | Propósito |
| :--- | :--- |
| `frontend/src/modules/m17-permisos/services/mensaje-error.ts` | Traducción de fallos de red al mensaje de dominio del envelope |
| `frontend/src/modules/m17-permisos/tests/regresiones-qa.test.ts` | 9 pruebas de regresión de los defectos de §3 |

### Modificados (9)

| Archivo | Cambio |
| :--- | :--- |
| `dtos/empleados.dto.ts` | `telefonoEdicionSchema`; `.trim()` en `telefonoSchema` |
| `components/empleados/EditarEmpleadoModal.tsx` | Omite el teléfono vacío del payload |
| `components/empleados/CrearEmpleadoModal.tsx` | Protege la credencial de un solo uso; informa el fallo de copia |
| `components/empleados/PermisosModal.tsx` | `mensajeDeError` en sus 2 capturas |
| `components/gobernanza/GobernanzaView.tsx` | `mensajeDeError` en sus 2 capturas |
| `components/AdminLayout.tsx` | Escape, clic fuera, `inert`, atributos ARIA y `aria-current` |
| `components/clientes/ClientesTable.tsx` | Debounce de 300 ms en la búsqueda |
| `components/empleados/EmpleadosTable.tsx` | Debounce de 300 ms en la búsqueda |
| `store/empleadosStore.ts`, `store/clientesStore.ts`, `store/configuracionStore.ts` | Contador de secuencia, orden del mensaje de éxito y `mensajeDeError` |

### Dependencias externas

**Consume:** `core/api/apiClient` (`esRespuestaError` y la cookie de sesión `HttpOnly` de
M20), `core/components` (Core Kit) y `core/theme` (tokens de color).
**No modifica** ningún archivo fuera de `frontend/src/modules/m17-permisos/`.
**Habilita:** nada nuevo; consolida M17 como dependencia certificable de M01 (Ola 2).
**Pendiente de:** M04 para la identidad real de la sesión, y de una ampliación del contrato
de M17 para los agregados de los KPIs.

---

## 7. DICTAMEN

Los 6 defectos remediados quedan cubiertos por pruebas que fallan sin la corrección. M17
pasa limpio el instrumento externo de accesibilidad por primera vez.

**No se declara ninguna compuerta aprobada:** la certificación del Gate 4 es potestad
exclusiva del QA Lead y esta entrega es trabajo de implementación. Quedan abiertos los 2
defectos del Core Kit y los 2 hallazgos bloqueados por dependencias descritos en §4.
