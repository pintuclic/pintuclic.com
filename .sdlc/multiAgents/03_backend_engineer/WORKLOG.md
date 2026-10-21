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


