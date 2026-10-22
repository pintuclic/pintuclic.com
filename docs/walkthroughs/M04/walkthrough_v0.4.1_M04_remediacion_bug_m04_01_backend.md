# WALKTHROUGH DE IMPLEMENTACIÓN — M04 Backend · Remediación BUG-M04-01 y saneamiento

> 📌 **Módulo:** `M04 — Cuentas, Autenticación y Perfil`  
> 🏷️ **Capa:** Backend API (Express 5 + Prisma 6 + PostgreSQL + Vitest 3)  
> 🎯 **Fase:** 3A (remediación tras veto Stop-the-Line del QA) · **Gate:** 3A  
> 🔁 **Corrige:** [`walkthrough_v0.4.0`](./walkthrough_v0.4.0_M04_cuentas_autenticacion_backend.md) · **Origen:** [`QA_REPORT.md` v0.4.0](../../../.sdlc/docs/qa/M04/v0.4.0/QA_REPORT.md)

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

* **Versión Generada:** `v0.4.1`
* **Módulo de Origen:** `M04 — Cuentas, Autenticación y Perfil`
* **Capa:** Backend (`backend/src/modules/m04-cuentas/`) y raíz de composición (`backend/src/app.routes.ts`)
* **Fecha de Entrega:** 22/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Estado de la Implementación:** ✅ **REMEDIACIÓN ENTREGADA — PENDIENTE DE RE-AUDITORÍA DEL QA.** El veto Stop-the-Line sigue **activo** hasta que el QA lo levante; el implementador no lo cierra (`STAGE_GATES.md` §1.1).

La entrega tiene dos partes: **(A)** la remediación del defecto bloqueante que reportó el QA y **(B)** el saneamiento de defectos y huecos que el análisis del código reveló en el mismo flujo (HU-CUE-09 / HU-CUE-10) y que la suite verde no había detectado.

---

## 2. PARTE A — DEFECTO REMEDIADO: `BUG-M04-01`

| ID | Severidad | Título | Estado |
| :--- | :---: | :--- | :---: |
| **`BUG-M04-01`** | S1 — Blocker | Broken Function-Level Access Control en `/api/v1/admin/empresas/*` (OWASP A01:2021 / CWE-285) | Remediado, pendiente de re-auditoría |

**Causa raíz (confirmada):** las rutas administrativas llevaban únicamente `authMiddleware`, que valida que la sesión exista pero no *quién* es el actor. Cualquier cliente con sesión podía listar solicitudes, ver datos de representantes y NIT, y aprobar o rechazar empresas.

**Por qué no bastaba el remedio mínimo del informe (`tipoSesion === 'admin'`):** en el login, todo usuario con rol (`idRol !== null`) recibe sesión `admin`, incluidos empleados. Una comprobación por tipo de sesión habría seguido permitiendo que un colaborador **sin** `empresas.validar` dictaminara, lo que incumple `HU-CUE-09` escenario 2 y `HU-ADM-03`. Se aplicó la variante que el propio informe deja como opción: integrar el `AutorizacionService` de M20.

### 2.1 Guarda de acceso a nivel de router
```ts
adminEmpresasRouter.use(
  authMiddleware,
  requirePermission(autorizacion, PERMISO_VALIDAR_EMPRESAS), // 'empresas.validar'
);
```
* **Sesión primero (401), permiso después (404 opaco).** Un actor sin permiso recibe `RESPUESTA_RECURSO_NO_DISPONIBLE`, idéntica a la de un recurso inexistente (`RN-SEG-08` / ADR-003).
* **Protegido por omisión (`RNF-SEG-03-01`):** la guarda está en `router.use`; cualquier endpoint administrativo futuro nace protegido.
* **El permiso se resuelve en cada petición** contra la base de datos (`ResolutorPermisosDatabaseAdapter` de M17); no se cachea en el token.
* **Falla cerrada:** `construirModuloM04(sesionService, autorizacion, config?)` exige el `AutorizacionService`; el módulo no puede montarse sin autorización administrativa.

### 2.2 Raíz de composición (`app.routes.ts`) — archivo compartido
```ts
const m04 = construirModuloM04(m20.sesionService, m17.autorizacionService);
```
> ⚠️ **Directiva #3.** `app.routes.ts` no pertenece a `m04-cuentas`. Es un cambio de una línea (inyección de dependencias del montaje del propio M04), ejecutado por instrucción expresa del Director Humano de corregir el backend; **queda declarado para su ratificación.**

