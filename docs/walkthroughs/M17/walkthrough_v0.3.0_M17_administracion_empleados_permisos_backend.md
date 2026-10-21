# WALKTHROUGH DE IMPLEMENTACIÓN — M17 Backend

> 📌 **Módulo:** `M17 — Administración, Empleados y Permisos`  
> 🏷️ **Capa:** Backend API (Express 5 + Prisma 6 + PostgreSQL + Vitest 3)  
> 🎯 **Fase:** 3A (Backend Engineer) · **Gate:** 3A  

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

* **Versión Generada:** `v0.3.0`
* **Módulo de Origen:** `M17 — Administración, Empleados y Permisos`
* **Capa:** Backend (`backend/src/modules/m17-permisos/`)
* **Fecha de Entrega:** 21/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Estado de la Implementación:** ✅ **COMPLETO** — 7 de 7 historias de usuario cumplidas (100 %)

---

## 2. HISTORIAS DE USUARIO CUBIERTAS EN ESTA VERSIÓN

| ID Historia | Título de la Historia de Usuario | Estado de Cobertura | Endpoints / Componentes Desarrollados |
| :--- | :--- | :---: | :--- |
| **HU-ADM-01** | Gestión de cuentas de colaborador / empleado | **100% Cumplida** | `GET/POST /api/v1/admin/empleados`<br>`GET/PATCH /api/v1/admin/empleados/:id`<br>`POST /api/v1/admin/empleados/:id/desactivar`<br>`POST /api/v1/admin/empleados/:id/reactivar` |
| **HU-ADM-02** | Asignación individual y granular de permisos | **100% Cumplida** | `GET/PUT /api/v1/admin/empleados/:id/permisos` |
| **HU-ADM-03** | Verificación centralizada de permisos en servidor | **100% Cumplida** | `ResolutorPermisosDatabaseAdapter` (ADR-008)<br>`requirePermission` middleware en tiempo real |
| **HU-ADM-04** | Gestión y consulta de clientes desde administración | **100% Cumplida** | `GET /api/v1/admin/clientes`<br>`GET /api/v1/admin/clientes/:id`<br>`POST /api/v1/admin/clientes/:id/desactivar` |
| **HU-ADM-05** | Configuración general y parámetros del sistema | **100% Cumplida** | `GET /api/v1/admin/configuracion`<br>`PUT /api/v1/admin/configuracion/:clave` |
| **HU-ADM-06** | Gobernanza de la cuenta administradora única | **100% Cumplida** | `POST /api/v1/admin/gobernanza/sustituir-correo`<br>`POST /api/v1/admin/gobernanza/confirmar-correo`<br>`POST /api/v1/admin/primer-acceso` |
| **HU-ADM-07** | Catálogo oficial de parámetros del sistema | **100% Cumplida** | `AlmacenConfiguracionMemoria` (ADR-007) con los 10 parámetros de autenticación, comunicaciones y comercial |

### Descripción del Alcance de la Versión
Se implementó la totalidad de la lógica de negocio y API REST para la gestión de colaboradores, resolución dinámica de permisos atómicos, administración de clientes, parámetros configurables en runtime y gobernanza de la cuenta administradora.

El módulo conecta limpiamente con el motor de seguridad de M20 mediante el adaptador `ResolutorPermisosDatabaseAdapter`, cumpliendo el principio de *default deny*, bypass total para el Administrador Supremo, revocación en caliente y respuestas opacas que impiden la enumeración de recursos no autorizados.

---

## 3. REGLAS DE NEGOCIO Y POLÍTICAS DE SEGURIDAD APLICADAS

