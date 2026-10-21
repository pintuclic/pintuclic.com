# 🛠️ 04_ARQUITECTURA_Y_CODIGO — M17. Administración, Empleados y Permisos

> **Módulo:** `M17` · **Scope:** `m17-permisos` · **Ola:** 1 (Núcleo Base)
> **Responsable:** Software Architect Lead (Fase 2)
> **Consumidores:** Backend Lead Engineer (Gate 3A) y Frontend Lead Engineer (Gate 3B)
> **Estado:** REVISIÓN — esperando firma del Director Humano en Gate 2
> **Contrato Rector:** [`../../contracts/m17-permisos.contract.ts`](../../contracts/m17-permisos.contract.ts)
> **ADRs Asociados:** [`ADR-006`](../../adrs/ADR-006-modelo-permisos-individuales-sobre-ddl.md), [`ADR-007`](../../adrs/ADR-007-puerto-almacen-configuracion.md), [`ADR-008`](../../adrs/ADR-008-resolutor-permisos-en-caliente.md)

---

## 1. Modelo de Persistencia y Mapeo Prisma

### 1.1 Mapeo del DDL Existente (Conforme a ADR-004 y ADR-006)
Las tablas necesarias para la persistencia de permisos, roles y usuarios **ya existen** en `bd/sql/schema_pintuclic.sql` y cuentan con sus seeds en `bd/sql/seed_pintuclic.sql`:
- `rol` (`@@map("rol")`)
- `permisos` (`@@map("permisos")`)
- `asignacion_permiso` (`@@map("asignacion_permiso")`)
- `usuario_rol` (`@@map("usuario_rol")`)

Para los parámetros de configuración general (`HU-ADM-05` / `HU-ADM-07`), al no existir tabla en el DDL y estar bloqueado `bd/`, se implementa el puerto `ConfiguracionPort` con adaptador en memoria respaldado por el catálogo maestro tipado en el contrato Zod (ver `ADR-007`).

### 1.2 Declaración de Modelos en `backend/prisma/schema.prisma`

El bloque de M17 en Prisma se declara sin alterar los modelos de otros módulos:

```prisma
// =============================================================================
// MÓDULO M17 — ADMINISTRACIÓN, EMPLEADOS Y PERMISOS
// =============================================================================

/// Estado general de entidades de configuración y catálogos
enum EstadoGeneral {
  activo
  inactivo

  @@map("enum_estado_general")
}

/// Rol o perfil de asignación relacional (ADR-006)
model Rol {
  idRol            Int           @id @default(autoincrement()) @map("id_rol")
  nombre           String        @unique @db.VarChar(100)
  idSubRolEmpresa  Int?          @map("id_sub_rol_empresa")
  estado           EstadoGeneral @default(activo)

  asignaciones     AsignacionPermiso[]
  usuariosConRol   UsuarioRol[]
  usuariosDirectos Usuario[]

  @@map("rol")
}

/// Catálogo maestro de permisos atómicos del sistema
model Permiso {
  idPermiso   Int           @id @default(autoincrement()) @map("id_permiso")
  nombre      String        @unique @db.VarChar(100)
  descripcion String?
  estado      EstadoGeneral @default(activo)

  asignaciones AsignacionPermiso[]

  @@map("permisos")
}

/// Asignación N:M de permisos a perfiles individuales
model AsignacionPermiso {
  idAsignacionPermiso Int @id @default(autoincrement()) @map("id_asignacion_permiso")
  idRol               Int @map("id_rol")
  idPermiso           Int @map("id_permiso")

  rol     Rol     @relation(fields: [idRol], references: [idRol], onDelete: Cascade)
  permiso Permiso @relation(fields: [idPermiso], references: [idPermiso], onDelete: Cascade)

  @@unique([idRol, idPermiso], map: "uq_rol_permiso")
  @@index([idRol])
  @@index([idPermiso])
  @@map("asignacion_permiso")
}

/// Relación 1:1 Usuario - Rol con restricción UNIQUE(id_usuario)
model UsuarioRol {
  idUsuarioRol Int @id @default(autoincrement()) @map("id_usuario_rol")
  idUsuario    Int @unique @map("id_usuario")
  idRol        Int @map("id_rol")

  usuario Usuario @relation(fields: [idUsuario], references: [idUsuario], onDelete: Cascade)
  rol     Rol     @relation(fields: [idRol], references: [idRol], onDelete: Cascade)

  @@index([idUsuario])
  @@index([idRol])
  @@map("usuario_rol")
}
```

---

## 2. Mapa de Rutas HTTP Canónicas (API REST)

Todas las rutas administrativas de M17 viven bajo el prefijo `/api/admin/` y están protegidas obligatoriamente por el middleware de sesión `verificarSesion` de M20 y el validador de permisos `requirePermission`:

