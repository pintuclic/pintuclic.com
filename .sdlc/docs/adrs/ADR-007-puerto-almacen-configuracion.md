# ADR-007 — Puerto y almacén de parámetros de configuración general

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M17

## Contexto
Las historias de usuario `HU-ADM-05` (Configuración general del sistema) y `HU-ADM-07` (Catálogo de parámetros configurables) exigen:
1. Almacenar y exponer parámetros de Autenticación, Comunicaciones y Comercial básico.
2. Permitir al administrador modificar valores en tiempo real desde el panel, con aplicación inmediata sin reiniciar el servidor (`RF-ADM-05-03`).
3. Validar rangos numéricos y tipos estrictos (`RF-ADM-05-06`).
4. Servir los parámetros a `M20` (vigencia de OTP y sesiones en `RF-SEG-02-07`), `M18` (reintentos de correo) y `M06`/`M12` (porcentaje de IVA).

Sin embargo, el DDL relacional de `bd/sql/schema_pintuclic.sql` no posee una tabla `configuracion` o `parametro`. Como `bd/` está bloqueado por gobernanza, el backend no puede depender de una tabla no provista en el script de arranque.

## Decisión
Se aplica el patrón **Puertos y Adaptadores (Arquitectura Hexagonal)**, idéntico al adoptado para `AuditoriaPort` en ADR-002:

1. Se define la interfaz de puerto `ConfiguracionPort`:
```typescript
export interface ConfiguracionPort {
  obtenerParametro<T>(clave: ClaveParametro): Promise<T>;
  listarParametros(): Promise<ParametroConfiguracion[]>;
  actualizarParametro(clave: ClaveParametro, valor: unknown, idAdmin: number): Promise<ParametroConfiguracion>;
}
```
2. Se implementa un adaptador en memoria (`AlmacenConfiguracionMemoria`) precargado con el catálogo maestro oficial tipado en `m17-permisos.contract.ts` (valores por defecto seguros: IVA 19%, vigencia OTP 15 min, reintentos SMTP 3, etc.).
3. Las modificaciones persisten durante el ciclo de vida del proceso y notifican en memoria a los servicios suscriptores en tiempo real.
4. Cuando el Product Owner apruebe la tabla relacional de configuración en una futura versión del DDL, solo se sustituirá la implementación del puerto sin tocar los controladores ni los servicios consumidores.

## Consecuencias

**Positivas**
- Cumplimiento estricto e inmediato de `HU-ADM-05` y `HU-ADM-07`.
- Cero desvíos o fallos en tests por tablas inexistentes en PostgreSQL.
- Tiempo de respuesta ultra-rápido (< 1 ms) para consultas críticas de configuración transversal (ventanas de expiración en cada login o cálculo de impuestos).

**Negativas / Aceptadas**
- Los cambios realizados en caliente en memoria durante el desarrollo se restablecen a sus valores por defecto si se reinicia el servidor Node.js. Esto es aceptable en esta fase y queda documentado como comportamiento transitorio hasta la incorporación de la tabla DDL definitiva.