### A. Reglas de Negocio de M17
* **`RN-ADM-01` (Unicidad Universal de Correo):** Verificación estricta de unicidad en `usuario`. Si el correo ya existe, rechaza con `409 CORREO_DUPLICADO`.
* **`RN-ADM-02` (Credencial Temporal de Alta Entropía):** Alta de empleado genera contraseña temporal aleatoria (`Pintu#...`) con coste BCrypt 12, exigiendo sustitución en primer acceso.
* **`RN-ADM-03` (Alta en Denegación por Defecto):** Nuevos empleados nacen con cero permisos asignados en `asignacion_permiso`.
* **`RN-ADM-04` (Inmutabilidad Histórica y Baja Lógica):** Prohibido el `DELETE` físico. La desactivación cambia `estado = inactivo`.
* **`RN-ADM-05` (Cierre Inmediato de Sesiones):** Desactivar un colaborador o cliente revoca inmediatamente todas sus sesiones activas con motivo `cuenta_desactivada`.
* **`RN-ADM-06` (Reactivación con Restauración):** Permite reactivar la cuenta preservando el perfil de permisos asignados.
* **`RN-ADM-07` (Concesión Implicada Consulta-Operación):** Otorgar permisos operativos (ej: `catalogo.editar`) concede automáticamente el permiso de lectura (`catalogo.ver`).
* **`RN-ADM-08` (Retiro en Cascada):** Retirar un permiso de consulta (ej: `catalogo.ver`) revoca en cascada todas las operaciones que dependen de él.
* **`RN-ADM-09` (Efecto en Caliente / Sin Caché de Token):** La comprobación se evalúa en tiempo real contra la base de datos por cada petición (`ResolutorPermisosDatabaseAdapter`).
* **`RN-ADM-10` (Prohibición de Auto-Modificación):** Un colaborador no puede alterarse ni concederse permisos a sí mismo (`403 OPERACION_BLOQUEADA_ADMIN`).
* **`RN-ADM-11` y `RN-ADM-12` (Fail-Safe y Opacidad 403):** Middleware rechaza accesos denegados con respuesta estándar e indistinguible sin filtrar metadatos.
* **`RN-ADM-13` (Privacidad e Inviolabilidad de Datos de Clientes):** Ficha de cliente nunca expone contraseñas, hashes ni tarjetas de crédito completas.
* **`RN-ADM-14` (Desactivación de Clientes con Motivo Obligatorio):** Solo el administrador puede desactivar clientes, exigiendo un motivo explícito mínimo de 5 caracteres. Órdenes en curso no se cancelan.
* **`RN-ADM-15` (Parámetros Dinámicos sin Reinicio):** Parámetros del sistema se validan contra rangos tipados y actualizan en runtime sin reiniciar servicios.
* **`RN-ADM-17` (Inmortalidad y Unicidad del Administrador):** Cuenta única raíz. El sistema bloquea cualquier intento de desactivarla o eliminarla.
* **`RN-ADM-18` (Sustitución de Administrador por Doble Enlace):** Traspaso de cuenta mediante token criptográfico efímero de confirmación, invalidando sesiones anteriores tras el cambio.

### B. Políticas Transversales Validadas
* 🔒 **M20 - Credenciales (`HU-SEG-01`):** BCrypt con factor de costo 12 (`derivarContrasena`).
* 🛡️ **M17 - Autorización en Servidor (`HU-ADM-03`):** Validación atómica por permiso en servidor en cada petición.
* 👁️ **M20 - Mínima Exposición (`HU-SEG-06`):** Ocultamiento estricto de contraseñas y metadatos internos en respuestas JSON.
* 🆔 **M04 - Unicidad de Cuentas (`HU-CUE-08`):** Unicidad absoluta de correo electrónico.

---

## 4. MATRIZ DE CRITERIOS DE ACEPTACIÓN CUMPLIDOS