---

## 3. PARTE B — SANEAMIENTO (defectos hallados al analizar el flujo de dictamen)

### 3.1 Defectos corregidos

| # | Defecto | Referencia | Corrección |
| :-: | :--- | :--- | :--- |
| B1 | **Decisión no atómica.** `dictaminar` era un `update` por id sin condición de estado: dos administradores simultáneos podían decidir ambos. | `RNF-CUE-09-01`, `RN-CUE-16`, ATDD §3 esc. 4 | Actualización condicionada `updateMany ... WHERE estado = 'pendiente'`; el perdedor obtiene 0 filas → `409 SOLICITUD_YA_DECIDIDA`. |
| B2 | **Aprobación sin transacción.** Tres escrituras sueltas (solicitud, usuario, `cuenta_empresa`): un fallo intermedio dejaba una solicitud aprobada sin cuenta. | `ADR-010`, `RFC-M04-001` C-1 | Todo dentro de `prisma.$transaction`; ante conflicto de NIT (`P2002`) se revierte y se responde `409 NIT_YA_REGISTRADO`. |
| B3 | **La cuenta nunca pasaba a tipo `empresa`** al aprobar un ascenso. | `HU-CUE-09` E8, `RF-CUE-08-03` | La aprobación fija `usuario.tipo = 'empresa'` sobre la **misma** cuenta. |
| B4 | **El registro de empresa creaba la cuenta ya como `empresa`**, antes de la aprobación. | `RN-CUE-15`, `HU-CUE-03` E5 | La cuenta nace `normal`/`pendiente`; solo el dictamen la convierte. |
| B5 | **No se desactivaba el acceso de Google** al aprobar. | `HU-CUE-09` E10, `DP-12` | La transacción elimina los vínculos de identidad externa de esa cuenta. |
| B6 | **Motivo obligatorio también al rechazar ascensos.** | `RN-CUE-17`, `CA-CUE-09-08` | El servicio lo exige solo para solicitudes de tipo `registro`. |
| B7 | **Un `:id` mal formado provocaba un 500** (Prisma recibía un valor no casteable a `uuid`) en solicitudes, renovaciones, documentos y direcciones. | `RN-SEG-08` | `leerParamUuid` → 404 opaco, sin llegar al repositorio. |
| B8 | **Camino de escritura duplicado y sin transacción** (`crearCuentaEmpresa`, `actualizarNitEmpresa`) en `CuentasRepository`. | — | Eliminados; la única vía es el repositorio transaccional. |
| B9 | **`SOLICITUD_YA_TRAMITADA` con 400** para una decisión repetida. | `CA-CUE-09-04` | Ahora `SOLICITUD_YA_DECIDIDA` con `409`, como fija la HU. |

### 3.2 Endpoints nuevos (cierran los pendientes elevados en la remediación)

| Método y ruta | Autorización | Propósito |
| :--- | :--- | :--- |
| `GET /api/v1/cuentas/empresas/solicitudes/mias` | Sesión (titular) | El cliente consulta el estado de SUS solicitudes (`HU-CUE-03` E6, `HU-CUE-10` E3). Proyección mínima: sin revisor, sin correo, motivo solo si fue rechazada. La titularidad sale de la sesión. |
| `GET /api/v1/admin/empresas/renovaciones` | `empresas.validar` | Vista independiente de renovaciones de NIT (`RF-CUE-09-08`). |
| `GET /api/v1/admin/empresas/renovaciones/:idSolicitud` | `empresas.validar` | Detalle con metadatos del RUT, nunca su contenido (`RNF-CUE-10-01`). |
| `GET /api/v1/admin/empresas/documentos/:idDocumento` | `empresas.validar` | Descarga del RUT (`HU-CUE-09` E14, `RN-CUE-20`). |

