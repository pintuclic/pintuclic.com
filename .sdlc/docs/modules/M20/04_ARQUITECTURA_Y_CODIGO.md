# 🛠️ 04_ARQUITECTURA_Y_CODIGO — M20. Seguridad, Auditoría y Protección de Datos

> **Módulo:** `M20` · **Scope:** `m20-seguridad`
> **Responsable:** Software Architect Lead (Fase 2)
> **Consumidores:** Backend Lead Engineer (Gate 3A) y Frontend Lead Engineer (Gate 3B)
> **Estado:** REVISIÓN — esperando firma del Director Humano en Gate 2
> **Contrato:** [`../../contracts/m20-seguridad.contract.ts`](../../contracts/m20-seguridad.contract.ts)

---

## 1. Modelo de Datos

### 1.1 Decisión estructural: Prisma **mapea** el DDL existente, no lo sustituye

`bd/` está **bloqueado** (el Product Owner no tiene autorización para reescribirlo) y `backend/` sí
es reescribible. El `schema.prisma` actual describe un modelo **distinto e incompatible** con
`bd/sql/schema_pintuclic.sql`: `Usuario.id` frente a `usuario.id_usuario`, `SesionToken` frente a
`sesion`, y sin ninguna de las tres tablas de privacidad.

> **Decisión:** `schema.prisma` se reescribe para **mapear el DDL real** mediante `@@map` / `@map`,
> en lugar de inventar un modelo paralelo. Así no se toca `bd/` y Prisma y PostgreSQL describen la
> misma base. Ver [`ADR-004`](../../adrs/ADR-004-prisma-mapea-ddl-existente.md).

### 1.2 Hallazgo afortunado: M20 **no necesita ningún cambio de DDL**

Con HU-SEG-04 aplazada, todas las tablas que M20 necesita **ya existen** en el DDL legado, y sus
enums están comentados con los propios identificadores de requisito:

| Tabla existente en `bd/sql/` | Cubre |
| :--- | :--- |
| `sesion` (UUID, `tipo_sesion`, `fecha_ultimo_acceso`, `fecha_expiracion`, `estado`, `motivo_cierre`) | **Toda HU-SEG-02**, incluida la ventana deslizante y la invalidación con motivo |
| `aviso_privacidad` (`version`, `descripcion`, `es_vigente`) | `RF-SEG-05-02/03` |
| `consentimiento_usuario` (`id_usuario`, `id_aviso_privacidad`, `fecha`, UNIQUE) | `RF-SEG-05-01/02` |
| `solicitud_supresion` (`estado`, `fecha_solicitud`, `fecha_resolucion`) | `RF-SEG-05-06` |
| `usuario_identidad_externa` (`proveedor`, `id_proveedor`) | Vinculación con Google |

La ausencia de tabla de auditoría en el DDL **no es una inconsistencia**: es coherente con que el
Product Owner aún no la haya establecido.

### 1.3 Modelos Prisma que el Backend debe declarar

> ⚠️ **Aislamiento de módulo.** M20 declara **solo estos cuatro modelos**, dentro del bloque
> `MÓDULO M20` de `backend/prisma/schema.prisma`. El modelo `Usuario` pertenece a **M04**: M20 lo
> **lee** por relación, pero su definición completa es responsabilidad de M04.

```prisma
enum TipoSesion            { admin cliente                                                   @@map("enum_tipo_sesion") }
enum EstadoSesion          { activa cerrada expirada revocada                                @@map("enum_estado_sesion") }
enum MotivoCierreSesion    { cierre_manual inactividad cambio_contrasena
                             cuenta_desactivada permisos_retirados                           @@map("enum_motivo_cierre_sesion") }
enum EstadoSolicitudSupresion { pendiente en_proceso aprobada rechazada                      @@map("enum_estado_solicitud_supresion") }

model Sesion {
  idSesion          String             @id @default(uuid()) @map("id_sesion") @db.Uuid
  idUsuario         Int                @map("id_usuario")
  tipoSesion        TipoSesion         @map("tipo_sesion")
  fechaInicio       DateTime           @default(now()) @map("fecha_inicio") @db.Timestamptz(6)
  fechaUltimoAcceso DateTime           @default(now()) @map("fecha_ultimo_acceso") @db.Timestamptz(6)
  fechaExpiracion   DateTime           @map("fecha_expiracion") @db.Timestamptz(6)
  estado            EstadoSesion       @default(activa)
  motivoCierre      MotivoCierreSesion? @map("motivo_cierre")

  @@index([idUsuario, estado])
  @@map("sesion")
}

model AvisoPrivacidad {
  idAvisoPrivacidad Int     @id @default(autoincrement()) @map("id_aviso_privacidad")
  version           String  @unique @db.VarChar(50)
  descripcion       String
  esVigente         Boolean @default(true) @map("es_vigente")

  consentimientos ConsentimientoUsuario[]
  @@map("aviso_privacidad")
}

model ConsentimientoUsuario {
  idConsentimiento  Int      @id @default(autoincrement()) @map("id_consentimiento")
  idUsuario         Int      @map("id_usuario")
  idAvisoPrivacidad Int      @map("id_aviso_privacidad")
  fecha             DateTime @default(now()) @db.Timestamptz(6)

  aviso AvisoPrivacidad @relation(fields: [idAvisoPrivacidad], references: [idAvisoPrivacidad])

  @@unique([idUsuario, idAvisoPrivacidad], map: "uq_usuario_aviso")
  @@map("consentimiento_usuario")
}

model SolicitudSupresion {
  idSolicitudSupresion Int                       @id @default(autoincrement()) @map("id_solicitud_supresion")
  idUsuario            Int                       @map("id_usuario")
  fechaSolicitud       DateTime                  @default(now()) @map("fecha_solicitud") @db.Timestamptz(6)
  fechaResolucion      DateTime?                 @map("fecha_resolucion") @db.Timestamptz(6)
  estado               EstadoSolicitudSupresion  @default(pendiente)

  @@index([idUsuario, estado])
  @@map("solicitud_supresion")
}
```

