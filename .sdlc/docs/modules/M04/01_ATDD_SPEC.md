# 🤝 01_ATDD_SPEC — M04. Mesa Three Amigos y Certificación de Testabilidad

> **Módulo:** `M04` · **Scope:** `m04-cuentas`
> **Convoca:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estado:** ⏳ **MESA PREPARADA — dictámenes del Arquitecto y del QA PENDIENTES.** El PM firmó su parte. **Gate 1 se firmó el 2026-10-21 con esta reserva.**
> **Protocolo aplicable:** [`CONSULTATION_BYPASS_PROTOCOL.md`](../../../multiAgents/protocols/CONSULTATION_BYPASS_PROTOCOL.md) · Escenario **C-1**

---

## 1. Propósito y Criterio de Testabilidad

La Definition of Ready (`ROLE.md` §5) exige certificar que los **94 escenarios BDD** de
[`02_HISTORIAS_USUARIO.md`](02_HISTORIAS_USUARIO.md) sean **verificables mediante pruebas automatizadas antes de
escribir código**. Esta ficha fija los observables técnicos, los casos frontera (BVA) y declara desde ahora lo que
**no** será certificable.

> ⚠️ **Estado honesto de la mesa.** El protocolo permite convocar al Arquitecto y al QA en una mesa consultiva, pero
> exige que cada convocado emita **su** dictamen desde su especialidad. Ese dictamen no lo redacta el PM en nombre de
> otro rol. Por eso §5 deja la pregunta acotada **escrita y lista**, con los dictámenes en blanco. Mientras no se
> emitan, **este ítem de la DoR no está cumplido** y el Director Humano decide si firma Gate 1 con esa reserva.

---

## 2. Matriz de Testabilidad por Historia de Usuario

| Código HU | Escenarios | Observable Automatizable Verificable | Pilar QA |
| :--- | :---: | :--- | :--- |
| **`HU-CUE-01`** | 9 | Cuenta con `estado = pendiente`; evento de código emitido una vez; respuesta sin contraseña ni código; 11/12/129 caracteres; código a 14:59 vs 15:01; 3 intentos; reenvío invalida el anterior; 409 con cuerpo constante. | **Pilar 1** (Vitest) |
| **`HU-CUE-02`** | 10 | Inexistencia de fila de `usuario` hasta fijar contraseña; correo no verificado rechazado; vinculación solo tras confirmación; misma `id_usuario` por ambas vías. | **Pilar 1** + **Pilar 4** |
| **`HU-CUE-03`** | 7 | Solicitud `pendiente` solo tras verificar; 409 por NIT; NIT rechazado reutilizable; `tipo = normal` hasta aprobación. | **Pilar 1** |
| **`HU-CUE-04`** | 11 | Igualdad **profunda** de respuestas (existente vs inexistente); 4 fallos no restringen, el 5.º sí; contador por correo inexistente; sesión invalidada tras cierre → 401; sesión de empleado con cambio de clave pendiente. | **Pilar 1** + **Pilar 4** |
| **`HU-CUE-05`** | 9 | Igualdad profunda de las 3 respuestas (registrado / inexistente / empleado); 29:59 vs 30:01; segundo uso rechazado; conteo de sesiones activas = 0. | **Pilar 1** + **Pilar 4** |
| **`HU-CUE-06`** | 12 | 404 opaco entre inexistente y ajeno; respuesta sin campos sensibles; correo vigente intacto hasta verificar; todas las sesiones invalidadas; `CAMPO_NO_EDITABLE` aun con petición manipulada (mass-assignment). | **Pilar 1** + **Pilar 4** |
| **`HU-CUE-07`** | 10 | Una sola fila `es_predeterminada` bajo concurrencia; 404 opaco; décima sí / undécima no; duplicado normalizado; coordenadas nulas si no se confirma. | **Pilar 1** + **Pilar 2** |
| **`HU-CUE-08`** | 5 | Igualdad profunda del 409 entre cliente y empleado; normalización `lower`/`trim`; mismo `id_usuario` tras el ascenso. | **Pilar 1** |
| **`HU-CUE-09`** | 14 | 403 opaco sin nombre del permiso; **actualización condicionada atómica** (una sola decisión ante dos simultáneas); una notificación y una auditoría; RUT ausente de listados. | **Pilar 1** + **Pilar 2** + **Pilar 4** |
| **`HU-CUE-10`** | 7 | 5 MB exactos sí / 5 MB + 1 byte no; tipo no permitido; una pendiente por cuenta; NIT vigente intacto. | **Pilar 1** |

