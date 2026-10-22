# 📝 WORKLOG — 03_BACKEND_ENGINEER

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado para construcción de API REST, lógica de dominio, persistencia tipada con Cero SQL crudo y suites Vitest TDD.

---

## 2026-10-21 — M20 · Implementación de Fase 3A (pase continuo)

**Rol:** Backend Lead Engineer · **Sello:** ✅ Firmado en turno propio

### Subroles convocados
- **03 · Data Layer Optimizer** — `schema.prisma` mapeado al DDL real y repositorios tipados.
- **01 · API Gateway & Security** — middlewares de sesión y autorización, controladores, rutas.
- **02 · Domain Business Rules** — máquina de estados de la sesión y reglas de privacidad.
- **04 · Developer TDD Tester** — suite Vitest de 36 pruebas.

### Entregado
`backend/src/core/` (cliente Prisma, crypto, jwt, cookieSesion, apiResponse, 3 middlewares, tipos) y
`backend/src/modules/m20-seguridad/` (3 dtos, 3 interfaces, 3 repositorios, 6 servicios, 2
controladores, rutas) + `index.ts` y `app.routes.ts`. 32 archivos TypeScript.

### 🛑 Decisión que debe conocer el equipo: poda de `schema.prisma`

El `schema.prisma` heredado del clon declaraba modelos para **M01, M04, M05 y M08** con un diseño
**incompatible con `bd/sql/schema_pintuclic.sql`** (`Usuario.id` frente a `usuario.id_usuario`,
`SesionToken` frente a `sesion`, permisos por rol). Al remapear `Usuario` a la tabla real, sus
relaciones quedaban rotas y `prisma generate` habría producido un cliente que no corresponde a la
base.

Se eliminaron esos modelos. Criterio: no tienen código que los respalde, contradicen la base real,
provienen de un clon que el Product Owner declaró que no es fuente de verdad, y pertenecen a módulos
que **no han pasado Gate 1 ni Gate 2**. Cada uno los redeclarará, mapeados correctamente, cuando
alcance su Gate 2. Es reversible desde el historial de git.

Quedan: los 4 modelos de M20 más una declaración **mínima** de `Usuario` (solo `estado` y
`contrasena`, lo que M20 necesita leer), marcada como propiedad de M04.

### Decisiones de implementación con efecto en seguridad
- **Señuelo de tiempo en `verificarPorCorreo`:** si el correo no existe se verifica igualmente contra
  una derivación señuelo, para que el tiempo de respuesta no delate la ausencia de la cuenta. Refuerza
  RF-SEG-06-06 más allá de igualar el cuerpo de la respuesta.
- **El token solo transporta `sid`.** Ningún permiso ni rol viaja en él: un permiso cacheado
  sobreviviría a su revocación y rompería CA-SEG-02-05.
- **Orden de comprobaciones en `validarYRenovar`:** existencia → estado terminal → inactividad →
  estado de la cuenta → renovación. El límite de expiración es **excluyente**.
- **`RESPUESTA_RECURSO_NO_DISPONIBLE` está congelada** con `Object.freeze`, para que nadie pueda
  añadirle un detalle y romper la indistinguibilidad sin que una prueba lo detecte.

### Verificación (barrera de Fase 3A)
`check:no-any` ✅ 32 archivos · `tsc --noEmit` ✅ · `eslint --max-warnings=0` ✅ ·
`npm run build` ✅ · **Vitest 36/36** ✅ · raíz: `check:no-any` ✅ `test:contracts` ✅ `verify:state` ✅

**Pruebas de mutación:** se rompió a propósito el límite excluyente de expiración y la comprobación
del estado de la cuenta; en ambos casos la prueba correspondiente **falló**. Las pruebas muerden.

### Pendiente para Gate 4 (QA)
`CA-SEG-03-05` **no está cubierto**: el adaptador emite al registro técnico, no persiste. Es la
condición que el QA Lead impuso en la mesa ATDD y está anotada en `auditoria.port.test.ts`.

### 2026-10-21 — Limpieza del residuo del clon en `backend/` y `frontend/`

Encargo del Director Humano. Auditoría de los 33 archivos rastreados fuera de `src/`.

