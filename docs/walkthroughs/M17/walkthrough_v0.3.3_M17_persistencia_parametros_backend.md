# WALKTHROUGH DE IMPLEMENTACIÓN — CAPA BACKEND

> **Módulo:** `M17 — Administración, Empleados y Permisos`  
> **Versión Generada:** `v0.3.3`  
> **Fecha de Entrega:** 2026-10-21  
> **Autor / Responsable:** Jorge Alejandro Peña Motta (@DanExl24)  
> **Apoyo de IA:** Antigravity (Gemini) — asistencia en implementación técnica, nunca como autor.  
> **Estado de la Implementación:** ✅ COMPLETO (Cierre de deuda técnica de persistencia de parámetros)

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

| Campo | Valor |
| :--- | :--- |
| Ola | 1 (Seguridad y Administración) |
| Capa | Backend (Express 5 + Prisma 6 + PostgreSQL) |
| Alcance | `backend/prisma/schema.prisma` y `backend/src/modules/m17-permisos/` |
| RFC Asociado | `RFC-M17-001` (Aprobado por el Director Humano el 2026-10-21) |
| Archivos modificados | 7 |
| Tests Vitest backend | **71/71 PASS** (12 suites) — 1 suite ampliada (+1 test) |
| Calidad de Tipado | `npx tsc --noEmit` limpio (0 errores) |
| Linter | `npm run lint` limpio (0 advertencias, 0 errores) |
| Tolerancia Cero any | 145 archivos auditados, **0 usos de ANY** (`check:no-any`) |

---

## 2. HISTORIAS DE USUARIO CUBIERTAS EN ESTA VERSIÓN

| ID Historia | Título de la Historia de Usuario | Estado de Cobertura | Endpoints / Componentes Desarrollados |
| :--- | :--- | :---: | :--- |
| **HU-ADM-05** | Configuración General y Parámetros del Sistema | **100% Cumplida** | `GET /api/v1/admin/configuracion`<br>`PUT /api/v1/admin/configuracion/:clave` |
| **HU-ADM-07** | Integridad y Resiliencia del Catálogo de Configuración | **100% Cumplida** | `PrismaConfiguracionRepository` + `parametro_sistema` (PostgreSQL) |

### Descripción del Alcance de la Versión

Esta entrega implementa en su totalidad el plan de cambio técnico definido en la sección §5 del **`RFC-M17-001`**, eliminando la deuda técnica transitoria aceptada originalmente en `ADR-007`:

1. **Persistencia en PostgreSQL (`parametro_sistema`):** Sustituye el almacén en memoria volátil (`AlmacenConfiguracionMemoria`) por `PrismaConfiguracionRepository`, conectando directamente la API administrativa a la tabla relacional `parametro_sistema` (esquema BD v2.9 / v4.1).
2. **Cero Siembra en Código (Directiva #10):** Se elimina el array hardcodeado de 10 parámetros que residía en TypeScript dentro de `configuracion.repository.ts`. Toda la siembra de datos iniciales reside exclusivamente en `bd/sql/seed_pintuclic.sql`. `AlmacenConfiguracionMemoria` queda reservado como doble de pruebas desacoplado que recibe fixtures por constructor.
3. **Trazabilidad del Administrador (`idAdmin`):** Se actualiza el contrato `ConfiguracionPort.actualizar(clave, nuevoValor, idAdmin?)` para registrar al actor administrativo que modifica la configuración en la columna `id_usuario_actualizo` (`fk_parametro_usuario`).
4. **Caché en Memoria de Alta Velocidad (TTL 30s):** Se implementa una caché corta transparente en el adaptador Prisma para responder consultas de alta frecuencia (como las ventanas de seguridad consultadas por M20 en cada inicio de sesión) en `< 1ms`. La caché se invalida inmediatamente ante cualquier actualización mediante `invalidarCache()`.

---

## 3. REGLAS DE NEGOCIO Y POLÍTICAS DE SEGURIDAD APLICADAS

### A. Reglas de Negocio Específicas del Módulo
- **RN-ADM-15 (Validación de Parámetros):** El valor nunca puede ser nulo, debe coincidir con el tipo de dato (`numero`, `texto`, `booleano`) y respetar los rangos `[rangoMinimo, rangoMaximo]`.
- **RN-ADM-16 (Irretroactividad):** Los cambios aplican de forma inmediata en caliente sin alterar registros históricos.
- **RN-SEG-01 / D-5 (Piso de Seguridad M20):** La longitud mínima de contraseña (`auth.complejidad_minima_contrasena`) está atada a un rango estricto de 12–32 caracteres, garantizando que ningún administrador pueda reducir la seguridad por debajo de los 12 caracteres exigidos por M20.

### B. Políticas Transversales Validadas
- 🛡️ **Directiva #10 (Origen Único de Datos):** Cero arrays de datos hardcodeados en runtime dentro del backend.
- 🔒 **M20 - Autorización en Servidor (`HU-ADM-03`):** El endpoint `/configuracion/:clave` está protegido por el middleware `soloAdmin` que verifica la identidad del usuario administrador en base de datos.
- 👁️ **M20 - Mínima Exposición (`HU-SEG-06`):** Las respuestas respetan el envelope canónico sin exponer detalles técnicos ni credenciales.
- 📐 **Directiva #11 (Calidad Estricta):** Cero advertencias de ESLint, TypeScript estricto con `exactOptionalPropertyTypes: true` y 0 usos del tipo `any`.

---

## 4. MATRIZ DE CRITERIOS DE ACEPTACIÓN CUMPLIDOS

### 🔹 Historia de Usuario: HU-ADM-05 y HU-ADM-07 — Configuración General y Parámetros

| ID Criterio | Criterio de Aceptación (Gherkin) | Método de Validación | Resultado |
| :--- | :--- | :--- | :---: |
| **CA-ADM-05-01** | **Dado que** el administrador solicita el catálogo de configuración...<br>**Cuando** invoca `GET /configuracion`...<br>**Entonces** recibe los parámetros mapeados desde la tabla `parametro_sistema`. | Prueba unitaria y de repositorio con Prisma | ✅ **CUMPLIDO** |
| **CA-ADM-05-02** | **Dado que** se actualiza un parámetro numérico dentro de rango...<br>**Cuando** se ejecuta `PUT /configuracion/:clave`...<br>**Entonces** el nuevo valor se persiste en BD, se registra `id_usuario_actualizo` y la caché se invalida. | Suite `PrismaConfiguracionRepository` en Vitest | ✅ **CUMPLIDO** |
| **CA-ADM-05-03** | **Dado que** se ingresa un valor menor a `rangoMinimo` o mayor a `rangoMaximo`...<br>**Cuando** se intenta actualizar...<br>**Entonces** se rechaza con error 400 `PARAMETRO_INVALIDO`. | Pruebas de límites y rangos en `configuracion.service.test.ts` | ✅ **CUMPLIDO** |
| **CA-ADM-05-04** | **Dado que** M20 o servicios de alto tráfico consultan parámetros repetidamente...<br>**Cuando** las consultas ocurren dentro de la ventana de 30s...<br>**Entonces** se resuelven desde la memoria local sin llamadas redundantes a la BD. | Spy sobre `prisma.parametroSistema.findMany` | ✅ **CUMPLIDO** |

---

## 5. RESUMEN CONCEPTUAL DE DEPENDENCIAS EXTERNAS E INTEGRACIÓN

### A. Dependencias Hacia Atrás (¿De qué requiere para operar al 100% en Producción?)
- **Mapeo Prisma y Base de Datos:** Requiere PostgreSQL ejecutando el esquema `v4.1` con la tabla `parametro_sistema` y la siembra de `seed_pintuclic.sql`.
- **Módulo M20 (Seguridad):** Requiere `req.actor` provisto por el middleware de autenticación para vincular `idAdmin` al registro auditable.

### B. Dependencias Hacia Adelante (¿A qué otros módulos habilita este desarrollo?)
- **Módulo M04 (Cuentas, Autenticación y Perfil):** Habilita la lectura dinámica y configurable en caliente de los parámetros de autenticación (`auth.vigencia_codigo_registro_minutos`, `auth.intentos_codigo_registro`, `auth.complejidad_minima_contrasena`, `auth.intentos_fallidos_bloqueo`).
- **Módulo M07 (Checkout) y M08 (Órdenes):** Habilita la lectura centralizada de `comercial.iva_porcentaje`, `comercial.costo_envio_base` y `comercial.umbral_envio_gratis` sin duplicar constantes.

---

## 6. REGISTRO DE ARCHIVOS MODIFICADOS

| Archivo | Naturaleza del Cambio |
| :--- | :--- |
| `backend/prisma/schema.prisma` | Se agregan los enums `AreaParametro`, `TipoDatoParametro`, la relación en `Usuario` y el modelo `ParametroSistema` mapeado a `parametro_sistema`. |
| `backend/src/modules/m17-permisos/interfaces/configuracion.port.ts` | Se agrega `idUsuarioActualizo` a `EntidadParametro` y el parámetro opcional `idAdmin?: number` a `actualizar()`. |
| `backend/src/modules/m17-permisos/repositories/configuracion.repository.ts` | Se implementa `PrismaConfiguracionRepository` con caché TTL de 30s e invalidación reactiva. Se elimina el array hardcodeado de 140 líneas de datos iniciales en cumplimiento de Directiva #10. |
| `backend/src/modules/m17-permisos/services/configuracion.service.ts` | Se adapta `actualizarParametro` para recibir `idAdmin?: number` y propagarlo al puerto. |
| `backend/src/modules/m17-permisos/controllers/configuracion.controller.ts` | Se extrae `req.actor?.idUsuario` y se pasa a `configService.actualizarParametro`. |
| `backend/src/modules/m17-permisos/m17.routes.ts` | Se reemplaza `AlmacenConfiguracionMemoria` por `PrismaConfiguracionRepository` como repositorio de producción. |
| `backend/src/modules/m17-permisos/__tests__/configuracion.service.test.ts` | Se agregan fixtures limpios para tests unitarios y nueva suite de pruebas para verificar caché e invalidación en `PrismaConfiguracionRepository`. |

---

## 7. DICTAMEN TÉCNICO

La persistencia de configuración general queda 100% implementada y verificada. Se cierran formalmente los hallazgos `D-1`, `D-2`, `D-4` y `D-5` de `RFC-M17-001`. El backend pasa limpio todas las verificaciones automáticas con 71/71 tests PASS, 0 errores en TypeScript y 0 advertencias en ESLint.
