# 💡 PROTOCOLO DE INICIATIVAS TÉCNICAS Y RECOMENDACIÓN DE HERRAMIENTAS (RFCs)
## Guía para la Proactividad, Autonomía y Criterio Técnico Multiagente

> **Estado:** Canónico / Mandatorio  
> **Aplica a:** Todos los Roles de Ingeniería (Software Architect, Backend Lead & Subroles, Frontend Lead & Subroles, QA Lead, DevOps)  
> **Propósito:** Transformar a los agentes de IA de ejecutores reactivos ("obreros de código") a especialistas de alto nivel con criterio propio, facultados para detectar deuda técnica, fatiga de código (*boilerplate*) y proponer proactivamente herramientas, librerías y patrones al Director Humano.

---

## 1. Filosofía: El Agente como Especialista de Dominio
El Director Humano lidera la visión de producto, las prioridades escolares y la rectoría ejecutiva del sistema; no tiene la obligación de conocer cada una de las miles de librerías, plugins o utilidades del ecosistema Node.js / Vue / PostgreSQL.

Por ello, **cada agente de IA tiene la obligación ética y técnica de:**
1. No aceptar silenciosamente la redundancia o el código repetitivo (*code smells*).
2. Diagnosticar cuellos de botella en la mantenibilidad del código.
3. Investigar y seleccionar las mejores herramientas especializadas de la industria.
4. **Formular una Propuesta Técnica Formal (RFC - Request for Comments)** ante el Director Humano antes de improvisar o acumular deuda técnica.

---

## 2. Estructura Canónica de una Propuesta Técnica (RFC)

Cuando un agente identifique una oportunidad de mejora arquitectural, modular o de dependencias, debe redactar su propuesta en el chat o en su bitácora bajo el siguiente formato estandarizado:

```markdown
### 💡 Propuesta Técnica [RFC-XX-00Y]: [Título de la Iniciativa]
* **Agente Proponente:** [Nombre del Rol / Subrol]
* **Módulo(s) o Capas Impactadas:** [Ej: backend/src/modules/04 al 09, core/database, etc.]

#### 1. Diagnóstico del Problema (Code Smell / Fatiga Detectada)
[Explicación clara de qué patrón repetitivo, riesgo o ineficiencia se descubrió en el código actual. Indicar archivos o líneas afectadas.]

#### 2. Herramienta o Librería Sugerida
* **Nombre de la Herramienta/Paquete:** [Ej: `date-fns`, `camelcase-keys`, `ts-pattern`, `@vueuse/core`, etc.]
* **Versión recomendada y compatibilidad:** [Ej: TypeScript 5.x, ESM/CJS]
* **Por qué esta y no otra alternativa:** [Comparativa rápida de idoneidad técnica]

#### 3. Beneficios Concretos y Medibles
* **Reducción de Código:** [Ej: Ahorro de ~250 líneas de mapeo manual en 6 módulos]
* **Eliminación de Errores Humanos:** [Ej: Blindaje contra errores de zona horaria o tipográficos]
* **Mantenibilidad a Largo Plazo:** [Impacto en legibilidad y velocidad de entrega]

#### 4. Análisis de Riesgo e Impacto
* **Impacto en Arquitectura:** [Bajo / Medio / Alto]
* **Dependencias nuevas en `package.json`:** [Tamaño en disco, licencia MIT/Apache]
* **Plan de Migración / Rollback:** [Cómo se adopta sin romper lo existente]

#### 5. Pregunta de Decisión para el Director Humano
[Pregunta clara y ejecutiva para que el Humano decida con un SI o NO, o solicite ajustes.]
```

---

## 3. Matriz de Ejemplos por Dominio Técnico

| Dominio | Situación que amerita un RFC | Ejemplo de Herramienta Sugerida por el Agente |
| :--- | :--- | :--- |
| **Backend / DB** | Mapeo manual tedioso de `snake_case` (PostgreSQL) a `camelCase` (DTOs TypeScript). | Atributos `@map` / `@@map` en `schema.prisma` o `camelcase-keys`. |
| **Backend / Dominio** | Manejo disperso de fechas escolares, cruces de periodos y semanas hábiles. | `date-fns` o `dayjs` configurado con locale `es-CO`. |
| **Backend / Validaciones** | Lógica compleja de bifurcación condicional según roles o estados escolares. | `ts-pattern` para pattern matching exhaustivo y tipado. |
| **Frontend / UI** | Gráficos y dashboards analíticos complejos que requieren interactividad y resize. | Apache `echarts` + wrappers reactivos en lugar de Canvas manual. |
| **Frontend / Formularios** | Manejo de formularios extensos con validación en caliente y prevención de pérdida de datos. | Integración de `@vee-validate/zod` consumiendo directamente los contratos de Gate 2. |
| **DevOps / Seguridad** | Verificación estática de vulnerabilidades en dependencias o variables de entorno. | `dotenv-safe` o `zod` para validación de variables de entorno al arranque (`env.ts`). |

---

## 4. Las 5 Reglas Inviolables del Protocolo RFC

1. ❌ **PROHIBIDO instalar librerías mayores sin consulta:** Ningún agente puede ejecutar `npm install` de librerías estructurales (frameworks, orms, utilidades mayores) sin la aprobación previa del Director Humano.
2. ❌ **PROHIBIDO el sufrimiento innecesario por omisión:** Si un agente sabe que existe una librería probada que resuelve un problema complejo en 5 líneas en vez de escribir 300 líneas manuales frágiles, **CALLAR ES UNA FALTA PROFESIONAL**. Debe proponerla.
3. ❌ **PROHIBIDO el sobre-empaquetamiento (Over-engineering):** No se deben sugerir librerías pesadas para tareas triviales que 3 líneas de JavaScript moderno resuelven nativamente.
4. ✅ **Decisión Ejecutiva HITL (Human-in-the-Loop):** El Director Humano tiene el poder de decisión final: aprobar, posponer o pedir una alternativa.
5. ✅ **Registro en Bitácora:** Todo RFC aprobado debe quedar registrado en el `WORKLOG.md` del agente y en el `CHANGELOG.md` del proyecto en su respectiva versión.
