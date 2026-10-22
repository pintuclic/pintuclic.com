# WALKTHROUGH DE IMPLEMENTACIÓN — M04 Backend

> 📌 **Módulo:** `M04 — Cuentas, Autenticación y Perfil`  
> 🏷️ **Capa:** Backend API (Express 5 + Prisma 6 + PostgreSQL + Vitest 3)  
> 🎯 **Fase:** 3A (Backend Lead Engineer) · **Gate:** 3A  

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

* **Versión Generada:** `v0.4.0`
* **Módulo de Origen:** `M04 — Cuentas, Autenticación y Perfil`
* **Capa:** Backend (`backend/src/modules/m04-cuentas/`)
* **Fecha de Entrega:** 21/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Estado de la Implementación:** ✅ **COMPLETO** — 10 de 10 historias de usuario cumplidas (100 %)

---

## 2. HISTORIAS DE USUARIO CUBIERTAS EN ESTA VERSIÓN

| ID Historia | Título de la Historia de Usuario | Estado de Cobertura | Endpoints / Componentes Desarrollados |
| :--- | :--- | :---: | :--- |
| **HU-CUE-01** | Registro B2C con verificación por correo electrónico (OTP) | **100% Cumplida** | `POST /api/v1/cuentas/registro`<br>`POST /api/v1/cuentas/registro/verificar-otp`<br>`POST /api/v1/cuentas/registro/reenviar-otp` |
| **HU-CUE-02** | Autenticación federada mediante Google Identity | **100% Cumplida** | `POST /api/v1/cuentas/oauth/google`<br>`POST /api/v1/cuentas/oauth/google/completar` |
| **HU-CUE-03** | Registro corporativo B2B con validación de NIT y RUT | **100% Cumplida** | `POST /api/v1/cuentas/empresas/registro` |
| **HU-CUE-04** | Inicio de sesión con correo y contraseña y control de fuerza bruta | **100% Cumplida** | `POST /api/v1/cuentas/login`<br>`POST /api/v1/cuentas/cambio-password-primer-acceso`<br>`POST /api/v1/cuentas/logout` |
| **HU-CUE-05** | Recuperación segura de contraseña mediante enlace firmado | **100% Cumplida** | `POST /api/v1/cuentas/recuperar-password/solicitar`<br>`POST /api/v1/cuentas/recuperar-password/confirmar` |
| **HU-CUE-06** | Gestión de perfil, credenciales y solicitud de ascenso empresarial | **100% Cumplida** | `GET /api/v1/cuentas/perfil`<br>`PUT /api/v1/cuentas/perfil`<br>`PUT /api/v1/cuentas/perfil/password`<br>`POST /api/v1/cuentas/perfil/cambio-correo/solicitar`<br>`POST /api/v1/cuentas/perfil/cambio-correo/confirmar`<br>`POST /api/v1/cuentas/empresas/ascenso` |
| **HU-CUE-07** | Libreta de direcciones de entrega del cliente | **100% Cumplida** | `GET /api/v1/cuentas/direcciones`<br>`POST /api/v1/cuentas/direcciones`<br>`PUT /api/v1/cuentas/direcciones/:idDireccion`<br>`DELETE /api/v1/cuentas/direcciones/:idDireccion`<br>`PATCH /api/v1/cuentas/direcciones/:idDireccion/predeterminada` |
| **HU-CUE-08** | Invariante de unicidad universal de cuentas y personas | **100% Cumplida** | Blindaje a nivel de base de datos (`uq_usuario_correo_lower`, `uq_cuenta_empresa_nit`, `uq_solicitud_empresa_nit_pendiente`) y validación transversal en repositorios |
| **HU-CUE-09** | Gestión y renovación de NIT empresarial corporativo | **100% Cumplida** | `POST /api/v1/cuentas/empresas/renovacion-nit` |
| **HU-CUE-10** | Administración de solicitudes B2B y ciclo de vida de cuentas | **100% Cumplida** | `GET /api/v1/admin/empresas/solicitudes`<br>`GET /api/v1/admin/empresas/solicitudes/:idSolicitud`<br>`POST /api/v1/admin/empresas/solicitudes/:idSolicitud/dictamen`<br>`POST /api/v1/admin/empresas/renovaciones/:idSolicitud/dictamen`<br>`POST /api/v1/cuentas/perfil/desactivar` |

