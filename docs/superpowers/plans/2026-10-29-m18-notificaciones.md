# Plan de trabajo M18 — Notificaciones (2026-10-29)

Fuente: `docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md` contrastado con las especificaciones y contratos de M04, M05, M08, M11, M12, M21 y M03. El contrato `contracts/m18-notificaciones.contract.ts` manda sobre este plan.

## Qué piden los otros módulos a M18

| Módulo | Qué pide | Fuente | Estado hoy |
|---|---|---|---|
| M04 | Códigos de registro y cambio de correo, recuperación, activación, aviso de cambio de correo, dictamen empresa | ADR-009, M04 | Hecho |
| M04 | Confirmar al cliente empresa que se recibió su solicitud de NIT | RF-CUE-10-04 | **Falta** (no hay tipo ni llamada) |
| M04 | Confirmar que la solicitud de cuenta empresa quedó en revisión | Matriz de trazabilidad, HU-CUE-03 | **Falta** |
| M03 | Alerta al admin por fallos del servicio de IA | contrato M03 I9 | Hecho |
| M12 | Aviso del comprobante de venta | contrato M12 R9 | Hecho |
| M08 | Correo solo al nacer la orden, al despacharla y al cancelarla (D05, R10) | spec y contrato M08 | Nacer: lo cubre el comprobante. Despachar: **falta**. Cancelar: **falta** (espera a M11) |
| M11 | Correo al radicar la solicitud, al aprobarla o rechazarla y al confirmar el reembolso | spec M11 | **Falta** (depende de M11) |
| M21 | Aviso de cotización respondida y rechazada | contrato M21 D8 | Puerto listo en M21, **sin adaptador conectado** |
| M21 | Aviso de cotización próxima a caducar | RF-NOT-02-05 | Bloqueado: plazo sin definir |
| M05, M01, M02 | Nada (N/A). El aviso de cambios de precio del carrito es en pantalla | specs | — |

## Fases

**Fase 0 — Cerrada en la rama `feature/m18-avisos-orden`.** Tres tipos nuevos en el esquema y el seed (`chore/m18-avisos-orden-compartidos`). Métodos de puerto, correos y vista previa de cotización respondida y rechazada.

**Fase 1 — Corregir lo hecho a lo que M08 decidió (D05). HECHA.**
- Reemplazar el tipo `estado_orden` (cambio de estado genérico) por `orden_despachada` y `orden_cancelada`.
- Ajustar SQL, Prisma, seed, contrato, puerto, adaptadores, plantillas y tests.
- Los correos de despachada y cancelada llevan datos del pedido (código, modo de entrega), sin catálogo de estados.

**Fase 2 — Cableado. HECHA (solo `app.routes.ts` y adaptadores nuevos de M18; ni M08 ni M21 cambiaron).**
- `app.routes.ts`: pasar a M21 un adaptador que reenvíe a M18. Hoy se construye sin ninguno.
- `app.routes.ts`: el adaptador de M12 (`alCrearOrden`) reenvía `notificarOrdenDespachada` a M18, en vez de dejarla vacía.
- Cuidar que M12 y M18 convivan: el comprobante al nacer y el aviso de despacho no se pisan.

**Fase 3 — M04. HECHA.**
- Tipos y plantillas para «solicitud de empresa recibida» y «solicitud de NIT recibida».
- M04 los llama desde su servicio de empresas. Es código de M04: preguntar antes.

**Fase 4 — Entregabilidad (HU-NOT-04).**
- Endpoint autenticado para el webhook de rebotes de Brevo que llame a `registrarRebote`.
- Vista de rebotes en el panel, con el listado que ya existe en el backend.
- Documentar SPF, DKIM y DMARC del dominio como tarea de despliegue (no es código).

**Fase 5 — Depende de otros módulos (no empezar).**
- M11: radicada, aprobada, rechazada y reembolso confirmado.
- M09: aviso de demora por falta de disponibilidad (RF-NOT-02-02).
- M21: aviso de cotización por vencer, cuando el cliente fije el plazo.

**Fase 6 — Documentación y cierre.**
- Anotar en el documento de M18: proveedor Brevo, plantillas con asunto y texto editable (sin variables), catálogo de avisos de la orden definido por M08.
- Actualizar `RUTA_DEL_PROYECTO.md` (M18 aparece como «SMTP dentro de M04 y M17»).
- PR general primero, luego PR del módulo, descripción de máximo 10 líneas.

## Reglas que aplican
- Cero `any`, contrato primero, commits `tipo(scope): descripcion`.
- Un correo caído nunca revierte una orden ni una cotización.
- No se agregan avisos que la documentación de los módulos no pida.

## Preguntas abiertas al cliente
1. ¿Con cuánta antelación se avisa que una cotización está por vencer? (RF-NOT-02-05)
2. ¿Se confirma Brevo como proveedor? Hoy está en la configuración y falta anotarlo en el documento.
3. ¿«Solicitud de empresa en revisión» necesita correo o basta la pantalla? (HU-CUE-03)
