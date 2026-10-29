**PINTU CLIC**

Plataforma de comercio electrónico

**REQUISITOS Y CRITERIOS DE ACEPTACIÓN**

**TANDA 4B — Cumplimiento de la venta**

M09 Cumplimiento y preparación

| Versión | 3.0 |
| :---- | :---- |
| Fecha | 25 de septiembre de 2026 |
| Qué cambia | La entrevista no tocó este módulo: lo que cambia viene de fuera. Se reescribe la indicación de la base a consumir con el vocabulario de M01, donde la base dejó de ser una clase de color, y nace la verificación del combo, que llega armado y cuya existencia ya se descontó al generarse la orden, de modo que el empleado comprueba el paquete y no sus componentes. Se retira la consecución de existencias: el negocio confirmó que Pintu Clic es una libreta de pedidos y que es la tienda quien maneja la existencia, de modo que la mercancía siempre se consigue y el caso extremo se resuelve por comunicación directa, fuera del sistema. Desaparecen HU-CUM-02 y HU-CUM-04 con sus requisitos. Se cierran además los tres huecos del avance automático, del retroceso desde preparada y del efecto de una corrección tardía. Nace HU-CUM-06, la hoja de preparación: hasta ahora el módulo decía cómo se registra el inicio y el fin de la preparación, pero no qué mira el empleado mientras la hace. El 29 de octubre de 2026 el PO ajusta el módulo: es una mejora de M08 y debe ser liviano para no cargar al empleado al confirmar el envío; la disponibilidad por línea pasa a tres marcas (disponible, consiguiendo stock y no disponible) sin registrar cantidades. Donde este documento y `contracts/m09-cumplimiento.contract.ts` difieran, manda el contrato. |
| Contenido | 4 historias con requisitos · 20 requisitos funcionales · 1 no funcional · 24 criterios de aceptación |
| Módulos analizados | M09 Cumplimiento y preparación |

# 1\. Lo que falta definir

## 1.1 Sin requisitos pendientes

Ninguno. Los de la versión anterior que afectaban a este módulo se cerraron con el modelo de base y color de M01 y con la verificación del pago directo de M07.

# 2\. Requisitos y criterios por historia

## M09. Cumplimiento y preparación

### HU-CUM-01 — Revisión y validación física de disponibilidad

*Como empleado encargado de pedidos / quiero registrar el resultado de la verificación física de cada producto de una orden / para que quede constancia de qué hay realmente disponible antes de preparar el pedido.*

*Alcance: la verificación línea a línea de lo que hay físicamente, su corrección y su rastro. Es el módulo que resuelve la brecha entre lo que dice la existencia referencial y lo que hay en la bodega, que es la característica operativa distintiva de este negocio.*

**Requisitos**

| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :---- | :---- | :---- | :---- | ----- | ----- |
| RF-CUM-01-01 | RF | Verificación | El sistema debe permitir a un empleado autorizado consultar las órdenes pendientes de verificación física, e impedir registrar la verificación de una orden que no se encuentre en el estado que la admite. | **Deducido** | **Alta** |
| RF-CUM-01-02 | RF | Verificación | El sistema debe permitir registrar el resultado de la verificación por cada línea de la orden y no solo para la orden en su conjunto, con tres marcas: disponible, consiguiendo stock (hay parte de las unidades o se espera el resto) y no disponible. Una línea solo es «disponible» cuando están todas sus unidades; no se registra la cantidad hallada. | **Definido** | **Alta** |
| RF-CUM-01-05 | RF | Trazabilidad | El sistema debe registrar la identidad del empleado que realizó cada verificación con su fecha y hora, y conservar ese registro de forma permanente como parte de la historia de la orden. | **Definido** | **Alta** |
| RF-CUM-01-06 | RF | Verificación | El sistema debe permitir corregir una verificación registrada por error, conservando el registro anterior junto con la corrección, su autor y su momento. La corrección no hace retroceder la orden: si la preparación ya comenzó o terminó, la orden se mantiene en preparación. | **Definido** | **Alta** |
| RF-CUM-01-07 | RF | Integridad | El sistema no debe modificar la existencia referencial de la variante como consecuencia de una verificación física. Son dos datos distintos: uno describe lo que SAMIT informó y otro lo que el empleado vio. | **Deducido** | **Alta** |
| RF-CUM-01-08 | RF | Verificación | El sistema debe presentar al empleado, en cada línea, el producto, la presentación y la cantidad solicitada, y debe permitir registrar la verificación de forma incremental, sin exigir completar todas las líneas en una sola sesión. | **Deducido** | **Alta** |
| RF-CUM-01-09 | RF | Entonado | El sistema debe indicar, cuando la línea corresponda a un color de carta, qué variante de base debe consumirse y qué color hay que preparar sobre ella, conforme a RF-CAT-12-05. La variante nunca es la del color, que no tiene variante propia. | **Deducido** | **Alta** |
| RF-CUM-01-12 | RF | Verificación | El sistema debe presentar la línea de un combo como una unidad ya armada, cuya verificación consiste en comprobar que el paquete existe y no en verificar sus componentes. Su existencia se descontó al generarse la orden por RF-CAT-13-03, de modo que aquí no vuelve a tocarse. | **Deducido** | **Media** |
| RF-CUM-01-10 | RF | Control de acceso | El sistema debe reservar al permiso «Gestión de pedidos» todas las operaciones de este módulo: la consulta y el registro de la verificación, el avance de la orden y el registro de la preparación. | **Deducido** | **Alta** |
| RNF-CUM-01-01 | RNF | Usabilidad | El registro de la verificación debe poder realizarse desde un dispositivo móvil, por producirse físicamente en el punto donde está la mercancía y no ante un escritorio. | **Deducido** | **Media** |