### 1.4 🛑 Conflicto elevado al Director Humano

```sql
usuario.contrasena VARCHAR(255) NOT NULL
```

`RN-SEG-02` exige que **toda** cuenta tenga contraseña propia, incluidas las de Google. La columna
`NOT NULL` del DDL es, por tanto, **correcta y coherente** con la regla vigente. No se requiere
cambio alguno.

> 📌 Esto resuelve el conflicto que el PM elevó en Gate 1: tras la refactorización de historias de
> M04, era `RF-SEG-01-05` lo que estaba mal, no el DDL.

### 1.5 Invariante de desvinculación de identidad

> **Reserva #3 de la mesa ATDD.** `CA-SEG-05-05` exige "desvincular de la identidad cuando sea
> posible". Para que sea comprobable, se define como **invariante del modelo**:
>
> Tras resolverse una supresión, la orden de venta **conserva** su número, importes, fechas y líneas,
> y **ningún campo alcanzable desde ella permite remontar al titular**: `orden.id_usuario` queda a
> `NULL` y los datos de contacto se vacían. La prueba consulta la orden y verifica que no existe
> camino hacia una identidad.
>
> ⚠️ Esta invariante **toca el modelo de M08 (Orden de Venta)**, que no existe todavía. Se deja
> declarada como **contrato que M08 deberá honrar**; M20 no crea ni modifica esa tabla.

---

## 2. Contratos de API y Mapa de Endpoints

**Contrato principal:** `docs/contracts/m20-seguridad.contract.ts` — validado (`npm run test:contracts`)
y compilado con `tsc --strict` sin errores.

