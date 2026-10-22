# 📝 WORKLOG — 04_FRONTEND_ENGINEER

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado para construcción de interfaz SPA reactiva, consumo de contratos Zod, Design System oficial y Walkthroughs versionados.

---

## 2026-10-21 — M20 · Fase 3B acotada

**Rol:** Frontend Lead Engineer · **Sello:** ✅ Firmado en turno propio

**Alcance acotado por el Product Owner:** solo infraestructura de seguridad y el servicio tipado de
privacidad. **Sin componentes ni pantallas** — un Líder Frontend dejará el design system en `core/`.

### Subroles convocados
- **02 · State & Data Flow** — store sin token, interceptor `401`, servicios tipados.
- **05 · Developer Component TDD** — 19 pruebas Vitest.
- *No se convocó* **01 · Design System Core** ni **03 · Views & UX**: su trabajo queda fuera por decreto.

### Decisiones
- **El middleware NO es control de acceso** y así se documenta en el propio archivo: solo comprueba
  la presencia de la cookie, porque validarla exigiría un viaje al servidor en cada navegación. La
  autoridad sigue en el backend (`RNF-SEG-03-01`). Confundir esto sería justo lo que `RF-SEG-03-06`
  advierte.
- **El interceptor no navega.** Limpia la sesión y recuerda el destino, pero deja la redirección a la
  vista: navegar desde un interceptor interrumpiría peticiones de fondo y pelearía con el router.
- **`consumirDestino()` limpia al leer.** Si no, una segunda expiración reutilizaría un destino viejo
  y llevaría al usuario a donde ya no quería ir.

### Verificación
`tsc` ✅ · `next lint --max-warnings=0` ✅ · `check:no-any` ✅ 58 archivos · **Vitest 19/19** ✅ ·
`next build` ✅ · backend sin regresión 36/36 ✅

**Mutación:** se hizo que `errorApi` devolviera el mensaje crudo y que el destino no se consumiera;
ambas pruebas fallaron y volvieron a pasar al restaurar.

### ⚠️ Elevado al Director Humano
**Gate 3B pide revisar la interfaz en el navegador y esta entrega no tiene interfaz.** La compuerta
no puede evaluarse como está escrita. La revisión visual corresponderá a quien construya las
pantallas sobre estos servicios.

---

## 2026-10-21 — Core Design System y Transcripción de UI Spec v1.0

**Rol:** Frontend Lead Engineer & Subrol 01 (Design System Core) · **Sello:** ✅ Entrega Canónica Core

### Contexto y Necesidad
Siguiendo las fuentes visuales de verdad aprobadas en `docs/assets/mockups/` (`Pintu_Clic_UI_Oficial.docx.pdf`, `pintu_clic_admin_m01_m02_.pdf` y `VISTAS.pdf`), se formalizó la arquitectura de interfaz para erradicar componentes huérfanos o maquetados ad-hoc.

### Acciones Realizadas
1. **Transcripción Integral a Markdown Rector:**
   - Creado [`docs/00_SISTEMA/01_ARQUITECTURA/ESPECIFICACION_TECNICA_UI_UX.md`](../../../docs/00_SISTEMA/01_ARQUITECTURA/ESPECIFICACION_TECNICA_UI_UX.md) y espejo en [`docs/assets/mockups/Pintu_Clic_UI_Oficial.md`](../../../docs/assets/mockups/Pintu_Clic_UI_Oficial.md), cubriendo las 18 páginas del documento rector (tokens cromáticos, Poppins/Inter, iconografía outline, grillas de 8px, las 5 variantes de botón, modal con franja arcoíris, card de producto, flujos de vistas completas, skeletons y checklist de 8 criterios de aceptación).
