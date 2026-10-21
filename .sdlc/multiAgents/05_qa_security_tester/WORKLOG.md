# 📝 WORKLOG — 05_QA_SECURITY_TESTER

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado con Arsenal de 4 Pilares (Vitest/Bruno, Playwright/axe-core, k6 stress y verificación AST Zero ANY) y mandato de Veto (Stop-the-Line).

---

## 2026-10-21 — M20 · Dictamen consultivo en mesa ATDD

**Rol:** QA Lead & Security Compliance · **Sello:** 🪑 Consultado en mesa (escenario C-1)

Convocado por `01_product_manager` para certificar la testabilidad de los 36 escenarios BDD de M20.
**Dictamen: CONFORME CON RESERVA**, con dos condiciones que haré valer en Gate 4:

1. **`RNF-SEG-01-01` (verificación en tiempo constante) no se certifica por medición.** Un test de
   latencia en CI es inestable y generaría falsos rojos. Lo certifico por **inspección** de que se
   emplea la primitiva de comparación en tiempo constante de la librería de hashing, y así constará
   en el RTM.

2. **`CA-SEG-03-05` no se contará como cubierto** mientras HU-SEG-04 siga aplazada. El Escenario 7 de
   HU-SEG-03 certifica la **emisión** al `AuditoriaPort`, no la **persistencia**. Declararlo cumplido
   violaría la Regla de Oro #8 (Transparencia Radical). **Exijo que el RTM de Gate 4 lo muestre
   explícitamente como `NO CUBIERTO — dependencia aplazada`**, nunca como omitido ni como pasado.

> Esta firma es **consultiva**. No he ejecutado la Fase 4 ni levantado veto alguno.

---

## 2026-10-21 — Dos reglas incorporadas tras la retrospectiva de M20

Registradas a petición del Director Humano, como retroalimentación del ciclo de M20. **No se auditó
M20**: su Gate 4 corresponde a otro agente, precisamente por la primera de estas reglas.

**1. Independencia del auditor** (`STAGE_GATES.md` §1.1 y `ROLE.md` §1.1). El agente que implementa
un módulo no puede auditarlo. En M20 esto se cumplió por circunstancia, no por norma: el mismo
agente escribió el backend y el frontend, y si Gate 4 no se hubiera diferido, habría acabado
auditando su propio código. La excepción exige autorización humana explícita y una declaración de
conflicto de interés al abrir el `QA_REPORT.md`.

**2. Diferir una compuerta exige un RFC** (`STAGE_GATES.md` §1.2 y `ROLE.md` §1.2). El Gate 4 de M20
se difirió con buen criterio —el módulo no podía ejercitarse sin el login de M04— pero la decisión
se tomó en prosa, sin artefacto trazable. Consecuencia concreta: la condición que este rol impuso en
la mesa ATDD sobre `CA-SEG-03-05` quedó solo en bitácoras, **sin matriz RTM que la sostuviera**.
Queda establecido que diferir la certificación **no exime de declarar la cobertura**.

> 📌 Para quien tome el Gate 4 de M20: `CA-SEG-03-05` debe figurar en el RTM como
> **`NO CUBIERTO — dependencia aplazada`**. El adaptador de auditoría emite al registro técnico, no
> persiste. Nunca como omitido ni como pasado.
