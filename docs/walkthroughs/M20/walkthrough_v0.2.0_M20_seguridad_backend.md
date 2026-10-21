# WALKTHROUGH DE IMPLEMENTACIÓN — M20 Backend

> 📌 **Emitido para saldar el Hallazgo #1 (S4) del
> [`QA_REPORT.md`](../../../.sdlc/docs/qa/M20/v0.2.0/QA_REPORT.md).** La implementación se entregó en
> el commit `0d097ec` con la evidencia depositada únicamente en el `WORKLOG.md` del Backend Lead,
> sin este archivo. La Directiva #6 de `AGENTS.md` exige un walkthrough por **cada** implementación, y
> la guía de versionado impone el sufijo de capa precisamente para que backend y frontend no se
> solapen. El hallazgo es correcto.

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

* **Versión Generada:** `v0.2.0`
* **Módulo de Origen:** `M20 — Seguridad, Auditoría y Protección de Datos`
* **Capa:** Backend (Fase 3A — pase continuo)
* **Fecha de Entrega:** 21/10/2026 · **Walkthrough emitido:** 21/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Estado:** ⚠️ **PARCIAL** — 5 de 6 historias; `HU-SEG-04` aplazada por el Product Owner

---

## 2. HISTORIAS DE USUARIO CUBIERTAS

| ID | Historia | Cobertura | Artefactos |
| :--- | :--- | :---: | :--- |
| **HU-SEG-01** | Almacenamiento seguro de credenciales | 100 % | `crypto.ts`, `credenciales.service.ts` |
| **HU-SEG-02** | Gestión de sesión | 100 % | `sesion.service.ts`, `jwt.ts`, `cookieSesion.ts`, `auth.middleware.ts` |
| **HU-SEG-03** | Autorización verificada en el servidor | ⚠️ parcial | `autorizacion.service.ts`, `autorizacion.middleware.ts` |
| **HU-SEG-04** | Registro de auditoría | 🛑 **aplazada** | solo el puerto `AuditoriaPort` |
| **HU-SEG-05** | Protección de datos personales | parcial | `privacidad.service.ts`, `privacidad.controller.ts` |
| **HU-SEG-06** | No exposición de datos sensibles | 100 % | `errorHandler.ts`, `apiResponse.ts` |

**Alcance.** 32 archivos TypeScript: `core/` (cliente Prisma, crypto, JWT, cookie, envelope, CORS, 3
middlewares, tipos) y `modules/m20-seguridad/` (3 DTOs, 3 interfaces, 3 repositorios, 6 servicios,
2 controladores, rutas). Expone 6 endpoints y, sobre todo, **5 servicios internos sin HTTP** que son
donde vive el valor del módulo: el resto del sistema los consume sin escribir seguridad propia.

---

## 3. REGLAS DE NEGOCIO Y POLÍTICAS APLICADAS

- 🔒 **`RN-SEG-01` / `HU-SEG-01`:** BCrypt con coste mínimo 12, ajustable por entorno sin migrar los
  hashes ya almacenados. La sal la genera bcrypt por llamada: dos contraseñas idénticas producen
  derivaciones distintas.
- 🔑 **`RN-SEG-02`:** toda cuenta tiene contraseña propia, incluidas las creadas con Google. Invierte
  la redacción original de `RF-SEG-01-05`, derogada por la refactorización de historias de M04.
- 🔄 **`RN-SEG-04`:** cambiar la contraseña invalida **todas** las sesiones del usuario, con su motivo.
  La invalidación es parte indivisible del cambio, no un efecto posterior.
- ⏱️ **`RN-SEG-05`:** ventana deslizante, no expiración fija. El límite es **excluyente**: operar en
  el instante exacto de expiración se trata como expirado.
- 🛡️ **`RN-SEG-07` / `HU-ADM-03`:** validador central; los permisos se resuelven **en cada petición**.
  El token transporta únicamente `sid`.
- 👁️ **`RN-SEG-08` / `HU-SEG-06`:** recurso inexistente y recurso ajeno devuelven el **mismo objeto
  congelado** con 404.

---

## 4. CRITERIOS DE ACEPTACIÓN VERIFICADOS

**36 pruebas Vitest, 5 suites.**

| Suite | Casos | Criterios que certifica |
| :--- | :---: | :--- |
| `credenciales.service.test.ts` | 7 | `CA-SEG-01-01/02/05`, `RNF-SEG-01-02`, `RF-SEG-06-06` |
| `sesion.service.test.ts` | 9 | `CA-SEG-02-01/02/04/05`, `RF-SEG-02-02/04/06`, BVA del límite |
| `autorizacion.service.test.ts` | 10 | `CA-SEG-03-01/02/04/06`, `RF-SEG-04-07`, indistinguibilidad |
| `privacidad.service.test.ts` | 8 | `CA-SEG-05-01/02/04`, `RF-SEG-05-03/06` |
| `auditoria.port.test.ts` | 2 | `RN-SEG-15` (emisión, **no** persistencia) |