---

## 3. ARQUITECTURA TÉCNICA Y PATRONES DE DISEÑO

### 3.1 Separación Hexagonal Estricta
El módulo `m04-cuentas` implementa arquitectura hexagonal desacoplada:
* **Controladores (`controllers/`):** Validan peticiones entrantes contra esquemas Zod canónicos (`dtos/m04-cuentas.dto.ts`), coordinan con el servicio de sesión de M20 (`SesionService`) para la gestión de la cookie segura `pc_sid` y retornan el formato canónico `{ ok: true, datos: ... }`.
* **Servicios de Dominio (`services/`):**
  - `AuthCuentasService`: Registro OTP, federación Google Identity, inicio de sesión con prevención de ataques de fuerza bruta y señuelo de tiempo constante, forzado de cambio de clave en primer acceso.
  - `RecuperacionPasswordService`: Emisión de token firmado JWT de 30m para recuperación, ejecución de comparativa señuelo contra correos inexistentes para prevención de timing attacks y revocación masiva de sesiones en reset.
  - `PerfilService`: Consulta y actualización de datos personales, cambio de contraseña con verificación de clave previa y revocación de sesiones activas, cambio de correo en dos pasos con OTP de 15m, desactivación de cuenta con confirmación de clave.
  - `DireccionesService`: Libreta de direcciones con límite estricto de 10 direcciones por cliente (RN-CUE-07) y asignación automática de primera dirección como predeterminada.
  - `EmpresasService`: Registro B2B directo, solicitud de ascenso B2C a B2B, solicitud de renovación de NIT, custodia de archivo RUT (hasta 5MB) en `documento_soporte`, listado administrativo y dictamen con aprobación (creación 1:1 de `cuenta_empresa` según ADR-010 / C-1) o rechazo motivado (mínimo 10 caracteres).
* **Puertos e Interfaces (`interfaces/`):**
  - `NotificacionesPort`: Puerto desacoplado para despacho de OTP y enlaces transaccionales.
  - `GoogleAuthPort`: Puerto para validación de tokens de Google Identity.
  - `DateProviderPort`: Puerto de abstracción temporal para pruebas deterministas.
  - `AlmacenDocumentosPort`: Puerto para almacenamiento y custodia de archivos RUT.
* **Repositorios Prisma (`repositories/`):**
  - `PrismaCuentasRepository`: Gestión tipada de `usuario`, `usuarioIdentidadExterna` y `cuentaEmpresa`.
  - `PrismaCodigosVerificacionRepository`: Gestión segura de tokens y códigos OTP con hash BCrypt.
  - `PrismaControlIntentosRepository`: Persistencia de conteo de fallos y bloqueos temporales por correo en `controlIntentoAcceso`.
  - `PrismaDocumentosRepository`: Custodia y cálculo SHA-256 de archivos en `documentoSoporte`.
  - `PrismaSolicitudesEmpresaRepository`: Flujo de aprobaciones y dictámenes en `solicitudEmpresa` y `solicitudActualizacionNit`.
  - `PrismaDireccionesRepository`: Operaciones CRUD sobre `direccionCliente` con desmarcado atómico de predeterminadas.

---

## 4. REGLAS DE NEGOCIO Y POLÍTICAS DE SEGURIDAD VALIDADAS

