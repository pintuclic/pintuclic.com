# WALKTHROUGH DE IMPLEMENTACIÓN — M04 · Validación real contra PostgreSQL y correcciones

> 📌 **Módulo:** `M04 — Cuentas, Autenticación y Perfil`
> 🏷️ **Capa:** Backend (Express 5 + Prisma 6 + Zod 4) con un ajuste de frontend · 🎯 **Fase:** 3B (cierre) · **Autorización:** Director Humano, "te autorizo"

## 1. Metadatos
* **Versión:** `v0.6.1` · **Fecha:** 22/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Antecedente:** `walkthrough_v0.6.0_M04_cuentas_autenticacion_perfil_frontend.md` (frontend verificado solo con una API simulada).

## 2. Entorno de la validación real
| Pieza | Cómo |
| :--- | :--- |
| Base de datos | PostgreSQL 18 local, base **nueva** `pintuclic_dev` (`bd/sql/schema_pintuclic.sql` v4.2 + `seed_pintuclic.sql`: 53 tablas, 4 usuarios). No se tocó ninguna otra base del servidor. |
| Backend | Código real de `backend/src` con `backend/.env` local (no versionado). Se levantó con un **arnés de validación fuera del repositorio** que reproduce `index.ts` + `app.routes.ts` y solo inyecta en M04 un adaptador de notificaciones que imprime los OTP y enlaces en consola: el adaptador por omisión los guarda en memoria y M18 aún no existe. |
| Frontend | `next build` + `next start` con `BACKEND_URL=http://localhost:3000`: el navegador habla con `/api/v1` en el mismo origen y Next reenvía al backend. |
| Navegador | Chrome real, sin API simulada (`XMLHttpRequest` nativo), escritorio 1366 px, ubicación emulada (4.6097, -74.0817). |

## 3. Resultado por historia (contra la base real)
| HU | Verificado |
| :--- | :--- |
| `HU-CUE-01` | Registro → OTP emitido → verificación → cuenta `activo` creada solo al confirmar; contraseña `$2b$12$` (BCrypt costo 12, HU-SEG-01). |
| `HU-CUE-03` | Registro de empresa → solicitud `pendiente`. |
| `HU-CUE-04` | Login y credencial inválida con contador de intentos; **primer acceso** con `cambio_contrasena_pendiente` → cambio obligatorio → sesión abierta y marca en `false`. |
| `HU-CUE-05` | Mensaje uniforme; enlace real del correo → nueva contraseña; **token de un solo uso** (`TOKEN_INVALIDO_O_EXPIRADO` al reutilizarlo); la contraseña anterior deja de servir. |
| `HU-CUE-06` | Datos; **cambio de contraseña cierra todas las sesiones** (una segunda sesión abierta por API pasó a 401, DP-16); cambio de correo con OTP: el correo vigente no cambia hasta confirmar (RN-CUE-11); ascenso a empresa `pendiente`; desactivación → `inactivo` y login rechazado con `CUENTA_NO_ACTIVA` solo tras validar la credencial (RN-CUE-08). |
| `HU-CUE-07` | Alta con **ubicación del dispositivo guardada** (latitud/longitud, CA-CUE-07-04); sin ubicación las coordenadas quedan nulas (RN-CUE-22); una sola predeterminada al cambiarla (RN-CUE-21); edición y eliminación. |
| `HU-CUE-09` | Panel con datos reales; rechazo de registro con motivo; aprobación de ascenso → cuenta `empresa` + `cuenta_empresa` en la misma transacción; eventos de dictamen emitidos. Sin `empresas.validar`: 404 opaco y "No tienes acceso" (HU-ADM-03). |
| `HU-CUE-10` | RUT real de **2 MB** enviado desde la vista (pasa el límite JSON por ruta de v0.6.0); NIT vigente intacto mientras está pendiente; **descarga del RUT idéntica byte a byte** (SHA-256); aprobación → NIT actualizado. |