**Verificado por mutación**, no asumido: se rompió a propósito el límite excluyente de expiración y
la comprobación del estado de la cuenta; ambas pruebas fallaron y volvieron a pasar al restaurar.

> 🛑 **`CA-SEG-03-05` NO se declara cumplido.** El adaptador emite al registro técnico interno; no
> persiste. Depende de `HU-SEG-04`, aplazada. Declararlo cubierto violaría la Regla de Oro #8.

---

## 5. DEPENDENCIAS EXTERNAS

### Hacia atrás — qué necesita para operar al 100 % en producción
- **PostgreSQL** con el esquema de `bd/sql/schema_pintuclic.sql` aplicado. **M20 no requirió ningún
  cambio de DDL**: sus cuatro tablas ya existían.
- **Variables de entorno:** `JWT_SECRET` (≥ 32 caracteres) y `CORS_ORIGIN` **abortan el arranque** si
  faltan. Opcionales con valor por defecto: `BCRYPT_COST`, `SESION_INACTIVIDAD_ADMIN_SEG`,
  `SESION_INACTIVIDAD_CLIENTE_SEG`. ⚠️ `backend/.env.example` **no las declara** — elevado a DevOps.
- **TLS en producción:** la cookie es `Secure`; el navegador no la enviará por HTTP.
- **M17:** el catálogo de permisos atómicos que el validador consulta. M20 define el puerto
  `ResolutorPermisos`; M17 lo implementa.
- **M04:** el login. **Sin él M20 no puede ejercitarse end-to-end** — motivo del Hallazgo #2 de QA.

### Hacia adelante — a quién habilita
- **M17**, **M04** y **los 18 módulos restantes**: heredan el validador central, el ciclo de sesión,
  la derivación de credenciales y el envelope sin fugas. Una operación nueva queda protegida **por
  omisión**, que era el objetivo declarado del módulo.
- ⚠️ **M08 (Orden de Venta)** hereda una obligación: la **invariante de desvinculación de identidad**
  de `CA-SEG-05-05`. M20 no crea esa tabla; dejó el contrato declarado en `04_ARQUITECTURA_Y_CODIGO.md`
  §1.5. Si M08 no lo honra, ese criterio se queda sin dueño.

---

## 6. REGISTRO DE ARCHIVOS

| Acción | Ruta | Contenido |
| :---: | :--- | :--- |
| MOD | `backend/prisma/schema.prisma` | Mapeo al DDL real (ADR-004) + poda de modelos especulativos |
| NUEVO | `backend/src/core/db/client.ts` | Singleton `PrismaClient` |
| NUEVO | `backend/src/core/utils/{crypto,jwt,cookieSesion,apiResponse}.ts` | Primitivas de seguridad |
| NUEVO | `backend/src/core/middlewares/{auth,autorizacion,cors,errorHandler}.ts` | Validador central y manejo de errores |
| NUEVO | `backend/src/core/types/{api.types.ts,global.d.ts}` | Envelope y `req.actor` tipado |
| NUEVO | `backend/src/modules/m20-seguridad/**` | 3 DTOs, 3 interfaces, 3 repositorios, 6 servicios, 2 controladores, rutas |
| NUEVO | `backend/src/modules/m20-seguridad/__tests__/**` | 5 suites, 36 pruebas |
| NUEVO | `backend/src/{index.ts,app.routes.ts}` | Composición root |

> **Límites de módulo.** Todo reside en `m20-seguridad/` o en `core/`, cuyo uso autorizó el Product
> Owner por ser M20 el módulo transversal. **Decisión declarada:** se podaron de `schema.prisma` los
> modelos especulativos de M01, M04, M05 y M08 por ser incompatibles con la base real; cada módulo
> los redeclarará en su Gate 2.

---

## 7. DICTAMEN

* **Pruebas de calidad superadas:** ✅ 36/36 Vitest · `tsc --noEmit` · ESLint 0/0 · `check:no-any` · `build`
* **Apego al contrato de Gate 2:** ✅
* **Apego al diagrama de flujo:** ✅ incluida la máquina de 8 estados y la convergencia en el validador central
* **Certificación E2E:** 🔵 **diferida** — ver `QA_REPORT.md` Hallazgo #2
