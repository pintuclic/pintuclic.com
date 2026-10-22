# ADR-010 — Modelo de cuentas empresa y almacenamiento de documentos soporte sobre DDL

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M04

## Contexto
En el modelo relacional heredado existían dos deficiencias estructurales críticas respecto a cuentas corporativas (`HU-CUE-03`, `HU-CUE-09`, `HU-CUE-10`):
1. **El NIT vigente no tenía hogar persistente:** El NIT de la empresa solo se capturaba en `solicitud_empresa`. Al tramitar una actualización de NIT (`HU-CUE-10`), el sistema se veía forzado a mutar la solicitud histórica o inventar columnas, destruyendo la trazabilidad inmutable requerida por auditoría (`RN-CUE-23`).
2. **Almacenamiento de RUT adjunto:** `solicitud_actualizacion_nit` definía `documento_adjunto_url TEXT` apuntando a un bucket inexistente. No había infraestructura de almacenamiento de objetos ni SDKs de nube en el proyecto.

Ambos hallazgos fueron diagnosticados en `RFC-M04-001` (D-1 y D-2).

## Decisión
1. **Entidad `cuenta_empresa` (RFC-M04-001 C-1):**
   - Modelar una tabla 1:1 con `usuario` (`id_usuario INT PRIMARY KEY`), con el NIT vigente (`UNIQUE`), nombre de empresa, representante legal, teléfono y correo empresarial.
   - La tabla conserva `id_solicitud_origen` vinculando a la solicitud que dio origen a la cuenta comercial.
   - Cuando se aprueba una solicitud de actualización de NIT (`solicitud_actualizacion_nit`), la fila de `cuenta_empresa` actualiza su NIT y su `fecha_actualizacion`, manteniendo intacto el registro histórico de solicitudes.
2. **Almacenamiento de RUT en `documento_soporte` (RFC-M04-001 C-3, Opción A):**
   - Crear la tabla `documento_soporte` con columna `contenido BYTEA`, tamaño máximo acotado por `CHECK` a 5 MB (5,242,880 bytes), tipo MIME validado (`application/pdf`, `image/jpeg`, `image/png`) y huella SHA-256 obligatoria.
   - Aislar el acceso al documento tras la interfaz `AlmacenDocumentosPort`. En Fase 3A se utiliza el adaptador relacional `PrismaDocumentosRepository`. Si en el futuro DevOps provee almacenamiento S3/GCS, solo se sustituye el adaptador sin tocar la lógica de negocio.
   - **Regla estricta de consulta (`RN-CUE-20`):** El repositorio NUNCA selecciona la columna `contenido` en listados o consultas generales de solicitudes; dicha columna solo se proyecta en el endpoint dedicado de descarga autorizada para el administrador o el titular.

## Consecuencias

**Positivas**
- Garantía de unicidad global del NIT vigente en base de datos (`uq_cuenta_empresa_nit`).
- Consistencia transaccional ACID: la solicitud y el archivo adjunto se persisten o fallan juntos dentro de la misma transacción PostgreSQL.
- Historial inmutable y auditable de renovaciones y solicitudes sin alterar el registro vigente.
- Cero dependencias de infraestructura en la nube externas en este estadio del proyecto.

**Negativas / Aceptadas**
- Crecimiento del tamaño de la base de datos por almacenamiento en `BYTEA`. Mitigado porque el trámite de renovación de NIT es esporádico (anual/fiscal) y el archivo está acotado estrictamente a 5 MB.

## Alternativas Descartadas
- **Añadir columnas de empresa a la tabla `usuario`:** Descartado porque la tabla `usuario` es compartida por M20 y M17 y la gran mayoría de filas son clientes particulares y colaboradores, lo que generaría dispersión y nulidad innecesaria.
- **Guardar el archivo en el sistema de archivos del servidor (Opción B):** Descartado porque introduce estado efímero en el servidor y rompe el despliegue de contenedores sin estado (stateless).