| Método | Endpoint | Permiso Requerido (`requirePermission`) | Descripción / Historia |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/empleados` | `personal.ver` | Listado paginado de empleados con filtros (`HU-ADM-01`) |
| `POST` | `/api/admin/empleados` | `personal.editar` | Alta de empleado con credencial temporal (`HU-ADM-01`) |
| `GET` | `/api/admin/empleados/:id` | `personal.ver` | Consulta de ficha de empleado (`HU-ADM-01`) |
| `PATCH` | `/api/admin/empleados/:id` | `personal.editar` | Edición de datos de contacto de empleado (`HU-ADM-01`) |
| `POST` | `/api/admin/empleados/:id/desactivar` | `personal.desactivar` | Baja lógica y cierre inmediato de sesiones (`HU-ADM-01`) |
| `POST` | `/api/admin/empleados/:id/reactivar` | `personal.desactivar` | Reactivación y restauración de permisos (`HU-ADM-01`) |
| `GET` | `/api/admin/empleados/:id/permisos` | `seguridad.gestionar_permisos` | Consulta de matriz individual de permisos (`HU-ADM-02`) |
| `PUT` | `/api/admin/empleados/:id/permisos` | `seguridad.gestionar_permisos` | Asignación atómica con efecto en caliente (`HU-ADM-02`) |
| `GET` | `/api/admin/clientes` | `personal.ver` | Búsqueda de clientes por documento/correo/tel (`HU-ADM-04`) |
| `GET` | `/api/admin/clientes/:id` | `personal.ver` | Ficha de cliente con historial de órdenes (`HU-ADM-04`) |
| `POST` | `/api/admin/clientes/:id/desactivar` | *Exclusivo Administrador* | Desactivación de cliente con motivo obligado (`HU-ADM-04`) |
| `GET` | `/api/admin/configuracion` | *Exclusivo Administrador* | Catálogo completo de parámetros agrupados (`HU-ADM-05/07`) |
| `PUT` | `/api/admin/configuracion/:clave` | *Exclusivo Administrador* | Actualización de parámetro en caliente (`HU-ADM-05`) |
| `POST` | `/api/admin/gobernanza/sustituir-correo` | *Exclusivo Administrador* | Solicitud de confirmación en nuevo correo (`HU-ADM-06`) |
| `POST` | `/api/admin/gobernanza/confirmar-correo` | *Público con Token Efímero* | Validación de enlace y sustitución efectiva (`HU-ADM-06`) |
| `POST` | `/api/admin/primer-acceso` | *Sesión con flag de primer acceso* | Cambio forzado de credencial inicial (`HU-ADM-01/06`) |

---

## 3. Topología de Componentes Backend (`backend/src/modules/m17-permisos/`)

Estructura modular en capas según `backend/ARQUITECTURA.md`:

```text
backend/src/modules/m17-permisos/
├── __tests__/                          # Vitest Unit & Integration Tests (47 escenarios)
│   ├── empleados.service.test.ts
│   ├── permisos.service.test.ts
│   ├── resolutor-permisos.test.ts
│   ├── clientes-admin.service.test.ts
│   ├── configuracion.service.test.ts
│   └── gobernanza-admin.service.test.ts
├── controllers/
│   ├── empleados.controller.ts
│   ├── permisos.controller.ts
│   ├── clientes-admin.controller.ts
│   ├── configuracion.controller.ts
│   └── gobernanza.controller.ts
├── dtos/
│   ├── empleados.dto.ts
│   ├── permisos.dto.ts
│   ├── clientes-admin.dto.ts
│   ├── configuracion.dto.ts
│   └── gobernanza.dto.ts
├── interfaces/
│   ├── empleados-repository.interface.ts
│   ├── permisos-repository.interface.ts
│   ├── configuracion-port.interface.ts
│   └── eventos-m17.interface.ts
├── repositories/
│   ├── empleados.repository.ts
│   ├── permisos.repository.ts
│   ├── clientes-admin.repository.ts
│   └── almacen-configuracion.memoria.ts
├── services/
│   ├── empleados.service.ts
│   ├── permisos.service.ts
│   ├── resolutor-permisos.adapter.ts    # Implementa ResolutorPermisos de M20
│   ├── clientes-admin.service.ts
│   ├── configuracion.service.ts
│   └── gobernanza.service.ts
└── m17.routes.ts                       # Router Express exportado
```

---

## 4. Integración y Acoplamiento Limpio con M20

1. **Implementación de `ResolutorPermisos` (`ADR-008`):**
   `ResolutorPermisosDatabaseAdapter` se conecta directamente con `AutorizacionService` de M20, resolviendo permisos en tiempo real ante cada petición HTTP, con bypass automático para el administrador.
2. **Invalidación Inmediata de Sesiones:**
   `EmpleadosService` y `GobernanzaService` consumen `SesionService.invalidarTodas()` de M20:
   - Al desactivar un empleado: `motivoCierre = 'cuenta_desactivada'` (`RF-ADM-01-07`).
   - Al revocar permisos: `motivoCierre = 'permisos_retirados'` (`RF-ADM-02-06`).
   - Al sustituir el correo o contraseña del administrador (`RF-ADM-06-07`).
3. **Auditoría Transversal:**
   Toda denegación y cambio crítico de permisos o configuración emite el evento al `AuditoriaPort` de M20 (`ADR-002`).

---

## 5. Diseño de Frontend (`frontend/src/modules/m17-permisos/`)

El frontend de M17 se ubica en `frontend/src/modules/m17-permisos/` y consumirá estrictamente:
- **Core Kit:** `Button`, `Input`, `Modal`, `Badge`, `Checkbox` de `frontend/src/core/components/`.
- **Tokens de Color:** Colores oficiales (`corporate`, `action`, `subaction`, `neutral-*`) de `frontend/src/core/theme/colors.ts`.
- **Formularios:** `react-hook-form` con `@hookform/resolvers/zod` consumiendo los contratos exportados en `m17-permisos.contract.ts`.