| Método | Ruta | HU | Autorización | Request / Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/seguridad/sesiones/cerrar` | SEG-02 | Sesión vigente | `cerrarSesionRequestSchema` → `cerrarSesionResponseEnvelopeSchema` |
| `GET` | `/api/v1/seguridad/privacidad/aviso-vigente` | SEG-05 | **Público** | — → `avisoVigenteResponseEnvelopeSchema` |
| `POST` | `/api/v1/seguridad/privacidad/consentimiento` | SEG-05 | Sesión vigente | `otorgarConsentimientoRequestSchema` → `consentimientoResponseEnvelopeSchema` |
| `GET` | `/api/v1/seguridad/privacidad/consentimiento` | SEG-05 | Titularidad | — → `consentimientoResponseEnvelopeSchema` |
| `POST` | `/api/v1/seguridad/privacidad/supresion` | SEG-05 | Titularidad | `crearSolicitudSupresionRequestSchema` → `solicitudSupresionResponseEnvelopeSchema` |
| `GET` | `/api/v1/seguridad/privacidad/supresion` | SEG-05 | Titularidad | — → `listaSolicitudesSupresionResponseEnvelopeSchema` |

### 2.1 Servicios internos sin HTTP (el 70 % del valor de M20)

| Servicio | Consumidores | Qué garantiza |
| :--- | :--- | :--- |
| `credenciales.service` | M04, M17 | Derivar con sal única, verificar en tiempo constante, exigir contraseña en alta por Google |
| `sesion.service` | M04, todos | Crear, renovar ventana deslizante, cerrar, invalidar en masa con motivo |
| `autorizacion.service` | **Todos** | `requirePermission()` / `requireOwnership()` resueltos en cada petición |
| `privacidad.service` | M04 | Aviso vigente, consentimiento versionado, supresión |
| `AuditoriaPort` | Todos | Emisión de accesos denegados (adaptador no-op en esta entrega) |

---

## 3. Matriz RBAC por permiso atómico

> **Regla de Oro #3 de Arquitectura (Anti-IDOR):** el identificador del actor se inyecta **siempre**
> desde la sesión verificada en el servidor, **jamás** desde el cliente. Ningún endpoint de M20
> acepta un `idUsuario` en el cuerpo ni en la ruta.

| Permiso atómico | Lo necesita | Observación |
| :--- | :--- | :--- |
| *(ninguno)* | `GET /privacidad/aviso-vigente` | Público por `RF-SEG-05-03` |
| *(titularidad)* | Cerrar sesión, consentimiento, supresión | No es permiso: es comprobación de titularidad sobre el actor de la sesión |
| `seguridad.auditoria.ver` | Consulta de auditoría | **Reservado** — se activa con HU-SEG-04 |
| `seguridad.auditoria.exportar` | Exportación de auditoría | **Reservado** — se activa con HU-SEG-04 |

M20 **no crea** el catálogo de permisos: lo hace M17. M20 consume `codigoPermisoSchema` y deja los
dos códigos anteriores reservados para que M17 no los redefina.

---

## 4. 🗺️ Mapa de Rutas Canónicas de Implementación

> **Guía vinculante para Backend y Frontend.** No crear archivos fuera de estas rutas ni usar `any`.

### A. Contrato compartido
- `.sdlc/docs/contracts/m20-seguridad.contract.ts` — **fuente única** de tipos y validadores.

### B. Backend (Express 5 + Prisma 6)
- `backend/src/core/db/client.ts` — singleton `PrismaClient`
- `backend/src/core/middlewares/auth.middleware.ts` — resuelve sesión y renueva la ventana
- `backend/src/core/middlewares/autorizacion.middleware.ts` — **validador central**
- `backend/src/core/middlewares/errorHandler.ts` — envelope de error sin detalle interno
- `backend/src/core/utils/crypto.ts` · `jwt.ts` · `apiResponse.ts`
- `backend/src/modules/m20-seguridad/dtos/` · `interfaces/` · `repositories/` · `services/` · `controllers/`
- `backend/src/modules/m20-seguridad/m20.routes.ts`
- `backend/src/modules/m20-seguridad/__tests__/`

### C. Frontend (Next.js 15 + React 19)
- `frontend/src/middleware.ts` — guarda de rutas protegidas
- `frontend/src/core/api/apiClient.ts` — **migrar de `localStorage` a cookie** (ver `ADR-005`)
- `frontend/src/core/dtos/seguridad.dto.ts`
- `frontend/src/modules/m20-seguridad/{interfaces,dtos,services,hooks,store,components,tests}/`
- `frontend/src/app/(public)/privacidad/page.tsx`

### D. Pruebas
- `backend/src/modules/m20-seguridad/__tests__/*.test.ts` — los 36 escenarios BDD
- `frontend/src/modules/m20-seguridad/tests/*.test.tsx`

---

## 5. Decisiones registradas (ADR)

| ADR | Decisión |
| :--- | :--- |
| [`ADR-002`](../../adrs/ADR-002-puerto-auditoria.md) | Puerto `AuditoriaPort` con adaptador no-op, para que el aplazamiento de HU-SEG-04 no deje deuda |
| [`ADR-003`](../../adrs/ADR-003-indistinguibilidad-respuestas.md) | Un único objeto de respuesta para recurso inexistente y recurso ajeno |
| [`ADR-004`](../../adrs/ADR-004-prisma-mapea-ddl-existente.md) | Prisma mapea el DDL de `bd/` en lugar de sustituirlo |
| [`ADR-005`](../../adrs/ADR-005-sesion-en-cookie-httponly.md) | La sesión viaja en cookie `HttpOnly`, no en `localStorage` |

---

## 6. Definition of Done — Gate 2

- [x] DDL documentado y **compatible con el motor**: no requiere cambios, el existente ya lo cubre.
- [x] Contrato Zod con esquemas de entrada y salida tipados al 100 %.
- [x] **Cero `any`** en contratos y tipos exportados — `npm run test:contracts` y `tsc --strict` en verde.
- [x] Matriz RBAC definida por permiso atómico, no por rol.
- [x] Las 4 reservas de la mesa ATDD resueltas (§1.5, §2, contrato §2 y §3).
- [x] Bitácora actualizada en `multiAgents/02_software_architect/WORKLOG.md`.
- [ ] **Firma del Director Humano en Gate 2.**