| Historia | Criterio de Aceptación / Escenario BDD | Validación | Resultado |
| :--- | :--- | :--- | :---: |
| **HU-ADM-01** | `CA-ADM-01-01` Creación exitosa de colaborador con credencial temporal | `empleados.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-01** | `CA-ADM-01-04` Desactivación lógica y revocación inmediata de sesiones activas | `empleados.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-01** | `CA-ADM-01-08` Rechazo por duplicidad de correo electrónico universal | `empleados.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-01** | `RN-ADM-17` Bloqueo de desactivación sobre la cuenta administradora | `empleados.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-02** | `CA-ADM-02-01` Consulta de matriz de permisos individual por colaborador | `permisos.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-02** | `CA-ADM-02-02` Concesión automática de permisos de consulta acoplados | `permisos.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-02** | `CA-ADM-02-03` Retiro en cascada de operaciones al revocar consulta | `permisos.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-02** | `RN-ADM-10` Bloqueo de auto-asignación de permisos por el propio empleado | `permisos.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-03** | `CA-ADM-03-01` Verificación en caliente contra base de datos sin caché de token | `resolutor-permisos.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-03** | `CA-ADM-03-02` Bypass total e incondicional para la cuenta de Administrador | `resolutor-permisos.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-03** | `CA-ADM-03-04` Rechazo inmediato de empleados con estado inactivo | `resolutor-permisos.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-04** | `CA-ADM-04-01` Búsqueda y filtrado de clientes en panel administrativo | `clientes-admin.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-04** | `CA-ADM-04-03` Ficha segura de cliente sin exposición de credenciales | `clientes-admin.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-04** | `CA-ADM-04-04` Desactivación de cliente con motivo justificado obligatorio | `clientes-admin.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-05** | `CA-ADM-05-01` Consulta de catálogo completo de parámetros del sistema | `configuracion.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-05** | `CA-ADM-05-02` Actualización dinámica de parámetros respetando rangos | `configuracion.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-05** | `CA-ADM-05-03` Rechazo de valores fuera de rango o nulos | `configuracion.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-06** | `CA-ADM-06-01` Solicitud de sustitución de correo por administrador titular | `gobernanza-admin.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-06** | `CA-ADM-06-03` Confirmación con token actualiza correo y revoca sesiones | `gobernanza-admin.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-06** | `CA-ADM-06-04` Rechazo de tokens inválidos o expirados | `gobernanza-admin.service.test.ts` | ✅ **CUMPLIDO** |
| **HU-ADM-07** | `CA-ADM-07-01` Disponibilidad de los 10 parámetros oficiales inicializados | `configuracion.service.test.ts` | ✅ **CUMPLIDO** |

---

## 5. RESUMEN CONCEPTUAL DE DEPENDENCIAS EXTERNAS E INTEGRACIÓN

### Dependencias Inyectadas (Consumidas por M17):
- **`M20 — Seguridad y Auditoría`:**
  - Consume `SesionService.invalidarTodas()` para cierre de sesiones forzoso ante baja lógica de empleados y traspaso de admin.
  - Implementa el puerto `ResolutorPermisos` para inyectarlo en `AutorizacionService`.
  - Reutiliza utilidades criptográficas corporativas `derivarContrasena` y `verificarContrasena` (BCrypt coste 12).
  - Utiliza middlewares de autenticación `auth.middleware.ts` y autorización `autorizacion.middleware.ts`.

### Módulos Habilitados por M17:
- **`M01 — Catálogo de Productos`:** Habilita endpoints de edición protegidos por `catalogo.ver`, `catalogo.crear`, `catalogo.editar`, `catalogo.eliminar`.
- **`M04 — Cuentas, Autenticación y Perfil`:** Habilita validación de empresas B2B por empleados con permiso `personal.ver`.
- **`M08 — Orden de Venta`:** Habilita gestión operativa con permisos `ventas.ver`, `ventas.gestionar`, `ventas.exportar`.
- **`M06/M07/M12 — Precios, Checkout y Facturación`:** Habilita lectura de parámetros comerciales (`comercial.iva_porcentaje`, `comercial.costo_envio_base`, `comercial.umbral_envio_gratis`).

---

## 6. ARCHIVOS CREADOS Y MODIFICADOS

### Creados en `backend/src/modules/m17-permisos/`:
1. `dtos/m17-permisos.dto.ts` — Esquemas de validación Zod y tipos TypeScript sin `any`.
2. `interfaces/empleados.interface.ts` — Contratos de dominio para empleados.
3. `interfaces/permisos.interface.ts` — Contratos de dominio para permisos atómicos.
4. `interfaces/clientes-admin.interface.ts` — Contratos de dominio para clientes en administración.
5. `interfaces/configuracion.port.ts` — Puerto de configuración del sistema (ADR-007).
6. `interfaces/gobernanza.interface.ts` — Contratos de sustitución y gobierno de admin.
7. `repositories/empleados.repository.ts` — Persistencia Prisma de colaboradores y perfiles.
8. `repositories/permisos.repository.ts` — Persistencia Prisma de permisos y asignaciones.
9. `repositories/clientes-admin.repository.ts` — Consultas de clientes para el panel administrativo.
10. `repositories/configuracion.repository.ts` — Adaptador en memoria de configuración del sistema.
11. `repositories/gobernanza-admin.repository.ts` — Persistencia y gestión de tokens de traspaso.
12. `services/resolutor-permisos.adapter.ts` — Adaptador dinámico de `ResolutorPermisos` para M20.
13. `services/empleados.service.ts` — Lógica de negocio de colaboradores (`HU-ADM-01`).
14. `services/permisos.service.ts` — Lógica de matriz y acoplamientos (`HU-ADM-02`).
15. `services/clientes-admin.service.ts` — Lógica de clientes desde administración (`HU-ADM-04`).
16. `services/configuracion.service.ts` — Lógica de parámetros dinámicos (`HU-ADM-05/07`).
17. `services/gobernanza-admin.service.ts` — Lógica de cuenta administradora (`HU-ADM-06`).
18. `controllers/empleados.controller.ts` — Controlador HTTP de empleados.
19. `controllers/permisos.controller.ts` — Controlador HTTP de permisos.
20. `controllers/clientes-admin.controller.ts` — Controlador HTTP de clientes.
21. `controllers/configuracion.controller.ts` — Controlador HTTP de configuración.
22. `controllers/gobernanza-admin.controller.ts` — Controlador HTTP de gobernanza.
23. `m17.routes.ts` — Ensamblador de dependencias e inyección en Express Router.
24. `__tests__/empleados.service.test.ts` — Pruebas unitarias de empleados (6 tests).
25. `__tests__/permisos.service.test.ts` — Pruebas unitarias de permisos (4 tests).
26. `__tests__/resolutor-permisos.test.ts` — Pruebas de resolución en caliente y bypass (5 tests).
27. `__tests__/clientes-admin.service.test.ts` — Pruebas de clientes desde admin (5 tests).
28. `__tests__/configuracion.service.test.ts` — Pruebas de configuración y rangos (5 tests).
29. `__tests__/gobernanza-admin.service.test.ts` — Pruebas de sustitución y primer acceso (5 tests).
30. `__tests__/m17.routes.test.ts` — Pruebas de integración de rutas Express (2 tests).

### Modificados en raíz de backend:
31. `backend/prisma/schema.prisma` — Incorporación de modelos `Rol`, `Permiso`, `AsignacionPermiso`, `UsuarioRol` y enums `EstadoGeneral`, `TipoUsuario` sin alterar DDL.
32. `backend/src/app.routes.ts` — Montaje de rutas `/admin` con middleware de autenticación.

---

## 7. MÉTRICAS DE CALIDAD Y CERTIFICACIÓN TÉCNICA

* **TypeScript Strict:** `npm run check:types` (`tsc --noEmit`) → **0 errores**
* **ESLint:** `npm run lint` (`eslint src`) → **0 errores, 0 advertencias**
* **Auditoría Zero Any:** `npm run check:no-any` → **67 archivos auditados, 0 usos de `any`**
* **Suite de Pruebas Vitest:** `npm run test` → **12 suites ejecutadas, 68 tests aprobados (100 % pass)**
