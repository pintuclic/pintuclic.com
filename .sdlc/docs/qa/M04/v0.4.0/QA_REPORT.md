# 🧪 REPORTE MODULAR DE QA Y AUDITORÍA DE SEGURIDAD

> **Módulo Auditado:** `M04 — Cuentas, Autenticación y Perfil`  
> **Versión Evaluada:** `v0.4.0` (Backend API Delivery)  
> **Fecha de Auditoría:** 2026-10-21  
> **Auditor Responsable:** QA Lead & Security Compliance Director (Fase 4)  
> **Estado de la Compuerta:** 🔴 **RECHAZADO — VETO STOP-THE-LINE ACTIVADO (DEFECTO S1 BLOCKER)**  

---

## 1. Declaración de Independencia y Veto Forense (Stop-the-Line)

* **Declaración de Independencia (ROLE.md §1.1 / STAGE_GATES.md §1.1 / QA_LEAD_MANUAL.md §1):**  
  El suscrito QA Lead & Security Compliance Director certifica la auditoría independiente, objetiva e imparcial sobre la entrega del backend de M04 (`v0.4.0`), documentada en `docs/walkthroughs/M04/walkthrough_v0.4.0_M04_cuentas_autenticacion_backend.md`.
* **Activación Inmediata de Veto Stop-the-Line:**  
  En estricto apego al Mandato #1 (*Calidad antes que velocidad*), Mandato #2 (*Prohibición de autocorrección*), Mandato #3 (*Auditoría forense sin eufemismos*) y Mandato #5 (*Tolerancia Cero a Fallas Críticas de Seguridad*), se declara el **VETO STOP-THE-LINE** y se **RECHAZA** la certificación de la entrega de backend de M04 en `v0.4.0`.
* **Causa del Veto:**  
  Detección del defecto **`BUG-M04-01` (Severidad S1 — Blocker)**: Falla crítica de control de acceso (Broken Function-Level Access Control / Escalada Vertical de Privilegios) en todos los endpoints administrativos corporativos (`/api/v1/admin/empresas/*`), que permite a cualquier usuario registrado con rol de cliente ordinario (`tipoSesion: 'cliente'`) listar todas las solicitudes de empresas con sus datos sensibles de representación y NIT, así como aprobar o rechazar empresas y dictaminar renovaciones tributarias.

---

## 2. Resumen Consolidado de Pruebas Automatizadas

Se ejecutó la batería completa e independiente de quality gates sobre el repositorio en rama activa:

