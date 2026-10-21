# 🚦 PROTOCOLO DE COMPUERTAS DE CALIDAD Y CONTROL HUMANO (STAGE-GATES HITL)

> **Documento Rector del Ciclo de Vida Multiagente.**  
> Este protocolo rige de forma obligatoria para **TODOS los agentes de Inteligencia Artificial** que operen en este repositorio.  
> Su objetivo es garantizar la soberanía, supervisión y control del **Director Humano (Tech Lead / Product Owner)** en los momentos críticos e irreversibles del desarrollo, erradicando la sobre-autonomía no autorizada.

---

## 1. Principio Fundamental: Alto Mecánico Obligatorio (Yield/Halt)

Ningún agente de IA puede encadenar fases de forma autónoma más allá de una compuerta que requiera aprobación humana.  
**Cuando un agente completa los entregables de un Gate con aprobación humana obligatoria, TIENE LA OBLIGACIÓN ABSOLUTA DE DETENER SU TURNO (NO LLAMAR MÁS HERRAMIENTAS DE CÓDIGO NI AVANZAR DE ROL) y esperar la confirmación explícita del usuario.**

---

## 1.1. Independencia del Auditor (Separación de Funciones)

**El agente que implementó un módulo en Fase 3A o Fase 3B NO puede asumir el rol
`05_qa_security_tester` para auditar ese mismo módulo.**

El SDLC define al QA Lead como *fiscal técnico imparcial con poder de veto*, y la Regla de Oro #6
le prohíbe corregir código de producción. Ambas cosas presuponen **separación de funciones**: quien
escribió el código conoce sus atajos y sus supuestos, y ese conocimiento sesga dónde busca. Una
autocertificación es estructuralmente débil por bien intencionada que sea.

- **Regla:** Gate 4 lo ejecuta un agente distinto del que implementó.
- **Excepción:** si no hay otro agente disponible, el **Director Humano lo autoriza de forma
  explícita** y el `QA_REPORT.md` **abre declarando el conflicto de interés**, con esta leyenda:
  > ⚠️ *Auditoría realizada por el mismo agente que implementó el módulo, por indisponibilidad de un
  > auditor independiente, con autorización del Director Humano del [fecha]. Su dictamen tiene valor
  > reducido y debe revalidarse cuando haya un auditor independiente.*
- **Lo que NO autoriza la excepción:** levantar un veto propio. Un agente nunca cierra una incidencia
  que él mismo introdujo sin revisión externa.

---

## 1.2. Diferir o Recortar una Compuerta Exige un RFC

**Ninguna compuerta se difiere, se recorta ni se declara "no aplicable" por acuerdo verbal.**

Una compuerta puede no encajar con un módulo concreto —un módulo transversal sin interfaz no tiene
nada que enseñar en Gate 3B; un módulo que no puede ejecutarse todavía no es auditable en Gate 4—.
Esas situaciones son legítimas y se resuelven, **pero dejando rastro**: si la decisión vive solo en
una conversación, dentro de seis meses nadie sabrá por qué una versión se publicó sin certificar.

Procedimiento obligatorio:

1. **Redactar un RFC** según [`../multiAgents/protocols/TECHNICAL_PROPOSALS_PROTOCOL.md`](../multiAgents/protocols/TECHNICAL_PROPOSALS_PROTOCOL.md), indicando qué compuerta, por qué no aplica tal como está escrita, qué se entrega en su lugar y bajo qué condición se retoma.
2. **Obtener la firma del Director Humano** sobre ese RFC. La aprobación verbal no basta: se registra.
3. **Registrarlo en `bloqueos[]`** de `current_state.json` con su identificador de RFC.
4. **Citar el RFC en la entrada del CHANGELOG** de toda versión afectada, para que la publicación declare lo que no se verificó.

> 📌 **Esta regla nace de un caso real.** En M20 se difirió Gate 4 —con buen criterio: el módulo no
> podía ejercitarse end-to-end sin el login de M04— pero la decisión se tomó en prosa, sin RFC. La
> condición que el QA Lead había impuesto en la mesa ATDD sobre `CA-SEG-03-05` quedó registrada solo
> en bitácoras y **sin matriz RTM que la sostuviera**. Diferir no exime de declarar la cobertura.

---

## 2. Mapa Canónico de las Compuertas del SDLC

