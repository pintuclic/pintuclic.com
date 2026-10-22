# ADR-008 — Implementación del resolutor de permisos en tiempo real (`ResolutorPermisos`)

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M17

## Contexto
El módulo M20 (Seguridad y Auditoría) entregó el validador central `AutorizacionService` desacoplado de la persistencia de permisos mediante la interfaz de puerto:
```typescript
export interface ResolutorPermisos {
  tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean>;
}
```
Los requisitos funcionales de M17 exigen:
1. **Resolución en cada petición:** *"El sistema debe resolver los permisos del empleado en el momento de cada operación, y no a partir de un valor fijado al iniciar la sesión"* (`RF-ADM-03-03`).
2. **Efecto en caliente:** La revocación de un permiso debe surtir efecto inmediato sin esperar a que el JWT expire ni forzar cierre de sesión (`RF-ADM-02-06`, `CA-ADM-02-04`).
3. **Facultades implícitas del administrador:** El administrador del sistema posee todas las facultades de forma implícita y no editable (`RF-ADM-02-10`, `RF-ADM-06-07`).

## Decisión
Se implementa `ResolutorPermisosDatabaseAdapter` en `backend/src/modules/m17-permisos/services/resolutor-permisos.adapter.ts`:

1. **Atajo del Administrador Raíz:**
   Si `idUsuario === 1` o el usuario posee el rol `administrador`, la función retorna `true` de inmediato sin consultar la tabla de permisos, garantizando que el administrador nunca quede bloqueado ni sujeto a omisiones de catálogo.
2. **Consulta Dinámica sin Caché de Sesión:**
   Para cualquier otro usuario (empleados), el adaptador consulta en PostgreSQL la relación:
   ```sql
   SELECT 1 FROM permisos p
   JOIN asignacion_permiso ap ON ap.id_permiso = p.id_permiso
   JOIN usuario_rol ur ON ur.id_rol = ap.id_rol
   JOIN usuario u ON u.id_usuario = ur.id_usuario
   WHERE u.id_usuario = $1
     AND u.estado = 'activo'
     AND p.nombre = $2
     AND p.estado = 'activo'
   LIMIT 1;
   ```
3. **Inyección en el Middleware Canónico:**
   Este adaptador se inyecta en la instancia global de `AutorizacionService` consumida por el middleware `requirePermission()`, unificando la seguridad en toda la aplicación.

## Consecuencias

**Positivas**
- Cumplimiento estricto de la resolución dinámica en caliente (`RF-ADM-03-03`).
- El token JWT se mantiene liviano y seguro (no transporta listas de permisos que queden obsoletas tras una revocación).
- Cero acoplamiento entre la lógica de validación de rutas y la estructura de tablas de la base de datos.

**Negativas / Aceptadas**
- Cada operación protegida ejecuta una consulta `INDEX SCAN` contra PostgreSQL. Al estar indexadas las columnas `id_usuario`, `id_rol` y `nombre`, la latencia agregada es de ~1-2 ms, cumpliendo holgadamente el requisito no funcional de latencia imperceptible (`RNF-ADM-03-02` < 15 ms).
