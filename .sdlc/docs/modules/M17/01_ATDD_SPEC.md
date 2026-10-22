# 🤝 01_ATDD_SPEC — M17. Mesa Three Amigos y Certificación de Testabilidad

> **Módulo:** `M17` · **Scope:** `m17-permisos`
> **Convoca:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estado:** ✅ Mesa cerrada conforme — PM firmado en turno · Arquitecto y QA consultados en mesa
> **Protocolo aplicado:** [`CONSULTATION_BYPASS_PROTOCOL.md`](../../../multiAgents/protocols/CONSULTATION_BYPASS_PROTOCOL.md) · Escenario **C-1**

---

## 1. Propósito y Criterio de Testabilidad

La Definition of Ready del Product Manager (`ROLE.md` §5) exige certificar que los **47 escenarios BDD** de
[`02_HISTORIAS_USUARIO.md`](02_HISTORIAS_USUARIO.md) sean **verificables mediante pruebas automatizadas
antes de escribir código**. Esta especificación formaliza los observables técnicos y define los arneses
necesarios para garantizar el cumplimiento de los 4 pilares de QA.

> 🪑 **Mesa de Consulta Acotada (Escenario C-1):**  
> Siguiendo el protocolo rector de ritos multi-rol secuenciales, el Software Architect y el QA Lead participan
> con sello consultivo 🪑 para garantizar que los contratos Zod y los tests en Vitest nazcan alineados.

---

## 2. Matriz de Testabilidad por Historia de Usuario

| Código HU | Escenarios | Observable Automatizable Verificable | Pilar QA Responsable |
| :--- | :---: | :--- | :--- |
| **`HU-ADM-01`** | 8 | Cuenta creada con estado `activo`; conteo de permisos asignados = 0; rechazo HTTP 409 ante correo duplicado; flag de primer acceso activo; conteo de sesiones activas = 0 tras desactivar; preservación de autoría en logs; rechazo ante autodestrucción del admin. | **Pilar 1** (SDET / Vitest Unit & Integration) |
| **`HU-ADM-02`** | 7 | Catálogo agrupado por área funcional; presencia automática del permiso de consulta al conceder mutación; retiro en cascada de dependientes; rechazo en caliente en petición viva sin re-login; HTTP 403 ante empleados no autorizados. | **Pilar 1** + **Pilar 4** (Auditoría / AST) |
| **`HU-ADM-03`** | 6 | Intercepción de rutas en backend con HTTP 403; **opacidad del payload de error** (ausencia de nombres de permisos o rutas internas); preservación de cookie de sesión activa; evaluación en tiempo real en queries. | **Pilar 1** + **Pilar 4** (Seguridad Anti-Bypass) |
| **`HU-ADM-04`** | 8 | Búsqueda indexada por documento/NIT/correo/teléfono; rechazo HTTP 403 a peticiones PUT/PATCH sobre datos del cliente; payload de pago saneado (solo últimos 4 dígitos y tipo); validación de motivo obligatorio en desactivación. | **Pilar 1** + **Pilar 4** (Anti-Exposición de Datos) |
| **`HU-ADM-05`** | 7 | Almacén de configuración en BD actualizado; aplicación inmediata en endpoint siguiente; rechazo 400 ante valores fuera de rango; invariabilidad de montos e IVA en órdenes cerradas tras cambio de tasa. | **Pilar 1** + **Pilar 2** (E2E / Integración) |
| **`HU-ADM-06`** | 8 | Sesión admin marcada con cambio de clave forzoso en primer acceso; ausencia de rutas para crear administradores; bloqueo de auto-eliminación; token efímero de confirmación para nuevo correo; invalidación total de sesiones tras sustitución. | **Pilar 1** + **Pilar 4** (Seguridad / Anti-Takeover) |
| **`HU-ADM-07`** | 3 | Existencia de los 6 parámetros de autenticación y el de comunicaciones con claves tipadas fijas en Zod; validación de esquema en catálogo. | **Pilar 1** (Contratos Zod) |

---

## 3. Escenarios Críticos con Observables Especiales

Estos 4 escenarios exigen arneses específicos de prueba:

1. **`CA-ADM-02-04` / `CA-ADM-03-05` — Revocación de Permisos en Caliente (Sin Caché de Token):**
   * *Desafío:* Verificar que la autorización no depende de los claims del JWT firmado en el login.
   * *Observable Técnico:* Un test de integración que: (1) autentica un empleado y obtiene su sesión, (2) ejecuta una mutación permitida (200 OK), (3) retira el permiso en la base de datos **con la sesión viva**, y (4) ejecuta inmediatamente la misma operación con el mismo token/cookie, verificando que el backend responde **403 Forbidden** de forma inmediata.

2. **`CA-ADM-03-03` — Opacidad Absoluta de Respuestas 403 (Fail-Safe):**
   * *Desafío:* Impedir que un atacante deduzca qué permisos existen o qué recursos están presentes mediante análisis de mensajes de error.
   * *Observable Técnico:* Aserción estricta sobre el cuerpo JSON de la respuesta: debe contener exactamente `{ success: false, error: { codigo: "ACCESO_DENEGADO", mensaje: "No dispone de autorización para realizar esta acción." } }`, **sin campos** como `permisoRequerido`, `modulo` o `detallesInternos`.

3. **`CA-ADM-02-02` — Concesión Atómica Implicada (Consulta ↔ Operación):**
   * *Desafío:* Garantizar que otorgar un permiso de edición no deje al empleado huérfano de la consulta correspondiente.
   * *Observable Técnico:* Invocación del servicio para asignar `catalogo.editar` y aserción de que la base de datos contiene **dos filas nuevas** en `asignacion_permiso`: la de `catalogo.editar` y la de `catalogo.ver`.

4. **`CA-ADM-05-05` — Irretroactividad Comercial:**
   * *Desafío:* Modificar parámetros impositivos o de envío no puede alterar transacciones históricas.
   * *Observable Técnico:* Crear una orden con IVA al 19%, modificar el parámetro general `comercial.iva_porcentaje` a 10%, y verificar que la orden cerrada mantiene su desglose con base, IVA original y total inalterados.

---

## 4. Escenarios Explícitamente NO Certificables en Esta Entrega

Conforme a la transparencia del SDLC y las dependencias de la ruta:

- **Persistencia en tabla `registro_auditoria`:** La tabla de auditoría física fue aplazada por el Product Owner en M20 (`HU-SEG-04`). Todos los eventos de auditoría de M17 (`CA-ADM-01-05`, `CA-ADM-02-07`, `CA-ADM-03-06`, `CA-ADM-04-08`, `CA-ADM-05-06`) se certificarán conectándolos a `AuditoriaPort` con adaptador técnico en memoria / log interno, quedando cubiertos por diseño y listos para persistir cuando `HU-SEG-04` sea desbloqueada.
- **Despacho real de correos SMTP:** Al igual que en M20, M17 emite los eventos hacia `M18` sin invocar transporte SMTP real en tests unitarios (se utiliza mock desacoplado del despachador).

---

## 5. Acta de Mesa de Consulta Acotada (Three Amigos)

- **Fecha:** 2026-10-21
- **Convoca:** `01_product_manager` (Subrol 03)
- **Pregunta Acotada:** ¿Son los 47 escenarios BDD verificables mediante pruebas automatizadas y contratos Zod sin incurrir en acoplamientos prohibidos ni ambigüedades de persistencia?
- **Convocados:** `02_software_architect`, `05_qa_security_tester`
- **Dictámenes:**
  - 🪑 **Software Architect Lead:** **CONFORME.** Los 4 observables especiales se estructuran en el contrato `m17-permisos.contract.ts` mediante DTOs tipados estrictos en Zod, garantizando resolución dinámica en tiempo real sobre la tabla `asignacion_permiso` y middleware de autorización desacoplado.
  - 🪑 **QA Lead & Security:** **CONFORME.** Los 47 escenarios cubren adecuadamente los 4 pilares de pruebas (Vitest, integración HTTP, opacidad contra enumeration y verificación de invariantes de gobernanza).
- **Resultado:** Mesa cerrada conforme. DoR alcanzada al 100 %.
