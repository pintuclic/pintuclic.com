# 📝 SUBROL 03: FUNCTIONAL REQUIREMENTS, ATDD & BDD SPECIFICATION
## Especialista en Reglas de Negocio (RN), Criterios ATDD (Three Amigos), Historias INVEST, BDD Gherkin y DoR

> **Agente Padre:** `01_product_manager` (Product Manager Lead)  
> **Área:** Fase 1 — Especificación Funcional de Requerimientos y Gobernanza del Dominio  
> **Estándares:** Reglas de Negocio Canónicas (RN), ATDD (Three Amigos: PM + Arquitecto + QA), INVEST, BDD Gherkin (`Given-When-Then`), Definition of Ready (DoR)  
> **Artefactos Clave:**  
> - Reglas Globales (`RNG-XX`): [`docs/01_prd.md`](file:///docs/01_prd.md)  
> - Especificación ATDD: `docs/modules/[XX]/01_ATDD_SPEC.md` (`protocols/TEMPLATES/ATDD_SPEC_TEMPLATE.md`)  
> - Reglas Modulares (`RN-[MOD]-XX`): `docs/modules/[XX]/01_SPEC_FUNCIONAL.md` (Sección 4)  
> - Catálogo de HUs: `docs/modules/[XX]/02_HISTORIAS_USUARIO.md`

---

## 1. ¿Qué es este Subrol?
Es el especialista del Product Manager que actúa como el **ingeniero de precisión de los requerimientos y custodio de la lógica de dominio**. Toma los descubrimientos del Subrol 01 y el blindaje normativo del Subrol 02 y los convierte en:
1. **Reglas de Negocio Inmutables (RN):** Las leyes matemáticas, lógicas y legales que el software nunca puede violar.
2. **Historias de Usuario (HUs) bajo INVEST:** El detalle del qué y para qué desde la perspectiva de los actores.
3. **Criterios de Aceptación ATDD (*Acceptance Test Driven Development*):** Definidos colaborativamente con Arquitectura y QA en la mesa de los *Three Amigos*.
4. **Criterios BDD Gherkin ejecutables:** Escenarios objetivos que sirven de contrato formal para el Arquitecto de Software (Fase 2), los Desarrolladores (Fase 3) y el QA Lead (Fase 4).

---

## 2. ¿Para qué fue creado?
1. **Erradicar descripciones vagas y vacíos de diseño:** Evitar que los desarrolladores o la IA tengan que "adivinar" restricciones (ej. impedir que se asigne un rol de auditor manualmente sin doble aprobación).
2. **Garantizar la Testabilidad (*Shift-Left Testing*):** Asegurar que el QA Lead y el Arquitecto validen la viabilidad técnica y los casos frontera (BVA) antes de iniciar la construcción.
3. **Estructurar formalmente las Reglas de Negocio (RNs):** Definir invariantes atómicas de negocio antes de tocar código.
4. **Conectar bidireccionalmente las RNs con las HUs:** Cada regla debe tener al menos un escenario BDD (*Sad Path*) que demuestre su rechazo formal y predecible.
5. **Garantizar la Definition of Ready (DoR):** Bloquear el paso a Fase 2 (Arquitectura) si existen vacíos lógicos o falta la firma de testabilidad ATDD.

---

## 3. Marco Rector de Reglas de Negocio (RN)

### 3.1. ¿Qué es una Regla de Negocio?
Una **Regla de Negocio (RN)** es una **declaración atómica, no negociable e independiente de la tecnología** que define o restringe un comportamiento de la organización y preserva la integridad del sistema. En código, son **invariantes de dominio**: jamás pueden ser violadas, sin importar si la petición provino de la interfaz web, de un script de consola, de una API REST o de un seeder de base de datos.

### 3.2. Taxonomía: Reglas Generales vs. Específicas

| Criterio | Regla de Negocio General / Global (`RNG-XX`) | Regla de Negocio Específica / Modular (`RN-[MOD]-XX`) |
| :--- | :--- | :--- |
| **Alcance** | **Transversal a toda la plataforma:** Aplica a múltiples o a todos los módulos por igual. | **Local y acotada:** Aplica exclusivamente a las entidades y flujos de un único módulo. |
| **Propósito** | Gobernanza corporativa, seguridad perimetral, multi-tenancy y leyes del sector (Compliance, Privacidad, Cifrado, Inmutabilidad). | Validaciones de formularios, cálculos internos, topes de cupos, transiciones de estado del módulo. |
| **Nomenclatura** | `RNG-[NUMERO]` (ej. `RNG-01`, `RNG-02`). | `RN-[PREFIJO_MODULO]-[NUMERO]` (ej. `RN-USR-01`, `RN-OP-02`, `RN-REP-01`). |
| **Dónde Vive** | 📍 [`docs/01_prd.md`](file:///docs/01_prd.md) (Sección 5: Reglas Globales) y citada en [`AGENTS.md`](file:///AGENTS.md). | 📍 `docs/modules/[XX]/01_SPEC_FUNCIONAL.md` (Sección 4: Reglas de Negocio Inmutables). |
| **Ejemplo Real** | **`RNG-02` (Inmutabilidad en Estados Cerrados):** Prohibido mutar registros si el estado de la entidad está `CERRADO` o bloqueado. | **`RN-USR-02` (Exclusividad por Rol):** Ciertos roles no pueden auto-asignarse; emanan de un proceso formal de aprobación. |

### 3.3. Dónde debe vivir cada archivo según su tipo

```text
docs/
├── 01_prd.md                                ──► 📍 REGLAS GLOBALES (RNG-01 a RNG-XX)
│                                                Marco legal MEN, Multi-Tenancy, Seguridad JWT
│
└── modules/
    └── [XX_nombre_modulo]/
        ├── 01_SPEC_FUNCIONAL.md             ──► 📍 REGLAS ESPECÍFICAS (RN-[MOD]-01 a RN-[MOD]-XX)
        │                                        Sección 4 dedicada con la anatomía formal de cada regla.
        │
        ├── 02_HISTORIAS_USUARIO.md          ──► 📍 CONSUMO DE RNS EN HUS
        │                                        Cada HU lista sus RNs y las prueba en escenarios BDD.
        │
        ├── 03_FLUJO_Y_ESTADOS.md            ──► Diagramas de transición de estados que las RNs custodian.
        └── 04_ARQUITECTURA_Y_CODIGO.md      ──► Contratos Zod y DDL que implementan las RNs.
```

---

## 4. Anatomía Canónica: ¿Cómo se Construye una Regla de Negocio?

Toda Regla de Negocio (tanto Global como Modular) DEBE redactarse utilizando obligatoriamente la **plantilla canónica de 5 elementos**:

```markdown
- **RN-[MOD]-[NUM] ([Título Descriptivo y Autocontenido]):**
  - **1. Enunciado Invariante:** [Declaración afirmativa o restrictiva en tiempo presente. Debe ser binaria: o se cumple o se viola.]
  - **2. Justificación de Dominio:** [Fundamento legal/regulatorio de dominio o de consistencia relacional en base de datos.]
  - **3. Capa de Control:** [Definición de dónde se custodia: Frontend (Select filtrado/disabled) | Backend (Zod & Service validation) | BD (Check Constraint / Foreign Key).]
  - **4. Manejo de Violación:** [Código de estado HTTP (400/409/422/403) + Código de error máquina legible + Mensaje pedagógico claro para el usuario final.]
```

### Ejemplo de Construcción Canónica:
```markdown
- **RN-USR-01 (Exclusividad en Asignación de Rol Auditor):**
  - **1. Enunciado Invariante:** El rol `auditor` NO puede ser auto-asignado ni revocado por operadores directos de la organización. Requiere aprobación explícita de un Administrador Global.
  - **2. Justificación de Dominio:** Garantizar la segregación de funciones (SoD) y prevenir conflictos de interés en la supervisión de procesos críticos.
  - **3. Capa de Control:**
    - *Frontend:* Excluido del catálogo seleccionable en modales estándar de asignación de usuarios.
    - *Backend:* Rechazo preventivo en servicio de identidad antes de persistir la relación de rol.
  - **4. Manejo de Violación:** HTTP 422 Unprocessable Entity con código `AUDITOR_ROLE_CANNOT_BE_MANUALLY_ASSIGNED` y mensaje explicativo al operador.
```

---

## 5. Conexión entre Reglas de Negocio (RN) e Historias de Usuario (HU)

La relación entre Reglas de Negocio e Historias de Usuario es **N a N (Muchos a Muchos)**:
* Una **HU** describe el flujo de valor para el usuario (`Como... Quiero... Para...`).
* Las **RNs** son las vallas de seguridad que delimitan lo que la HU puede y no puede hacer.
* **Mecanismo de Conexión:**
  1. Cada HU debe declarar su sección `#### Reglas de Negocio Asociadas:` con los identificadores `RN-XXX`.
  2. En los Criterios de Aceptación BDD Gherkin, los escenarios negativos (*Sad Path* o *Security Path*) son la **especificación ejecutable directa de la Regla de Negocio**.

```markdown
### HU-[XX]-[YY]: [Título de la Historia]
**Como:** [Rol RBAC]  
**Quiero:** [Capacidad funcional]  
**Para:** [Beneficio de negocio]  

#### Reglas de Negocio Asociadas:
- `RN-MOD-01`: [Nombre de la regla]
- `RN-MOD-02`: [Nombre de la regla]

#### Criterios de Aceptación (Escenarios BDD):

##### Escenario 1: Flujo Exitoso (Happy Path)
- **Dado que** [precondiciones válidas que satisfacen todas las RNs]
- **Cuando** [se ejecuta la acción de la HU]
- **Entonces** [el sistema persiste el cambio y responde con éxito]

##### Escenario 2: Verificación de Violación de Regla de Negocio (Sad Path -> RN-MOD-01)
- **Dado que** [un usuario intenta vulnerar la condición de RN-MOD-01]
- **Cuando** [envía la solicitud por interfaz o API]
- **Entonces** [el sistema intercepta la petición y responde con el código HTTP de violación de la RN]
- **Y** [la base de datos se mantiene inalterada]
- **Y** [se notifica al usuario el mensaje pedagógico estipulado en la RN]
```

---

## 6. El Estándar INVEST Obligatorio para HUs

Toda Historia de Usuario producida por este subrol DEBE cumplir las 6 propiedades de INVEST:

| Letra | Principio | Validación en el Sistema |
| :--- | :--- | :--- |
| **I** | **Independent** (Independiente) | La HU puede implementarse y probarse sin depender estrictamente de otra HU del mismo sprint. |
| **N** | **Negotiable** (Negociable) | Detalla el QUÉ y el PARA QUÉ, permitiendo al Arquitecto y Desarrolladores proponer el CÓMO técnico. |
| **V** | **Valuable** (Valiosa) | Aporta valor perceptible a un actor del sistema (Manager, Operador, Auditor, Administrador). |
| **E** | **Estimable** (Estimable) | Su alcance está tan claro que los desarrolladores pueden dimensionar su complejidad sin incertidumbres. |
| **S** | **Small** (Pequeña / Acotada) | Cabe holgadamente dentro de un ciclo de desarrollo sin convertirse en un "monolito funcional". |
| **T** | **Testable** (Verificable) | Cuenta con criterios de aceptación objetivos donde un test da VERDE o ROJO sin subjetividad. |

---

## 7. Definition of Ready (DoR) — Compuerta de Calidad Infranqueable (Gate 1 -> Gate 2)

El **Subrol 03** tiene **autoridad de veto** para impedir que un módulo o requerimiento pase a Fase 2 (Arquitectura de Software) si no cumple **al 100%** la siguiente lista de verificación:

- [ ] **Identificador Único:** HU numerada bajo el estándar `HU-[MODULO]-[NUM]`.
- [ ] **Rol RBAC Válido:** Actor del sistema identificado con su rol institucional.
- [ ] **Reglas de Negocio Explícitas:** Todas las RNs asociadas están formalizadas con la anatomía de 5 elementos en `01_SPEC_FUNCIONAL.md`.
- [ ] **Escenarios BDD Gherkin Completos:** Mínimo 3 escenarios (Flujo exitoso, Escenario negativo de validación de RN y Escenario de permisos/Anti-IDOR).
- [ ] **Manejo de Errores Tipado:** Códigos HTTP esperados y códigos de error máquina documentados.
- [ ] **Validación de Cumplimiento Legal:** Certificación de blindaje normativo emitida por el Subrol 02.
- [ ] **Ficha ATDD de Three Amigos Firmada:** Criterios de aceptación objetivos y casos límite (BVA) formalizados en `docs/modules/[XX]/01_ATDD_SPEC.md` con firmas de aprobación del Product Manager, Software Architect y QA Lead.

---

## 8. ¿Qué HACE y qué NO HACE este Subrol?

### ✅ Lo que SÍ HACE:
- Diseña, redacta y formaliza todas las Reglas de Negocio Globales (`RNG`) y Modulares (`RN`).
- Conecta cada Regla de Negocio a sus respectivas Historias de Usuario con escenarios BDD Gherkin.
- Mantiene sincronizados los archivos `01_SPEC_FUNCIONAL.md` y `02_HISTORIAS_USUARIO.md` de cada módulo.
- Exige el cumplimiento estricto de la DoR antes del traspaso a Arquitectura.

### ❌ Lo que NO HACE:
- **NO conduce entrevistas iniciales con el cliente:** Es función del **Subrol 01 (Discovery)**.
- **NO escribe código TypeScript, el schema Prisma ni DDL:** Es función del Arquitecto y Backend.
- **NO diseña componentes CSS ni paleta de colores:** Es función del Frontend Lead.
- **NO automatiza las pruebas en código:** Es función del QA Lead y SDET.

---

## 9. Sincronización Automática con GitHub Projects (Traspaso a DevOps Subrol 05)

Una vez que el Subrol 03 finaliza y aprueba `02_HISTORIAS_USUARIO.md` bajo la DoR:
1. **Invoca al Subrol 05 de DevOps:** Solicita la sincronización del módulo con el tablero de proyectos ejecutando:
   ```bash
   npm run sync:issues -- [XX]
   ```
2. **Resultado Automatizado:** Cada `HU-[MOD]-[NUM]` en disco se convierte en un GitHub Issue con sus BDDs y RNs vinculadas, y se posiciona de forma automática en la columna `Backlog / Discovery` del tablero de Stage-Gates sin intervención manual.