```text
┌─────────────────────────┐
│ Fase 1: Product Manager │
│  (01_PRD.md + HUs BDD)  │
└────────────┬────────────┘
             │
      🛑 GATE 1: Aprobación Humana de Requerimientos y Reglas de Negocio
             │
┌────────────▼─────────────┐
│ Fase 2: Software Arch.   │
│  (DDL BD + Zod API)      │
└────────────┬─────────────┘
             │
      🛑 GATE 2: Aprobación Humana de Arquitectura y Contratos de Datos
             │
┌────────────▼─────────────┐
│ Fase 3A: Backend Eng.    │ ⚡ PASE CONTINUO (Sin alto obligatorio)
│  (Endpoints REST + SQL)  │   (Compilación estricta y transfiere a Frontend)
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Fase 3B: Frontend Eng.   │
│  (Vistas SPA + UI/UX)    │
└────────────┬─────────────┘
             │
      🛑 GATE 3B: Aprobación Humana de Diseño Web y Experiencia UI/UX
             │
┌────────────▼─────────────┐
│ Fase 4: QA Lead Tester   │
│  (QA_REPORT.md + RCA)    │
└────────────┬─────────────┘
             │
      🛑 GATE 4: Aprobación Humana de Certificación, Git Commit y Release
             │
┌────────────▼─────────────┐
│ Fase 5: Merge a Main     │
└──────────────────────────┘
```

---

## 3. Matriz de Detalle por Compuerta

### 🛑 GATE 1: Aprobación de Requerimientos y Reglas de Negocio
- **Agente Emisor:** `01_product_manager`
- **Agente Receptor:** `02_software_architect`
- **Aprobador Requerido:** **Director Humano**
- **Entregables Obligatorios:**
  - `docs/modules/[XX_modulo]/01_SPEC_FUNCIONAL.md`: Reglas funcionales del dominio y casos de uso.
  - `docs/modules/[XX_modulo]/02_HISTORIAS_USUARIO.md`: Historias bajo estándar **INVEST** y criterios en formato **BDD (Given-When-Then)**.
  - `docs/modules/[XX_modulo]/03_FLUJO_Y_ESTADOS.md`: Diagramas de flujo y ciclo de vida en Mermaid.
  - `docs/modules/[XX_modulo]/01_ATDD_SPEC.md`: Certificación de testabilidad del rito ATDD. Dado que
    los roles se asumen de forma secuencial, el Arquitecto y el QA Lead firman en **Mesa de Consulta
    Acotada** (sello 🪑), según [`../multiAgents/protocols/CONSULTATION_BYPASS_PROTOCOL.md`](../multiAgents/protocols/CONSULTATION_BYPASS_PROTOCOL.md).
    Esa firma es **consultiva** y no aprueba la compuerta: la aprobación sigue siendo del Director Humano.
- **Acción del Agente al Terminar:**
  1. Actualizar `.workflow/current_state.json` con `gate_activo: "GATE_1_PRD_APPROVAL"`, `estado: "ESPERANDO_APROBACION_HUMANA"`.
  2. **DETENERSE INMEDIATAMENTE (Halt).** Presentar el resumen ejecutivo al Director Humano.
  3. **NO proceder** a diseñar tablas ni contratos hasta recibir la confirmación explícita del humano.

---

### 🛑 GATE 2: Aprobación de Arquitectura Relacional y Contratos de Datos
- **Agente Emisor:** `02_software_architect`
- **Agente Receptor:** `03_backend_engineer`
- **Aprobador Requerido:** **Director Humano**
- **Entregables Obligatorios:**
  - `docs/modules/[XX_modulo]/04_ARQUITECTURA_Y_CODIGO.md`: Modelo relacional y sentencias DDL.
  - `docs/contracts/[modulo].contract.ts`: Contratos de entrada y salida tipados estrictamente con schemas de **Zod**.
  - Matriz de permisos RBAC para los roles del sistema.
- **Acción del Agente al Terminar:**
  1. Actualizar `.workflow/current_state.json` con `gate_activo: "GATE_2_ARCHITECTURE_APPROVAL"`, `estado: "ESPERANDO_APROBACION_HUMANA"`.
  2. **DETENERSE INMEDIATAMENTE (Halt).** Presentar el modelo DDL y los contratos para revisión humana.
  3. **NO escribir código backend ni frontend** hasta recibir la confirmación explícita del humano.