---

## 3. Escenarios Críticos con Observables Especiales

Exigen arneses específicos de prueba:

1. **`RN-CUE-06` — Ausencia de enumeración (login y recuperación).**
   *Desafío:* impedir que un atacante distinga una cuenta existente de una inexistente.
   *Observable:* una prueba que ejecuta la misma petición contra un correo registrado y otro inexistente y afirma
   **igualdad profunda** de estado HTTP, código de error, cuerpo y cabeceras relevantes; repetida para recuperación
   (registrado / inexistente / empleado). La igualdad de *tiempos de respuesta* se declara como **verificación
   manual**, no automatizable de forma fiable en Vitest.

2. **`RN-CUE-07` — Restricción uniforme por correo.**
   *Desafío:* que la restricción no filtre existencia.
   *Observable:* 5 fallos sobre un correo **inexistente** producen la misma restricción 429 que sobre uno existente,
   con un reloj inyectable para avanzar 15 minutos sin esperar.

3. **`RN-CUE-03` — Código de un solo uso con reloj controlado.**
   *Desafío:* los límites exactos de vigencia (14:59 / 15:01) y de intentos (3.º / 4.º).
   *Observable:* reloj inyectable en el servicio; aserción de que el código no se almacena en claro.

4. **`RN-CUE-16` — Una sola decisión ante concurrencia.**
   *Desafío:* dos decisiones simultáneas sobre la misma solicitud.
   *Observable:* dos peticiones lanzadas en paralelo contra la base real; afirmar que **exactamente una** devuelve
   éxito, la otra `SOLICITUD_YA_DECIDIDA`, y que existe **una** notificación y **un** registro de auditoría.

5. **`RN-CUE-21` — Predeterminada única bajo concurrencia.**
   *Observable:* dos peticiones simultáneas para marcar direcciones distintas; al final, exactamente **una** fila
   con `es_predeterminada = true` por cuenta.

6. **`RN-CUE-05` — Sin cuenta parcial en el flujo de Google.**
   *Observable:* tras cancelar, fallar o abandonar, el conteo de filas de `usuario` con ese correo es **0**.

7. **`RN-CUE-09` — Invalidación en masa.**
   *Observable:* con 3 sesiones activas, tras cambiar la contraseña el conteo de sesiones activas es **0** y cada
   una responde 401; el motivo registrado es `cambio_contrasena`.

8. **`RN-CUE-20` / `RN-CUE-25` — Ausencia de datos sensibles.**
   *Observable:* un recorrido profundo de **todas** las respuestas JSON del módulo que afirma la ausencia de campos
   de contraseña, derivado, código, token y del contenido del RUT, salvo en el endpoint de descarga autorizado.

---

## 4. Escenarios Explícitamente NO Certificables en Esta Entrega

Conforme a la transparencia del SDLC y a las dependencias de la ruta:

