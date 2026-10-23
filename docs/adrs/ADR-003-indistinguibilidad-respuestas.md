# ADR-003 — Respuesta única e indistinguible ante recurso ajeno o inexistente

> **Estado:** PROPUESTO (ratificable en Gate 2) · **Fecha:** 2026-10-21
> **Decide:** Software Architect Lead · **Módulo:** M20

## Contexto
`RF-SEG-03-05` y `CA-SEG-03-06` exigen que un recurso inexistente y un recurso existente pero ajeno
produzcan respuestas **indistinguibles**. Si difieren en algo —código, cuerpo, cabecera o incluso el
orden de las claves del JSON— un atacante puede **enumerar recursos ajenos** preguntando uno por uno:
el `403` confirma que existe.

En la mesa ATDD el Arquitecto señaló el riesgo real: dos ramas distintas de código que *hoy*
devuelven lo mismo **divergen con el tiempo**, cuando alguien añade un detalle a una sola de ellas.

## Decisión
No se construyen dos respuestas equivalentes: se construye **una sola**, exportada como constante
congelada en el contrato, y **ambas ramas devuelven ese mismo objeto** con HTTP `404`.

```typescript
export const RESPUESTA_RECURSO_NO_DISPONIBLE: ErrorResponseEnvelope = {
  success: false,
  error: { code: 'RECURSO_NO_DISPONIBLE', message: 'El recurso solicitado no está disponible.', details: null },
};
```

Se elige `404` y no `403` porque `403` ya admite la existencia del recurso.

## Consecuencias

**Positivas**
- La indistinguibilidad es **estructural**, no una coincidencia que haya que vigilar en revisión.
- El test de `CA-SEG-03-06` compara ambas respuestas **entre sí**, no contra un valor esperado.

**Negativas / aceptadas**
- Se pierde el matiz diagnóstico entre "no existe" y "no te pertenece". Es el precio de no permitir
  enumeración, y la especificación lo pide de forma expresa.
- El detalle real **sí** queda en el registro técnico interno (`RF-SEG-06-07`), donde no lo ve el cliente.