---

### ⚡ FASE 3A: Implementación de Backend (Pase Continuo)
- **Agente Responsable:** `03_backend_engineer`
- **Entregables:** Controladores, servicios, rutas tipadas y validaciones Zod.
- **Barrera de Compilación:** Compilación estricta `npm run build` (`check:no-any && tsc`) en verde con **Tolerancia Cero al tipo `any`**.
- **Protocolo:** **Pase Continuo hacia Frontend.** El agente de backend NO se detiene a pedir aprobación humana intermedia; al terminar sus endpoints y verificar compilación y tests al 100%, transfiere directamente al Frontend Engineer.

---

### 🛑 GATE 3B: Aprobación de Diseño Web y Experiencia de Usuario (UI/UX)
- **Agente Emisor:** `04_frontend_engineer`
- **Agente Receptor:** `05_qa_security_tester`
- **Aprobador Requerido:** **Director Humano**
- **Entregables Obligatorios:**
  - Vistas y componentes en `frontend/src/modules/[XX_modulo]/` consumiendo el **Design System** (`docs/04_ui_design_system.md`).
  - Cero estilos o colores hardcodeados fuera del Design System oficial.
  - Formularios, modales interactivos y tablas reactivas con feedback visual (estados Loading, Empty, Error, Success).
  - Compilación limpia con `npm run build` (`check:no-any && typecheck && build`) con 0 errores y **0 usos de `any`**.
- **Acción del Agente al Terminar:**
  1. Actualizar `.workflow/current_state.json` con `gate_activo: "GATE_3B_FRONTEND_UI_APPROVAL"`, `estado: "ESPERANDO_APROBACION_HUMANA"`.
  2. **DETENERSE INMEDIATAMENTE (Halt).** Invitar al Director Humano a revisar y explorar el diseño visual, la usabilidad y los modales en su navegador.
  3. **NO avanzar a pruebas de QA** hasta que el Director Humano apruebe el diseño visual de la interfaz.

---

### 🛑 GATE 4: Certificación de Calidad, Commit Canónico y Release
- **Agente Emisor:** `05_qa_security_tester`
- **Agente Receptor:** `06_devops_release` / `00_orchestrator`
- **Aprobador Requerido:** **Director Humano**
- **Entregables Obligatorios:**
  - `docs/qa/[XX_modulo]/[vX.Y.Z]/QA_REPORT.md`: Auditoría forense con análisis RCA de cualquier defecto encontrado.
  - `walkthroughs/[XX_modulo]/[vX.Y.Z]/WALKTHROUGH.md`: Guía paso a paso de verificación reproducible.
  - Suite de pruebas automatizadas 100% en verde.
  - **Certificación AST de Cero ANY:** Verificación de `npm run check:no-any` en `backend/` y `frontend/` con 0 incidencias. Si se detecta un solo `any`, el QA Lead aplica **Veto Inmediato (Stop-the-Line)**.
  - Actualización de `CHANGELOG.md` respetando SemVer y `docs/VERSION_MATRIX.md`.
- **Acción del Agente al Terminar:**
  1. Actualizar `.workflow/current_state.json` con `gate_activo: "GATE_4_RELEASE_APPROVAL"`, `estado: "ESPERANDO_APROBACION_HUMANA"`.
  2. **DETENERSE INMEDIATAMENTE (Halt).** Presentar el veredicto final solicitando la firma Go / No-Go.
  3. Tras la aprobación humana, persistir en Git con la nomenclatura canónica `tipo(scope): descripcion` (sin prefijo de versión; ver [`../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md`](../../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md)) y sincronizar en `origin/main`.

---

## 4. Mandato Técnico para Modelos de Lenguaje (LLMs)

> ⚠️ **REGLA DIRECTA AL AGENTE:**  
> Al culminar los entregables de **Gate 1** (PRD), **Gate 2** (Arquitectura/DDL/Zod), **Gate 3B** (Frontend UI/UX) o **Gate 4** (QA/Release), **DEBES DETENER EL LLAMADO DE HERRAMIENTAS**. No encadenes la siguiente fase. Explica lo realizado, señala los aspectos visuales o arquitecturales a evaluar y espera la respuesta del usuario.
