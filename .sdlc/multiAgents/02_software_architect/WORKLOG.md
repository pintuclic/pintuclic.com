# 📝 WORKLOG — 02_SOFTWARE_ARCHITECT

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado para diseño modular C4, contratos Zod API-First, DDL de persistencia y aislamiento de seguridad.

---

## 2026-10-21 — M20 · Dictamen consultivo en mesa ATDD

**Rol:** Software Architect Lead · **Sello:** 🪑 Consultado en mesa (escenario C-1)

Convocado por `01_product_manager` para certificar la testabilidad de los 36 escenarios BDD de M20
antes de Gate 1. **Dictamen: CONFORME CON RESERVA.**

Cuatro escenarios no son observables sin una decisión de contrato o de modelo, y las asumo como
compromiso propio para los entregables de Gate 2:

1. **`CA-SEG-03-06` (indistinguibilidad)** — el envelope de recurso inexistente y el de autorización
   denegada deben ser **el mismo objeto**, no dos ramas que coincidan por casualidad. Va al contrato.
2. **Estado y `motivo_cierre` de la sesión** — campos persistidos, no derivados; si no, el Escenario 4
   de HU-SEG-02 (cuenta desactivada) no es comprobable.
3. **`CA-SEG-05-05` (desvinculación de identidad)** — debe definirse como invariante sobre el modelo:
   la orden conserva importes y fechas, y ningún campo permite remontar al titular.
4. **Atributos de la cookie de sesión** — fijados en el contrato, para que el Escenario 8 de
   HU-SEG-02 sea aserción automatizable y no inspección manual.

> Esta firma es **consultiva**. No he ejecutado la Fase 2 ni aprobado compuerta alguna.

---

## 2026-10-21 — M20 · Entregables de Gate 2

**Rol:** Software Architect Lead · **Sello:** ✅ Firmado en turno propio · **Fase:** FASE_2_ARQUITECTURA

### Subroles convocados
- **01 · System & Modular Topologist** — 4 ADRs y el mapa de rutas canónicas.
- **02 · Relational Data & DDL Modeler** — reconciliación Prisma ↔ DDL de `bd/`.
- **03 · API Contracts & Protocol Designer** — `docs/contracts/m20-seguridad.contract.ts`.
- **04 · Security & Multi-Tenant Architect** — matriz RBAC por permiso atómico e indistinguibilidad.

### Entregables
- `docs/modules/M20/04_ARQUITECTURA_Y_CODIGO.md`
- `docs/contracts/m20-seguridad.contract.ts` — validado y compilado con `tsc --strict`, 0 errores
- `docs/adrs/ADR-002` … `ADR-005`

### Hallazgo principal
**M20 no requiere ningún cambio de DDL.** Con HU-SEG-04 aplazada, las cuatro tablas que necesita
(`sesion`, `aviso_privacidad`, `consentimiento_usuario`, `solicitud_supresion`) **ya existen** en
`bd/sql/schema_pintuclic.sql`, con sus enums comentados con los propios identificadores de requisito
(`RF-SEG-02-02`, `-03`, `-06`). El DDL fue escrito contra esta misma especificación. Resuelve también
el conflicto que el PM elevó en Gate 1: `usuario.contrasena NOT NULL` es **correcto** bajo RN-SEG-02.

### Las 4 reservas de la mesa ATDD, resueltas
1. **Indistinguibilidad** → `RESPUESTA_RECURSO_NO_DISPONIBLE`, un único objeto exportado que ambas
   ramas devuelven. No son dos respuestas equivalentes: es la misma (ADR-003).
2. **Estado y motivo de cierre de la sesión** → campos persistidos en `Sesion`, no derivados.
3. **Desvinculación de identidad** → declarada como invariante del modelo, verificable consultando la
   orden tras la supresión. **Toca a M08**, que aún no existe: queda como contrato que M08 honrará.
4. **Atributos de la cookie** → fijados en el contrato (`ATRIBUTOS_COOKIE_SESION`), no en la
   implementación, para que el Escenario 8 sea aserción y no inspección (ADR-005).

### Incidencia elevada
La invariante de desvinculación **alcanza al modelo de M08 (Orden de Venta)**, de la Ola 4. M20 no
crea ni modifica esa tabla: deja el contrato declarado. Cuando M08 entre en Gate 2, su arquitecto
debe honrarlo o abrir un Feedback Loop.

