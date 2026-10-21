# ADR-002 — Puerto de auditoría con adaptador no-op

> **Estado:** PROPUESTO (ratificable en Gate 2) · **Fecha:** 2026-10-21
> **Decide:** Software Architect Lead · **Módulo:** M20

## Contexto
El Product Owner aplazó **HU-SEG-04** (registro de auditoría): la tabla aún no se establece. Pero el
aplazamiento arrastra requisitos de otras historias que sí están en alcance: `RF-SEG-03-07` y
`CA-SEG-03-05` exigen *"registrar todo acceso denegado"*, y el diagrama contractual
`HU-SEG-03_autorizacion_servidor.png` **termina su rama de rechazo en ese nodo**.

Si M20 simplemente omite el registro, cuando HU-SEG-04 se desbloquee habrá que **reabrir cada punto
del código donde se deniega acceso** — exactamente el antipatrón que la propia especificación de M20
denuncia: *"añadirlos después obliga a revisar cada operación ya construida"*.

## Decisión
Se define el puerto `AuditoriaPort` en el contrato y se **invoca desde todos los puntos de llamada
correctos desde el primer día**. En esta entrega se enchufa un **adaptador no-op** que escribe en el
registro técnico interno. Al desbloquear HU-SEG-04 se sustituye únicamente el adaptador.

```typescript
export interface AuditoriaPort {
  registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void>;
}
```

## Consecuencias

**Positivas**
- El desbloqueo de HU-SEG-04 **no obliga a tocar ningún llamador**.
- El nodo del diagrama contractual queda cableado, no omitido.
- La forma del evento (`actor`, `operación`, `fecha`, `IP`) se acuerda ahora, cuando es barato.

**Negativas / aceptadas**
- `CA-SEG-03-05` **no se declara cumplido**: se certifica la emisión, no la persistencia. El QA Lead
  lo exigió explícitamente en la mesa ATDD y constará como `NO CUBIERTO — dependencia aplazada` en el
  RTM de Gate 4. Declararlo cumplido violaría la Regla de Oro #8.
- Existe código en producción cuyo efecto observable es solo un log. Es deliberado y está documentado.

## Alternativas descartadas
- **No invocar nada hasta que exista la tabla** — obliga a reabrir todos los puntos de denegación.
- **Crear ya la tabla** — invade una decisión del Product Owner.
