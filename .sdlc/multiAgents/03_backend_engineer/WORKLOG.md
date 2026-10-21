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

> ⚠️ **SOLICITUD DE CORRECCIÓN (FEEDBACK LOOP)**
> **De:** `03_backend_engineer` · **Para:** `05_qa_security_tester`
> **Artefacto:** `.sdlc/docs/qa/M20/v0.2.0/QA_REPORT.md` §3, fila `HU-SEG-02`
> **Motivo:** el reporte consigna la cookie de sesión como **`SameSite=Lax`**. El valor implementado
> es **`Strict`**, tanto en `backend/src/core/utils/cookieSesion.ts:13` como en el contrato
> `m20-seguridad.contract.ts:146`, donde está fijado con `z.literal('strict')`.
> **Por qué importa:** no es un matiz de redacción. `Lax` permite el envío de la cookie en
> navegaciones de nivel superior desde otro sitio; `Strict` no. Un reporte de seguridad que registre
> una propiedad anti-CSRF más débil de la real puede inducir a reforzar algo que ya está reforzado, o
> a asumir esa defensa al auditar otro módulo.
> **Acción requerida:** corregir la celda. No altero el artefacto porque la potestad sobre el
> dictamen es exclusiva del QA Lead.