### Alto mecánico
Turno detenido conforme a la Regla de Oro #10 y `STAGE_GATES.md` §3 (Gate 2).

---

## 2026-10-21 — M17 · Entregables de Gate 2

**Rol:** Software Architect Lead · **Sello:** ✅ Firmado en turno propio · **Fase:** FASE_2_ARQUITECTURA

### Contexto de entrada
El Director Humano firmó el Gate 1 de M17, habilitando formalmente la Fase 2 de Arquitectura. El módulo define el modelo de permisos atómicos individuales por colaborador, gobernanza de administrador y parámetros del sistema.

### Subroles convocados
- **01 · System & Modular Topologist:** 3 ADRs (`ADR-006`, `ADR-007`, `ADR-008`), topología modular y mapa de rutas canónicas REST.
- **02 · Relational Data & DDL Modeler:** Mapeo de tablas de roles y permisos (`rol`, `permisos`, `asignacion_permiso`, `usuario_rol`) en `backend/prisma/schema.prisma` respetando el DDL de `bd/sql/schema_pintuclic.sql` sin alteraciones.
- **03 · API Contracts & Protocol Designer:** Redacción formal de `.sdlc/docs/contracts/m17-permisos.contract.ts` con tipado bidireccional Zod, cero `any` y envelopes canónicos.
- **04 · Security & Multi-Tenant Architect:** Opacidad absoluta en respuestas 403 (`RESPUESTA_ACCESO_DENEGADO_OPACA`), bypass para admin raíz y resolución dinámica en tiempo real (`ResolutorPermisosDatabaseAdapter`).

### Entregables dejados en disco
- `.sdlc/docs/modules/M17/04_ARQUITECTURA_Y_CODIGO.md`: Especificación técnica completa, modelos Prisma, mapa de rutas y estructura de capas de backend y frontend.
- `.sdlc/docs/contracts/m17-permisos.contract.ts`: Contrato Zod oficial para las 7 HUs de M17.
- `.sdlc/docs/adrs/ADR-006-modelo-permisos-individuales-sobre-ddl.md`: Mapeo de permisos individuales por empleado sobre el DDL bloqueado de `bd/`.
- `.sdlc/docs/adrs/ADR-007-puerto-almacen-configuracion.md`: Patrón de Puertos y Adaptadores para configuración general sin tabla en DDL.
- `.sdlc/docs/adrs/ADR-008-resolutor-permisos-en-caliente.md`: Implementación en tiempo real del puerto `ResolutorPermisos` para M20.

### Hallazgos y Resoluciones Arquitectónicas
1. **Permisos individuales sin tocar DDL (`ADR-006`):** Se aprovecha la relación 1:1 `usuario_rol` asociando a cada empleado su propio perfil de asignación atómica en `asignacion_permiso`.
2. **Configuración sin tabla DDL (`ADR-007`):** Se introduce `ConfiguracionPort` con `AlmacenConfiguracionMemoria` precargado con el catálogo tipado del contrato, listo para sustitución por tabla SQL futura sin impacto en llamadores.
3. **Integración limpia con M20 (`ADR-008`):** Se implementa el puerto `ResolutorPermisos` que `AutorizacionService` dejó listo en M20, resolviendo la comprobación en tiempo real contra la base de datos sin cachear privilegios en JWT.

### Alto mecánico (Rule #10 y STAGE_GATES.md §3)
Turno detenido. `current_state.json` actualizado a `FASE_2_ARQUITECTURA` / `GATE_2_ARQUITECTURA_APPROVAL` en estado `ESPERANDO_APROBACION_HUMANA`.

---

## 2026-10-21 — M04 · Cambios de modelo de datos aprobados (Fase 2, parcial)

**Rol:** Software Architect Lead (ejecutado por **instrucción expresa del Director Humano**; el turno de Gate 2 no ha comenzado formalmente) · **Fase:** FASE_2_ARQUITECTURA

### Contexto de entrada
El Director Humano firmó el Gate 1 de M04 y aprobó, sobre `RFC-M04-001`, la tabla `cuenta_empresa` (C-1) y el almacenamiento del RUT en base de datos, opción A (C-3). `ADR-006` y `ADR-007` declaran que el DDL de `bd/` está bloqueado sin RFC; el RFC firmado es ese rastro.

### Subroles convocados
- **02 · Relational Data & DDL Modeler:** diseño e implementación de las dos tablas y sus restricciones.

