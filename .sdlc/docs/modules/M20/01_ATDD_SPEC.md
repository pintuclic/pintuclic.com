# 🤝 01_ATDD_SPEC — M20. Mesa Three Amigos y Certificación de Testabilidad

> **Módulo:** `M20` · **Scope:** `m20-seguridad`
> **Convoca:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estado:** ✅ Mesa cerrada conforme — PM firmado en turno · Arquitecto y QA consultados en mesa
> **Protocolo aplicado:** [`CONSULTATION_BYPASS_PROTOCOL.md`](../../../multiAgents/protocols/CONSULTATION_BYPASS_PROTOCOL.md) · escenario **C-1**

---

## 1. Propósito

La Definition of Ready del Product Manager (`ROLE.md` §5) exige que los 36 escenarios BDD de
[`02_HISTORIAS_USUARIO.md`](02_HISTORIAS_USUARIO.md) sean **verificables antes de escribir código**.
Esta ficha registra el análisis de testabilidad del PM y deja constancia de qué necesita cada
escenario para poder automatizarse.

> 🪑 **Mesa de Consulta Acotada (escenario C-1).** Los roles de este SDLC se asumen de forma
> secuencial, de modo que ni el Arquitecto ni el QA Lead han tomado turno todavía. El Director Humano
> autorizó el bypass y se incorporó al protocolo rector. Sus firmas abajo llevan sello 🪑
> **consultivo**: no sustituyen la ejecución de sus fases ni aprueban compuerta alguna.

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

| Rol | Sello | Dictamen | Fecha |
| :--- | :--- | :--- | :--- |
| **Product Manager Lead** | ✅ Firmado en turno propio | Responde por los 36 escenarios | 2026-10-21 |
| **Software Architect Lead** | 🪑 Consultado en mesa | CONFORME CON RESERVA — 4 observables asumidos para Gate 2 | 2026-10-21 |
| **QA Lead & Security** | 🪑 Consultado en mesa | CONFORME CON RESERVA — 2 condiciones para Gate 4 | 2026-10-21 |
| **Director Humano** | 🖊️ Firma de compuerta | Gate 1 aprobado · turno al Arquitecto | 2026-10-21 |

> 🪑 Las firmas consultivas **no eximen** al Arquitecto ni al QA de ejecutar su fase y firmar ✅
> cuando les llegue el turno (§5 del protocolo de bypass).
---

## 7. Acta de la Mesa

### 🪑 Acta de Mesa de Consulta Acotada
- **Escenario:** C-1 — Rito ATDD / Three Amigos
- **Convoca:** `01_product_manager` · **Fecha:** 2026-10-21 · **Módulo:** M20
- **Pregunta acotada:** *¿Son los 36 escenarios BDD de `02_HISTORIAS_USUARIO.md` verificables
  mediante prueba automatizada antes de que exista implementación, y hay alguno cuyo observable
  no esté definido con precisión suficiente para construir el arnés?*
- **Convocados:** `02_software_architect`, `05_qa_security_tester`

- **Dictámenes:**

  - 🪑 **`02_software_architect`** — Los 36 escenarios son expresables como contrato. Cuatro exigen
    que el contrato Zod y el modelo los hagan observables, y los asumo en Gate 2: la
    **indistinguibilidad** de `CA-SEG-03-06` obliga a que el envelope de error de `404` y el de
    autorización denegada sean **el mismo objeto**, no dos ramas que casualmente coincidan; el estado
    y el `motivo_cierre` de la sesión deben ser campos persistidos y no derivados, o el Escenario 4
    de HU-SEG-02 no es comprobable; la **desvinculación de identidad** de `CA-SEG-05-05` necesita
    definirse como invariante sobre el modelo; y los atributos de la cookie deben fijarse en el
    contrato para que el Escenario 8 de HU-SEG-02 sea aserción y no inspección manual.
    → **CONFORME CON RESERVA** (las cuatro reservas se resuelven en los entregables de Gate 2).

  - 🪑 **`05_qa_security_tester`** — Acepto el arnés propuesto con dos condiciones, que haré valer en
    Gate 4. Primera: `RNF-SEG-01-01` (tiempo constante) **no se certifica por medición** —un test de
    latencia en CI es inestable y produciría falsos rojos—; lo certifico por inspección de que se usa
    la primitiva de comparación en tiempo constante de la librería de hashing, y así quedará en el
    RTM. Segunda, y es la que me importa: **`CA-SEG-03-05` no se contará como cubierto** mientras
    HU-SEG-04 siga aplazada. El Escenario 7 de HU-SEG-03 certifica la emisión al puerto, no la
    persistencia; declararlo cumplido violaría la Regla de Oro #8. Exijo que el RTM de Gate 4 lo
    muestre explícitamente como **NO CUBIERTO — dependencia aplazada**, no como omitido.
    → **CONFORME CON RESERVA**.

- **Resultado:** la mesa **se cierra conforme**. Ningún dictamen revela un bloqueo que impida pasar a
  Gate 2; ambas reservas son compromisos verificables en fases posteriores. No se abre Feedback Loop.
- **Alcance de la firma:** consultiva. No aprueba Stage-Gate alguno.

