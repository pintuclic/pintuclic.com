# 📝 WORKLOG — 01_PRODUCT_MANAGER

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado para fase de Product Discovery (`/grill-me`), definición de HUs bajo INVEST y criterios ejecutables BDD Given-When-Then.

---

## 2026-10-21 — M20 · Entregables de Gate 1

**Rol:** Product Manager Lead · **Módulo:** M20 Seguridad, Auditoría y Protección de Datos
**Fase:** FASE_1_PRD → esperando firma de Gate 1

### Contexto de entrada
El Director Humano firmó el Gate 0 y designó M20 como primer módulo del ciclo SDLC formal. M20 es la
raíz absoluta del grafo de `RUTA_DEL_PROYECTO.md`: sin predecesores que certificar.

### Subroles convocados
- **03 · Functional Requirements, ATDD & BDD** — formalización de las 5 HU en alcance a INVEST +
  Gherkin (36 escenarios) y ficha de testabilidad.
- **02 · Legal & Domain Compliance** — acotación de HU-SEG-05 frente al régimen colombiano de
  protección de datos: se especifica el mecanismo (consentimiento versionado, supresión con
  conservación legal y desvinculación) y se deja el contenido legal al área jurídica.
- **01 · Discovery & Strategy** — matriz In-Scope / Out-of-Scope. No se lanzó `/grill-me` completo:
  la fuente de verdad ya aporta 45 RF y 37 CA; las 6 preguntas que sí quedan abiertas se elevan a
  Gate 1 con postura propuesta en lugar de bloquear la entrega.

### Entregables dejados en disco
- `docs/modules/M20/01_SPEC_FUNCIONAL.md` — propósito, dependencias, RBAC, 15 reglas inmutables
  (`RN-SEG-01`…`RN-SEG-15`) y matriz de alcance.
- `docs/modules/M20/02_HISTORIAS_USUARIO.md` — 5 HU en INVEST, 36 escenarios BDD trazados a su CA.
- `docs/modules/M20/03_FLUJO_Y_ESTADOS.md` — transcripción a Mermaid de los 6 diagramas
  contractuales, máquina de estados de la Sesión y 3 casos E2E.
- `docs/modules/M20/01_ATDD_SPEC.md` — testabilidad; firmas de Arquitecto y QA pendientes.

### Decisiones registradas
1. **HU-SEG-04 aplazada por el Product Owner.** M20 cierra con 5 de 6 historias.
2. **RN-SEG-15 (puerto `AuditoriaPort`)** para que el aplazamiento no deje deuda estructural:
   los puntos de llamada quedan cableados y solo se sustituye el adaptador al desbloquear.
3. **`CA-SEG-03-05` NO se declara cumplido** — depende de la persistencia aplazada.
4. **`RN-SEG-02` invierte `RF-SEG-01-05`**: toda cuenta tiene contraseña propia, incluidas las de
   Google, por la refactorización de historias de M04.
5. **`RF-SEG-02-07` fuera de alcance** — el almacén de parámetros es `HU-ADM-05` de M17.

### Incidencias elevadas
- **Deuda documental:** `HU-SEG-01_almacenamiento_seguro_credenciales.png` y los diagramas de
  registro/login de M04 contradicen la especificación vigente. Son imágenes y requieren reedición.
- **Mesa ATDD incompleta:** los roles se asumen secuencialmente; Arquitecto y QA no pueden firmar
  todavía. Se declara en la ficha en lugar de simularlo.

### Alto mecánico
Turno detenido conforme a la Regla de Oro #10 y `STAGE_GATES.md` §3. `current_state.json` en
`GATE_1_PRD_APPROVAL` / `ESPERANDO_APROBACION_HUMANA`.

### 🪑 Acta de Mesa de Consulta Acotada — M20 · rito ATDD
- **Escenario:** C-1 · **Fecha:** 2026-10-21 · **Convoca:** `01_product_manager`
- **Pregunta acotada:** ¿son los 36 escenarios BDD verificables por prueba automatizada antes de que
  exista implementación, y hay alguno sin observable suficientemente preciso?
- **Convocados:** `02_software_architect`, `05_qa_security_tester`
- **Dictámenes:** ambos **CONFORME CON RESERVA** — 4 observables que el Arquitecto asume en Gate 2 y
  2 condiciones que el QA hará valer en Gate 4.
- **Resultado:** mesa cerrada conforme. Sin Feedback Loop. DoR completa.
- **Nota:** el Director Humano autorizó el bypass y se incorporó al protocolo rector como
  `CONSULTATION_BYPASS_PROTOCOL.md`. Primera aplicación del protocolo en el proyecto.

