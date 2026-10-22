# 🛠️ 04_ARQUITECTURA_Y_CODIGO — M04. Cuentas, Autenticación y Perfil

> **Módulo:** `M04` · **Scope:** `m04-cuentas` · **Ola:** 3 (Salto de Ola Autorizado por Director Humano)
> **Responsable:** Software Architect Lead (Fase 2)
> **Consumidores:** Backend Lead Engineer (Gate 3A) y Frontend Lead Engineer (Gate 3B)
> **Estado:** REVISIÓN — esperando firma del Director Humano en Gate 2
> **Contrato Rector:** [`../../contracts/m04-cuentas.contract.ts`](../../contracts/m04-cuentas.contract.ts)
> **ADRs Asociados:** [`ADR-009`](../../adrs/ADR-009-puerto-notificaciones-desacople-m18.md), [`ADR-010`](../../adrs/ADR-010-modelo-cuentas-empresa-documentos-sobre-ddl.md), [`ADR-011`](../../adrs/ADR-011-autenticacion-flujo-unificado-seguridad-m20.md), [`ADR-012`](../../adrs/ADR-012-control-intentos-acceso-y-antienumeracion.md)

---

## 1. Modelo de Persistencia y Mapeo Prisma (BD v3.0 / DDL v4.2)

### 1.1 Entidades y Mapeo del DDL
Conforme a `ADR-004`, `ADR-010` y los cambios aprobados en `RFC-M04-001` (C-1 a C-9), las tablas de M04 mapean con exactitud el esquema de `bd/sql/schema_pintuclic.sql`:
1. `usuario` (`@@map("usuario")`): Tabla central extendida con `cambio_contrasena_pendiente BOOLEAN` y restricción funcional `uq_usuario_correo_lower`.
2. `cuenta_empresa` (`@@map("cuenta_empresa")`): Extensión 1:1 de `usuario` para cuentas corporativas aprobadas, con NIT vigente `UNIQUE`.
3. `documento_soporte` (`@@map("documento_soporte")`): Almacenamiento seguro del archivo RUT (`BYTEA`, max 5 MB, SHA-256) detrás de `AlmacenDocumentosPort`.
4. `direccion_cliente` (`@@map("direccion_cliente")`): Libreta de direcciones (máx 10 por cuenta) con restricciones `uq_direccion_predeterminada_unica` y `uq_direccion_no_duplicada`.
5. `solicitud_empresa` (`@@map("solicitud_empresa")`): Solicitudes de registro inicial y ascenso a B2B con índices únicos parciales para solicitudes pendientes (`C-2`).
6. `solicitud_actualizacion_nit` (`@@map("solicitud_actualizacion_nit")`): Solicitudes formales de renovación de NIT vinculadas a `documento_soporte.id_documento`.
7. `usuario_identidad_externa` (`@@map("usuario_identidad_externa")`): Vínculos federados OAuth (Google Identity).
8. `codigo_verificacion` (`@@map("codigo_verificacion")`): Códigos efímeros con valor derivado `codigo_hash VARCHAR(255)` (`C-5`).
9. `control_intento_acceso` (`@@map("control_intento_acceso")`): Control anti-fuerza bruta e indistinguibilidad anti-enumeración indexado por correo normalizado (`C-6`).

---

## 2. Mapa de Rutas HTTP Canónicas (API REST)

Todas las rutas públicas residen bajo `/api/cuentas/` y las rutas administrativas de auditoría bajo `/api/admin/empresas/`:

### 2.1 Autenticación y Registro B2C
| Método | Ruta | Auth / Permiso | Propósito / HU |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cuentas/registro` | Pública | Solicitar registro particular emitiendo OTP (`HU-CUE-01`) |
| `POST` | `/api/cuentas/verificar-codigo` | Pública | Validar código OTP de 6 dígitos y activar cuenta (`HU-CUE-01`) |
| `POST` | `/api/cuentas/reenviar-codigo` | Pública | Reenviar código OTP respetando límite de reintentos (`HU-CUE-01`) |
| `POST` | `/api/cuentas/login` | Pública | Autenticación con email/contraseña, emite cookie `pintuclic_sid` (`HU-CUE-04`) |
| `POST` | `/api/cuentas/logout` | Sesión activa | Revocar sesión en servidor y borrar cookie (`HU-CUE-04`) |
| `POST` | `/api/cuentas/primer-acceso/cambiar-contrasena` | Sesión restringida | Cambio obligatorio de contraseña temporal (`HU-CUE-04` / `CA-ADM-01-03`) |

### 2.2 Federación Google Identity (`HU-CUE-02`)
| Método | Ruta | Auth / Permiso | Propósito / HU |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cuentas/oauth/google` | Pública | Verificar ID token de Google. Emite sesión directa o token temporal si es cuenta nueva |
| `POST` | `/api/cuentas/oauth/google/completar-registro` | Token temporal | Fijar contraseña obligatoria (`RN-SEG-02`) y consolidar registro federado |

### 2.3 Solicitudes de Cuenta Empresa B2B (`HU-CUE-03` y `HU-CUE-06`)
| Método | Ruta | Auth / Permiso | Propósito / HU |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cuentas/registro-empresa` | Pública | Registro directo de empresa B2B en estado pendiente (`HU-CUE-03`) |
| `POST` | `/api/cuentas/solicitar-ascenso-empresa` | Sesión cliente | Solicitar ascenso de cuenta particular a corporativa (`HU-CUE-06`) |

### 2.4 Recuperación de Contraseña (`HU-CUE-05`)
| Método | Ruta | Auth / Permiso | Propósito / HU |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cuentas/recuperar-password` | Pública | Solicitar enlace de recuperación (respuesta indistinguible) (`HU-CUE-05`) |
| `POST` | `/api/cuentas/restablecer-password` | Pública | Restablecer contraseña con token de recuperación válido (`HU-CUE-05`) |

