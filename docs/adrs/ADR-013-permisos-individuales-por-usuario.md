# ADR-013 — Permisos individuales por usuario y rol único `empleado`

> **Estado:** APROBADO · **Fecha:** 2026-10-30
> **Decide:** Tech Lead (con autorización del PO para modificar la base de datos) · **Módulos:** M17, M04, M20
> **Reemplaza a:** [ADR-006](./ADR-006-modelo-permisos-individuales-sobre-ddl.md)

## Contexto
ADR-006 cumplió el requisito de permisos individuales (`RF-ADM-02-01`) sin tocar el DDL: un rol por cada empleado, con sus
permisos en `asignacion_permiso`. En la práctica produjo fallos que llegaron a la base real:

- **Escalada de privilegios.** `asignarPermisos` reescribe las asignaciones del rol de la persona. Con un cliente del seed
  como destino (rol `cliente`, compartido), 29 permisos quedaron en el rol de todos los clientes.
- **Dos fuentes de rol** (`usuario.id_rol` y `usuario_rol`) interpretadas distinto por M04 y por M17. El listado de
  colaboradores incluía a los clientes; todo rol distinto de los ids 2 y 3 se trataba como administrador.
- **Menú y vista del panel iguales para todo el personal**, sin relación con los permisos de la persona.
- Un rol por empleado ("Perfil Empleado N - Nombre") que no representa ningún puesto y guarda el nombre de la persona.

## Decisión
1. `usuario.id_rol` es el **único** vínculo de rol. `usuario_rol` queda obsoleta: nadie la lee ni la escribe; se elimina en
   un ciclo posterior.
2. Roles: `administrador`, `empleado`, `cliente`, `empresa_vip`. **Es personal quien tiene `administrador` o `empleado`.**
3. El rol `empleado` **no lleva permisos**. Los de cada empleado viven en la tabla nueva `usuario_permiso (id_usuario, id_permiso)`.
   Nunca se escriben en `asignacion_permiso`.
4. El administrador conserva las facultades totales e implícitas (ADR-008). El resolutor de permisos solo concede un código si la
   cuenta está activa, tiene rol `empleado` y existe la fila en `usuario_permiso`.
5. Asignar permisos solo es posible sobre un empleado; quien no es administrador solo concede lo que él mismo posee.
6. Se añade `usuario.fecha_creacion` (el listado devolvía «ahora» para todos).
7. La interfaz arma su menú con `GET /admin/mis-permisos`. Ocultar opciones es usabilidad; el control sigue siendo del servidor.

El detalle normativo está en el contrato `contracts/m17-permisos.contract.ts` (R-ACC-1 a R-ACC-9).

## Consecuencias
**Positivas**
- Los permisos individuales dejan de depender de roles: no hay rol compartido donde escribir por error.
- Una sola definición de «personal» para M04, M17 y M20.
- El modelo es el que describe la especificación, sin la abstracción del rol por persona.

**Negativas / aceptadas**
- Una tabla nueva y una columna en `usuario`. Cambio aditivo; el despliegue lo aplica `schema_pintuclic.sql` (idempotente).
- `usuario_rol` se conserva un ciclo con comentario de obsoleta.
- Las bases creadas antes necesitan el rol `empleado` (lo siembra `seed_pintuclic.sql`); las cuentas de personal existentes se
  reasignan a mano o se recrea la base.

## Alternativas descartadas
- **Un rol `empleado` con los permisos dentro:** todos los empleados tendrían los mismos permisos; contradice `RF-ADM-02-01`.
- **Roles por puesto (vendedor, bodeguero…):** descartado por ADR-006 y por la Directiva #10 de `AGENTS.md`.
- **Mantener el rol por empleado y solo proteger el repositorio:** deja dos fuentes de rol y un rol sin sentido por persona.
