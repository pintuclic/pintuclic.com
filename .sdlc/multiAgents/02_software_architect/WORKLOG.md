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