### 2.5 Gestión de Perfil y Libreta de Direcciones (`HU-CUE-06` y `HU-CUE-07`)
| Método | Ruta | Auth / Permiso | Propósito / HU |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cuentas/perfil` | Sesión activa | Obtener datos de perfil, tipo de cuenta y empresa (`HU-CUE-04`, `HU-CUE-08`) |
| `PUT` | `/api/cuentas/perfil/datos` | Sesión activa | Actualizar nombre y teléfono (`HU-CUE-06`) |
| `PUT` | `/api/cuentas/perfil/contrasena` | Sesión activa | Cambiar contraseña validando contraseña actual (`HU-CUE-06`) |
| `POST` | `/api/cuentas/perfil/cambio-correo/solicitar` | Sesión activa | Solicitar cambio de correo enviando OTP al nuevo correo (`HU-CUE-06`) |
| `POST` | `/api/cuentas/perfil/cambio-correo/confirmar` | Sesión activa | Confirmar nuevo correo con código OTP recibido (`HU-CUE-06`) |
| `GET` | `/api/cuentas/direcciones` | Sesión activa | Listar direcciones de entrega del usuario (`HU-CUE-07`) |
| `POST` | `/api/cuentas/direcciones` | Sesión activa | Crear nueva dirección (máximo 10) (`HU-CUE-07`) |
| `PUT` | `/api/cuentas/direcciones/:id` | Sesión activa | Actualizar dirección existente (`HU-CUE-07`) |
| `DELETE` | `/api/cuentas/direcciones/:id` | Sesión activa | Eliminar dirección (`HU-CUE-07`) |
| `PATCH` | `/api/cuentas/direcciones/:id/predeterminada` | Sesión activa | Designar como dirección predeterminada única (`HU-CUE-07`) |

### 2.6 Administración y Renovación de NIT (`HU-CUE-09` y `HU-CUE-10`)
| Método | Ruta | Auth / Permiso | Propósito / HU |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/empresas/solicitudes` | `empresas.validar` | Listar solicitudes pendientes, aprobadas y rechazadas (`HU-CUE-09`) |
| `GET` | `/api/admin/empresas/solicitudes/:id` | `empresas.validar` | Detalle de solicitud corporativa o renovación (`HU-CUE-09`) |
| `POST` | `/api/admin/empresas/solicitudes/:id/dictamen` | `empresas.validar` | Aprobar o rechazar solicitud con justificación obligatoria (`HU-CUE-09`) |
| `POST` | `/api/cuentas/renovacion-nit` | Sesión empresa | Radicar solicitud de cambio de NIT adjuntando RUT (max 5 MB) (`HU-CUE-10`) |
| `GET` | `/api/admin/documentos/:id` | `empresas.validar` | Descarga segura autorizada del RUT soporte (`HU-CUE-10`) |

---

## 3. Arquitectura Hexagonal y Puertos de Salida

Para cumplir la Directiva #1 y garantizar total testabilidad unitaria:

```mermaid
flowchart TD
    subgraph Dominio M04
        CuentasService["CuentasService"]
        AuthService["AuthService"]
        EmpresasService["EmpresasService"]
        DireccionesService["DireccionesService"]
    end

    subgraph Puertos de Salida
        NotificacionesPort["NotificacionesPort (M18)"]
        GoogleAuthPort["GoogleAuthPort (OAuth)"]
        AlmacenDocumentosPort["AlmacenDocumentosPort (Storage)"]
        DateProviderPort["DateProviderPort (Clock)"]
        AuditoriaPort["AuditoriaPort (M20)"]
    end

    Dominio M04 --> NotificacionesPort
    Dominio M04 --> GoogleAuthPort
    Dominio M04 --> AlmacenDocumentosPort
    Dominio M04 --> DateProviderPort
    Dominio M04 --> AuditoriaPort
```

1. **`NotificacionesPort`:** Desacopla la lógica de M04 del módulo M18. En tests utiliza `MemoriaNotificacionesAdapter`.
2. **`GoogleAuthPort`:** Aísla `google-auth-library` para verificar tokens ID sin llamadas de red en pruebas unitarias.
3. **`AlmacenDocumentosPort`:** Custodia y recuperación de archivos adjuntos (RUT). En Fase 3A implementa `PrismaDocumentosRepository` sobre la tabla `documento_soporte`.
4. **`DateProviderPort`:** Permite inyectar el reloj del sistema para contrastar determinísticamente los escenarios BVA de vencimiento (14:59 vs 15:01).
5. **`AuditoriaPort`:** Emite eventos de trazabilidad de seguridad hacia el adaptador técnico de M20.

---

## 4. Garantías de Seguridad y Políticas Transversales

- **BCrypt Sal 12:** Toda contraseña se hashea con sal de coste 12 (`RN-SEG-01`).
- **Antienumeración e Indistinguibilidad:** Mitigación mediante `control_intento_acceso` y dummy BCrypt compare ante usuarios inexistentes (`ADR-012`).
- **Anti-CSRF y Sesiones:** Cookie `pintuclic_sid` con flags `HttpOnly`, `SameSite=Strict`, `Secure` (`ADR-005` y `ADR-011`).
- **Zero Warnings / Zero Errors / Cero ANY:** Obligatoriedad de paso limpio de `npm run check:no-any`, `npm run lint` y `npx tsc --noEmit`.