### 4.1 Reglas de Negocio Específicas de M04
* **`RN-CUE-01` (Código OTP 6 dígitos y Expiración 15m):** El registro B2C genera código numérico de 6 dígitos con hash BCrypt costo 12 en `codigo_verificacion` y validez de 15 minutos.
* **`RN-CUE-02` / `RN-SEG-02` (Federación Google Identity):** Si el correo de Google no existe en base de datos, se emite un token de registro efímero firmado de 10 minutos para solicitar el número de teléfono faltante antes de crear la cuenta.
* **`RN-CUE-03` (Registro B2B Pendiente y Custodia RUT):** Las cuentas corporativas nacen en estado `pendiente`. El archivo RUT se valida (máximo 5MB, PDF/PNG/JPEG) y se almacena con hash SHA-256 inmutable.
* **`RN-CUE-04` / `ADR-012` (Defensa Anti-Fuerza Bruta y Timing Attack):** Tras 5 intentos fallidos dentro de la ventana de 15 minutos, la cuenta se bloquea temporalmente por 15 minutos. Ante correos inexistentes, se ejecuta una comparación señuelo con hash BCrypt simulado de costo 12 (`$2b$12$...`) para evitar enumeración de usuarios por discrepancia de tiempo de respuesta.
* **`RN-CUE-05` / `ADR-011` (Primer Acceso Forzoso):** Cuentas con flag `cambioContrasenaPendiente = true` rechazan autenticación regular y devuelven token temporal `CAMBIO_CONTRASENA_REQUERIDO` para forzar la actualización de clave.
* **`RN-CUE-06` / `ADR-012` (Recuperación Anti-Enumeración):** La solicitud de recuperación devuelve siempre respuesta idéntica exitosa (`{ ok: true, datos: { enviado: true, mensaje: '...' } }`) independientemente de si el correo existe o no en el sistema.
* **`RN-CUE-07` (Límite de 10 Direcciones y Predeterminada Única):** Restricción técnica que impide registrar más de 10 direcciones. La primera dirección registrada se marca automáticamente como predeterminada.
* **`RN-CUE-08` / `HU-CUE-08` (Unicidad Universal de Cuentas):** Índices únicos funcionales y de base de datos impiden colisiones de correo, NIT vigente y solicitudes simultáneas pendientes.
* **`RN-CUE-09` (Renovación de NIT):** Empresas activas pueden solicitar actualización de NIT adjuntando RUT soporte, requiriendo dictamen administrativo.
* **`RN-CUE-10` (Dictamen Administrativo y Desactivación):** Aprobación de empresa genera registro 1:1 en `cuenta_empresa`. Rechazo exige motivo mínimo de 10 caracteres. Desactivación de cuenta por el usuario exige confirmación de contraseña e invalida todas las sesiones activas en M20.

### 4.2 Políticas Transversales Validadas
* 🔒 **M20 - Credenciales (`HU-SEG-01`):** BCrypt con factor de costo 12 (`derivarContrasena`).
* 🔒 **M20 - Sesiones y Cookies (`HU-SEG-02`):** Cookies de sesión `pc_sid` emitidas con atributos `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` (en producción) mediante `ATRIBUTOS_COOKIE_SESION`.
* 🔒 **M20 - Control de Acceso en Servidor (`HU-ADM-03`):** Middleware de sesión y comprobación de permisos administrativos en `/admin/empresas`.
* 🔒 **M20 - No Exposición de Datos Sensibles (`HU-SEG-06`):** Respuestas filtradas y tipadas con DTOs de salida; nunca se retornan contraseñas, hashes ni secretos.

---

## 5. RESUMEN DE DEPENDENCIAS EXTERNAS

* **`M20 — Seguridad`:**
  - Consume: `SesionService` para crear sesión al verificar OTP, completar login, validar sesiones protegidas e invalidar sesiones en logout, cambio de clave, reseteo o desactivación.
  - Dependencia activa y montada en `app.routes.ts`.
* **`M18 — Notificaciones`:**
  - Salto de ola autorizado por el Director Humano: M04 opera desacoplado mediante el puerto `NotificacionesPort` con adaptador en memoria (`MemoriaNotificacionesAdapter`) para pruebas, listo para conectarse al servicio SMTP real cuando se construya M18.

---

## 6. INVENTARIO DE ARCHIVOS ENTREGADOS