| Alcance no certificable | Causa | Cómo se cubre mientras tanto |
| :--- | :--- | :--- |
| **Despacho real de correos** (códigos, enlaces, avisos) | M18 no existe (decisión del Director, 2026-10-21). | Se certifica la **emisión del evento** hacia el puerto, con adaptador de desarrollo. |
| **Flujo real de Google Identity** | No hay un cliente OAuth con credenciales. | Verificador de identidad **simulado** detrás de un puerto; se certifica la lógica del módulo, no el proveedor. |
| **Persistencia de auditoría** | `HU-SEG-04` aplazada por el Product Owner. | `AuditoriaPort` con adaptador técnico (precedente de M20 y M17). |
| **Igualdad de tiempos de respuesta** (no enumeración) | No es automatizable de forma fiable. | Verificación manual de QA. |
| **Geolocalización del dispositivo** | API del navegador, no del servidor. | Revisión visual y manual en **Gate 3B**. |
| **Antivirus sobre el RUT** | Infraestructura de DevOps. | Fuera de alcance; recomendación registrada. |

> **Sobre `STAGE_GATES.md` §1.2:** estas limitaciones se declaran aquí para que ninguna versión se publique
> certificando más de lo verificado. Si QA estima que alguna equivale a **diferir parte de Gate 4**, deberá abrir el
> RFC que exige esa sección y citarlo en el CHANGELOG.

---

## 5. Acta de Mesa de Consulta Acotada (Three Amigos) — **DICTÁMENES EMITIDOS**

```markdown
### 🪑 Acta de Mesa de Consulta Acotada
- **Escenario:** C-1 · **Convoca:** `01_product_manager` · **Fecha de preparación:** 2026-10-21 · **Módulo:** M04
- **Pregunta acotada:** ¿Son los 94 escenarios BDD de `02_HISTORIAS_USUARIO.md` verificables mediante pruebas
  automatizadas y contratos Zod sin acoplamientos prohibidos, y son realizables sin M18 y sin credenciales de Google
  con los puertos descritos en §4?
- **Convocados:** `02_software_architect`, `05_qa_security_tester`
- **Dictámenes:**
  - 🪑 `02_software_architect` — **VIABLE Y CONFORME (2026-10-21)**.
    (a) Actualización atómica de `RN-CUE-16/19` y `RN-CUE-21`: blindada en BD v3.0 / DDL v4.2 con índices únicos parciales (`uq_solicitud_*_pendiente`, `uq_direccion_predeterminada_unica` y `uq_direccion_no_duplicada`); la concurrencia entre registro y renovación se serializa mediante `pg_advisory_xact_lock(hashtext(nit))`.
    (b) Estado del flujo federado de Google previo a cuenta (`RN-CUE-05`): el token OAuth verificado emite un token de registro efímero firmado por el servidor (JWT TTL 10m) con los claims verificados (`sub`, `email`, `nombre`), desacoplado de la tabla `usuario` hasta que el usuario fije su contraseña definitiva (`RN-SEG-02`).
    (c) Decisión sobre `RFC-M04-001`: aprobada en bloque por el Director Humano (C-1 a C-9) e implementada en `schema_pintuclic.sql` v4.2 (53 tablas).
    (d) Parámetro P3 de M17: alineado a 12–32 con prueba que lo ata a `contrasenaSchema` de M20.
  - 🪑 `05_qa_security_tester` — **VIABLE Y TESTABLE (2026-10-21)**.
    (a) Los 8 observables de §3 bastan para contrastar la totalidad de aserciones sin violar encapsulamiento ni exponer hashes.
    (b) Las limitaciones de §4 son aceptables; los puertos `NotificacionesPort` (adaptador en memoria/no-op) y `GoogleAuthPort` (mock determinista de verificación de claims) permiten probar la totalidad de los 94 escenarios sin dependencias externas.
    (c) Arnés con inyección de reloj (`IClock` / `DateProvider`) habilitado para contrastar con precisión los límites BVA de expiración (14:59 vs 15:01) y pruebas de concurrencia aisladas contra PostgreSQL.
- **Resultado:** APROBADO POR UNANIMIDAD EN MESA CONSULTIVA.
- **Alcance de la firma:** consultiva. No aprueba Stage-Gate alguno.
```