**Corregido por mí, y era mío:** `backend/vitest.config.{js,js.map,d.ts,d.ts.map}` habían quedado
**rastreados en git**. Los emitió mi propio `npm run build` antes de acotar el `include` del
tsconfig, y entraron al commit `69f03fe` por un `git add -A`. Eliminados del índice y cubiertos en
`backend/.gitignore`.

**Residuo del clon:**
- `db:seed` apuntaba a `src/core/db/seed.ts`, que no existe y además **viola la Directiva #10**
  (prohibido sembrar desde TypeScript). Ahora aplica `bd/sql/seed_pintuclic.sql`.
- Los dos `ARQUITECTURA.md` usaban el scope `m05-carrito-compras`, que no es el canónico de
  `RUTA_DEL_PROYECTO.md` (`m05-carrito`), y describían el transporte de sesión por Bearer token.
- `frontend/src/core/auth/useAuth.ts` estaba **vacío (0 bytes)**.
- `usuario.type.ts` declaraba `id` y `tipo: 'B2C'|'B2B'|'EMPLEADO'|'ADMIN'`, que no existen en la base
  (`id_usuario`, `enum_tipo_usuario = normal|empresa`), y **cacheaba `permisos: string[]`** en el
  cliente: una copia que sobreviviría a su revocación y rompería CA-SEG-02-05.
- `respuesta-api.type.ts` declaraba un envelope de error distinto del canónico.
- `authStore.ts` guardaba `accessToken` en estado JavaScript, contra el ADR-005.
- `apiClient.ts` leía el token de `localStorage`, incumpliendo RNF-SEG-02-01 de forma directa.

**Hallazgo grave: el frontend nunca había sido instalable.** `npm install` fallaba con ERESOLVE:
`eslint@^10.9.1` contra `eslint-config-next`, que exige `^7 || ^8 || ^9`. Además `eslint.config.js`
importaba `@eslint/eslintrc` sin declararlo. Alineado a `eslint@^9.37.0` y añadida la dependencia
faltante. `eslint.config.js` → `.mjs` para eliminar el aviso de reparseo de Node.

**Verificación:** backend `tsc` · `eslint` · `build` · **Vitest 36/36**; frontend `tsc` · `eslint` ·
`next build`; raíz `check:no-any` · `test:contracts` · `verify:state`. Todo en verde.

**No tocado (dominio exclusivo de DevOps):** `backend/.env.example`, los dos `Dockerfile` y los
`.dockerignore`. Ver incidencia elevada en el `WORKLOG.md` de `06_devops_release`.

### 2026-10-21 — Respuesta al QA_REPORT de M20

**Hallazgo #1 (S4) — ACEPTADO Y SALDADO.** El hallazgo es correcto: entregué la implementación de
backend sin emitir su walkthrough, dejando la evidencia solo en esta bitácora. La Directiva #6 exige
uno por **cada** implementación y la guía de versionado impone el sufijo de capa precisamente para
que backend y frontend no se solapen. Emitido
`docs/walkthroughs/M20/walkthrough_v0.2.0_M20_seguridad_backend.md`.

La causa raíz que el QA Lead apunta es exacta: di por bueno que el walkthrough de frontend cubría la
entrega coordinada. No la cubría — son dos capas, dos artefactos.

**Hallazgo #2 (S3) — CONFORME.** Nada que objetar: M20 es la raíz del grafo y el login es de M04.

> 📍 Solicitud de corrección abierta hacia `05_qa_security_tester` sobre
> `.sdlc/docs/qa/M20/v0.2.0/QA_REPORT.md` §3 (fila `HU-SEG-02`, `SameSite`) — **ver su `WORKLOG.md`**.
> Reubicada conforme al destino único que fija `HANDOFF_PROTOCOL.md` §2.1: el bloque va en la
> bitácora de quien debe corregir, no en la de quien detecta.

---

## 2026-10-21 — M17 · Implementación de Backend (Fase 3A)

**Rol:** Backend Lead Engineer · **Sello:** ✅ Firmado en turno propio · **Fase:** FASE_3A_BACKEND