**Descarga del RUT — endurecimiento:** adjunto (`Content-Disposition: attachment`) con nombre `rut-<id>.<ext>` construido en servidor (el nombre original **no** llega a la cabecera), `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, y verificación de la huella SHA-256 recalculada contra la registrada antes de entregar.

> **Desviación de ruta declarada:** `04_ARQUITECTURA_Y_CODIGO.md` §2.6 diseñó `GET /admin/documentos/:id`. Esa raíz pertenece al router de M17 (`/admin`), así que la ruta se ubica en `/admin/empresas/documentos/:id`, dentro del módulo y bajo la misma guarda.

---

## 4. CRITERIOS DE ACEPTACIÓN Y POLÍTICAS VERIFICADOS

| Referencia | Verificación | Resultado |
| :--- | :--- | :---: |
| `HU-CUE-09` E2 — respuesta opaca sin `empresas.validar` | Cliente y colaborador sin permiso reciben el mismo 404 en las **7** rutas administrativas; el cuerpo no nombra el permiso | ✅ |
| `HU-ADM-03` — control de acceso en servidor | El permiso se evalúa en cada petición; `tipoSesion` no concede acceso | ✅ |
| `RNF-CUE-09-01` / `CA-CUE-09-04` — un único ganador | Dos peticiones simultáneas → exactamente `200` y `409 SOLICITUD_YA_DECIDIDA` | ✅ (contrato HTTP; ver §7 sobre concurrencia real) |
| `ADR-010` — atomicidad | Condición `pendiente`, orden de efectos y reversión ante conflicto de NIT verificados en el repositorio | ✅ |
| `HU-CUE-09` E8 / E10 / `RN-CUE-15` | Conversión a `empresa`, baja de Google y registro como `normal` | ✅ |
| `RN-CUE-17` | Motivo obligatorio solo en registro | ✅ |
| `RN-SEG-08` — id inválido | 404 opaco en vez de 500 | ✅ |
| `HU-CUE-09` E14 / `RN-CUE-20` | Descarga con cabeceras seguras e integridad; 404 opaco si no existe | ✅ |
| Integridad de auditoría de revisor | `idAdminRevisor` sale de la sesión; un valor falsificado en el cuerpo se ignora | ✅ |
| Anti-IDOR en `mias` | Un `idUsuario` por query se ignora | ✅ |

---

## 5. RESUMEN DE DEPENDENCIAS EXTERNAS

* **`M20 — Seguridad`:** consume `requirePermission` y `AutorizacionService` (puerto `ResolutorPermisos`; cada denegación se emite al `AuditoriaPort` con adaptador técnico mientras `HU-SEG-04` siga aplazada).
* **`M17 — Permisos`:** provee la instancia de `AutorizacionService` y el resolutor en caliente. El permiso `empresas.validar` (id 21) ya figura en `seed_pintuclic.sql`; **no se modificó ningún archivo de M17**.
* **A quién habilita:** el frontend de M04 (Fase 3B) puede construir el panel de dictamen, la descarga del RUT y la pantalla de estado de solicitudes sobre una API que ya los expone y los protege.

---

## 6. INVENTARIO DE ARCHIVOS

```
backend/src/
├── app.routes.ts                                              # (compartido) inyecta m17.autorizacionService
└── modules/m04-cuentas/
    ├── m04.routes.ts                                          # guarda de router, PERMISO_VALIDAR_EMPRESAS, 4 rutas nuevas
    ├── controllers/
    │   ├── parametros.ts                                      # NUEVO · leerParamUuid (404 opaco ante id inválido)
    │   ├── empresas.controller.ts                             # 4 handlers nuevos + validación de ids
    │   └── direcciones.controller.ts                          # validación de :idDireccion
    ├── services/empresas.service.ts                           # dictamen atómico, consultas nuevas, integridad del RUT
    ├── repositories/
    │   ├── solicitudes-empresa.repository.ts                  # decidirSolicitud / decidirRenovacionNit transaccionales
    │   └── cuentas.repository.ts                              # retirados crearCuentaEmpresa y actualizarNitEmpresa
    ├── interfaces/cuentas.interfaces.ts                       # tipos de la vista "mis solicitudes" (cero runtime)
    └── __tests__/
        ├── admin-empresas.acceso.test.ts                      # NUEVO · pruebas HTTP de acceso, dictamen, descarga y "mias"
        ├── solicitudes-empresa.repository.test.ts             # NUEVO · garantías transaccionales
        ├── empresas.service.test.ts                           # reescrito para el flujo atómico
        ├── m04.routes.test.ts                                 # nueva firma
        └── auth-cuentas / perfil / recuperacion-password      # mocks sin los métodos retirados