---

## 2026-10-21 — M17 · Entregables de Gate 1

**Rol:** Product Manager Lead · **Módulo:** M17 Administración, Empleados y Permisos
**Fase:** FASE_1_PRD → esperando firma del Director Humano en Gate 1
**Perfil de Compuerta Declarado:** **Perfil B (Módulo Transversal / Habilitador de Plataforma)**

### Contexto de entrada
El Director Humano activó la Fase 1 para M17 tras la lectura analítica de la gobernanza y la especificación de negocio. M17 es el segundo eslabón de la Ola 1, condicionado exclusivamente por M20.

### Subroles convocados
- **03 · Functional Requirements, ATDD & BDD:** Formalización de las 7 HU en formato INVEST con 47 escenarios BDD Gherkin ejecutables (`Dado-Cuando-Entonces`) y análisis de testabilidad.
- **02 · Legal & Domain Compliance:** Mapeo de reglas inmutables de gobierno, principio de mínimo privilegio (*default deny*), protección de datos de clientes (prohibición de modificación de datos personales y ofuscación de instrumentos de pago) y gobernanza de la cuenta administradora única.
- **01 · Discovery & Strategy:** Matriz In-Scope / Out-of-Scope, resolución de las preguntas pendientes (§6) sin bloquear el flujo y confirmación de que no existen roles rígidos para colaboradores.
- **04 · Product Analytics & UAT:** Definición de criterios de aceptación observables y métricas de latencia de resolución de autorización en servidor (< 15 ms).

### Entregables dejados en disco
- `.sdlc/docs/modules/M17/01_SPEC_FUNCIONAL.md`: Visión, topología de dependencias, RBAC granular, 18 reglas inmutables (`RN-ADM-01`…`RN-ADM-18`), matriz In/Out-of-Scope y resolución de preguntas abiertas.
- `.sdlc/docs/modules/M17/02_HISTORIAS_USUARIO.md`: 7 HU en INVEST (`HU-ADM-01` a `HU-ADM-07`), 47 escenarios BDD Gherkin trazados 1:1 a los CA contractuales.
- `.sdlc/docs/modules/M17/03_FLUJO_Y_ESTADOS.md`: Transcripción completa a Mermaid de los 5 diagramas contractuales `.drawio.png` de `docs/assets/diagrams/M17/`, secuencia de intercepción HTTP y máquinas de estados de cuenta y sustitución de admin.
- `.sdlc/docs/modules/M17/01_ATDD_SPEC.md`: Matriz de testabilidad de los 47 escenarios, análisis de 4 observables complejos (revocación en caliente, opacidad 403, acoplamiento consulta-operación, irretroactividad comercial) y Acta Three Amigos.

### Decisiones registradas
1. **Modelo de Permisos Atómicos:** Ningún empleado posee rol predefinido. La autorización se evalúa dinámicamente sobre `asignacion_permiso` en backend ante cada petición HTTP.
2. **Administrador Único e Inmortal:** La cuenta de administrador no admite réplicas, no puede desactivarse ni borrarse, y sus facultades no son editables en la matriz de permisos.
3. **Privacidad Estricta de Clientes (`HU-ADM-04`):** El personal administrativo tiene estrictamente prohibido alterar datos personales de clientes. Las peticiones de rectificación se canalizan exclusivamente por el titular en M04.
4. **Almacén de Parámetros (`HU-ADM-05` / `HU-ADM-07`):** Definición tipada de parámetros operativos y comerciales básicos con aplicación dinámica sin reinicio del servidor.

### Alto mecánico (Rule #10 y STAGE_GATES.md §3)
Turno detenido. `current_state.json` actualizado a `FASE_1_PRD` / `GATE_1_PRD_APPROVAL` en estado `ESPERANDO_APROBACION_HUMANA`. Se requiere la firma explícita del Director Humano para habilitar la Fase 2 (Software Architect Lead).

### 🪑 Acta de Mesa de Consulta Acotada — M17 · rito ATDD
- **Escenario:** C-1 · **Fecha:** 2026-10-21 · **Convoca:** `01_product_manager`
- **Pregunta acotada:** ¿Son los 47 escenarios BDD verificables mediante pruebas automatizadas y contratos Zod sin incurrir en acoplamientos prohibidos ni ambigüedades de persistencia?
- **Convocados:** `02_software_architect`, `05_qa_security_tester`
- **Dictámenes:** Ambos **CONFORME**. El Arquitecto asume los 4 observables especiales en el contrato Zod y QA valida que los 47 escenarios cubren los pilares de prueba.
- **Resultado:** Mesa cerrada conforme. DoR cumplida.