### Entregables dejados en disco
- `bd/sql/schema_pintuclic.sql` → **v4.0 / 51 tablas:** `cuenta_empresa` (1:1 con `usuario`, `nit` UNIQUE), `documento_soporte` (BYTEA con `CHECK` de tipo, tamaño ≤ 5 MB, huella SHA-256 e integridad de tamaño) y `solicitud_actualizacion_nit.id_documento` (FK RESTRICT). Migración idempotente.
- `bd/sql/seed_pintuclic.sql` → **v4.0:** `cuenta_empresa` rellenada desde las solicitudes aprobadas; RUT de ejemplo en `documento_soporte`.
- `bd/docs/DOCUMENTACION_BASE_DATOS.md`, `WALKTHROUGH_DATABASE.md`, `CHANGELOG_DATABASE.md` → versión **2.8**, ER, diccionario (módulo 9 de M04) y enums.

### Decisiones
1. **Variación frente al RFC:** en lugar de `id_documento NOT NULL`, imposible mientras existan solicitudes anteriores que solo tienen URL, se aplicó el `CHECK` transitorio `ck_solicitud_nit_adjunto`. La garantía de base de datos se mantiene y pasará a `NOT NULL` al retirar la columna URL.
2. **Interpretación de la instrucción:** se entendió "tabla cuenta_empresa… opción A" como C-1 **y** C-3 opción A (las decisiones 5 y 4 del Director). C-2 y C-4…C-9 **no** se aplicaron.
3. **`cuenta_empresa` usa `id_usuario` como PK** en lugar de `id_[tabla]`, por ser extensión 1:1 de `usuario`.

### Verificación (PostgreSQL 18.6, clúster desechable)
Instalación limpia y actualización de una base 3.9, ambas con esquema y seed dos veces y `ON_ERROR_STOP=1`: código 0. **10/10** inserciones inválidas rechazadas por la restricción prevista; **exactamente 5 MB** aceptado y 5 MB + 1 byte rechazado.