## 4. Hallazgos y correcciones
### 4.1 `GET/PUT /cuentas/perfil` no cumplían el contrato (backend)
* **Síntoma:** una cuenta empresa se mostraba como personal y no podía pedir la renovación de NIT desde la vista.
* **Causa:** `PerfilService.obtenerPerfil` respondía `tipoUsuario` y `cuentaEmpresa` y omitía `cambioContrasenaPendiente`, mientras `perfilUsuarioResponseSchema` (contrato rector) exige `tipo`, `empresa` y `cambioContrasenaPendiente`. `actualizarDatos` devolvía solo 4 campos. La prueba unitaria fijaba la forma incorrecta.
* **Corrección:** ambos métodos devuelven `PerfilUsuarioResponse` (`PUT` relee el perfil completo); `fechaAprobacion` en ISO. La prueba valida ahora contra `perfilUsuarioResponseSchema.strict()` y comprueba que no salga el hash.

### 4.2 La unicidad del NIT se evadía con otro formato (backend, RN-CUE-14)
* **Síntoma:** `900555666-1` se rechazaba por duplicado, pero `900.555.666-1` se aceptaba como empresa nueva.
* **Causa:** el NIT solo se recortaba (`trim`) antes de compararlo; el RFC-M04-001 había dejado la normalización al contrato Zod.
* **Corrección:** `nitSchema` normaliza con `normalizarNit` (quita espacios y puntos; el guion del dígito de verificación se conserva) en backend, contrato rector y frontend; aplica a registro, ascenso y renovación. Verificado contra la base: con puntos o espacios responde `NIT_YA_REGISTRADO`.
* **Decisión pendiente del Product Owner:** si `9005556661` (sin guion) es el mismo NIT que `900555666-1`. No se infiere el dígito de verificación.
* **Datos existentes:** en producción no hay datos; en `pintuclic_dev` se normalizaron los NIT de prueba creados con puntos.

### 4.3 Promesa falsa en la vista (frontend)
* "Avisamos del cambio a tu correo anterior": el puerto de notificaciones no tiene ese evento. Se retiró el texto. **CA-CUE-06-02 sigue incumplido en el backend** (aviso al correo anterior), pendiente con M18.

## 5. Verificación
| Puerta | Resultado |
| :--- | :---: |
| Backend `tsc` · ESLint · `check:no-any` | ✅ |
| Vitest backend | ✅ 22/22 suites · **205/205** (+6: perfil contra el contrato, normalización del NIT en sus tres entradas) |
| Frontend `tsc` · ESLint · Vitest | ✅ · 136/136 |
| `validate-contracts` | ✅ |
| Navegador real contra `pintuclic_dev` | ✅ los tres hallazgos cerrados (§4) y las HU de §3 |

## 6. Limitaciones
* La validación usó un arnés para leer OTP y enlaces; con el arranque normal **no hay forma de recibirlos** hasta que M18 entregue el correo real (el adaptador de M04 por omisión los guarda en memoria).
* `HU-CUE-02` (Google) sigue aplazada.
* Docker no está instalado en este entorno: la pila de `docker compose` no se probó.

## 7. Archivos
```
backend/src/modules/m04-cuentas/services/perfil.service.ts
backend/src/modules/m04-cuentas/dtos/m04-cuentas.dto.ts            (normalizarNit + nitSchema)
backend/src/modules/m04-cuentas/__tests__/perfil.service.test.ts
backend/src/modules/m04-cuentas/__tests__/nit.dto.test.ts          (nuevo)
.sdlc/docs/contracts/m04-cuentas.contract.ts                       (normalizarNit + nitSchema)
frontend/src/modules/m04-cuentas/dtos/m04-cuentas.dto.ts           (normalizarNit + nitSchema)
frontend/src/modules/m04-cuentas/components/perfil/SeguridadSection.tsx
```