**Criterios de aceptación**

| ID | Criterio |
| :---- | :---- |
| CA-CUM-01-01 | Dado que una orden está pendiente de verificación, cuando registro que todas sus líneas tienen disponibilidad total, entonces el sistema conserva ese resultado con mi identificador y la fecha. |
| CA-CUM-01-02 | Dado que una línea solicita cinco unidades y solo encuentro dos, cuando la marco como «consiguiendo stock», entonces el sistema lo acepta y la orden sigue retenida hasta que estén las cinco. |
| CA-CUM-01-03 | Dado que intento marcar una línea que la orden no tiene, cuando guardo, entonces el sistema lo impide e indica el motivo. |
| CA-CUM-01-04 | Dado que registré una verificación por error, cuando la corrijo, entonces el sistema conserva también el registro anterior con su autor y su momento. |
| CA-CUM-01-05 | Dado que registro una disponibilidad distinta de la existencia referencial, cuando consulto la variante en el catálogo, entonces su existencia referencial no ha cambiado. |
| CA-CUM-01-06 | Dado que una línea pide un color de carta, cuando abro la verificación, entonces el sistema me indica qué variante de base consumir y qué color preparar sobre ella. |
| CA-CUM-01-07 | Dado que una línea es un combo, cuando abro la verificación, entonces se me pide comprobar el paquete y no sus componentes. |
| CA-CUM-01-08 | Dado que verifico la mitad de las líneas y cierro sesión, cuando vuelvo a la orden, entonces el sistema conserva lo registrado y me permite continuar. |
| CA-CUM-01-09 | Dado que soy un empleado sin permiso de gestión de pedidos, cuando intento registrar una verificación, entonces el sistema rechaza la operación en el servidor. |
| CA-CUM-01-10 | Dado que corrijo una verificación con la preparación ya iniciada, cuando guardo la corrección, entonces la orden sigue en preparación y no retrocede. |

### HU-CUM-03 — Integridad del despacho

*Como responsable de la operación / quiero que una orden solo avance cuando todos sus productos estén disponibles / para no enviar pedidos incompletos ni generar dos envíos por una misma compra.*

**Requisitos**

| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :---- | :---- | :---- | :---- | ----- | ----- |
| RF-CUM-03-01 | RF | Integridad | El sistema debe impedir que una orden avance al proceso de entrega mientras alguna de sus líneas no tenga disponibilidad física confirmada, y debe dejarla en condiciones de avanzar en cuanto se confirme la última pendiente. | **Definido** | **Alta** |
| RF-CUM-03-02 | RF | Integridad | El sistema no debe admitir el despacho parcial de una orden, ni permitir eludirlo dividiéndola en dos ni eliminando líneas para desbloquear su avance. Ambas vías convertirían la prohibición en una regla evitable, y la segunda alteraría además una operación comercial ya pagada. | **Definido** | **Alta** |
| RF-CUM-03-03 | RF | Visibilidad | El sistema debe mostrar qué líneas retienen el avance de una orden y permitir consultar el conjunto de órdenes retenidas con el motivo de cada retención. | **Definido** | **Alta** |
| RF-CUM-03-07 | RF | Trazabilidad | El sistema debe registrar el momento en que una orden alcanza la disponibilidad completa. | **Deducido** | **Media** |
| RF-CUM-03-10 | RF | Integridad | El sistema debe hacer avanzar la orden a preparación de forma automática en cuanto el empleado confirme la última línea como disponible, sin exigir una acción adicional. Un botón que solo admite una respuesta no aporta control y sí retrasa la operación. | **Definido** | **Alta** |

**Criterios de aceptación**

