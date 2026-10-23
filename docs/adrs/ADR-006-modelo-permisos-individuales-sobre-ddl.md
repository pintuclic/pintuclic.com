# ADR-006 — Modelo de permisos individuales sobre DDL relacional existente

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M17

## Contexto
La especificación de negocio y funcional de M17 establece taxativamente:
> *"El modelo confirmado es de permisos estrictamente individuales por empleado, sin roles predefinidos"* (`RF-ADM-02-01`).

Sin embargo, el DDL relacional preexistente en `bd/sql/schema_pintuclic.sql` (que está bloqueado y no puede modificarse sin RFC) modela el control de acceso con tablas tradicionales:
- `rol (id_rol, nombre, id_sub_rol_empresa, estado)`
- `usuario (id_usuario, ..., id_rol, estado, tipo)`
- `usuario_rol (id_usuario_rol, id_usuario UNIQUE, id_rol)`
- `permisos (id_permiso, nombre, descripcion, estado)`
- `asignacion_permiso (id_asignacion_permiso, id_rol, id_permiso, UNIQUE(id_rol, id_permiso))`

Existe una restricción `UNIQUE (id_usuario)` en `usuario_rol`, lo que implica una relación estricta 1:1 entre cada usuario y un registro de `rol`.

## Decisión
Para satisfacer simultáneamente la prohibición de roles fijos para empleados y la invariabilidad del DDL en `bd/`:
1. Cada cuenta de colaborador/empleado en `usuario` se asocia a su propio perfil de rol individual (`rol.nombre = 'empleado_' + id_usuario` o rol de asignación personal).
2. Los permisos atómicos concedidos a un empleado se persisten como tuplas individuales en `asignacion_permiso` vinculadas a dicho `id_rol`.
3. Para la cuenta administradora única (`id_rol = 1`), las facultades son implícitas y totales (bypass a nivel de autorización en servicio).
4. Para los clientes (`id_rol = 2` o `3`), aplican los privilegios correspondientes a clientes.
5. Los endpoints de administración operan exclusivamente sobre permisos atómicos (`catalogo.ver`, `ventas.gestionar`, etc.), ocultando por completo la existencia de `id_rol` al consumidor de la API REST.

## Consecuencias

**Positivas**
- Cumplimiento 100% del principio de permisos individuales por empleado sin roles rígidos.
- Cero alteraciones en el DDL bloqueado de `bd/sql/schema_pintuclic.sql`.
- El esquema relacional existente se aprovecha con integridad referencial completa y borrado en cascada controlado (`ON DELETE CASCADE` en asignación).

**Negativas / Aceptadas**
- La base de datos contiene una entidad `rol` por colaborador en lugar de una tabla directa `usuario_permiso`. Esta abstracción queda encapsulada en el repositorio `PermisosRepository` y no permea a la capa de servicios ni a los contratos DTO.

## Alternativas Descartadas
- **Alterar el DDL para crear `usuario_permiso` directo:** Descartado porque violaría la Directiva de bloqueo de `bd/` sin RFC del Product Owner.
- **Crear roles genéricos en el código (ej. 'vendedor', 'bodeguero'):** Descartado taxativamente por violar el requisito funcional `RF-ADM-02-01` y la Directiva #10 de `AGENTS.md`.