| Instrumento / Quality Gate | Cuadrante Ágil | Objetivo de Verificación | Resultado Obtenido | Observaciones |
| :--- | :---: | :--- | :---: | :--- |
| **Vitest Backend** | **Q1** | Lógica de dominio, repositorios, servicios y rutas | **✅ 116/116 tests PASS** (18 suites) | 45 tests específicos de M04 cubriendo flujos nominales y errores de servicio |
| **Vitest Frontend** | **Q1 / Q2** | Regresión en stores Zustand y esquemas Zod | **✅ 57/57 tests PASS** (9 suites) | Regresión cero en frontend transversal y M17/M20 |
| **Auditoría AST Cero ANY** | **Q4** | Eliminación estricta de `any` (`check:no-any`) | **✅ 99 archivos backend PASS** (0 ANYs) | Backend `src/` 100% tipado estricto sin comodines |
| **Validación de Contratos Zod** | **Q1** | Envelopes canónicos y DTOs M04 (`validate-contracts.mjs`) | **✅ 16/16 validaciones PASS** | Contrato `m04-cuentas.contract.ts` íntegro |
| **TypeScript Strict (Backend)** | **Q1** | Compilación estricta `npx tsc --noEmit` | **✅ 0 errores** | Compilación limpia con Prisma 6 + Express 5 |
| **ESLint Backend** | **Q1** | Linter y calidad de código (`npm run lint`) | **✅ 0 errores, 0 warnings** | 0 variables huérfanas, 0 advertencias de estilo |
| **Auditoría Core Kit (Directiva #13)** | **Q3** | Verificación de componentes canónicos UI | **✅ 0 violaciones** (13 archivos) | No impactado por backend |
| **Auditoría Cadenas Zod (Anti-Bypass)**| **Q1** | Orden de sanitización `.trim().min()` (`audit:zod`) | **✅ 0 violaciones** (14 archivos) | Tooling corregido en delimitadores de coma |
| **Auditoría A11y (WCAG 2.1 AA)** | **Q2 / Q3** | Accesibilidad estática (`audit:a11y`) | **✅ 0 violaciones** (28 archivos) | Conforme |

---

## 3. Matriz de Trazabilidad RTM y Evaluación de Criterios

| Código HU | Escenarios | Criterios Clave Auditados en Código | Evidencia Observable | Estado QA |
| :--- | :---: | :--- | :--- | :---: |
| **`HU-CUE-01`**<br>Registro B2C OTP | 9 | • Generación de código numérico de 6 dígitos.<br>• Expiración acotada a 15 minutos (`RN-CUE-01`).<br>• Almacenamiento derivado con hash BCrypt (`codigoHash`).<br>• Máximo 3 intentos fallidos antes de invalidar el código. | `auth-cuentas.service.ts`<br>`codigos-verificacion.repository.ts` | 🟢 CONFORME |
| **`HU-CUE-02`**<br>Federación Google | 10 | • Abstracción mediante puerto hexagonal `GoogleAuthPort`.<br>• Emisión de token temporal efímero si falta teléfono (`RN-CUE-02`).<br>• Vinculación 1:1 en `usuario_identidad_externa`. | `google-auth.adapter.ts`<br>`auth-cuentas.service.ts` | 🟢 CONFORME (Mock) |
| **`HU-CUE-03`**<br>Registro B2B Empresa | 7 | • Nacimiento en estado `pendiente`.<br>• Custodia y hash SHA-256 de documento RUT (`documento_soporte`).<br>• Unicidad de NIT en solicitudes pendientes (`uq_solicitud_empresa_nit_pendiente`). | `empresas.service.ts`<br>`solicitudes-empresa.repository.ts` | 🟢 CONFORME |
| **`HU-CUE-04`**<br>Login & Fuerza Bruta | 11 | • Bloqueo tras 5 intentos fallidos por 15 minutos (`RN-CUE-04`).<br>• Comparativa señuelo en tiempo constante (`DERIVACION_SENUELO`) ante correos inexistentes para prevención de timing attacks (`ADR-012`).<br>• Detección de cambio forzoso de clave en primer acceso (`RN-CUE-05` / `ADR-011`). | `auth-cuentas.service.ts`<br>`control-intentos.repository.ts` | 🟢 CONFORME |
| **`HU-CUE-05`**<br>Recuperación Clave | 9 | • Token JWT de 30m con hash seguro.<br>• Comparativa señuelo ante correos no registrados (`ADR-012`).<br>• Revocación masiva de sesiones activas al cambiar clave (`sesionService.invalidarTodas`). | `recuperacion-password.service.ts`<br>`recuperacion-password.controller.ts` | 🟢 CONFORME |
| **`HU-CUE-06`**<br>Gestión de Perfil | 12 | • Cambio de clave exige contraseña actual.<br>• Cambio de correo con verificación OTP de 15m.<br>• Desactivación de cuenta marca `inactivo` e invalida sesiones.<br>• Solicitud de ascenso particular a empresa con adjunto RUT. | `perfil.service.ts`<br>`perfil.controller.ts` | 🟢 CONFORME |
| **`HU-CUE-07`**<br>Direcciones de Entrega | 10 | • Límite estricto de máximo 10 direcciones por cliente (`RN-CUE-07`).<br>• Primera dirección asignada automáticamente como predeterminada.<br>• Verificación anti-IDOR en servidor (`buscarPorId(idDireccion, idUsuario)`). | `direcciones.service.ts`<br>`direcciones.repository.ts` | 🟢 CONFORME |
| **`HU-CUE-08`**<br>Unicidad de Cuentas | 5 | • Correo en minúsculas forzado en servicio y BD (`uq_usuario_correo_lower`).<br>• Verificación previa en repositorios y captura de colisiones PostgreSQL P2002. | `cuentas.repository.ts`<br>`schema.prisma` | 🟢 CONFORME |
| **`HU-CUE-09`**<br>Aprobación Empresas | 14 | • Listado de solicitudes y detalle de empresa con RUT.<br>• Aprobación activa cuenta y crea registro 1:1 `cuenta_empresa` (`ADR-010`).<br>• Rechazo motivado obligatorio (mínimo 10 caracteres).<br>• **Control de acceso administrativo en servidor (`HU-ADM-03` / `Escenario 14`).** | `m04.routes.ts`<br>`empresas.controller.ts`<br>`empresas.service.ts` | 🔴 **VETO (BOLA/BFLA)**<br>Falta validación de rol admin |
| **`HU-CUE-10`**<br>Renovación de NIT | 7 | • Solicitud de renovación de NIT con soporte RUT.<br>• Dictamen administrativo de renovación.<br>• **Control de acceso administrativo en servidor.** | `empresas.controller.ts`<br>`m04.routes.ts` | 🔴 **VETO (BOLA/BFLA)**<br>Falta validación de rol admin |

---

## 4. Registro de Defectos y Ficha de Incidencia Forense

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEFECTO BLOQUEANTE DETECTADO EN AUDITORÍA FORENSE                                      │
├──────────────┬──────────┬─────────────────────────────┬────────────────────────────────┤
│ ID DEFECTO   │ SEVERIDAD│ AGENTE RESPONSABLE          │ ESTADO DE LA MÁQUINA DE ESTADOS │
├──────────────┼──────────┼─────────────────────────────┼────────────────────────────────┤
│ BUG-M04-01   │ S1 Block │ 03_backend_engineer         │ 🔴 NUEVO / BLOQUEANTE (VETO)   │
└──────────────┴──────────┴─────────────────────────────┴────────────────────────────────┘
```

### Ficha Técnica del Defecto `BUG-M04-01`

* **Título:** Broken Function-Level Access Control (BFLA) y Falta de Autorización Administrativa en `/api/v1/admin/empresas/*`.
* **Clasificación OWASP:** A01:2021 — Broken Access Control / CWE-285: Improper Authorization.
* **Severidad:** **S1 — Blocker** (*Veto Inmediato según QA_LEAD_MANUAL.md §7*).
* **Agente Asignado:** `03_backend_engineer`.
* **Políticas Institucionales Violadas:**
  1. [`HU-ADM-03`](../../../../docs/01_TRANSVERSALES/POLITICAS/politica_HU-ADM-03_control_acceso_servidor.md): Control de acceso en servidor mandatorio para toda operación administrativa.
  2. [`HU-SEG-03`](../../../../docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md): Autorización en servidor y defensas Anti-IDOR / Anti-BFLA.
  3. [`02_HISTORIAS_USUARIO.md`](../../modules/M04/02_HISTORIAS_USUARIO.md) — Escenario 14: *"El RUT adjunto solo se entrega a personal autorizado... Cuando un empleado sin el permiso empresas.validar solicita el documento / solicitud, responde con acceso denegado o recurso no disponible."*
  4. Falsa declaración de conformidad en Walkthrough v0.4.0 §4.2 (*"Middleware de sesión y comprobación de permisos administrativos en /admin/empresas"* cuando el código solo incluye `authMiddleware`).

#### Análisis Forense de Causa Raíz (RCA)

1. **Ubicación en Código Fuente:**
   - [backend/src/modules/m04-cuentas/m04.routes.ts:137-142](file:///c:/Users/alejo/Downloads/proyectos-dev/pintuclic.com/backend/src/modules/m04-cuentas/m04.routes.ts#L137-L142):
     ```typescript
     // 2. Router de Administración de Empresas (/admin/empresas)
     const adminEmpresasRouter = Router();
     adminEmpresasRouter.get('/solicitudes', authMiddleware, empresasController.listarSolicitudes as RequestHandler);
     adminEmpresasRouter.get('/solicitudes/:idSolicitud', authMiddleware, empresasController.obtenerDetalleSolicitud as RequestHandler);
     adminEmpresasRouter.post('/solicitudes/:idSolicitud/dictamen', authMiddleware, empresasController.dictaminarSolicitud as RequestHandler);
     adminEmpresasRouter.post('/renovaciones/:idSolicitud/dictamen', authMiddleware, empresasController.dictaminarRenovacionNit as RequestHandler);
     ```
   - [backend/src/modules/m04-cuentas/controllers/empresas.controller.ts:190-194](file:///c:/Users/alejo/Downloads/proyectos-dev/pintuclic.com/backend/src/modules/m04-cuentas/controllers/empresas.controller.ts#L190-L194) (y repetido en líneas 217, 253, 305):
     ```typescript
     const actor = req.actor;
     if (!actor) {
       responderRecursoNoDisponible(res);
       return;
     }
     ```
2. **Mecanismo de Falla:**
   - `authMiddleware` únicamente comprueba que la cookie `pc_sid` corresponda a una sesión válida y puebla `req.actor = { idUsuario, idSesion, tipoSesion }`.
   - Cuando un cliente B2C ordinario inicia sesión (`POST /api/v1/cuentas/login`), su sesión se crea con `tipoSesion = 'cliente'` ([auth-cuentas.service.ts:350](file:///c:/Users/alejo/Downloads/proyectos-dev/pintuclic.com/backend/src/modules/m04-cuentas/services/auth-cuentas.service.ts#L350)).
   - Ni el router ni el controlador validan que `actor.tipoSesion === 'admin'` o que el actor posea privilegios administrativos de validación empresarial.
   - En consecuencia, **cualquier comprador de la tienda que envíe su cookie de sesión puede**:
     - Consumir `GET /api/v1/admin/empresas/solicitudes` y descargar el listado de empresas con nombres de representantes, correos corporativos, teléfonos y NITs.
     - Consumir `POST /api/v1/admin/empresas/solicitudes/:idSolicitud/dictamen` y aprobar o rechazar solicitudes corporativas arbitrariamente. En `dictaminarSolicitud`, el `actor.idUsuario` del cliente atacante queda persistido en base de datos en la columna `idAdminRevisor`.
     - Consumir `POST /api/v1/admin/empresas/renovaciones/:idSolicitud/dictamen` y dictaminar renovaciones fiscales.
3. **Omisión en la Suite de Pruebas:**
   - La suite `backend/src/modules/m04-cuentas/__tests__/m04.routes.test.ts` únicamente comprueba que las cadenas de ruta existan en el array de capas de Express (`expect(paths).toContain('/solicitudes')`), sin ejercitar requests con actores no autorizados ni validar el código de respuesta HTTP ante accesos de clientes.
   - `empresas.service.test.ts` prueba los métodos del servicio en aislamiento inyectando mocks, pero no valida el guardarraíl perimetral del controlador/middleware.

---

## 5. Acciones Requeridas para Remediación (Backend Lead Engineer)

En cumplimiento del Mandato #2 (*Prohibición estricta de autocorrección por parte de QA*), el Backend Lead Engineer (`03_backend_engineer`) debe realizar la subsanación formal:

1. **Blindaje de Middleware / Controlador en `m04-cuentas`:**
   - Asegurar que todas las rutas bajo `/admin/empresas` requieran obligatoriamente que `actor.tipoSesion === 'admin'`.
   - Si el actor no tiene sesión de tipo `'admin'`, rechazar la petición de inmediato con la respuesta opaca institucional `responderRecursoNoDisponible(res)` (HTTP 404, para no filtrar existencia de rutas administrativas a clientes B2C conforme a la política `HU-ADM-03`).
   - Opcionalmente, integrar con `requirePermission` de M20/M17 si se inyecta `AutorizacionService` o verificar el permiso `empresas.validar` / rol de administración.
2. **Pruebas Automatizadas de Seguridad (Regresión Obligatoria):**
   - Incorporar pruebas de integración en `m04.routes.test.ts` (o suite dedicada de controlador) que simulen:
     - Actor no autenticado (`req.actor = undefined`) ➔ HTTP 401 / 404.
     - Actor autenticado como cliente ordinario (`req.actor = { idUsuario: 99, tipoSesion: 'cliente', idSesion: 'sid-1' }`) consumiendo `GET /admin/empresas/solicitudes` y `POST /admin/empresas/solicitudes/:id/dictamen` ➔ **RECHAZADO con HTTP 404 opaco**.
     - Actor autenticado como administrador (`req.actor = { idUsuario: 1, tipoSesion: 'admin', idSesion: 'sid-admin' }`) ➔ Acceso permitido (HTTP 200 / 201).
3. **Actualización del Walkthrough:**
   - Actualizar el walkthrough reflejando las pruebas de seguridad añadidas y la mitigación de `BUG-M04-01`.

---

## 6. Dictamen Final del QA Lead: VETO STOP-THE-LINE ACTIVADO

🔴 **STAGE-GATE 3A / 4A RECHAZADO.**

1. Se activa formalmente el **Veto Stop-the-Line** sobre el backend de `M04 — Cuentas, Autenticación y Perfil (v0.4.0)`.
2. Se detiene cualquier intento de avance a producción o certificación de Gate 4A hasta la remediación verificable de `BUG-M04-01`.
3. Se notifica al Orquestador y al Director Humano del estado de bloqueo.
4. El rol en turno se transfiere a **`03_backend_engineer`** para la corrección inmediata del defecto de seguridad.
