# ADR-012 — Control de intentos de acceso, mitigación anti-fuerza bruta y anti-enumeración

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M04

## Contexto
Los requisitos funcionales de seguridad de M04 y M20 imponen dos objetivos potencialmente en tensión:
1. **Defensa anti-fuerza bruta (`RN-CUE-07`):** Bloqueo temporal por 15 minutos tras 5 intentos fallidos consecutivos de inicio de sesión (`HU-CUE-04`).
2. **Indistinguibilidad y Anti-enumeración (`RN-CUE-06` / `ADR-003`):** Un atacante externo no debe poder deducir si una cuenta o correo electrónico existe en el sistema basándose en mensajes de error, códigos de estado HTTP ni diferencias en los tiempos de respuesta.

Si el contador de intentos fallidos residiera en la tabla `usuario`, un atacante que pruebe un correo inexistente jamás observaría un bloqueo temporal, mientras que al probar un correo existente observaría el bloqueo al quinto intento: esto constituiría un oráculo directo de enumeración de cuentas.

## Decisión
1. **Tabla dedicada desacoplada `control_intento_acceso` (RFC-M04-001 C-6):**
   - La tabla se indexa por la clave primaria `correo VARCHAR(150)` normalizado (minúsculas y `trim`).
   - Registra intentos fallidos tanto para cuentas que existen como para correos que NO existen en `usuario`.
   - Si se reciben 5 intentos fallidos consecutivos dentro de la ventana de evaluación, se establece `bloqueado_hasta = now() + interval '15 minutes'`.
2. **Defensa contra ataques de canal lateral por tiempo (Timing Side-Channels):**
   - Cuando el correo no existe en `usuario`, el servicio ejecuta una comparación falsa de BCrypt contra un hash precalculado ficticio (`DUMMY_BCRYPT_HASH`), consumiendo el mismo costo computacional de CPU (~80-120ms) que una verificación de contraseña real.
3. **Mensajes y Respuestas Indistinguibles:**
   - Tanto si la contraseña es errónea, como si el correo no existe, o si la cuenta está temporalmente restringida, la respuesta JSON devuelve el mismo código de error estándar:
     `{ "exito": false, "codigo": "CREDENCIALES_INVALIDAS", "mensaje": "Credenciales inválidas o cuenta no disponible" }`.
   - En el flujo de recuperación de contraseña (`HU-CUE-05`), exista o no el correo, la respuesta siempre es unívoca:
     `{ "exito": true, "mensaje": "Si el correo está registrado en el sistema, hemos enviado un enlace de recuperación" }`.
4. **Normalización de correos (`RN-CUE-01` / RFC-M04-001 C-7):**
   - Todo correo entrante es normalizado con `.toLowerCase().trim()` en los DTOs Zod antes de alcanzar la lógica de negocio o la base de datos.
   - El índice `uq_usuario_correo_lower` respalda esta unicidad a nivel de motor PostgreSQL.

## Consecuencias

**Positivas**
- Blindaje absoluto contra oráculos de enumeración de correos en autenticación y recuperación.
- Mitigación eficaz de ataques de fuerza bruta automatizados o ataques de diccionario.
- Comportamiento y tiempos de respuesta homogéneos ante cualquier tipo de entrada.

**Negativas / Aceptadas**
- Un atacante podría bloquear temporalmente el acceso a un usuario legítimo si conoce su correo y envía 5 contraseñas erróneas intencionales (Denegación de Servicio acotada). Se mitiga limitando el tiempo de bloqueo a solo 15 minutos y permitiendo recuperación por correo seguro.
- Requiere mantenimiento periódico para depurar registros obsoletos en `control_intento_acceso` cuyo último intento sea mayor a 24 horas.

## Alternativas Descartadas
- **Añadir columnas `intentos_fallidos` y `bloqueado_hasta` a la tabla `usuario`:** Descartado categóricamente porque filtraría la existencia de usuarios mediante oráculo de comportamiento.
- **Diferenciar mensajes como "Usuario no encontrado" vs "Contraseña incorrecta":** Descartado taxativamente por violar `RN-CUE-06` y la política transversal de seguridad `HU-SEG-06`.
