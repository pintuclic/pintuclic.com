# ADR-009 — Puerto de notificaciones para desacople con M18

> **Estado:** APROBADO (ratificable en Gate 2) · **Fecha:** 2026-10-21  
> **Decide:** Software Architect Lead · **Módulo:** M04

## Contexto
El grafo de dependencias de `RUTA_DEL_PROYECTO.md` establece que M04 depende de M18 (Notificaciones y Comunicaciones) para el despacho de correos transaccionales:
- Código OTP para confirmación de registro (`HU-CUE-01`).
- Enlace/código para recuperación de contraseña (`HU-CUE-05`).
- Notificación de cambio de correo (`HU-CUE-06`).
- Notificación de resolución (aprobación/rechazo) de solicitud de cuenta empresa o actualización de NIT (`HU-CUE-09`).

No obstante, M18 aún no ha sido implementado y el Director Humano autorizó explícitamente el salto de ola (bloqueo `SALTO_DE_OLA_AUTORIZADO` en `current_state.json`), instruyendo construir M04 de forma desacoplada mediante un puerto de notificación con adaptador no-op / en memoria (precedente: `AuditoriaPort` en M20 y M17).

## Decisión
1. Definir en M04 el puerto de salida `NotificacionesPort` (`src/modules/m04-cuentas/interfaces/notificaciones.port.ts`), totalmente agnóstico de protocolos de transporte (SMTP, SendGrid, etc.).
2. El puerto define métodos semánticos de negocio:
   - `enviarCodigoRegistro(correo: string, codigoOtp: string, minutosVigencia: number): Promise<void>`
   - `enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void>`
   - `enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void>`
   - `notificarDictamenEmpresa(correo: string, resultado: 'aprobada' | 'rechazada', motivoRechazo?: string): Promise<void>`
3. Proveer un adaptador en memoria (`MemoriaNotificacionesAdapter`) para testing automatizado y desarrollo local, que registra los eventos emitidos en un array observable por los tests de Vitest.
4. Cuando el equipo implemente M18, se suministrará un adaptador `M18NotificacionesAdapter` que invocará al servicio SMTP de M18, sin alterar los servicios ni controladores de M04.

## Consecuencias

**Positivas**
- Desacople estricto entre M04 y M18: M04 puede construirse y probarse al 100% en aislamiento con 94 escenarios BDD verificables.
- Cero dependencias externas de red o servidores SMTP en suites de pruebas automatizadas.
- Cumplimiento de la Directiva #1 (Aislamiento Estricto de Módulo) y Directiva #4 (Objetivo 100% Funcional).

**Negativas / Aceptadas**
- El despacho real de correos a buzones SMTP queda diferido hasta que M18 entre en operación. Los tests certifican que el evento fue emitido con los parámetros correctos.

## Alternativas Descartadas
- **Instanciar Nodemailer directamente en el servicio de usuarios:** Descartado porque violaría la separación de capas, introduciría acoplamiento a infraestructura y rompería la ejecución offline de tests.
- **Detener M04 hasta que se construya M18:** Descartado porque existe una orden ejecutiva explícita del Director Humano autorizando el salto de ola.