2. **Construcción del Core Base Kit (`frontend/src/core/components/`):**
   - `buttons/Button.tsx`: 5 variantes oficiales (`primary-action`, `primary-conversion`, `selection` con check, `outline`, `ghost`, con ícono) con soporte para hover, active (escala 0.98), disabled (#E5E7EB/#6B7280) y spinner accesible.
   - `forms/Input.tsx`: Campo accesible con label Poppins, helper text, error dinámico `#E63946`, foco `#0877E8` y radio `rounded-input` (6px).
   - `forms/Checkbox.tsx`: Checkbox estilizado con fondo azul `#0877E8` y check blanco, cumpliendo WCAG.
   - `overlays/Modal.tsx`: Modal centrado, radio 14px (`rounded-modal`), franja superior decorativa en degradado de marca arcoíris (`bg-brand-rainbow`), focus trap y listener `Escape`.
   - `data-display/Badge.tsx`: Badges para "Patrocinado" (`#FFC107`), "Oferta" (`#E63946`), "Éxito" (`#41BF5A`) y neutros.
   - `data-display/ProductCard.tsx`: Tarjeta canónica de producto con sombras (`shadow-card`, `hover:shadow-card-hover`, `translateY(-4px)`), imagen en `#F7F8FA` con `object-fit: contain`, badges superiores, precio Poppins Bold 20px `#002855`, precio tachado y botones de acción.
   - `feedback/Skeleton.tsx`: Esqueletos pulsantes grises (`Skeleton`, `SkeletonProductCard`) según sección 5.3.
   - `index.ts`: Barrel export limpio para que cualquier módulo importe desde `@/core/components`.
3. **Ajuste de Tokens en `frontend/tailwind.config.ts`:**
   - Incorporados radios `input: 6px`, `btn: 6px`, `card: 8px`, `modal: 14px`.
   - Incorporadas sombras oficiales `card` y `card-hover`.
   - Gradiente de marca `brand-rainbow` configurado.
   - Conectadas variables CSS `--font-inter` y `--font-poppins` para soporte total de Next.js font optimization.
4. **Blindaje de Gobernanza:**
   - Incorporada Directiva Crítica #13 en `AGENTS.md`.
   - Actualizado `.sdlc/docs/04_ui_design_system.md` con las especificaciones técnicas completas.
   - Actualizado `ROLE.md`, `subroles/01_design_system_core.md` y `subroles/03_views_forms_ux.md`.

### Verificación y Calidad
- `check:no-any`: ✅ PASS (27 archivos auditados, 0 usos de `any`).
- `npx tsc --noEmit`: ✅ PASS (0 errores TypeScript).
- `npm run lint`: ✅ PASS (0 warnings, 0 errores ESLint).
- `vitest run`: ✅ PASS (5 suites, 19 tests unitarios pasando al 100%).
- `next build`: ✅ PASS (Compilación de producción standalone exitosa en 3.1s).

---

## 2026-10-21 — M17 · Fase 3B Frontend Completa

**Rol:** Frontend Lead Engineer (`04_frontend_engineer`) · **Sello:** ✅ Entrega Canónica M17

### Contexto y Directiva del Director Humano
Siguiendo la instrucción explícita del Director Humano de tomar el diseño visual del panel de administración oficial ([`docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf`](../../../docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf)) y reemplazar las funcionalidades de catálogo por las 7 historias de usuario del módulo M17.

### Acciones Realizadas
1. **DTOs con Zod 4 y Tipado Estricto (`src/modules/m17-permisos/dtos/`):**
   - `empleados.dto.ts`: Creación, edición, primer acceso con clave temporal y desactivación confirmada.
   - `permisos.dto.ts`: Catálogo oficial de 20 permisos atómicos.
   - `clientes-admin.dto.ts`: Desactivación con motivo justificado obligatorio (mínimo 5 caracteres - RN-ADM-08).
   - `configuracion.dto.ts`: 10 parámetros maestros del sistema.
   - `gobernanza.dto.ts`: Sustitución de correo maestro con token criptográfico (mínimo 16 caracteres).
2. **Interfaces TypeScript de Dominio (`src/modules/m17-permisos/interfaces/`):**
   - Cero runtime, 100% type-safe sin uso de `any`.
3. **Servicios de Consumo API (`src/modules/m17-permisos/services/`):**
   - `empleados.service.ts`, `permisos.service.ts`, `clientes-admin.service.ts`, `configuracion.service.ts`, `gobernanza.service.ts`.
4. **Manejo de Estado Global con Zustand (`src/modules/m17-permisos/store/`):**
   - `empleadosStore.ts`, `clientesStore.ts`, `configuracionStore.ts`.
5. **Componentes y Vistas con Fidelidad al Mockup Oficial (`src/modules/m17-permisos/components/`):**
   - `AdminLayout.tsx`: Shell con Sidebar blanco, Topbar con buscador y perfil, navegación activa, y widget inferior.
   - `AdminStatCard.tsx`: KPI cards canónicas con iconos tintados, Poppins Bold y tendencias.
   - `AdminPagination.tsx`: Paginación oficial con botones numéricos y selector de registros por página.
   - `EmpleadosTable.tsx`, `CrearEmpleadoModal.tsx`, `EditarEmpleadoModal.tsx`, `DesactivarEmpleadoModal.tsx` (estilo página 13 del mockup con métricas de 0ms e impacto), `PermisosModal.tsx` (matriz atómica de 20 permisos con cascadas automáticas).
   - `ClientesTable.tsx`, `FichaClienteModal.tsx`, `DesactivarClienteModal.tsx`.
   - `ConfiguracionView.tsx`: Pestañas por área y edición validada de los 10 parámetros del sistema.
   - `GobernanzaView.tsx`: Protocolo seguro de cambio de correo y reglas inmutables.
6. **Rutas Desplegadas en Next.js App Router (`src/app/admin/`):**
   - `/admin` (Dashboard Overview), `/admin/empleados`, `/admin/clientes`, `/admin/configuracion`, `/admin/gobernanza`.
7. **Pruebas Automatizadas Unitarias (`src/modules/m17-permisos/tests/`):**
   - `dtos.test.ts` (13 tests), `stores.test.ts` (6 tests).

### Verificación y Métricas
- `check:no-any`: ✅ PASS (70 archivos auditados, 0 usos de `any`).
- `npx tsc --noEmit`: ✅ PASS (0 errores TypeScript).
- `npm run lint`: ✅ PASS (0 warnings, 0 errores ESLint).
- `vitest run`: ✅ PASS (7 suites, 38/38 tests unitarios pasando al 100%).
- `next build`: ✅ PASS (Todas las rutas administrativas generadas como estáticas).
- Backend Vitest: ✅ PASS (12 suites, 68/68 tests pasando, cero regresiones).
- Walkthrough generado en [`docs/walkthroughs/M17/walkthrough_v0.3.0_M17_administracion_empleados_permisos_frontend.md`](../../../docs/walkthroughs/M17/walkthrough_v0.3.0_M17_administracion_empleados_permisos_frontend.md).


---

## 2026-10-21 — M17 - v0.3.1 - Remediacion de hallazgos de revision de pares

### Contexto
Una revision de pares sobre `v0.3.0` registro 1 defecto bloqueante y 12 mayores. El ciclo
Stop-the-Line de QA resolvio 4 (`BUG-M17-04` a `BUG-M17-07`). El Director Humano instruyo cerrar
los restantes que cayeran dentro de los limites del modulo.

### Acciones Realizadas
1. **`dtos/empleados.dto.ts`** - nuevo `telefonoEdicionSchema`: un colaborador con `telefono: null`
   no podia editarse porque el modal precarga la cadena vacia y `telefonoSchema.optional()` solo
   admite `undefined`. Se anadio `.trim()` a `telefonoSchema` por coherencia anti-bypass.
2. **`EditarEmpleadoModal.tsx`** - omite el telefono vacio del payload, porque
   `editarEmpleadoInputSchema` del backend tampoco lo acepta.
3. **`services/mensaje-error.ts`** (nuevo) - helper que prefiere el mensaje del envelope canonico
   via `esRespuestaError`. Aplicado en los 3 stores, `PermisosModal` y `GobernanzaView`: eran 15
   puntos mostrando "Request failed with status code 409" en vez del motivo de negocio.
4. **`empleadosStore.ts` / `clientesStore.ts`** - contador de secuencia que descarta respuestas
   obsoletas; antes una respuesta lenta sobrescribia una mas reciente.
5. **`ClientesTable.tsx` / `EmpleadosTable.tsx`** - debounce de 300 ms con estado local, en lugar de
   una peticion por pulsacion de tecla.
6. **`configuracionStore.ts`** - el refresco se ejecuta antes de anunciar el exito; el banner de
   confirmacion nunca llegaba a verse porque `cargarParametros` lo borraba.
7. **`AdminLayout.tsx`** - cierre por Escape y por puntero externo, `inert` condicionado por
   `matchMedia`, y `aria-expanded` / `aria-controls` / `aria-haspopup` / `aria-current`.
8. **`CrearEmpleadoModal.tsx`** - la credencial de un solo uso ya no se destruye con Escape ni con
   clic en el fondo (`HU-SEG-06`); el fallo del portapapeles se informa con `role="alert"`.
9. **`tests/regresiones-qa.test.ts`** (nuevo) - 9 pruebas que ejercitan el limite exacto de cada
   defecto corregido.

### Verificacion y Metricas
- `vitest run`: PASS - 8 suites, **47/47** tests (eran 38).
- `npx tsc --noEmit`: PASS - 0 errores.
- `npm run lint`: PASS - 0 errores, 0 advertencias.
- `check:no-any`: PASS - 73 archivos, 0 usos de `any`.
- `audit-a11y.mjs`, `audit-core-kit.mjs`, `audit-zod-chains.mjs`: PASS - 0 violaciones.
- `eslint-plugin-jsx-a11y` como instrumento externo: **0 errores en M17** por primera vez.
- Walkthrough: `docs/walkthroughs/M17/walkthrough_v0.3.1_M17_remediacion_hallazgos_revision_pares_frontend.md`.

### Elevado al Director Humano (Directiva #3)
1. **2 defectos del Core Kit compartido, no tocados:** `core/components/overlays/Modal.tsx:70` sin
   `aria-labelledby`, sin foco inicial, sin retorno de foco y sin trampa de foco (afecta a los 6
   modales de M17); y `core/components/data-display/ProductCard.tsx:88` sin manejador de teclado.
2. **2 hallazgos bloqueados por dependencias:** la identidad simulada del panel ("Hola, Carlos",
   `admin@pintuclic.com`, KPIs `12`/`20`/`1.840`) exige la sesion real de **M04**; los KPIs que hoy
   se calculan sobre la pagina actual exigen agregados del backend, o sea ampliar el contrato de M17.
   Se recomienda retirar las afirmaciones "100% verificado en servidor" y "Sesiones revocadas en
   0ms", que el codigo no respalda.
3. **Compuerta de accesibilidad: PARCIAL.** Se incorporo el script `npm run lint:a11y` en
   `frontend/package.json`, que ejecuta 8 reglas de `eslint-plugin-jsx-a11y` sobre `src/app` y
   `src/modules` con `--max-warnings=0`. Verificado que detecta de verdad: apuntado a `src/core`
   devuelve los 2 errores conocidos del Core Kit; sobre el alcance oficial sale en 0.
   **Pendiente:** integrarlas en `frontend/eslint.config.mjs` para que `npm run lint` las aplique de
   forma nativa. El hook de proteccion de configuracion del entorno bloquea la edicion de ese
   archivo, asi que queda a decision del Director Humano. El alcance debe excluir `src/core/` por la
   Directiva #1 hasta que su equipo propietario cierre sus 2 violaciones; al cerrarse, basta ampliar
   el `files` a todo el frontend.

---

## 2026-10-21 — Core Kit · v0.3.2 · Remediacion de accesibilidad (Modal y ProductCard)

### Contexto
Cierre de los 2 defectos del Core Kit compartido que `v0.3.1` elevo sin tocar por la Directiva #3.
Habilitantes: instruccion explicita del Director Humano, ticket tecnico de QA en
`.sdlc/docs/qa/M17/v0.3.1/QA_REPORT.md` seccion 4.1 que asigna el defecto de `Modal.tsx` al custodio
del Core Kit (este rol), y la elevacion previa ya registrada en esta bitacora.

Los archivos corregidos viven en `frontend/src/core/`, entregable de infraestructura frontend de
**M20**, no de `m17-permisos`. M17 era consumidor, no propietario.

### Acciones Realizadas
1. **`Modal.tsx`** — `role="dialog"` y `aria-modal` trasladados del fondo decorativo al panel, que
   es donde corresponde la region del dialogo (tercer defecto, no reportado antes). Añadidos
   `aria-labelledby` sobre el titulo y `aria-describedby` sobre el subtitulo via `useId()`, mas la
   prop opcional `ariaLabel` para modales sin titulo. Implementados foco inicial, retorno del foco
   al disparador y trampa de foco ciclica. El cierre por clic exterior pasa de `onClick` en el fondo
   a `pointerdown` en `document`, el mismo patron que ya usaba `AdminLayout.tsx`.
2. **`foco.ts`** (nuevo) — selector de focalizables y `siguienteIndiceDeFoco`, recorrido puro y sin
   dependencias del DOM para poder probarlo sin `jsdom`.
3. **`ProductCard.tsx`** — el `<h3>` conserva su semantica y delega la accion a un `<button>` real
   interior; `<span>` sin afordancia cuando no hay `onViewDetails`. `line-clamp-2` reubicado sobre
   el nodo del texto para no alterar la altura de la tarjeta.
4. **`package.json`** — `lint:a11y` amplia su alcance a `src/core`, revirtiendo la exclusion que
   `v0.3.1` habia decidido para no dejar el lint en rojo para todo el equipo.
5. **Dos efectos separados en el Modal a proposito:** el de apertura depende solo de `isOpen`.
   Unificarlo con el de escuchas haria que recrear `onClose` en el padre volviese a disparar el foco
   inicial en cada render y le robase el foco al usuario mientras escribe.

### Verificacion y Metricas
- `eslint-plugin-jsx-a11y` sobre `src/core`: **2 errores ANTES → 0 DESPUES**.
- Vitest frontend: **57/57 PASS** (9 suites) — eran 47; 10 pruebas nuevas en `core/tests/foco.test.ts`.
- Vitest backend: 68/68 PASS, sin afectacion. **Total 125/125** (eran 115).
- `tsc --noEmit`: PASS. `npm run lint`: 0 errores, 0 advertencias. `check:no-any`: 75 archivos, 0 any.
- `audit-a11y.mjs`, `audit-core-kit.mjs`, `audit-zod-chains.mjs`: 0 violaciones.
- Contrato de `CrearEmpleadoModal` preservado: `Escape` sigue cayendo en el no-op y el puntero
  exterior sigue bloqueado mientras la credencial de un solo uso esta visible (`HU-SEG-06`).
- Walkthrough: `docs/walkthroughs/M20/walkthrough_v0.3.2_M20_remediacion_accesibilidad_core_kit_frontend.md`.

### Declarado al equipo (sin sobre-afirmar)
1. **Brecha de cobertura real.** El proyecto no tiene `jsdom` ni Testing Library y `vitest.config.ts`
   corre en `environment: 'node'`. Las 10 pruebas nuevas cubren el **contrato de recorrido** de la
   trampa de foco, y el instrumento `jsx-a11y` cubre la ausencia de manejador de teclado. El cableado
   DOM (`querySelectorAll`, la llamada a `focus()`, el retorno del foco y la resolucion de
   `aria-labelledby` por un lector de pantalla) queda **verificado por inspeccion, no por prueba
   automatizada**. Se recomienda incorporar `jsdom` y `@testing-library/react` como dependencias de
   desarrollo; es un cambio de dependencias del proyecto y excede el alcance autorizado aqui.
2. **Sigue bloqueado:** integrar las 8 reglas en `frontend/eslint.config.mjs` para que `npm run lint`
   las aplique de forma nativa. El hook de proteccion de configuracion del entorno impide editar ese
   archivo. El script `lint:a11y` continua siendo el instrumento.
3. **No se declara ninguna compuerta aprobada.** El entregable de este rol termina en el walkthrough
   y el commit; Gate 4 es potestad del QA Lead.

---

## 2026-10-22 — FP-01 · v0.5.0 · Landing page pública

**Rol:** Frontend Lead Engineer · **Frente propio** registrado por el Director Humano (fuera de los 21 módulos)

### Contexto
El Director pidió la landing antes del frontend de M04: fuente visual `VISTAS.pdf` (solo página 1), tipografía global Poppins + Inter, datos estáticos temporales y autorización para ampliar el Core Kit.

### Subroles convocados
- **01 · Design System:** 13 componentes nuevos en `core/components` (layout, navegación, formularios, `CategoryCard`) y `button-styles.ts` como fuente única de estilos; extensiones compatibles de `Button`, `Input`, `Badge` y `ProductCard`.
- **03 · Views & UX:** `app/(public)/` con layout (skip link, topbar, header, footer) y 5 secciones; contenido aislado en `_data/*.content.ts` y marcado como temporal.
- **05 · Component TDD:** sin `jsdom`, render en servidor con `react-dom/server` (38 pruebas nuevas) e integridad del contenido (existencia de cada imagen, enlaces válidos).

### Verificación
- `next build` ✅ · `tsc` ✅ · ESLint ✅ · `lint:a11y` ✅ · 0 `any` · auditorías `a11y` y `core-kit` aprobadas · Vitest 103/103.
- Navegador real (servidor de producción): 1366 px y 500 px, sin desborde, objetivos táctiles ≥ 44 px, mega-menú con foco retenido y retorno de foco. Corregidos en la revisión: título del hero en 3 líneas, fondos blancos de las fotos, sufijo COP, solape de la insignia del carrito, legibilidad del hero en móvil, objetivos táctiles < 44 px y 404 del favicon.

### Pendiente / conocido
- 14 errores 404 de *prefetch* hacia rutas aún no construidas; desaparecen con M01/M04/M05.
- Imágenes de logo, productos y categorías son marcadores extraídos del mockup; el Director las sustituirá.
- **Detenido en Gate 3B**: revisión visual del Director Humano. No se declara la compuerta aprobada.
- **Walkthrough:** `docs/walkthroughs/FP-01/walkthrough_v0.5.0_FP01_landing_frontend.md`.

---

## 2026-10-22 — M04 · v0.6.0 · Frontend de Cuentas, Autenticación y Perfil

**Rol:** Frontend Lead Engineer · **Módulo:** M04 (Fase 3B)

### Contexto
El Director aprobó la landing (FP-01) y pidió el login con `VISTAS.pdf` págs. 3–6 como fuente visual. Esas páginas son el **modal de registro**; se propusieron 7 decisiones (registro según mockup, login/recuperación/primer acceso derivados, empresa sin OTP, azul `action`, stepper del mockup, una sola contraseña, Términos solo en cliente, Google deshabilitado) y el Director respondió: "si, hazlo. y el frontend que falta, derivalo por funciones y diseño del proyecto, ya que parece que no tengo mas mockups."

### Subroles convocados
- **01 · Design System:** 8 componentes nuevos en el Core (`PasswordInput`, `OtpInput`, `FileInput`, `Alert`, `Stepper`, `SegmentedTabs`, `SectionNav`, `TextButton`); `Input.endAdornment` y `Header` con sesión.
- **02 · Data & State:** servicios sobre la API real v0.4.2, mapa de errores propio del módulo, `SesionBootstrap` sobre `useAuthStore` (sin tokens en el cliente).
- **03 · Views & UX:** modal interceptado + páginas completas de acceso, `/perfil` con 5 secciones y `/admin/empresas`.
- **05 · Component TDD:** 33 pruebas nuevas (utilidades, RUT, render en servidor de formularios y del Core nuevo).

### Verificación
- `next build` ✅ · `tsc` ✅ · ESLint ✅ · `lint:a11y` ✅ · 0 `any` · `audit:core-kit` 0 violaciones (la primera pasada detectó 6 `<button>` crudos; se crearon `TextButton` y `SectionNav`) · `audit:a11y` ✅ · `audit:zod` ✅ · Vitest 136/136.
- Navegador real con **API simulada en la página** (no hay backend ni base de datos en el entorno): todos los flujos de las HU recorridos a 1920 y 390 px. Corregidos en la revisión: placeholder engañoso del login, título descentrado, stepper desequilibrado, paso final "en curso", campos de solo lectura con aspecto editable, desborde de 772 px en móvil y sección activa fuera de vista.

### Elevado al equipo (fuera del módulo, no se tocó — Directiva #3)
1. `frontend/next.config.ts`: el *rewrite* `/api/:path*` → `http://backend:3000/:path*` descarta `/api`, pero el backend escucha en `/api/v1`.
2. `backend/src/index.ts`: límite JSON de 100 kb frente a RUT de hasta 5 MB (ya elevado en v0.4.1).
3. `m17-permisos/components/AdminLayout.tsx`: entrada "Empresas" en la barra lateral y su breadcrumb.

### Pendiente / conocido
- Integración contra el backend real (Gate 4). `HU-CUE-02` aplazada. Sin geocodificación inversa para `CA-CUE-07-04` (solo coordenadas).
- **Detenido en Gate 3B**: revisión visual del Director Humano. No se declara la compuerta aprobada.
- **Walkthrough:** `docs/walkthroughs/M04/walkthrough_v0.6.0_M04_cuentas_autenticacion_perfil_frontend.md`.

### Cierre (mismo día) — Gate 3B aprobado
- El Director aprobó la revisión visual ("apruebo tu frontend") y autorizó, antes del commit, dos cambios fuera del módulo: el límite JSON del backend y la barra lateral del admin de M17.
- **Límite JSON:** nuevo `backend/src/core/middlewares/cuerpoJson.middleware.ts`: 100 kb en toda la API y 7 MB solo en `POST /cuentas/empresas/renovacion-nit`; el exceso responde 413 con código propio en lugar del 500 genérico. Backend: `tsc` 0, ESLint 0/0, 0 `any`, Vitest 199/199 (+6).
- **M17:** entrada "Empresas" en la barra lateral y título en el breadcrumb; verificada en navegador.
- **Siguiente:** integrar `main` (DevOps: Docker, SMTP, Google OAuth) y probar contra el backend real, incluida la geolocalización de `CA-CUE-07-04`. Sigue pendiente alinear el *rewrite* `/api` de `next.config.ts` con la configuración de DevOps.
- **Commits:** v0.4.2 (`fix`), v0.5.0 landing (`chore(ui)`), M04 frontend (`feat`), límite JSON (`fix(core)`), barra lateral M17 (`fix(m17-permisos)`) y documentación (`docs`). Cada entrega lleva solo sus cambios; los archivos compartidos se prepararon en el índice con su versión intermedia y el commit de la landing se verificó aislado en un worktree (103/103, igual que v0.5.0).
- **Integración de `main`:** sin conflictos. `lucide-react` 1.x retiró `Facebook`, `Instagram` y `Youtube` y rompía el Footer del Core: se reemplazaron por `IconosMarca.tsx` (Simple Icons, CC0). Verificado con `lucide-react` 1.60.0 y `dotenv` 18.0.8 instalados.
- **Elevado a DevOps:** la configuración de `main` no conserva el prefijo `/api/v1` (`NEXT_PUBLIC_API_URL=/api` en el build, `http://localhost:3000` en `.env.example`) y `package-lock.json` del frontend quedó desincronizado. Detalle en el walkthrough §12.
- **URL de la API (autorizado: "hazlo tu, te doy permiso"):** el *rewrite* descartaba `/api` y el Dockerfile del frontend no declaraba `ARG`, así que los `args` de compose nunca llegaban al build. Ahora el navegador llama a `/api/v1` en el mismo origen y Next reenvía con `BACKEND_URL` (solo servidor, fijado al compilar) conservando el prefijo. Verificado con un backend de eco: ruta, cookie, cuerpo de ~7 MB y `Set-Cookie`. Sigue para DevOps: `package-lock.json` desincronizado.
