# M10. Entrega

**Dominio:** Operación · **Prefijo:** ENT · **Requisitos en:** Tanda 12

> Extracto del *Documento de historias de usuario* de Pintu Clic (versión 5.2, 14 de octubre de 2026), limitado al módulo M10. Es el enunciado de las historias, no su especificación: los requisitos y criterios de aceptación derivados viven en el documento de la Tanda 12, que no está en este repositorio.

## Propósito

Registrar cómo el pedido llega al cliente. El alcance del sistema termina en el despacho y en el registro de la entrega; del transporte se hace cargo la tienda física.

## Estado del módulo

| Módulo | Dominio | HU | Espec. | Parcial | Bloq. | Documento |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| M10 Entrega | Operación | 4 | 3 | 1 | 0 | Tanda 12 |

El recuento corresponde a las cuatro primeras historias (HU-ENT-01 a HU-ENT-04). El resumen del documento fuente no incluye las historias HU-ENT-05 a HU-ENT-08.

## Orden de desarrollo

M10 va en la **Ola 6**, junto a M09 Cumplimiento y M21 Cotizaciones: la operación posterior a la venta, que necesita M06 y M07 ya construidos.

## Historias de usuario

| ID | Historia de usuario | Req. | Estado |
| :---- | :---- | :---- | :---- |
| HU-ENT-01 | **Modo de entrega** Como cliente quiero saber de qué formas puedo recibir o recoger mi pedido para elegir la que me convenga antes de pagar. | 5 | Especificable |
| HU-ENT-02 | **Registro del despacho** Como empleado quiero registrar que el pedido salió del almacén para que el cliente vea que su pedido va en camino y quede constancia de cuándo se despachó. | 3 | Especificable |
| HU-ENT-03 | **Costo de envío** Como cliente quiero saber si mi compra incluye algún costo de envío y a cuánto asciende para conocer el valor total antes de pagar. | 0 | Parcial |
| HU-ENT-04 | **Confirmación de la entrega** Como cliente quiero que quede registrado cuándo se entregó efectivamente mi pedido para tener constancia de la entrega y del inicio de cualquier plazo posterior. | 4 | Especificable |
| HU-ENT-05 | **Integración y cotización con transportadoras externas** Como cliente en proceso de compra quiero ver las opciones de empresas de transporte disponibles según mi ciudad/dirección y el costo del flete cotizado en tiempo real para elegir la opción de envío más conveniente (económica o rápida) y pagar el valor correspondiente en la orden. | 2 | Parcial |
| HU-ENT-06 | **Generación automática de guía y etiqueta de despacho** Como empleado de bodega/despacho quiero generar la guía de transporte oficial y descargar la etiqueta imprimible con código de barras directamente desde el detalle de la orden para rotular los paquetes sin tener que entrar a la plataforma externa de cada transportadora a radicar manualmente. | 4 | Parcial |
| HU-ENT-07 | **Seguimiento del envío en tiempo real (Tracking)** Como cliente con una orden despachada quiero consultar en mi perfil el enlace o línea de tiempo del estado de mi paquete provisto por la transportadora para conocer la ubicación y fecha estimada de entrega sin tener que llamar a la tienda ni buscar en webs externas. | 5 | Parcial |
| HU-ENT-08 | **Gestión de novedades y reintentos de entrega** Como empleado de atención y logística quiero recibir alertas en el sistema cuando una transportadora reporte una novedad (dirección errónea, destinatario ausente, zona de difícil acceso) para contactar al cliente a tiempo antes de que el paquete sea devuelto al almacén. | 6 | Parcial |

## Historias retiradas o que esperan una decisión

| Historia | Qué pasa |
| :---- | :---- |
| HU-ENT-03 Costo de envío | Ya no espera nada: **se retira**. El envío, incluido su costo, queda fuera de PintuClic por completo. |

## Inconsistencias del documento fuente

Quedan señaladas para que alguien las confirme con el análisis; no se corrigieron aquí.

- HU-ENT-03 figura como «Parcial» en la tabla de historias, pero el capítulo 7 dice que se retira. Eso también contradice a HU-ENT-05, que habla de pagar el flete en la orden.
- HU-ENT-05 a HU-ENT-08 (transportadoras, guía, seguimiento y novedades) tampoco encajan con el propósito del módulo («del transporte se hace cargo la tienda física»). Tienen estado «Parcial» y ninguno de los dos capítulos de resumen las cuenta.
- El resumen del capítulo 3 cuenta 4 historias para M10 (3 especificables y 1 parcial), pero la tabla lista 8.
- El nombre del archivo dice v5.0 y el encabezado, versión 5.2.

## Relación con otros módulos

- **M08 Orden de venta:** el estado «Enviado» (`despachado`) solo existe para el modo «envío a domicilio». La recogida en almacén pasa de «Alistado» a «Entregado» sin despacho.
- **M18 Notificaciones:** al despachar, el cliente recibe un aviso (decisión D05 de M08).