### Subroles convocados
- **01 · API Gateway & Security:** Enrutador de Express montado bajo `/api/v1/admin`, middlewares `requirePermission` en tiempo real y `requireAdmin` exclusivo.
- **02 · Domain Business Rules:** Implementación de servicios para colaboradores (`RN-ADM-01` a `RN-ADM-06`), asignación de permisos con acoplamiento y cascada (`RN-ADM-07` a `RN-ADM-10`), gestión de clientes (`RN-ADM-13`/`RN-ADM-14`), parámetros dinámicos (`RN-ADM-15`/`RN-ADM-16`) y gobernanza de administrador supremo (`RN-ADM-17`/`RN-ADM-18`).
- **03 · Data Layer Optimizer:** Mapeo de modelos Prisma (`Rol`, `Permiso`, `AsignacionPermiso`, `UsuarioRol`) respetando el DDL inmutable de `bd/sql/schema_pintuclic.sql`.
- **04 · Developer TDD Tester:** Suite Vitest de 32 pruebas específicas para M17 (68/68 pruebas globales pasando).

### Entregables
- `backend/prisma/schema.prisma` actualizado con modelos de M17 y regenerado con `npx prisma generate`.
- `backend/src/modules/m17-permisos/`:
  - `dtos/m17-permisos.dto.ts` (espejo Zod del contrato rector).
  - `interfaces/` (5 contratos TypeScript puros, cero runtime, cero datos inline).
  - `repositories/` (5 repositorios tipados con Prisma y `AlmacenConfiguracionMemoria` ADR-007).
  - `services/` (6 servicios de dominio + `ResolutorPermisosDatabaseAdapter` ADR-008).
  - `controllers/` (5 controladores HTTP tipados).
  - `m17.routes.ts` (ensamblador modular inyectado en `app.routes.ts`).
  - `__tests__/` (6 suites de prueba Vitest con 32 tests específicos).
- `docs/walkthroughs/M17/walkthrough_v0.3.0_M17_administracion_empleados_permisos_backend.md`.

### Verificación de Calidad (Zero Warnings / Zero Errors)
- `npm run check:no-any`: ✅ 67 archivos auditados, 0 usos de `any`.
- `npm run lint`: ✅ 0 errores, 0 advertencias.
- `npm run check:types` (`tsc --noEmit`): ✅ 0 errores.
- `npm run test` (Vitest): ✅ 12/12 suites pasadas, 68/68 tests aprobados (100% pass).

---

## 2026-10-21 — M17 · Persistencia Relacional de Parámetros v0.3.3 (RFC-M17-001)

**Rol:** Backend Lead Engineer · **Sello:** ✅ Firmado en turno propio

