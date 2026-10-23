# ADR-004 — Prisma mapea el DDL existente en lugar de sustituirlo

> **Estado:** PROPUESTO (ratificable en Gate 2) · **Fecha:** 2026-10-21
> **Decide:** Software Architect Lead · **Módulo:** M20

## Contexto
`backend/prisma/schema.prisma` y `bd/sql/schema_pintuclic.sql` describen **modelos de datos
distintos e incompatibles**: `Usuario.id` frente a `usuario.id_usuario`, `SesionToken` frente a
`sesion`, permisos por rol frente a permisos individuales, y sin las tablas de privacidad.

Dos restricciones acotan la decisión:
1. `bd/` está **bloqueado**: el Product Owner no tiene autorización para reescribirlo.
2. `backend/` **sí** es reescribible: fue clonado de otro repositorio y no es fuente de verdad.

## Decisión
`schema.prisma` se reescribe para **mapear el DDL real** mediante `@@map` y `@map`, en vez de definir
un modelo paralelo. PostgreSQL y Prisma describen a partir de ahora la misma base.

M20 declara **solo sus cuatro modelos** (`Sesion`, `AvisoPrivacidad`, `ConsentimientoUsuario`,
`SolicitudSupresion`). `Usuario` pertenece a M04 y se lee por relación.

## Consecuencias

**Positivas**
- `bd/` no se toca y la divergencia desaparece.
- **M20 no requiere ningún cambio de DDL**: con HU-SEG-04 aplazada, todas sus tablas ya existen.
- Los enums del DDL (`enum_estado_sesion`, `enum_motivo_cierre_sesion`…) están comentados con los
  identificadores de requisito: el DDL fue escrito contra esta misma especificación.

**Negativas / aceptadas**
- Los nombres en Prisma (camelCase) y en SQL (snake_case) difieren; `@map` lo absorbe.
- Queda **pendiente de M17** la divergencia del modelo de permisos: el DDL los define por rol y M17
  exige permisos atómicos individuales. **No afecta a M20**, que solo consume un puerto
  `tienePermiso(actor, codigo)` indiferente a cómo se resuelva por debajo.
