# ADR-011 — Autenticación, flujo unificado y coordinación con M20

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M04

## Contexto
El flujo de autenticación y gestión de sesiones cruza directamente los módulos M04 (Cuentas) y M20 (Seguridad y Auditoría):
1. **Regla Inmutable `RN-SEG-01`:** Toda contraseña debe almacenarse como hash BCrypt con costo de sal mínimo de 12.
2. **Regla Inmutable `RN-SEG-02`:** Toda cuenta debe contar con contraseña propia, incluso si utiliza federación con Google Identity (`HU-CUE-02`), permitiendo autenticación alternativa si el proveedor externo falla.
3. **Gestión de Sesiones (`HU-SEG-02` / `ADR-005`):** Las sesiones se persisten en la tabla `sesion` con UUID no enumerable, control de inactividad por tipo de sesión (`admin`: 30 min, `cliente`: 30 días) y cookie `HttpOnly`, `SameSite=Strict`, `Secure`.
4. **Primer Acceso con Cambio de Clave Forzoso (`CA-ADM-01-03`, `RN-CUE-04`):** Las cuentas de colaboradores creadas administrativamente nacen con contraseña temporal y deben cambiarla obligatoriamente antes de operar.

## Decisión
1. **Verificación de Credenciales en Login (`HU-CUE-04`):**
   - El endpoint de login valida correo y contraseña.
   - La verificación de hash se ejecuta mediante `bcrypt.compare`.
   - Se utiliza un timing indistinguible para mitigar enumeración de usuarios (ver `ADR-012`).
2. **Emisión de Sesión Delegada a Modelo M20:**
   - Ante autenticación exitosa, se crea el registro en `sesion` mediante `SesionRepository` (o servicio de M20), calculando `fecha_expiracion` de acuerdo al tipo de sesión.
   - El token de sesión (`sid`) viaja exclusivamente en la cookie HTTP `pintuclic_sid` con flags de seguridad estrictas (`HttpOnly`, `SameSite=Strict`, `Secure` en producción).
3. **Flujo de Primer Acceso (`cambio_contrasena_pendiente`):**
   - Si la columna `cambio_contrasena_pendiente` de `usuario` es `true`, la respuesta de autenticación devuelve `cambioContrasenaPendiente: true` y la sesión emitida se marca con restricción en memoria o payload restringido.
   - Cualquier intento de acceder a recursos administrativos es rechazado hasta que el usuario invoque el endpoint `/api/cuentas/primer-acceso/cambiar-contrasena`, el cual actualiza el hash de la contraseña y conmuta la bandera a `false` en una sola transacción.
4. **Flujo Federado con Google Identity (`HU-CUE-02`):**
   - El cliente envía el ID token emitido por Google.
   - M04 valida la firma y vigencia mediante `GoogleAuthPort` (aislando la librería `google-auth-library` para permitir testing determinista sin credenciales de Google).
   - Si la identidad externa (`sub`) ya está vinculada en `usuario_identidad_externa`, se emite la sesión de inmediato.
   - Si no está vinculada pero el correo coincide con una cuenta local existente, se vincula automáticamente (`RN-CUE-02`).
   - Si el usuario no existe en el sistema, no se crea la fila en `usuario` inmediatamente (evitando cuentas incompletas sin contraseña): se genera un token de registro temporal firmado por el servidor (JWT TTL 10m con `sub`, `email`, `nombre`), el cual el frontend utiliza para solicitar al usuario que defina su contraseña requerida por `RN-SEG-02` para completar el registro.

## Consecuencias

**Positivas**
- Cumplimiento estricto de las reglas transversales de seguridad `RN-SEG-01` y `RN-SEG-02`.
- Coordinación natural con el ciclo de vida de sesiones implementado en M20 sin duplicar lógica ni tablas.
- Flujo federado robusto que no crea cuentas zombi ni elude el requisito de contraseña local.

**Negativas / Aceptadas**
- El usuario de Google debe ingresar una contraseña la primera vez que se registra. Esto es una consecuencia directa y requerida por la regla de negocio `RN-SEG-02`.

## Alternativas Descartadas
- **Almacenar sesiones en JWT sin estado (stateless JWT puro):** Descartado taxativamente por `ADR-005` y `RN-SEG-02` (exigen revocabilidad inmediata, caducidad por inactividad y registro en base de datos).
- **Crear usuarios de Google sin contraseña o con contraseña dummy vacía:** Descartado porque violaría `RN-SEG-01` y `RN-SEG-02`.
