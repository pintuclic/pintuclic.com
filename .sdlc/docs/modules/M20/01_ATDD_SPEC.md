# 🤝 01_ATDD_SPEC — M20. Mesa Three Amigos y Certificación de Testabilidad

> **Módulo:** `M20` · **Scope:** `m20-seguridad`
> **Convoca:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estado:** PM firmado · **Arquitecto y QA pendientes** (firman en sus turnos, Gate 2 y Gate 4)

---

## 1. Propósito

La Definition of Ready del Product Manager (`ROLE.md` §5) exige que los 36 escenarios BDD de
[`02_HISTORIAS_USUARIO.md`](02_HISTORIAS_USUARIO.md) sean **verificables antes de escribir código**.
Esta ficha registra el análisis de testabilidad del PM y deja constancia de qué necesita cada
escenario para poder automatizarse.

> ⚠️ **Limitación declarada:** en este ciclo los roles se asumen **secuencialmente**, no en paralelo.
> El PM no puede firmar por el Arquitecto ni por el QA Lead. Sus firmas se recogen cuando esos roles
> tomen su turno. El Director Humano decide en Gate 1 si esto satisface la mesa ATDD o si exige
> convocarla de forma explícita antes de Gate 2.

---

## 2. Matriz de Testabilidad por Historia

| HU | Escenarios | Observable automatizable | Pilar QA que lo cubre |
| :--- | :---: | :--- | :--- |
| **HU-SEG-01** | 7 | Valor almacenado ≠ texto claro; dos sales distintas; ausencia de la credencial en respuesta y en logs; conteo de sesiones tras el cambio | Pilar 1 (SDET/Vitest) |
| **HU-SEG-02** | 8 | Estado y `motivo_cierre` de la sesión; avance de `fecha_ultimo_acceso`; código de respuesta tras la ventana; atributos de la cookie | Pilar 1 + Pilar 2 (E2E) |
| **HU-SEG-03** | 7 | **Igualdad byte a byte** entre la respuesta de recurso inexistente y la de recurso ajeno; rechazo sin re-autenticar tras retirar permiso | Pilar 1 + Pilar 4 (Anti-IDOR) |
| **HU-SEG-05** | 7 | Registro bloqueado sin consentimiento; fecha y versión persistidas; estado de la solicitud; desvinculación de identidad | Pilar 1 |
| **HU-SEG-06** | 7 | Ausencia de claves prohibidas en el payload; igualdad de respuestas en recuperación; ausencia de rutas y versiones en el mensaje de error | Pilar 1 + Pilar 4 (AST) |

---

## 3. Escenarios que exigen un observable especial

Estos cuatro **no se verifican con una aserción trivial** y se señalan para que el Arquitecto los
contemple en el contrato Zod y el QA Lead diseñe el arnés:

1. **`CA-SEG-03-06` — Indistinguibilidad.** No basta con que ambas respondan `404`: deben coincidir
   en **código, cuerpo y cabeceras**. Requiere un test que compare las dos respuestas entre sí, no
   contra un valor esperado.

2. **`RNF-SEG-01-01` — Tiempo constante.** No es observable con una aserción funcional. Se verifica
   con un test estadístico de latencia entre usuario existente e inexistente, o delegando en la
   garantía de la primitiva de comparación. **El PM propone lo segundo** y que QA lo certifique por
   inspección, no por medición.

3. **`CA-SEG-02-05` — Permiso retirado en caliente.** Exige que el arnés modifique el permiso **con
   la sesión viva** y que la siguiente petición lo refleje sin re-autenticar. Es la prueba de que los
   permisos no se cachean en el token.

4. **`CA-SEG-05-05` — Desvinculación de identidad.** Requiere definir qué significa "desvinculado" de
   forma comprobable: el PM propone que la orden conserve sus importes y fechas pero que **ningún
   campo permita remontar al titular**, verificable consultando la orden tras la supresión.

---

## 4. Escenario explícitamente NO certificable en esta entrega

| Criterio | Motivo |
| :--- | :--- |
| **`CA-SEG-03-05`** — *"queda registrado el usuario, la operación intentada y la fecha"* | Exige persistencia de auditoría. HU-SEG-04 está aplazada por el Product Owner. El Escenario 7 de HU-SEG-03 certifica la **emisión** al puerto; la **persistencia** no se declara cumplida |

> QA Lead: este criterio **no debe contarse como cubierto** en la matriz RTM de Gate 4 mientras
> HU-SEG-04 siga aplazada. Declararlo cumplido violaría la Regla de Oro #8 (Transparencia Radical).

---

## 5. Definición de "Hecho" acordada para M20

Un escenario se considera cumplido cuando:
1. Existe una prueba automatizada que lo ejerce de punta a punta.
2. La prueba **falla** si se revierte la implementación (probado, no asumido).
3. No introduce ningún `any` (Regla de Oro #11; `npm run check:no-any` en verde).
4. El comportamiento observado coincide con la rama correspondiente del diagrama contractual.

---

## 6. Firmas

| Rol | Responsable | Estado | Fecha |
| :--- | :--- | :--- | :--- |
| **Product Manager Lead** | Fase 1 | ✅ Firmado | 2026-10-21 |
| **Software Architect Lead** | Fase 2 | ⏳ Pendiente — firma al emitir los contratos Zod en Gate 2 | — |
| **QA Lead & Security** | Fase 4 | ⏳ Pendiente — firma al construir el arnés en Gate 4 | — |
| **Director Humano** | Gate 1 | ⏳ Pendiente | — |