### Pendiente (no hecho)
- `backend/prisma/schema.prisma` (archivo **compartido**, Directiva #3) y el contrato Zod `m04-cuentas.contract.ts`.
- Cambios C-2 y C-4…C-9 del RFC, sujetos a decisión del Director.
- Dictamen del Arquitecto en la mesa ATDD (sigue pendiente; no se redacta en este turno).
- Errata: `GUIA_REFACTORIZACION_BD.md` y `WALKTHROUGH_DATABASE.md` aún citan **Kysely**; el stack vigente es **Prisma 6**.

---

## 2026-10-21 — M17 · Tabla de parámetros de configuración general (RFC-M17-001)

**Rol:** Software Architect Lead (ejecutado por **instrucción expresa del Director Humano**) · **Fase:** FASE_2_ARQUITECTURA (turno de M04; este cambio pertenece a M17)

### Contexto de entrada
El Director preguntó qué tendría la tabla de parámetros y, tras la propuesta, ordenó *"dale, hagamoslo, haz la tabla, y redacta el RFC"*. `ADR-007` había dejado el catálogo en un `Map` en memoria por falta de tabla y `ADR-006/007` declaran `bd/` bloqueado sin RFC.

### Entregables dejados en disco
- `bd/sql/schema_pintuclic.sql` y `seed_pintuclic.sql` → **v4.1 / 52 tablas:** `parametro_sistema`, 2 enums nuevos, restricciones de tipo y rango, índice y 10 filas leídas del catálogo real de M17.
- `bd/docs/` (documentación, walkthrough y changelog) → versión **2.9**.
- `.sdlc/docs/modules/M17/RFC-M17-001_tabla_parametros.md`.

### Decisiones
1. **`JSONB` para `valor` y `valor_por_defecto`** (frente a columnas tipadas o `TEXT`): la base impone tipo y rango con 2 columnas en vez de 6.
2. **`CASE WHEN` en las comprobaciones de rango**, porque PostgreSQL no garantiza el orden de `AND`/`OR`.
3. **Sin disparador para `fecha_actualizacion`**, siguiendo la convención del esquema; debe fijarla la aplicación.
4. **Sin tabla de historial**, por la aplazada `HU-SEG-04`.

### Verificación (PostgreSQL 18.6, clúster desechable)
Instalación limpia y actualización de bases en v4.0 y v3.9, esquema y seed dos veces: código 0 y mismo estado final. **15/15** valores inválidos rechazados; límites exactos aceptados; parámetros nuevos de texto y booleano sin tocar el DDL.

### Pendiente (no hecho)
- `backend/prisma/schema.prisma` (compartido) y todo el código de `m17-permisos`: lo aplica el equipo de M17 según RFC-M17-001 §5.
- Sin resolver: rango 8–32 de la complejidad de contraseña frente al piso de 12 de M20.

---

## 2026-10-21 — Revisión de defectos: fecha automática, rango de contraseña y documentación de BD

**Rol:** Software Architect Lead (ejecutado por **instrucción expresa del Director Humano**, que además autorizó tocar archivos de otros módulos **solo si era necesario**) · **Fase:** FASE_2_ARQUITECTURA

### Alcance recibido
"antes de hacer el commit, ayudame con los defectos, la alineacion del rango y la documentacion de la BD".

### Entregables
- **`bd/sql/` (v4.1):** disparador `trg_parametro_sistema_fecha`; rango 12–32 en el seed con corrección para bases ya sembradas; definición duplicada de `presentacion` eliminada.
- **Archivos de otro módulo tocados (autorizado, necesario):** `m17-permisos/repositories/configuracion.repository.ts` (una línea del catálogo) y `m17-permisos/__tests__/configuracion.service.test.ts` (2 pruebas). `m20-seguridad` solo se **lee** desde la prueba.
- **`bd/docs/`:** diccionario completo (52 de 52 tablas), enum `enum_clase_color`, diagrama ER con las 7 entidades que faltaban, FKs reales de `producto` y `variante`, y corrección de Kysely a Prisma en la guía y en la documentación vigente.
- RFC-M17-001 §9 y los hallazgos `F-13`/`P3` de M04 actualizados.

### Decisiones
1. **Disparador en lugar de dejarlo a la aplicación.** El requisito de la fecha es del dato, y la base puede garantizarlo; se documentó como convención nueva porque es el primero del esquema.
2. **Se incorpora a la v2.9 y no a una v2.10**, porque nada se ha publicado.
3. **No se tocó M20.** Se detectó que su mínimo de contraseña está fijo en `.min(12)` y no lee el parámetro: queda como observación, no como cambio.
4. **Las entradas históricas de Kysely no se reescribieron:** describen el stack de su fecha. Solo se corrigieron las vigentes (guía, plantilla y sección de recomendaciones).

### Verificación (PostgreSQL 18.6, clúster desechable)
`pg_dump` antes/después: única diferencia, la función y el disparador. Base con rango viejo y valor 10 → mínimo 12 y valor 12. Disparador: 6 comportamientos comprobados. Backend de M17: **70/70**, `tsc` y ESLint en cero; **mutación verificada** (las 2 pruebas nuevas fallan con el defecto).

### Pendiente (no hecho)
- Código de M17 que sustituya `AlmacenConfiguracionMemoria` (RFC-M17-001 §5) y el modelo Prisma.
- Conectar `auth.complejidad_minima_contrasena` con la validación real de contraseñas (M20/M04).
- `docs/00_SISTEMA` (plantilla de QA y plantilla de módulo) y `.sdlc/.../MODULE_TEMPLATE` aún citan Kysely: son documentos de otro dominio y no se tocaron.

---

## 2026-10-21 — M04 · Formalización completa de Arquitectura, Contratos Zod y DDL (Fase 2)

**Rol:** Software Architect Lead · **Fase:** FASE_2_ARQUITECTURA · **Módulo:** M04 (Cuentas, Autenticación y Perfil)

### Contexto de entrada
El Director Humano autorizó el salto de ola de M04 sobre M18 y la Ola 2, firmó Gate 1 y aprobó en bloque los 9 cambios propuestos en `RFC-M04-001` (C-1 a C-9). Se procede con la ejecución íntegra y exhaustiva de la Fase 2 de Arquitectura.

### Subroles convocados y actividades
1. **01 · System & Modular Topologist:**
   - Formalización de 4 ADRs fundacionales:
     - `ADR-009`: Puerto hexagonal `NotificacionesPort` con adaptador offline en memoria/no-op para desacoplar M04 de M18 sin bloquear pruebas ATDD.
     - `ADR-010`: Mapeo de `cuenta_empresa` 1:1 con `usuario`, almacenamiento seguro de RUT en `documento_soporte` (BYTEA max 5 MB, SHA-256) detrás de `AlmacenDocumentosPort` con prohibición expresa de seleccionar `contenido` en listados.
     - `ADR-011`: Flujo unificado de autenticación con M20 (BCrypt costo 12, sliding sessions en tabla `sesion`, cambio obligatorio de contraseña en primer acceso con `cambio_contrasena_pendiente`, y token de registro efímero JWT para Google Identity).
     - `ADR-012`: Control anti-fuerza bruta en tabla `control_intento_acceso` y técnica anti-enumeración (dummy compare BCrypt para correos inexistentes y respuestas idénticas).
   - Mapa de rutas canónicas REST `/api/cuentas/*` y `/api/admin/empresas/*` documentado en `.sdlc/docs/modules/M04/04_ARQUITECTURA_Y_CODIGO.md`.
2. **02 · Relational Data & DDL Modeler:**
   - DDL actualizado a **v4.2 / BD v3.0 (53 tablas)** en `bd/sql/schema_pintuclic.sql` y `bd/sql/seed_pintuclic.sql`:
     - Tabla 53 `control_intento_acceso` con índice `idx_control_intento_acceso_bloqueo`.
     - Tabla `cuenta_empresa` y tabla `documento_soporte`.
     - Renombrado `codigo` a `codigo_hash VARCHAR(255)` con seed hasheado BCrypt costo 12 de `'123456'`.
     - Índices únicos parciales para solicitudes pendientes (`solicitud_empresa`, `solicitud_actualizacion_nit`).
     - Restricciones únicas en `direccion_cliente` (`uq_direccion_predeterminada_unica` y `uq_direccion_no_duplicada`).
     - Normalización de correo `uq_usuario_correo_lower` en `usuario`.
     - Columna `cambio_contrasena_pendiente BOOLEAN NOT NULL DEFAULT false` en `usuario`.
     - Permiso 21 `'empresas.validar'` sembrado y asignado al Administrador.
   - Sincronización del modelo en `backend/prisma/schema.prisma` y generación limpia de tipos con `npx prisma generate`.
   - Documentación relacional actualizada a v3.0 en `bd/docs/CHANGELOG_DATABASE.md`, `WALKTHROUGH_DATABASE.md` y `DOCUMENTACION_BASE_DATOS.md`.
3. **03 · API Contracts & Protocol Designer:**
   - Redacción formal de `.sdlc/docs/contracts/m04-cuentas.contract.ts` cubriendo las 10 HUs (`HU-CUE-01` a `HU-CUE-10`), envelopes de respuesta estandarizados, tipado estricto Zod 4 y tipos inferidos.
   - DTOs espejo implementados en `backend/src/modules/m04-cuentas/dtos/m04-cuentas.dto.ts` y `frontend/src/modules/m04-cuentas/dtos/m04-cuentas.dto.ts`.
   - Interfaces puras (cero runtime) y puertos hexagonales en `backend/src/modules/m04-cuentas/interfaces/` y `frontend/src/modules/m04-cuentas/interfaces/`.
4. **04 · ATDD Three Amigos Consultation:**
   - Formalización de los dictámenes consultivos del Software Architect y QA Security Tester en `.sdlc/docs/modules/M04/01_ATDD_SPEC.md` §5. Aprobado por unanimidad.

### Verificación Determinista
- `npm run test:contracts`: 16/16 validaciones exitosas, 0 advertencias, 0 fallos (veredicto: APROBADO).
- `npm run check:no-any`: PASS sobre 154 archivos auditados (0 usos de ANY).
- `npx tsc --noEmit` en `backend/` y `frontend/`: 0 errores de compilación.
- `npm run lint` en `backend/` y `frontend/`: 0 warnings, 0 errores.
- `npm run lint:a11y` en `frontend/`: 0 violaciones.
- Vitest suites: 71/71 tests backend PASS, 57/57 tests frontend PASS (128/128 total en el repositorio).

### Alto mecánico (Rule #10 y STAGE_GATES.md §3)
Turno de Arquitectura detenido. `current_state.json` actualizado a `FASE_2_ARQUITECTURA` / `GATE_2_ARQUITECTURA` en estado `ESPERANDO_APROBACION_HUMANA`. No se genera código de controladores ni servicios hasta la firma explícita del Director Humano.