| ID | Criterio |
| :---- | :---- |
| CA-CUM-03-01 | Dado que una orden tiene tres líneas y una sin disponibilidad confirmada, cuando intento hacerla avanzar, entonces el sistema lo impide e indica cuál la retiene. |
| CA-CUM-03-02 | Dado que una orden tiene dos líneas disponibles y una que no, cuando intento despachar solo las disponibles, entonces el sistema no ofrece esa posibilidad. |
| CA-CUM-03-03 | Dado que una orden está retenida por una línea, cuando intento eliminar esa línea o dividir la orden en dos, entonces el sistema lo impide. |
| CA-CUM-03-04 | Dado que soy administrador, cuando intento hacer avanzar una orden con una línea sin disponibilidad, entonces el sistema lo impide igual que a cualquier empleado. |
| CA-CUM-03-05 | Dado que confirmo la disponibilidad de la última línea pendiente, cuando la orden queda completa, entonces pasa a preparación sin que yo pulse nada más y consta el momento en que ocurrió. |
| CA-CUM-03-06 | Dado que quiero saber qué órdenes están detenidas, cuando consulto la bandeja de retenidas, entonces veo cada una con el motivo de su retención. |

### HU-CUM-05 — Preparación del pedido

*Como empleado encargado de pedidos / quiero registrar que un pedido ya fue preparado / para que el equipo sepa que está listo para entregarse.*

**Requisitos**

| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :---- | :---- | :---- | :---- | ----- | ----- |
| RF-CUM-05-01 | RF | Preparación | El sistema debe permitir registrar el inicio y la finalización de la preparación de un pedido, conservando el empleado responsable y ambos momentos, y debe permitir consultar las órdenes en preparación y las ya preparadas. | **Definido** | **Media** |
| RF-CUM-05-04 | RF | Integridad | El sistema debe impedir iniciar la preparación de una orden que no tenga la disponibilidad de todas sus líneas confirmada, e impedir registrar la finalización de una preparación que no haya sido iniciada. | **Deducido** | **Alta** |
| RF-CUM-05-05 | RF | Preparación | El sistema debe permitir devolver una orden preparada únicamente a preparación, exigiendo un motivo y registrando al autor. No se admite retroceder a la revisión de disponibilidad: lo ya verificado no se vuelve a verificar. | **Definido** | **Media** |

**Criterios de aceptación**

| ID | Criterio |
| :---- | :---- |
| CA-CUM-05-01 | Dado que una orden tiene toda su disponibilidad confirmada, cuando registro el inicio de su preparación, entonces el sistema lo acepta y conserva mi identificador y el momento. |
| CA-CUM-05-02 | Dado que una orden tiene una línea sin disponibilidad confirmada, cuando intento iniciar su preparación, entonces el sistema lo impide. |
| CA-CUM-05-03 | Dado que terminé de preparar un pedido, cuando registro la finalización, entonces queda marcado como listo para entregar. |
| CA-CUM-05-04 | Dado que una preparación no ha sido iniciada, cuando intento registrar su finalización, entonces el sistema lo impide. |
| CA-CUM-05-05 | Dado que devuelvo un pedido preparado a un estado anterior sin indicar motivo, cuando guardo, entonces el sistema lo impide; cuando lo indico, entonces el único destino posible es preparación y consta quién lo hizo, cuándo y por qué. |

### HU-CUM-06 — Tener a mano lo que hay que recoger

*Como empleado que arma el pedido en la bodega / quiero llevar conmigo la lista de lo que tengo que recoger / para no volver a la pantalla por cada línea.*

**Requisitos**

| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :---- | :---- | :---- | :---- | ----- | ----- |
| RF-CUM-06-01 | RF | Preparación | El sistema debe generar una hoja de preparación imprimible de una orden, con su identificador y, por cada línea, el producto, la presentación, la cantidad y la base que se consume cuando la línea sea entonada, conforme a RF-CUM-01-09. | **Definido** | **Alta** |
| RF-CUM-06-02 | RF | Preparación | El sistema no debe incluir en la hoja de preparación importes, descuentos ni datos de pago. La hoja va a la bodega y no es un documento de venta: RF-CHK-05-07 y el anexo C de la Tanda 2 rigen dónde vive esa información. | **Deducido** | **Alta** |
| RF-CUM-06-03 | RF | Preparación | El sistema debe imprimir en la hoja la fecha y el estado de la orden en el momento de generarla, de modo que una hoja impresa horas antes no se confunda con la situación actual del pedido. | **Deducido** | **Media** |

**Criterios de aceptación**

| ID | Criterio |
| :---- | :---- |
| CA-CUM-06-01 | Dado que voy a preparar un pedido con una línea entonada, cuando genero su hoja, entonces aparece qué base debo tomar para esa línea. |
| CA-CUM-06-02 | Dado que genero la hoja de preparación, cuando la reviso, entonces no aparece ningún precio ni dato de pago. |
| CA-CUM-06-03 | Dado que imprimí la hoja y el pedido cambió de estado después, cuando comparo, entonces la hoja indica la fecha y el estado que tenía al imprimirse. |