```

---

## 7. VERIFICACIÓN DETERMINISTA Y CRITERIOS DE CIERRE

| Criterio / Puerta de Calidad | Herramienta / Comando | Resultado | Observaciones |
| :--- | :--- | :---: | :--- |
| Compilación TypeScript | `npx tsc --noEmit` | ✅ **0 errores** | |
| Calidad de código | `npm run lint` | ✅ **0 errores / 0 warnings** | |
| Prohibición de `any` | `npm run check:no-any` | ✅ **0 ANY** | 102 archivos auditados |
| Pruebas backend | `npx vitest run` | ✅ **20/20 suites · 188/188 tests** | +72 respecto a v0.4.0 (116) |
| **Pruebas de mutación** | Se sabotearon por separado: la guarda de permiso, la condición `estado = 'pendiente'`, la conversión a `empresa` y la baja de Google | ✅ **Cada mutante fue detectado** (10/20, 1/12, 1/12, 1/12 pruebas fallan) | Archivos restaurados y verificados idénticos |

### Alcance honesto de lo verificado
* La **lógica** de la decisión atómica está probada contra un doble de `prisma`. La **exclusión mutua real entre dos conexiones** la da PostgreSQL y solo se demuestra contra una base real: queda como prueba de integración para el Gate 4 del QA (ATDD §3 esc. 4).
* Las pruebas HTTP sustituyen solo los bordes (sesión, autorización, repositorios Prisma); la cadena de guardas, el controlador y el servicio son los reales.

---

## 8. ELEVADO PARA DECISIÓN (no se tocó: requiere archivo compartido, contrato firmado o decisión de producto)

1. **Subida del RUT bloqueada por el tamaño del cuerpo.** `index.ts` fija `express.json({ limit: '100kb' })` global, pero `HU-CUE-10` E5 exige aceptar un RUT de hasta 5 MB (llega en base64 dentro del JSON). Hoy un RUT de ~75 KB ya supera el límite. Requiere cambiar `index.ts` (compartido) o pasar a `multipart`. **Bloquea el flujo de renovación de punta a punta.**
2. **Códigos de error divergentes** entre el contrato Zod firmado en Gate 2 (`CODIGOS_ERROR_CUENTAS`), las HU de Gate 1 y la implementación (p. ej. `MOTIVO_REQUERIDO` 422 vs `MOTIVO_RECHAZO_REQUERIDO` 400; `DOCUMENTO_RUT_REQUERIDO`/`INVALIDO`; `SOLICITUD_PENDIENTE_EXISTENTE` 409 vs `RENOVACION_PENDIENTE_EXISTENTE` 400). Solo se alineó `SOLICITUD_YA_DECIDIDA`/409. Conviene que Producto/Arquitectura fije el catálogo antes de que el frontend lo consuma.
3. **El DTO de dictamen exige ≥ 10 caracteres de motivo en cualquier rechazo**, también en ascensos y renovaciones, donde la HU lo declara opcional (`CA-CUE-09-08`, `CA-CUE-09-06`). Es el contrato firmado.
4. **Registro de empresa sin verificación de correo** (`HU-CUE-03` E1/E2, `DP-19`): la cuenta queda `pendiente` hasta el dictamen y el listado no filtra solicitudes con correo sin verificar.
5. **Notificaciones de renovación de NIT** (`renovacion_nit_recibida`, `decision_renovacion_nit`; `HU-CUE-10` E4, `HU-CUE-09` E11/E12): el puerto `NotificacionesPort` no las define.
6. **Auditoría de decisiones** (`RN-CUE-23`, `HU-CUE-09` E13): M04 no emite al `AuditoriaPort`; depende de `HU-SEG-04`, aplazada.
7. **Si la notificación falla después del commit**, la decisión queda aplicada pero la petición responde error. Con el adaptador actual (en memoria) no ocurre; requiere un patrón *outbox* cuando exista M18.
8. **Carga de RUT en registro/ascenso** (`archivoRut`): código inalcanzable hoy (no hay `multer`) que, de activarse, dejaría el documento huérfano porque `solicitud_empresa` no tiene FK a `documento_soporte`.

---

## 9. ERRATA DEL `walkthrough v0.4.0`

El `v0.4.0` §4.2 afirma "comprobación de permisos administrativos en `/admin/empresas`" y el §3.1 indica el envelope `{ ok: true, datos }`. En `v0.4.0` solo existía `authMiddleware` (corregido aquí), y el envelope real es `{ success, data, message }`. Se anotó la errata en el propio `v0.4.0`.
