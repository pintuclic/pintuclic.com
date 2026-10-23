# 🧪 REPORTE MODULAR DE QA, CODE REVIEW Y AUDITORÍA DE SEGURIDAD

> **Módulo Auditado:** `M04 — Cuentas, Autenticación y Perfil`  
> **Versión Evaluada:** `v0.4.1` (Remediación de Backend & Saneamiento Transaccional)  
> **Fecha de Certificación:** 2026-10-22  
> **Auditor Responsable:** QA Lead & Security Compliance Director (Fase 4)  
> **Estado de la Compuerta:** 🟢 **GATE 3A APROBADO Y CERTIFICADO — VETO STOP-THE-LINE LEVANTADO**  

---

## 1. Declaración de Independencia, Veto y Ciclo de Feedback (Stop-the-Line)

* **Declaración de Independencia (ROLE.md §1.1 / STAGE_GATES.md §1.1 / QA_LEAD_MANUAL.md §1):**  
  El suscrito QA Lead & Security Compliance Director certifica la re-auditoría imparcial y exhaustiva sobre la entrega remediada de backend `v0.4.1`, documentada formalmente en [`docs/walkthroughs/M04/walkthrough_v0.4.1_M04_remediacion_bug_m04_01_backend.md`](file:///c:/Users/alejo/Downloads/proyectos-dev/pintuclic.com/docs/walkthroughs/M04/walkthrough_v0.4.1_M04_remediacion_bug_m04_01_backend.md).
* **Ciclo de Feedback y Resolución:**  
  1. En `v0.4.0` se detectó el defecto crítico **`BUG-M04-01` (S1 Blocker)**: ausencia de control de acceso funcional en `/api/v1/admin/empresas/*`. Se activó el Veto Stop-the-Line bloqueando el avance del SDLC.
  2. En apego estricto al **Mandato #2** (*Prohibición de autocorrección por parte de QA*), el defecto fue devuelto a `03_backend_engineer`.
  3. El Backend Lead Engineer entregó la versión `v0.4.1` no solo subsanando `BUG-M04-01`, sino realizando un saneamiento integral de concurrencia y atomicidad transaccional.
  4. QA re-ejecutó el 100% de los quality gates y suites automatizadas, confirmando la resolución definitiva.
* **Resolución Oficial:**  
  Se declara **RESUELTO Y VERIFICADO** el defecto `BUG-M04-01` y se **LEVANTA FORMALMENTE EL VETO STOP-THE-LINE**.

---

## 2. Resumen Consolidado de Pruebas Automatizadas

| Instrumento / Quality Gate | Cuadrante Ágil | Objetivo de Verificación | Resultado Obtenido | Observaciones |
| :--- | :---: | :--- | :---: | :--- |
| **Vitest Backend** | **Q1** | Servicios, repositorios, transacciones y HTTP routing | **✅ 188/188 tests PASS** (20 suites) | **+72 tests nuevos** respecto a v0.4.0 (116). Incluye 45 tests HTTP y 12 tests transaccionales |
| **Vitest Frontend** | **Q1 / Q2** | Regresión en stores Zustand y esquemas Zod | **✅ 57/57 tests PASS** (9 suites) | Regresión cero en frontend transversal y módulos M17/M20 |
| **Auditoría AST Cero ANY** | **Q4** | Eliminación estricta de `any` (`check:no-any`) | **✅ 102 archivos backend PASS** (0 ANYs) | Backend `src/` 100% tipado estricto sin comodines |
| **Validación de Contratos Zod** | **Q1** | Envelopes canónicos y DTOs M04 (`validate-contracts.mjs`) | **✅ 16/16 validaciones PASS** | Contrato `m04-cuentas.contract.ts` blindado |
| **TypeScript Strict (Backend)** | **Q1** | Compilación estricta `npx tsc --noEmit` | **✅ 0 errores** | Tipado estricto con Prisma 6 + Express 5 |
| **TypeScript Strict (Frontend)** | **Q1** | Compilación estricta Next.js `npx tsc --noEmit` | **✅ 0 errores** | Compilación estricta limpia |
| **ESLint Backend / Frontend** | **Q1** | Linter y calidad de código (`npm run lint`) | **✅ 0 errores, 0 warnings** | 0 variables huérfanas, 0 advertencias de estilo |
| **Auditoría Core Kit (Directiva #13)** | **Q3** | Verificación de componentes canónicos UI | **✅ 0 violaciones** (13 archivos) | Conforme |
| **Auditoría Cadenas Zod (Anti-Bypass)**| **Q1** | Orden de sanitización `.trim().min()` (`audit:zod`) | **✅ 0 violaciones** (17 archivos) | Conforme |
| **Auditoría A11y (WCAG 2.1 AA)** | **Q2 / Q3** | Accesibilidad estática (`audit:a11y`) | **✅ 0 violaciones** (28 archivos) | Conforme |

---

## 3. Matriz de Auditoría Forense y Verificación de Remediación

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ESTADO DE DEFECTOS TRAS LA AUDITORÍA DE REMEDIACIÓN (v0.4.1)                           │
├──────────────┬──────────┬─────────────────────────────┬────────────────────────────────┤
│ ID DEFECTO   │ SEVERIDAD│ AGENTE ASOCIADO             │ ESTADO FINAL VERIFICADO        │
├──────────────┼──────────┼─────────────────────────────┼────────────────────────────────┤
│ BUG-M04-01   │ S1 Block │ 03_backend_engineer         │ ✅ RESUELTO Y CERTIFICADO      │
└──────────────┴──────────┴─────────────────────────────┴────────────────────────────────┘
```

### 3.1 Verificación de `BUG-M04-01`: Broken Function-Level Access Control (OWASP A01:2021)

* **Defecto Original:** Los endpoints administrativos `/api/v1/admin/empresas/*` no validaban si el actor autenticado era administrador o si tenía permisos, permitiendo a clientes ordinarios (`tipoSesion: 'cliente'`) listar y dictaminar solicitudes corporativas.
* **Remediación Aplicada por el Backend Lead Engineer:**
  1. **Guarda de Router Perimetral (`m04.routes.ts:152-156`):**
     ```typescript
     adminEmpresasRouter.use(
       authMiddleware,
       requirePermission(autorizacion, PERMISO_VALIDAR_EMPRESAS) as RequestHandler,
     );
     ```
     La guarda protege por omisión todo endpoint administrativo pasado y futuro bajo `/admin/empresas/`.
  2. **Resolución en Caliente sin Cacheo en Token:** La comprobación delega en el `AutorizacionService` de M20 y el `ResolutorPermisosDatabaseAdapter` de M17, evaluando permisos en tiempo real contra PostgreSQL.
  3. **Respuesta Opaca (`HU-ADM-03` / `RN-SEG-08` / ADR-003):** Cualquier cliente o colaborador sin `empresas.validar` recibe `RESPUESTA_RECURSO_NO_DISPONIBLE` (HTTP 404), impidiendo la enumeración de endpoints y sin nombrar el permiso faltante.
  4. **Falla Cerrada en Inyección (`m04.routes.ts:42` y `app.routes.ts:13`):** `construirModuloM04` exige mandatoriamente `autorizacion: AutorizacionService`; el módulo no compila ni arranca sin control de acceso administrativo.
  5. **Batería de Pruebas de Acceso HTTP (`admin-empresas.acceso.test.ts`):** 45 pruebas independientes que levantan un servidor HTTP real y validan que las 7 rutas administrativas responden 401 sin sesión, 404 opaco a clientes ordinarios y colaboradores sin permiso, y 200 solo ante el permiso `empresas.validar`.

---

## 4. Auditoría de Seguridad Especializada (Skill `/security-review`)

Se contrastó la implementación de `v0.4.1` contra la lista de verificación del estándar de seguridad institucional:

### 4.1 Secrets Management & Credentials (HU-SEG-01)
- [x] **0 Secretos Hardcodeados:** Se verificó la ausencia de API keys, hashes estáticos o credenciales en código fuente.
- [x] **Costo BCrypt Mandatorio:** `derivarContrasena` emplea factor de costo 12 (`BCRYPT_SALT_ROUNDS = 12`).
- [x] **Protección contra Timing Attacks (`ADR-012`):** Implementada comparación en tiempo constante con `DERIVACION_SENUELO` ante correos inexistentes o cuentas inactivas.

### 4.2 Authentication & Session Management (HU-SEG-02)
- [x] **Cookie de Sesión Segura:** `pc_sid` emitida exclusivamente con atributos `HttpOnly`, `SameSite=Strict`, `Path=/` y `Secure` en producción.
- [x] **Revocación Masiva:** Cambio de clave, reset de contraseña y desactivación de cuenta invocan `sesionService.invalidarTodas(idUsuario)`.
- [x] **Fuerza Bruta Mitigada:** Bloqueo automático por 15 minutos tras 5 fallos consecutivos (`CUENTA_BLOQUEADA_TEMPORALMENTE` 423).

### 4.3 Input Validation & Type Safety
- [x] **Validación Universal Zod:** 100% de `req.body`, `req.query` y `req.params` validados mediante esquemas Zod canónicos.
- [x] **Protección contra Inyección de Identificadores (`parametros.ts`):** Función `leerParamUuid` valida contra `idUuidSchema`; un identificador no-UUID retorna HTTP 404 opaco de inmediato, evitando excepciones 500 no controladas en el driver Prisma/PostgreSQL (`RN-SEG-08`).
- [x] **Zero ANY Compliance:** AST linter certifica 0 usos del tipo `any` en los 102 archivos de `backend/src`.

### 4.4 SQL & Database Transactional Integrity
- [x] **Cero SQL Crudo / Cero Concatenaciones:** 100% de consultas orquestadas con Prisma 6 fuertemente tipado.
- [x] **Decisión Atómica de Concurrencia (`RNF-CUE-09-01` / `RN-CUE-16`):**
  `tx.solicitudEmpresa.updateMany({ where: { idSolicitud, estado: 'pendiente' }, ... })` dentro de `prisma.$transaction`.
  Ante solicitudes simultáneas, el perdedor obtiene `count === 0` y el endpoint responde `409 SOLICITUD_YA_DECIDIDA`.
- [x] **Transacción de Aprobación Corporativa (`ADR-010` / `RFC-M04-001` C-1):**
  La activación del usuario, la conversión a `tipo = 'empresa'`, la creación 1:1 de `cuenta_empresa` y la desvinculación de identidades Google (`DP-12`) se ejecutan en una única transacción atómica. Ante conflicto de NIT (`P2002`), se revierte y retorna `409 NIT_YA_REGISTRADO`.

### 4.5 File Upload & Custody Security (HU-CUE-09 E14 / RN-CUE-20)
- [x] **Integridad Criptográfica de Archivos:** El documento RUT se almacena con hash SHA-256. Antes de la entrega en `descargarDocumento`, se recalcula la huella y se valida coincidencia (`DOCUMENTO_INTEGRIDAD_NO_VERIFICADA` 500 si no coincide).
- [x] **Cabeceras Seguras de Descarga:**
  - `Content-Disposition: attachment; filename="rut-<id>.<ext>"`: el nombre se construye en servidor con el ID y extensión de lista blanca (`pdf`, `jpg`, `png`), impidiendo inyección de cabeceras HTTP o Directory Traversal.
  - `X-Content-Type-Options: nosniff` (previene ejecución MIME en navegador).
  - `Cache-Control: no-store` (impide almacenamiento de documentos fiscales en cachés intermedias).
  - Descarga restringida al permiso `empresas.validar`.

### 4.6 Anti-IDOR (Insecure Direct Object References)
- [x] **Titularidad en Servidor:**
  - En `GET /cuentas/empresas/solicitudes/mias`, el `idUsuario` se extrae estrictamente de `req.actor.idUsuario`; cualquier parámetro enviado por query string o body es ignorado.
  - En libretas de direcciones (`direcciones.service.ts`), las operaciones exigen `buscarPorId(idDireccion, idUsuario)`.

---

## 5. Auditoría de Cumplimiento de Políticas de Arquitectura (AGENTS.md)

| Directiva Inviolable | Criterio Exigido | Verificación en M04 v0.4.1 | Dictamen |
| :--- | :--- | :--- | :---: |
| **Directiva #1 (Aislamiento de Módulo)** | Código confinado estrictamente a su módulo asignado. | Archivos confinados a `backend/src/modules/m04-cuentas/`. Ajuste menor en `app.routes.ts` para inyección de `autorizacionService` ratificado. | ✅ CONFORME |
| **Directiva #2 (Nomenclatura kebab-case)** | Carpetas nombradas `m[xx]-[nombre-modulo]`. | `backend/src/modules/m04-cuentas/`. | ✅ CONFORME |
| **Directiva #10 (Origen Único de Datos)** | Cero auto-siembra de datos en el arranque de Express. | No existen funciones tipo `sembrar...()` ni auto-inserts en runtime. Datos en PostgreSQL. | ✅ CONFORME |
| **Directiva #11 (Cero Any y Cero Warnings)** | Tolerancia cero a `any`, 0 errores `tsc` y 0 advertencias de linter. | 102 archivos auditados (0 ANY). `tsc` 0 errores, ESLint 0 advertencias. | ✅ CONFORME |
| **Directiva #12 (Arquitectura de DTOs)** | Esquemas Zod en archivos dedicados `dtos/`. Interfaces sin runtime. | `m04-cuentas.dto.ts` y contratos en `.sdlc/docs/contracts/m04-cuentas.contract.ts`. | ✅ CONFORME |

---

## 6. Registro de Deuda Técnica y Observaciones Elevadas (No Bloqueantes)

Se ratifican las observaciones técnicas señaladas con honestidad en la Sección 8 del walkthrough `v0.4.1`, las cuales no comprometen la seguridad inmediata de la API pero deben agendarse en mesa técnica:
1. **Límite de JSON Body en `index.ts`:** El límite global de `100kb` impide recibir archivos RUT de hasta 5MB codificados en Base64 en peticiones JSON puras. Requiere elevar el límite para la ruta específica de documentos o adoptar `multipart/form-data` con `multer` en Fase 4/Despliegue.
2. **Estandarización de Catálogo de Errores:** Homogeneizar los códigos de error entre el contrato Zod y las historias de usuario antes de la integración visual final.
3. **Auditoría de Eventos (`RN-CUE-23`):** M04 emite eventos técnicos, supeditado a la aprobación final de `HU-SEG-04` (aplazada por el PO).

---

## 7. Dictamen Final del QA Lead: GATE 3A APROBADO

🟢 **GATE 3A (BACKEND) APROBADO Y CERTIFICADO PARA INTEGRACIÓN.**

1. Se **LEVANTA FORMALMENTE EL VETO STOP-THE-LINE** activado en `v0.4.0`.
2. Se certifica que la versión `v0.4.1` del Backend de `M04 — Cuentas, Autenticación y Perfil` cumple al 100% con los criterios de seguridad, integridad transaccional y robustez arquitectónica.
3. Se autoriza la continuación de la **Fase 3B (Frontend Lead Engineer)** para la construcción de vistas y componentes de usuario consumiendo la API asegurada.
