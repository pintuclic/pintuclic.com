# Registro de Cambios y Versiones (CHANGELOG) - PINTU CLIC

Todas las modificaciones, nuevas funcionalidades y refactorizaciones del proyecto deben registrarse en este archivo siguiendo el estándar [SemVer](https://semver.org/lang/es/) y la [Guía de Versionado y Walkthroughs](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md).

> **Repositorio oficial:** `pintuclic/pintuclic.com`  
> **Formato de Versiones:** `[vMAJOR.MINOR.PATCH]` - `AAAA-MM-DD`  
> **Stack tecnológico oficial:** Express 5 + Prisma 6 + PostgreSQL + Next.js 15 + React 19 + Tailwind CSS 4 + Zustand 5

## [v0.5.0] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🏠 **Landing page pública (frente propio FP-01).** Página de inicio `/` según la página 1 de `VISTAS.pdf` y la UI Spec §4.1: topbar, header con mega-menú de categorías, hero, franja de confianza, buscador con accesos a Calculadora y Asesoría de color, productos destacados, categorías y footer institucional. Responsive *mobile-first*.
- **⚠️ Estado:** detenido en **Gate 3B** a la espera de la revisión visual del Director Humano. **Datos estáticos temporales** (productos, categorías, carrito y sesión) hasta que M01, M05 y M04 los alimenten; imágenes de producto, categoría y logo son marcadores extraídos del mockup.

### Core Kit (ampliación autorizada)
- **Nuevos:** `ButtonLink`, `IconButton`, `Select`, `SearchBar`, `Container`, `Logo`, `Topbar`, `Header`, `CategoriesMegaMenu`, `Footer`, `Carousel`, `ScrollRow`, `CategoryCard`, `formatCOP` y `button-styles.ts` (fuente única de estilos de botón, con la variante `outline-light`).
- **Extendidos sin romper su API:** `Button` (estilos extraídos), `Input` (`appearance="bare"`), `Badge` (`pill`), `ProductCard` (`href`, precio con sufijo COP, fondos blancos fundidos, objetivos táctiles de 44 px en móvil). `app/layout.tsx`: Poppins 500 y favicon declarado.
- **Verificación:** `next build` ✅ (`/` estática, 122 kB); `tsc`, ESLint y `lint:a11y` sin errores; 0 `any`; auditorías `a11y` y `core-kit` aprobadas; Vitest **103/103** (+38). Verificado en navegador real a 1366 y 500 px: sin desborde, objetivos táctiles ≥ 44 px, mega-menú accesible con retorno de foco.
- **Conocido:** 14 errores 404 en consola por el *prefetch* de Next.js hacia rutas aún no construidas (`/productos`, `/login`, `/carrito`…). Walkthrough: `docs/walkthroughs/FP-01/walkthrough_v0.5.0_FP01_landing_frontend.md`.

---

## [v0.4.2] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** ✏️ **Motivo de rechazo opcional en el dictamen (M04).** Por decisión del Director Humano el contrato acepta rechazar sin motivo; se conserva obligatorio (mínimo 10 caracteres) solo al rechazar un **registro** de empresa (`RN-CUE-17`), regla que pasa del DTO al servicio porque depende del tipo de solicitud.
- **Alcance:** contrato rector `m04-cuentas.contract.ts`, DTO del backend, `EmpresasService` (un motivo vacío se guarda como "sin motivo") y DTO del frontend (`dictamenSolicitudEmpresaFormSchema` opcional + `dictamenRegistroEmpresaFormSchema` obligatorio). Ajuste autorizado expresamente durante la Fase 3B.
- **Verificación:** backend 20/20 suites · **193/193** (+5); frontend +8 pruebas de DTO; contratos 16/16; `tsc`, ESLint y `check:no-any` limpios. Walkthrough: `docs/walkthroughs/M04/walkthrough_v0.4.2_M04_motivo_rechazo_opcional_backend.md`.
- **Decisiones registradas:** ratificado el cambio de `app.routes.ts` (v0.4.1); la verificación del correo del registro de empresa la valida el administrador al aceptarla; auditoría de decisiones aplazada (`HU-SEG-04`).

---

## [v0.4.1] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🛡️ **Remediación de `BUG-M04-01` (S1 Blocker) — control de acceso en `/admin/empresas/*`.** Las rutas administrativas de empresas ahora exigen sesión válida y el permiso atómico `empresas.validar`, evaluado en servidor en cada petición; sin él responden el 404 opaco de M20.
- **✅ Estado de certificación:** re-auditado y certificado formalmente por el QA Lead & Security Compliance Director en v0.4.1 tras resolución comprobada de `BUG-M04-01`. Veto Stop-the-Line levantado formalmente. Gate 3A (Backend) aprobado al 100%. Reporte oficial: `.sdlc/docs/qa/M04/v0.4.1/QA_REPORT.md`.

### Módulo M04 — Cuentas, Autenticación y Perfil (Backend)
- **Control de acceso (`HU-CUE-09` E2, `HU-ADM-03`):** guarda a nivel de router (`sesión → requirePermission('empresas.validar')`), protegida por omisión. `construirModuloM04` exige ahora el `AutorizacionService`; no se puede montar sin autorización administrativa.
- **Por qué no `tipoSesion === 'admin'`:** el login concede ese tipo a todo usuario con rol, empleados incluidos; solo el permiso atómico impide que un colaborador sin `empresas.validar` dictamine.
- **Raíz de composición:** `app.routes.ts` inyecta `m17.autorizacionService` (cambio de una línea en archivo compartido, por instrucción expresa del Director Humano; pendiente de su ratificación).

#### Saneamiento del flujo de dictamen (defectos hallados al analizar `HU-CUE-09` / `HU-CUE-10`)
- **Decisión atómica y transaccional (`RNF-CUE-09-01`, `ADR-010`):** `UPDATE ... WHERE estado = 'pendiente'`; la aprobación (activar cuenta, convertir a tipo `empresa`, crear `cuenta_empresa`, retirar Google) ocurre en **una** transacción que se revierte ante un conflicto de NIT. Antes eran escrituras sueltas y dos administradores simultáneos podían decidir ambos.
- **Cuenta empresa correcta (`RN-CUE-15`, `HU-CUE-09` E8/E10):** el registro de empresa ya no nace como `empresa`; solo la aprobación convierte la cuenta (sobre la misma) y desactiva el acceso de Google.
- **Códigos y reglas:** decisión repetida → `409 SOLICITUD_YA_DECIDIDA`; motivo de rechazo obligatorio solo en registros (`RN-CUE-17`).
- **Identificadores mal formados** ya no provocan 500: responden el 404 opaco (solicitudes, renovaciones, documentos y direcciones).
- **Endpoints nuevos:** `GET /cuentas/empresas/solicitudes/mias` (estado de solicitudes propias, `HU-CUE-03` E6 / `HU-CUE-10` E3), `GET /admin/empresas/renovaciones` y `/:id`, y `GET /admin/empresas/documentos/:id` (descarga del RUT con adjunto, `nosniff`, `no-store` y verificación SHA-256; `HU-CUE-09` E14).
- **Pruebas y verificación:** 20/20 suites, **188/188 tests** (+72); `tsc` 0 errores; ESLint 0/0; 0 `any` en 102 archivos. Pruebas de mutación: la guarda de permiso, la condición `pendiente`, la conversión a `empresa` y la baja de Google fueron sabotadas una a una y cada mutante fue detectado.
- **Límite de lo verificado:** la exclusión mutua real entre dos conexiones concurrentes requiere PostgreSQL y queda para la prueba de integración del Gate 4.
- **Elevado para decisión (no se tocó):** el cuerpo JSON global de 100 kb impide subir un RUT de hasta 5 MB (`HU-CUE-10` E5; bloquea la renovación de punta a punta), catálogo de códigos de error divergente entre contrato y HU, motivo opcional en ascensos/renovaciones frente al DTO firmado, verificación de correo del registro de empresa, notificaciones de renovación de NIT y auditoría de decisiones. Detalle en el walkthrough §8.
- **Errata:** el walkthrough `v0.4.0` §4.2 afirmaba una comprobación de permisos inexistente; corregido en el propio documento. Walkthrough: `docs/walkthroughs/M04/walkthrough_v0.4.1_M04_remediacion_bug_m04_01_backend.md`.

---

## [v0.4.0] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔐 **Implementación Backend completa de Cuentas, Autenticación y Perfil (M04).** Endpoints REST canónicos bajo `/cuentas` y `/admin/empresas`, servicios hexagonales desacoplados, autenticación con OTP, federación Google Identity, señuelos anti-fuerza bruta, libreta de direcciones y flujo B2B corporativo con custodia de RUT.

### Módulo M04 — Cuentas, Autenticación y Perfil (Backend)
- **HU-CUE-01 (Registro B2C con OTP):** Código de verificación de 6 dígitos con hash BCrypt costo 12, expiración de 15 minutos y límite de 3 reintentos.
- **HU-CUE-02 (Federación Google Identity):** Autenticación federada vía `GoogleAuthPort` con token de registro efímero JWT de 10 minutos para complementar datos en nuevos usuarios.
- **HU-CUE-03 y HU-CUE-09 (Empresas B2B y Renovación de NIT):** Solicitudes corporativas con validación de NIT, custodia segura de archivo RUT (hasta 5MB, SHA-256) en `documento_soporte` y flujo de renovación de NIT.
- **HU-CUE-04 (Login y Control de Fuerza Bruta):** Bloqueo temporal por 15m tras 5 intentos fallidos (ADR-012) y comparación con hash señuelo de tiempo constante ante correos inexistentes para prevenir ataques de temporización. Forzado de cambio de clave en primer acceso (ADR-011).
- **HU-CUE-05 (Recuperación de Contraseña):** Enlace firmado seguro JWT de 30 minutos con respuesta indistinguible anti-enumeración y revocación masiva de sesiones en reset.
- **HU-CUE-06 (Perfil y Credenciales):** Actualización de datos personales, cambio de contraseña con validación de clave actual y solicitud/confirmación de cambio de correo con OTP de 15m.
- **HU-CUE-07 (Libreta de Direcciones):** Límite estricto de 10 direcciones por cliente (RN-CUE-07), auto-asignación de primera dirección como predeterminada y desmarcado atómico.
- **HU-CUE-08 (Unicidad Universal):** Blindaje de unicidad en BD y repositorios contra colisiones de correo, NIT y solicitudes pendientes.
- **HU-CUE-10 (Dictamen Administrativo y Desactivación):** Aprobación crea fila 1:1 en `cuenta_empresa` (ADR-010 / C-1); rechazo exige motivo >= 10 caracteres. Desactivación de cuenta con confirmación de clave y revocación de sesiones.
- **Verificación:** 18/18 suites Vitest backend PASS (116/116 tests), 0 errores TypeScript (`npx tsc --noEmit`), 0 advertencias ESLint, y 0 usos de `any` en 99 archivos backend auditados. Walkthrough generado en `docs/walkthroughs/M04/walkthrough_v0.4.0_M04_cuentas_autenticacion_backend.md`.

---

## [v0.3.3] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `3b10811` — `feat(m17-permisos): persistir parametros en base de datos con repositorio prisma HU-ADM-05`
- **Hito:** ⚙️ **Persistencia relacional de configuración general según RFC-M17-001.** Se elimina el almacén volátil en memoria y se conecta la API administrativa con la tabla `parametro_sistema`.

### Módulo M17 — Administración, Empleados y Permisos (Backend)

Esta entrega resuelve de forma definitiva la deuda técnica transitoria documentada en `ADR-007` y formalizada en el `RFC-M17-001`:

- **Conexión Prisma ↔ PostgreSQL:** Mapeo de la tabla `parametro_sistema` en `backend/prisma/schema.prisma` con enums `AreaParametro` y `TipoDatoParametro`.
- **`PrismaConfiguracionRepository`:** Implementación del puerto `ConfiguracionPort` que reemplaza `AlmacenConfiguracionMemoria` en `m17.routes.ts`.
- **Cero Datos Iniciales en Código (Directiva #10):** Se remueve el catálogo hardcodeado de 10 parámetros de TypeScript en `configuracion.repository.ts`. Toda la siembra reside exclusivamente en `bd/sql/seed_pintuclic.sql`.
- **Auditoría del Administrador:** Propagación de `idAdmin` desde `req.actor?.idUsuario` en `ConfiguracionController` hasta `actualizar()` para registrar la autoría en `id_usuario_actualizo`.
- **Caché en Memoria (TTL 30s):** Consultas de alta frecuencia resuelven en `< 1ms` sin saturar la base de datos, con invalidación reactiva ante cualquier actualización.
- **Verificación:** 71/71 tests Vitest backend PASS (+1 test de caché e invalidación), 0 errores TypeScript (`npx tsc --noEmit`), 0 advertencias ESLint, y 0 usos de `any` en 145 archivos auditados.

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