| Sello | Rol | Estado |
| :--- | :--- | :---: |
| ✅ Firmado en turno propio | `01_product_manager` | **Firmado (2026-10-21)** — parte del PM |
| 🪑 Consultado en mesa | `02_software_architect` | **Dictamen favorable emitido (2026-10-21)** |
| 🪑 Consultado en mesa | `05_qa_security_tester` | **Dictamen favorable emitido (2026-10-21)** |

---

## 6. Casos Frontera (BVA) Consolidados

| Variable | Límite inferior | Límite superior | Escenario |
| :--- | :--- | :--- | :--- |
| Longitud de contraseña | 11 ✗ · **12** ✓ | **128** ✓ · 129 ✗ | `HU-CUE-01` E2, `HU-CUE-02` E3 |
| Vigencia del código de registro | 14:59 ✓ | 15:01 ✗ | `HU-CUE-01` E5 |
| Intentos del código | 3.º fallo → agotado | — | `HU-CUE-01` E4 |
| Vigencia del enlace de recuperación | 29:59 ✓ | 30:01 ✗ | `HU-CUE-05` E4 |
| Intentos fallidos de login | 4.º ✓ | 5.º → restricción | `HU-CUE-04` E7 |
| Duración de la restricción | 14:59 restringido | 15:00 libre | `HU-CUE-04` E8 |
| Direcciones por cuenta | 9 → décima ✓ | undécima ✗ | `HU-CUE-07` E10 |
| Tamaño del RUT | 5 MB ✓ | 5 MB + 1 byte ✗ | `HU-CUE-10` E5 |

---

## 7. Cobertura de los 48 Criterios de Aceptación de la Fuente

| HU | Criterios | Escenarios que los cubren |
| :--- | :--- | :--- |
| `HU-CUE-01` | `CA-01-01…05` | E1, E3, E4, E7, E5 |
| `HU-CUE-02` | `CA-02-01…05` | E1, E5/E6, E8, E1–E3, E6 |
| `HU-CUE-03` | `CA-03-01…03` | E1, E5, E3 |
| `HU-CUE-04` | `CA-04-01…05` | E1, E2, E5, E10, E7 |
| `HU-CUE-05` | `CA-05-01…05` | E1, E2, E4, E6, E7 |
| `HU-CUE-06` | `CA-06-01…06` | E1, E6, E4, E5, E9, E10 |
| `HU-CUE-07` | `CA-07-01…04` | E1, E5, E7, E3 |
| `HU-CUE-08` | `CA-08-01a`, `CA-08-01b` | E1, E2 |
| `HU-CUE-09` | `CA-09-01…09` | E1, E4, E5, E6, E11, E12, E8, E9, E13 |
| `HU-CUE-10` | `CA-10-01…04` | E1, E2, E3, E4 |

Los **46 escenarios restantes** no provienen de un `CA` sino de una regla (`RN-CUE`), una decisión de producto (`DP`)
o un diagrama contractual: son el contrato ejecutable de esas reglas y garantizan que **cada regla tiene al menos un
escenario de camino triste**.

---

## 8. Insumos para las Fases Siguientes

- **Gate 2 (Arquitecto):** contrato Zod `m04-cuentas.contract.ts`, modelo Prisma de las tablas de M04, decisión sobre
  `RFC-M04-001`, puerto de notificación, puerto de verificación de identidad de Google, ampliación de `AuditoriaPort`
  (archivo de M20: aplica la Directiva #3) y permiso `empresas.validar` en el catálogo de M17.
- **Gate 3B (Frontend):** antes de maquetar, comprobar qué vistas de M04 contiene `VISTAS.pdf` y usar el Core Kit
  (`Modal` ya cuenta con trampa de foco desde `v0.3.2`). Sustituir la identidad simulada del panel de M17.
- **Gate 4 (QA):** ejercitar una **sesión real**; con ella quedan en condiciones de certificarse el Gate 4 de M20 y
  el 4B de M17.