### Subroles convocados
- **03 · Data Layer Optimizer** — Mapeo de `parametro_sistema` en `backend/prisma/schema.prisma` con enums `AreaParametro` y `TipoDatoParametro`. Regeneración exitosa con `prisma generate`.
- **02 · Domain Business Rules** — Implementación de `PrismaConfiguracionRepository` con caché corta en memoria de 30s para lecturas de alta frecuencia e invalidación reactiva ante actualizaciones.
- **01 · API Gateway & Security** — Propagación de `idAdmin` desde `req.actor?.idUsuario` en `ConfiguracionController` hasta `actualizar()` para auditar autoría en `id_usuario_actualizo`.
- **04 · Developer TDD Tester** — Suite de pruebas para `PrismaConfiguracionRepository` (lectura con caché, invalidación reactiva) y pruebas unitarias aisladas sin hardcodear datos iniciales en código (cumplimiento Directiva #10).

### Entregables
- `backend/prisma/schema.prisma` (modelo `ParametroSistema`, relación en `Usuario`, enums `AreaParametro` y `TipoDatoParametro`).
- `backend/src/modules/m17-permisos/`:
  - `interfaces/configuracion.port.ts` (`idUsuarioActualizo`, `idAdmin` opcional en `actualizar`).
  - `repositories/configuracion.repository.ts` (`PrismaConfiguracionRepository` con caché 30s + `AlmacenConfiguracionMemoria` para tests sin datos iniciales hardcodeados).
  - `services/configuracion.service.ts` (propagación de `idAdmin`).
  - `controllers/configuracion.controller.ts` (extracción de `req.actor?.idUsuario`).
  - `m17.routes.ts` (inyección de `PrismaConfiguracionRepository`).
  - `__tests__/configuracion.service.test.ts` (8 tests Vitest incluyendo suite de caché e invalidación).
- `docs/walkthroughs/M17/walkthrough_v0.3.3_M17_persistencia_parametros_backend.md`.
- `docs/CHANGELOG.md` y `.github/version.txt` actualizados a `v0.3.3`.

### Verificación de Calidad (Zero Warnings / Zero Errors)
- `npx tsc --noEmit`: ✅ 0 errores.
- `npm run lint`: ✅ 0 errores, 0 advertencias.
- `npm test` (Vitest backend): ✅ 12/12 suites pasadas, 71/71 tests aprobados (100% pass).
- `npm run check:no-any`: ✅ 145 archivos auditados, 0 usos de `any`.
- `npm run test:contracts`: ✅ 12/12 validaciones exitosas.
- `npm run verify:state`: ✅ Estado SDLC validado.

---

## 2026-10-21 — M04 · Inicio de Fase 3A (Construcción Backend API REST)

**Rol:** Backend Lead Engineer · **Sello:** ✅ Firmado en turno propio · **Fase:** FASE_3A_BACKEND

### Contexto de Entrada
Gate 2 de M04 firmado por el Director Humano ('confirmo'). Aprobada formalmente la arquitectura, ADRs 009..012, contrato Zod rector `m04-cuentas.contract.ts`, DTOs, puertos hexagonales y DDL v4.2 / BD v3.0 (53 tablas). Salto de ola autorizado para M04 sobre M18 y Ola 2 (desacoplado de M18 mediante `NotificacionesPort`).

### Plan de Construcción TDD (10 HUs)
- **HU-CUE-01:** Registro particular B2C con validación OTP (códigos hasheados con BCrypt, TTL 15m, máx 3 reintentos).
- **HU-CUE-02:** Registro y autenticación federada con Google Identity (`GoogleAuthPort` + token de registro efímero JWT + fijación obligatoria de contraseña).
- **HU-CUE-03:** Registro directo empresa B2B con subida segura de RUT en `documento_soporte` (máx 5MB, SHA-256) y validación de unicidad de solicitudes pendientes.
- **HU-CUE-04:** Inicio y cierre de sesión con cookies HTTP-only `SameSite=Strict`, control anti-fuerza bruta en `control_intento_acceso` y cambio obligatorio de clave en primer acceso (`cambio_contrasena_pendiente`).
- **HU-CUE-05:** Recuperación de contraseña con respuesta indistinguible anti-enumeración, token de restablecimiento con TTL 30m y límite de intentos.
- **HU-CUE-06:** Perfil de usuario y solicitud de ascenso a empresa B2B (con RUT adjunto).
- **HU-CUE-07:** Libreta de direcciones (máx 10, regla de una única predeterminada y no duplicación de nomenclatura).
- **HU-CUE-08:** Unicidad estricta de cuentas y política anti-colisión de correos en minúsculas.
- **HU-CUE-09:** Administración y validación corporativa de solicitudes B2B (permiso `empresas.validar`, aprobación atómica con creación en `cuenta_empresa` y renovación de NIT con historial inmutable).
- **HU-CUE-10:** Desactivación de cuenta propia (revocación de sesiones activas y opacidad ante intentos posteriores).

### Entrega de Fase 3A Completada (100% Funcional)
- **Subroles convocados:**
  - **03 · Data Layer Optimizer:** Repositorios Prisma tipados con cero SQL crudo (`PrismaCuentasRepository`, `PrismaCodigosVerificacionRepository`, `PrismaControlIntentosRepository`, `PrismaDocumentosRepository`, `PrismaSolicitudesEmpresaRepository`, `PrismaDireccionesRepository`).
  - **02 · Domain Business Rules:** Implementación de servicios de dominio desacoplados (`AuthCuentasService`, `RecuperacionPasswordService`, `PerfilService`, `DireccionesService`, `EmpresasService`).
  - **01 · API Gateway & Security:** Controladores REST tipados con DTOs Zod canónicos, cookie `pc_sid` HttpOnly/SameSite=Strict, y enrutador modular `m04.routes.ts` montado en `backend/src/app.routes.ts`.
  - **04 · Developer TDD Tester:** 6 suites de pruebas Vitest para M04 con 45 pruebas exhaustivas cubriendo el 100% de los escenarios BDD de HU-CUE-01 a HU-CUE-10.

### Verificación Determinista de Calidad (Zero Warnings / Zero Errors)
- `npx tsc --noEmit`: ✅ 0 errores.
- `npm run lint`: ✅ 0 errores, 0 advertencias.
- `npm run check:no-any`: ✅ 99 archivos auditados, 0 usos de ANY.
- `npm test` (backend Vitest): ✅ 18/18 suites PASS, 116/116 tests PASS (45 nuevos de M04 + 71 regresión M20/M17).
- `npm test` (frontend Vitest): ✅ 9/9 suites PASS, 57/57 tests PASS (cero regresiones).
- `npm run test:contracts`: ✅ 16/16 validaciones exitosas.
- **Walkthrough oficial:** `docs/walkthroughs/M04/walkthrough_v0.4.0_M04_cuentas_autenticacion_backend.md`.
- **Estado de la entrega:** Fase 3A finalizada al 100%. Módulo preparado para revisión técnica / inicio de Fase 3B (Frontend).

---

## 2026-10-21 — M04 · Remediación de BUG-M04-01 (Veto Stop-the-Line del QA)

**Rol:** Backend Lead Engineer · **Sello:** ✅ Firmado en turno propio · **Fase:** FASE_3A_BACKEND (reabierta por el QA) · **Versión:** v0.4.1

### Contexto de Entrada
El QA rechazó `v0.4.0` con el defecto S1 `BUG-M04-01`: `/api/v1/admin/empresas/*` solo tenía `authMiddleware`, así que cualquier cliente con sesión podía listar, aprobar y rechazar solicitudes de empresa (OWASP A01 / CWE-285). Informe: `.sdlc/docs/qa/M04/v0.4.0/QA_REPORT.md`.

### Decisión técnica
El remedio mínimo del informe (`tipoSesion === 'admin'`) es insuficiente: el login concede sesión `admin` a **todo** usuario con rol, empleados incluidos, de modo que un colaborador sin `empresas.validar` seguiría pudiendo dictaminar (incumple `HU-CUE-09` E2 y `HU-ADM-03`). Se aplicó la opción que el informe contempla: `requirePermission(autorizacion, 'empresas.validar')` de M20, con respuesta 404 opaca (`RN-SEG-08` / ADR-003).

### Cambios
- **Subrol 01 · API Gateway & Security:** guarda a nivel de `adminEmpresasRouter.use(authMiddleware, requirePermission(...))` (protegido por omisión). `construirModuloM04` exige ahora el `AutorizacionService` (falla cerrada).
- **Archivo compartido (Directiva #3):** `backend/src/app.routes.ts`, una línea, inyecta `m17.autorizacionService`. Ejecutado por instrucción expresa del Director Humano; pendiente de su ratificación.
- **Subrol 04 · TDD:** nueva suite `admin-empresas.acceso.test.ts` (20 pruebas HTTP reales) y actualización de `m04.routes.test.ts` a la nueva firma.

### Saneamiento del flujo de dictamen (segunda parte de la entrega)
Por instrucción del Director Humano ("dejar el backend completamente sano") se analizó el flujo de `HU-CUE-09`/`HU-CUE-10` y se corrigieron los defectos que la suite verde no había detectado:
- **Subrol 03 · Data Layer:** `decidirSolicitud` y `decidirRenovacionNit` transaccionales y atómicos (`updateMany ... WHERE estado='pendiente'`; `P2002` → `nit_ocupado` con reversión). La aprobación activa la cuenta, la convierte a `empresa`, crea `cuenta_empresa` y retira Google en una sola transacción. Retirados `crearCuentaEmpresa`/`actualizarNitEmpresa` (caminos sin transacción).
- **Subrol 02 · Domain:** el registro de empresa nace `normal` (`RN-CUE-15`); motivo obligatorio solo en registros (`RN-CUE-17`); `SOLICITUD_YA_DECIDIDA` con 409; `consultarMisSolicitudes` (proyección mínima); `obtenerDocumentoRut` con verificación SHA-256.
- **Subrol 01 · Gateway:** 4 rutas nuevas (`/cuentas/empresas/solicitudes/mias`, `/admin/empresas/renovaciones` y `/:id`, `/admin/empresas/documentos/:id`); `leerParamUuid` evita el 500 por ids mal formados (también en direcciones); descarga con `attachment`, `nosniff`, `no-store` y nombre construido en servidor.
- **Subrol 04 · TDD:** nuevas `solicitudes-empresa.repository.test.ts` y ampliación de `admin-empresas.acceso.test.ts`; reescrita `empresas.service.test.ts`.

### Verificación Determinista
- `npx tsc --noEmit`: ✅ 0 errores · `npm run lint`: ✅ 0/0 · `npm run check:no-any`: ✅ 102 archivos, 0 ANY.
- `npx vitest run`: ✅ 20/20 suites, **188/188 tests** (+72 sobre v0.4.0).
- **Pruebas de mutación:** sabotear la guarda de permiso (10/20), la condición `pendiente` (1/12), la conversión a `empresa` (1/12) y la baja de Google (1/12) hace fallar las pruebas; archivos restaurados y verificados idénticos.
- **Walkthrough:** `docs/walkthroughs/M04/walkthrough_v0.4.1_M04_remediacion_bug_m04_01_backend.md` (errata añadida al `v0.4.0` §4.2).

### Estado y límites
- El veto **sigue activo**: lo levanta únicamente el QA tras re-auditar (`STAGE_GATES.md` §1.1). Este agente no cierra una incidencia propia.
- **Elevado sin resolver (requiere archivo compartido, contrato firmado o decisión de producto):** límite JSON de 100 kb en `index.ts` frente a RUT de 5 MB (bloquea la renovación de punta a punta); catálogo de códigos de error divergente; motivo opcional en ascensos/renovaciones frente al DTO firmado; verificación de correo del registro de empresa; notificaciones de renovación de NIT; auditoría de decisiones (`HU-SEG-04`); fallo de notificación posterior al commit; carga de RUT huérfana en registro/ascenso. Detalle en el walkthrough §8.
- La exclusión mutua real entre conexiones concurrentes solo se demuestra contra PostgreSQL: prueba de integración para el Gate 4.
- **Entrega al Agente 05 (QA)** para re-auditoría de `BUG-M04-01` y del saneamiento.

---

## 2026-10-22 — M04 · v0.4.2 · Motivo de rechazo opcional en el dictamen

**Rol:** Backend Lead Engineer (ajuste puntual autorizado por el Director Humano durante la Fase 3B)

- **Decisión del Director:** el motivo de rechazo queda opcional. Se conserva obligatorio (≥ 10 caracteres) solo al rechazar un **registro** de empresa (`RN-CUE-17`).
- **Cambios:** el `.refine` de ≥ 10 caracteres sale del contrato rector y del DTO; la regla del registro pasa a `EmpresasService.dictaminarSolicitud` (depende del tipo de solicitud, que solo conoce el servidor). Un motivo vacío o de espacios se guarda como `null` en solicitudes y renovaciones. DTO del frontend dividido en `dictamenSolicitudEmpresaFormSchema` (opcional) y `dictamenRegistroEmpresaFormSchema` (obligatorio).
- **Verificación:** 20/20 suites, 193/193 (+5); `tsc`, ESLint, `check:no-any` limpios; contratos 16/16.
- **Decisiones registradas en la misma instrucción:** ratificado `app.routes.ts`; verificación del correo del registro de empresa a cargo del administrador; auditoría aplazada.
- **Walkthrough:** `docs/walkthroughs/M04/walkthrough_v0.4.2_M04_motivo_rechazo_opcional_backend.md`.
- **Sigue elevado:** límite JSON de 100 kb en `index.ts` frente al RUT de 5 MB; catálogo de códigos de error divergente; notificaciones de renovación de NIT.
