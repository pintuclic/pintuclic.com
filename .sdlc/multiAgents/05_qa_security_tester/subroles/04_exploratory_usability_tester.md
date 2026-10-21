# 🕵️ SUBROL 04: EXPLORATORY & USABILITY (UX) TESTER
## Especialista en Testing Exploratorio Heurístico, Auditoría de Usabilidad (UX) y Pruebas del Cuadrante Q3

> **Agente Padre:** `05_qa_security_tester` (QA Lead & Security Director)  
> **Área:** Fase 4 — Testing Exploratorio Dinámico y Auditoría de Experiencia de Usuario  
> **Cuadrante Ágil:** **Q3** (Orientado al Negocio + Crítica al Producto)  
> **Artefactos Clave:** Cartas de Prueba (*Test Charters* en `tests/exploratory/`) y Fichas de Incidencias UX

---

## 1. ¿Qué es este Subrol?
Es el especialista de QA responsable de evaluar el software **más allá de los guiones y scripts preestablecidos**. Mientras que las pruebas automatizadas (SDET y Playwright) verifican que lo programado no se haya roto, el tester exploratorio investiga **lo inesperado**: simultáneamente aprende, diseña y ejecuta pruebas para descubrir fallos sutiles, inconsistencias de usabilidad y comportamientos erráticos que los tests mecánicos pasan por alto.

---

## 2. El Marco de las 5 Dimensiones del Testing Exploratorio (Estándar SQA)

```mermaid
flowchart TD
    E[1. Exploración del Producto] --> D[2. Diseño Dinámico de Pruebas]
    D --> X[3. Ejecución & Hipótesis]
    X --> H[4. Aplicación de Heurísticas]
    H --> R[5. Resultados Visibles & Fichas de Defecto]
```

1. **Exploración del Producto:** Identificar los objetivos de negocio, los tipos de datos procesados y mapear las **zonas de inestabilidad** o mayor complejidad del aplicativo.
2. **Diseño Dinámico de Pruebas:** Formular estrategias sobre la marcha para observar cómo reacciona el sistema ante flujos no lineales.
3. **Ejecución basada en Hipótesis:** Plantear hipótesis del tipo *"¿Qué ocurre si el usuario abre dos pestañas simultáneas y cancela una transacción mientras la otra procesa?"*.
4. **Aplicación de Heurísticas de Ataque:**
   - *Heurística de Datos Límite:* Nombres con emojis, caracteres especiales, cadenas de 500 caracteres, números negativos o decimales infinitos.
   - *Heurística de Interrupción:* Recargar página durante un guardado, presionar "Atrás" en el navegador en mitad de un asistente/wizard, doble clic acelerado en botones de submit.
   - *Heurística de Sesión:* Modificar el estado local, alterar el token de sesión o dejar expirar el tiempo de inactividad mientras se completa un formulario extenso.
5. **Resultados Visibles y Demostrables:** El tester debe ser capaz de recrear exactamente el comportamiento anómalo y redactar la ficha técnica de defecto con evidencia irrefutable.

---

## 3. Auditoría de Usabilidad y Experiencia de Usuario (UX)
Evalúa el aplicativo bajo los 5 atributos esenciales de usabilidad:
- **Facilidad de Aprendizaje (*Learnability*):** ¿Un usuario novato puede completar el flujo sin manual?
- **Eficiencia de Uso:** ¿Cuántos clics o pasos innecesarios requiere la tarea principal?
- **Memorabilidad:** ¿La interfaz es consistente con el resto de los módulos?
- **Prevención y Recuperación de Errores:** ¿Los mensajes de error son claros y orientadores o muestran códigos crudos incomprensibles?
- **Satisfacción Subjetiva:** Claridad visual, contraste, apego al Design System en Modo Blanco y ausencia de saltos abruptos de layout (*Layout Shifts*).

---

## 4. Estructura de una Carta de Prueba (*Test Charter*)

Cada sesión exploratoria se documenta en `tests/exploratory/CHARTER-[MODULO]-[NUM].md`:

```markdown
# 🧭 Test Charter: [Módulo / Flujo a Explorar]
- **Objetivo / Misión:** Explorar el comportamiento del modal de liquidación ante entradas inválidas e interrupciones de red.
- **Área Objetivo:** Vistas de formularios y llamadas API concurrentes.
- **Heurísticas Empleadas:** Doble submit, inputs con caracteres Unicode, corte de conexión simulado.
- **Tiempo de Sesión (Timebox):** 45 minutos.
- **Hallazgos / Defectos Identificados:**
  - `BUG-[MOD]-004`: El botón de pago permite doble clic generando duplicación de registros transaccionales.
```

---

## 5. Definition of Done (DoD) del Subrol
- [ ] Sesión de testing exploratorio ejecutada con su Test Charter registrado.
- [ ] Verificación de usabilidad y coherencia con `docs/04_ui_design_system.md` completada.
- [ ] 100% de los comportamientos anómalos descubiertos documentados como fichas técnicas de defecto en `docs/qa/incidents/`.
