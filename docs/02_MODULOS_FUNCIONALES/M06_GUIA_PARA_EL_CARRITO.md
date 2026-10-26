# M06 — Guía para quien haga el carrito (M05), el checkout (M07) y la orden (M08)

> La fuente de verdad es el contrato `contracts/m06-precios.contract.ts`. Esta guía resume lo que el carrito
> **debe** hacer con los precios y descuentos para no inventar reglas por su cuenta.

## 1. El carrito no calcula precios

Cada vez que cambia el carrito (agregar, quitar, cambiar cantidad, iniciar sesión, escribir un cupón) y otra vez
**justo antes de pagar**, el carrito llama a `PreciosPort.calcular` (servicio interno) o a
`POST /api/v1/precios/calcular` (desde el navegador) y pinta lo que devuelve. No suma, no resta, no aplica
porcentajes en el carrito.

```
calcular({ lineas: [{ idVariante, idColor, cantidad }], codigoCupon?, contexto: { idUsuario } })
```

- Líneas de una **cotización** (M21) llevan `precioAcordado` (solo por servicio interno): el cálculo las respeta y no les aplica descuentos.
- Una línea con `vendible: false` no tiene precio ni suma: mostrar su `motivoNoVendible` y pedir que se quite.

## 2. Jerarquía de descuentos: NO se suman, se encadenan

```
precio base → evento → descuento de empresa → cupón
```

Cada paso se aplica sobre el precio que dejó el anterior. Ejemplo:

| Paso                          | Cuenta       | Precio |
| ----------------------------- | ------------ | ------ |
| Precio base                   |              | 100,00 |
| Evento "Miércoles de color"   | −10 %        | 90,00  |
| Cliente empresa "Proveedor"   | −15 % de 90  | 76,50  |

El resultado es **76,50**, no 75. El desglose (`descuentos` de cada línea) trae cada paso con su `origen`,
`porcentaje`, `importe` y `ordenAplicacion`; es lo que se muestra al cliente y lo que M08 copia a
`linea_orden_descuento`.

Un producto con `excluidoDeDescuentos` (p. ej. los combos) no recibe ninguno de los tres: se cobra a precio base.

## 3. Descuento de empresa

- Solo lo recibe una cuenta **empresa** con un tipo de cliente asignado (Proveedor, Constructora…; el administrador los crea y cambia sus porcentajes).
- Es **global al carrito**: se aplica a todas las líneas (menos las excluidas), siempre después del evento.
- Tiene un **monto mínimo** (por tipo de cliente): si el total del carrito (después de eventos, IVA incluido) no lo alcanza, el descuento **no se aplica**.
  El cálculo lo dice en `empresa` (`aplicado`, `faltante`) y en `avisos`.
- **El carrito debe avisar al cliente.** Cuando llegue un aviso `empresa_falta_monto`, mostrar algo como:
  _"Te faltan $X para recibir tu 15 % de descuento Proveedor"_ (`faltante`, `porcentaje`, `tipoCliente`).
- El descuento de empresa **nunca** se muestra en tarjetas ni en la ficha de producto, solo en el carrito.

## 4. Invitación a crear cuenta empresa

Si el cliente está registrado como particular y el total de su carrito (después de eventos) alcanza el umbral
configurable `comercial.umbral_sugerir_empresa` (panel de configuración, M17), el cálculo devuelve el aviso
`sugerir_cuenta_empresa`. El carrito muestra una invitación a pedir la cuenta empresa y enlaza a la sección
Empresa del perfil (`/perfil`), donde ya está el ascenso de cuenta. Un visitante sin sesión no recibe este aviso.

## 5. Cupón

- Hay un campo "Código de descuento". El código viaja en `codigoCupon`; el cálculo responde en `cupon`.
- Si `aplicado: false`, mostrar el motivo (`cupon_no_vigente`, `cupon_agotado`, `monto_minimo_no_alcanzado`, `requiere_sesion`…); el resto del carrito sigue calculado.
- Calcular **no reserva** el cupón. El uso se registra al crear la orden (ver §7).

## 6. IVA

Los precios de la variante ya incluyen IVA. El resultado trae `tasaIva`, `baseSinImpuesto` e `importeIva`. La tasa
sale del parámetro `comercial.iva_porcentaje` de M17; el carrito no la lee ni la calcula.

## 7. Lo que hacen checkout y orden

1. **M07**: llama de nuevo a `calcular` antes de cobrar (revalida precios). Antes de crear la orden llama a
   `registrarUsoCupon({ idCupon, idUsuario, referencia, importeDescuento })`; si responde `registrado: false`, recalcula y avisa al cliente.
2. **M08**: recibe el cálculo **ya hecho** y lo congela tal cual (D07): copia `subtotal`, `descuentoTotal`, `tasaIva`, `baseSinImpuesto`, `importeIva` y los descuentos de cada línea. No recalcula ni redondea. Copia el `subtotal` de la línea; el precio unitario puede diferir por centavos.
3. Si la orden se cancela: `liberarUsoCupon(referencia)`.

## 8. Qué se ve en las tarjetas (no es del carrito, pero evita confusiones)

Las tarjetas de producto y la ficha solo muestran el **evento**: etiqueta con el porcentaje, precio original
tachado y precio con descuento. Nunca el de empresa. En el carrito, con cantidad mayor que 1, el subtotal manda
sobre N × precio de tarjeta (puede haber diferencia de centavos por el redondeo).

Si un evento excluye un color, la tarjeta no puede saberlo (no hay color elegido); la ficha con color elegido y
el carrito sí aplican la excepción.