```
backend/
├── src/
│   ├── app.routes.ts                                           # Enrutador central con M04 montado
│   └── modules/
│       └── m04-cuentas/
│           ├── dtos/
│           │   └── m04-cuentas.dto.ts                          # DTOs Zod canónicos para M04
│           ├── interfaces/
│           │   ├── almacen-documentos.port.ts                  # Puerto para custodia de RUT
│           │   ├── cuentas.interfaces.ts                       # Tipos de dominio desacoplados
│           │   ├── date-provider.port.ts                       # Abstracción de tiempo
│           │   ├── google-auth.port.ts                         # Puerto para verificación Google
│           │   └── notificaciones.port.ts                      # Puerto para envíos de correo/OTP
│           ├── adapters/
│           │   ├── date-provider.adapter.ts                    # Adaptadores real y simulado
│           │   ├── google-auth.adapter.ts                      # Adaptador mock de Google
│           │   └── notificaciones.adapter.ts                   # Adaptador en memoria
│           ├── repositories/
│           │   ├── codigos-verificacion.repository.ts          # Repositorio de OTP y tokens
│           │   ├── control-intentos.repository.ts              # Repositorio de bloqueos por intento
│           │   ├── cuentas.repository.ts                       # Repositorio de usuarios y empresas
│           │   ├── direcciones.repository.ts                   # Repositorio de libreta de direcciones
│           │   ├── documentos.repository.ts                    # Repositorio de documentos RUT
│           │   └── solicitudes-empresa.repository.ts           # Repositorio de solicitudes y renovaciones
│           ├── services/
│           │   ├── auth-cuentas.service.ts                     # Servicio de autenticación y registro
│           │   ├── direcciones.service.ts                      # Servicio de direcciones
│           │   ├── empresas.service.ts                         # Servicio de gestión empresarial y dictamen
│           │   ├── perfil.service.ts                           # Servicio de perfil y credenciales
│           │   └── recuperacion-password.service.ts            # Servicio de recuperación de contraseña
│           ├── controllers/
│           │   ├── auth-cuentas.controller.ts                  # Controlador de autenticación
│           │   ├── direcciones.controller.ts                   # Controlador de direcciones
│           │   ├── empresas.controller.ts                      # Controlador de empresas y admin
│           │   ├── perfil.controller.ts                        # Controlador de perfil
│           │   └── recuperacion-password.controller.ts         # Controlador de recuperación
│           ├── m04.routes.ts                                   # Montaje modular de rutas M04
│           └── __tests__/
│               ├── auth-cuentas.service.test.ts                # 13 tests de autenticación y registro
│               ├── direcciones.service.test.ts                 # 8 tests de libreta de direcciones
│               ├── empresas.service.test.ts                    # 8 tests de empresas y dictamen
│               ├── m04.routes.test.ts                          # 3 tests de integración de rutas
│               ├── perfil.service.test.ts                      # 8 tests de perfil y cambio de clave
│               └── recuperacion-password.service.test.ts       # 5 tests de recuperación y señuelo
.sdlc/
└── docs/
    └── contracts/
        └── m04-cuentas.contract.ts                             # Contrato Zod rector sincronizado
```

---

## 7. VERIFICACIÓN DETERMINISTA Y CRITERIOS DE CIERRE (Definition of Done)

| Criterio / Puerta de Calidad | Herramienta / Comando | Resultado Obtenido | Observaciones |
| :--- | :--- | :---: | :--- |
| **Compilación TypeScript Backend** | `npx tsc --noEmit` | ✅ **0 errores** | Tipado estricto sin inferencias laxas |
| **Calidad de Código y Estilo** | `npm run lint` | ✅ **0 errores / 0 warnings** | ESLint estricto con reglas completas |
| **Prohibición Absoluta de ANY** | `npm run check:no-any` | ✅ **0 ANY** | 99 archivos backend auditados |
| **Pruebas Automatizadas Backend** | `npm test` (Vitest) | ✅ **18/18 suites PASS (116/116 tests)** | 45 pruebas nuevas para M04 + regresión completa |
| **Pruebas Automatizadas Frontend** | `npm test` (Vitest) | ✅ **9/9 suites PASS (57/57 tests)** | 0 regresiones en suites de M20 y M17 |
| **Auditoría de Contratos Zod** | `npm run test:contracts` | ✅ **16/16 PASS (0 fallos)** | Contratos rector y DTOs 100% blindados |
| **Total Pruebas en Repositorio** | Vitest (Backend + Frontend) | ✅ **173/173 tests PASS** | Cobertura integral verificada |
