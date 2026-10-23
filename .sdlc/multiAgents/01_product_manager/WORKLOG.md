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

---

## 2026-10-21 — M04 · Entregables de Gate 1

**Rol:** Product Manager Lead · **Módulo:** M04 Cuentas, Autenticación y Perfil
**Fase:** FASE_1_PRD → esperando firma del Director Humano en Gate 1
**Perfil de Compuerta Declarado:** **Perfil A (Vertical)**

### Contexto de entrada
El Director Humano autorizó construir M04 antes que M18 y antes de cerrar la Ola 2 (salto de ola registrado en
`current_state.json → bloqueos[]` como `SALTO_DE_OLA_AUTORIZADO`), y dispuso que el arranque sea por el rol de
Product Manager conforme a la metodología. M04 es Ola 3, depende de M18 (inexistente) y no tenía artefactos de Gate 1 ni
contrato Zod. Se respondió además a sus decisiones: (1) ante conflicto entre diagrama y especificación **prevalece la
especificación**; (2) la ampliación de `AuditoriaPort` la hace el Arquitecto en su turno; (3) se adoptan los valores por
defecto del catálogo de parámetros de M17; (4) y (5) se le entrega una propuesta de DDL para que decida.

### Subroles convocados
- **03 · Functional Requirements, ATDD & BDD:** 26 reglas inmutables `RN-CUE`, 10 HU en INVEST con **94 escenarios BDD**
  trazados a los **48 criterios de aceptación** de la fuente, matriz de testabilidad y casos frontera.
- **02 · Legal & Domain Compliance:** custodia de datos personales (la ubicación del dispositivo exige consentimiento,
  `RN-CUE-22`), no enumeración de cuentas (`RN-CUE-06`), custodia del RUT (`RN-CUE-20`) y trazabilidad de decisiones.
- **01 · Discovery & Strategy:** matriz In/Out-of-Scope y resolución de preguntas abiertas como **19 decisiones de
  producto propuestas** (`DP-01`…`DP-19`), que el Director firma con Gate 1.
- **04 · Product Analytics & UAT:** 5 indicadores de éxito, con metas declaradas como propuestas a validar.

### Entregables dejados en disco
- `.sdlc/docs/modules/M04/01_SPEC_FUNCIONAL.md`: salto de ola, dependencias, actores, 26 RN, matriz de alcance, 19 DP, **17 hallazgos** sobre la fuente (6 diagramas que contradicen la spec y 11 defectos de spec/entorno), parámetros consumidos y DoR.
- `.sdlc/docs/modules/M04/02_HISTORIAS_USUARIO.md`: 10 HU, 94 escenarios, evaluación INVEST (3 HU declaradas por rebanadas).
- `.sdlc/docs/modules/M04/03_FLUJO_Y_ESTADOS.md`: transcripción a Mermaid de los 5 diagramas, 6 máquinas de estado y el catálogo de 9 eventos hacia M18.
- `.sdlc/docs/modules/M04/01_ATDD_SPEC.md`: 8 observables críticos, alcance **no certificable** declarado, BVA y cobertura de los 48 CA.
- `.sdlc/docs/modules/M04/RFC-M04-001_cambios_ddl.md`: 9 cambios propuestos al modelo de datos. **No es entregable de Gate 1**: la regla de oro #1 del PM prohíbe especificar SQL, así que se redactó a petición expresa del Director como insumo de Gate 2, y lo formaliza el Arquitecto.

### Decisiones y hallazgos relevantes
1. **Seguridad por diseño que cambia el modelo:** la restricción por intentos fallidos se lleva por correo (exista o no) para no filtrar qué cuentas existen; por eso no puede vivir en columnas de `usuario`.
2. **El NIT vigente de una cuenta empresa no tiene dónde guardarse** (solo existe en `solicitud_empresa`) y el RUT presupone un almacenamiento de archivos inexistente: de ahí las decisiones 4 y 5 del Director.
3. **Una cuenta jamás verificada no reserva el correo** (`DP-07`), para no dejar fuera de la plataforma a su dueño legítimo.
4. **Corrección a mi propio reporte previo:** afirmé que las "15 preguntas abiertas" no estaban en el repositorio; sí están, en `M18_NOTIFICACIONES.md` §6, porque el análisis original cubría M04 y M18 y se partió en dos. Se incorporaron como origen de varias `DP`.
5. **Defectos de otros módulos detectados, no tocados:** M17 guarda su catálogo de parámetros (decisión documentada en `ADR-007`: el DDL no tenía tabla de parámetros) y los tokens de cambio de correo del administrador en `Map` en memoria, de modo que no sobreviven a un reinicio; el catálogo de permisos no tiene un permiso para validar empresas; el mínimo de contraseña de M17 (8) contradice el de M20 (12); el cambio de clave forzoso de empleados no se persiste. Se elevan al Arquitecto y al Director (Directiva #3).

### 🪑 Mesa de Consulta Acotada — ESTADO: PREPARADA, NO CONVOCADA
- **Escenario:** C-1 · **Pregunta acotada escrita** en `01_ATDD_SPEC.md` §5 · **Convocados:** `02_software_architect`, `05_qa_security_tester`
- **Dictámenes:** **PENDIENTES.** No se redactaron en nombre de otros roles: el protocolo exige que cada convocado responda desde su especialidad, y simularlo sería una firma sin respaldo.
- **Consecuencia:** el ítem *"Ficha ATDD firmada por los Three Amigos"* de la DoR **no está cumplido**. El Director Humano decide si firma Gate 1 con esa reserva o exige antes la mesa.

### Alto mecánico (Regla de Oro #10 y STAGE_GATES.md §3)
Turno detenido. `current_state.json` pasa a `FASE_1_PRD` / `GATE_1_PRD_APPROVAL` en estado `ESPERANDO_APROBACION_HUMANA`. Se requiere
la firma explícita del Director Humano para habilitar la Fase 2 (Software Architect Lead). No se escribió código ni se modificó ningún archivo fuera de
`.sdlc/` en esta entrega.

### ✅ Gate 1 FIRMADO — 2026-10-21
- **Firma:** Director Humano, por instrucción expresa en la sesión ("firma el gate 1"), transcrita por el agente. Valida las decisiones de producto `DP-01`…`DP-19` y habilita la Fase 2.
- **Reserva registrada:** la ficha ATDD seguía **sin los dictámenes del Arquitecto y del QA**; la instrucción de firma no abordó ese punto. Queda como bloqueo `RESERVA_DE_COMPUERTA` en `current_state.json` y debe resolverse antes de cerrar Gate 2.
- **Corrección a mi reporte previo:** presenté el almacenamiento en memoria de los parámetros de M17 como un defecto. Es una decisión documentada (`ADR-007`); el efecto sobre M04 es real, pero no una falla no vista.
- **Turno cedido** al Software Architect Lead.
