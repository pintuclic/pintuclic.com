**PINTU CLIC**

Plataforma de comercio electrónico

**REQUISITOS Y CRITERIOS DE ACEPTACIÓN**

M03 Asesoría y asistencia

# 2\. Requisitos y criterios por historia

## M03. Asesoría y asistencia

### HU-ASE-01 — Búsqueda asistida por preguntas guiadas

_Como visitante que no sabe qué pintura necesita / quiero responder unas pocas preguntas sobre mi proyecto / para que el sistema me muestre solo los productos adecuados para mi caso._

**Requisitos**

| ID           | Tipo | Categoría         | Requisito                                                                                                                                                                                                                                                                         | Origen       | Prior.    |
| :----------- | :--- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------- |
| RF-ASE-01-01 | RF   | Búsqueda asistida | El sistema debe presentar un flujo de preguntas cerradas, independiente del chatbot y utilizable sin autenticación, que traduzca cada respuesta en un filtro aplicado sobre el catálogo.                                                                                          | **Definido** | **Media** |
| RF-ASE-01-02 | RF   | Búsqueda asistida | El sistema debe partir del cuestionario de la tabla siguiente, traduciendo cada respuesta al filtro indicado, y debe permitir al administrador editar las preguntas, sus opciones y su correspondencia con los filtros desde el panel, sin intervención del equipo de desarrollo. | **Deducido** | **Media** |
| RF-ASE-01-03 | RF   | Búsqueda asistida | El sistema debe permitir retroceder y modificar una respuesta, omitir cualquier pregunta aplicando solo los filtros de las respondidas, y abandonar el flujo en cualquier momento devolviendo al usuario al catálogo sin conservar sus respuestas.                                | **Deducido** | **Media** |
| RF-ASE-01-04 | RF   | Búsqueda asistida | El sistema debe informar cuando la combinación de respuestas no produzca productos, ofreciendo relajar el último filtro aplicado.                                                                                                                                                 | **Deducido** | **Media** |

**Cuestionario de partida (RF-ASE-01-02)**

| Pregunta                                | Opciones                                                                 | Filtro que aplica                                      |
| :-------------------------------------- | :----------------------------------------------------------------------- | :----------------------------------------------------- |
| ¿Qué superficie va a pintar?            | Pared o techo interior · Fachada o muro exterior · Madera · Metal · Piso | Categoría o subcategoría                               |
| ¿El espacio es abierto o cerrado?       | Interior cerrado · Exterior a la intemperie · Zona húmeda                | Productos de interior o de exterior                    |
| ¿Qué color desea?                       | Las familias cromáticas del catálogo                                     | Familia cromática                                      |
| ¿En qué condiciones está la superficie? | Nueva sin tratar · Pintada en buen estado · Deteriorada                  | Incorpora los productos preparatorios que correspondan |
| ¿Qué uso tendrá el espacio?             | Residencial · Comercial de alto tránsito · Industrial                    | Línea o acabado adecuado                               |
| ¿Con qué se va a aplicar o diluir?      | Agua · Solvente · Indiferente                                            | Tipo de resina                                         |

**Criterios de aceptación**

| ID           | Criterio                                                                                                                                                              |
| :----------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-ASE-01-01 | Dado que accedo sin haber iniciado sesión, cuando comienzo el flujo, entonces el sistema me presenta las preguntas sin solicitarme autenticación.                     |
| CA-ASE-01-02 | Dado que respondo que la superficie es metal y está con óxido, cuando finaliza el flujo, entonces el resultado incluye anticorrosivos.                                |
| CA-ASE-01-03 | Dado que respondo que el espacio es exterior a la intemperie y tiene humedad, cuando finaliza el flujo, entonces el resultado incluye impermeabilizantes.             |
| CA-ASE-01-04 | Dado que respondo que el uso será de tráfico vehicular, cuando finaliza el flujo, entonces el resultado incluye pinturas de tráfico.                                  |
| CA-ASE-01-05 | Dado que estoy respondiendo, cuando retrocedo a una pregunta anterior, entonces puedo modificar mi respuesta y continuar.                                             |
| CA-ASE-01-06 | Dado que omito la pregunta del color, cuando finaliza el flujo, entonces se aplican únicamente los filtros de las preguntas respondidas.                              |
| CA-ASE-01-07 | Dado que mis respuestas no corresponden a ningún producto, cuando finaliza el flujo, entonces el sistema me lo informa y me ofrece relajar el último filtro.          |
| CA-ASE-01-08 | Dado que abandono el flujo a la mitad, cuando vuelvo al catálogo, entonces el sistema no ha conservado mis respuestas.                                                |
| CA-ASE-01-09 | Dado que soy administrador, cuando modifico la correspondencia entre una opción y su filtro, entonces el cambio se refleja sin intervención del equipo de desarrollo. |

### HU-ASE-02 — Calculadora de cantidad de pintura

_Como cliente que va a pintar / quiero decirle al sitio cuántos metros cuadrados tengo y cuántas manos voy a dar / para saber cuánta pintura comprar y no quedarme corto ni comprar de más._

**Requisitos**

| ID           | Tipo | Categoría   | Requisito                                                                                                                                                                                                                                                                   | Origen       | Prior.    |
| :----------- | :--- | :---------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------- |
| RF-ASE-02-01 | RF   | Calculadora | El sistema debe ofrecer, desde la ficha de un producto con rendimiento registrado, una calculadora utilizable sin autenticación que pida el área a pintar en metros cuadrados y el número de manos, y devuelva cuánto producto se necesita en la presentación seleccionada. | **Definido** | **Media** |
| RF-ASE-02-02 | RF   | Calculadora | El sistema debe calcular la cantidad dividiendo el área multiplicada por el número de manos entre el rendimiento de la presentación, que RF-CAT-10-03 deriva del volumen. El rendimiento es por mano, de modo que dar dos manos duplica la cantidad.                        | **Definido** | **Media** |
| RF-ASE-02-03 | RF   | Calculadora | El sistema debe devolver un intervalo cuando el rendimiento del producto sea un rango, calculando el extremo menor con el rendimiento máximo y el mayor con el mínimo, y una sola cifra cuando el rendimiento sea un valor único.                                           | **Definido** | **Media** |
| RF-ASE-02-04 | RF   | Calculadora | El sistema debe expresar el resultado en unidades enteras de la presentación elegida, redondeando siempre hacia arriba, y debe permitir consultar el equivalente en las demás presentaciones activas del producto.                                                          | **Deducido** | **Media** |
| RF-ASE-02-05 | RF   | Calculadora | El sistema debe advertir, junto a todo resultado, que la cantidad es aproximada y que el rendimiento real depende del estado y la absorción de la superficie.                                                                                                               | **Definido** | **Alta**  |
| RF-ASE-02-06 | RF   | Calculadora | El sistema debe exigir al usuario indicar el número de manos, sin suponerlo, y debe proponer el valor por defecto configurable del anexo B de la Tanda 2 cuando el negocio lo fije.                                                                                         | **Definido** | **Media** |
| RF-ASE-02-07 | RF   | Calculadora | El sistema no debe ofrecer la calculadora en los productos sin rendimiento registrado, y no debe estimar por su cuenta el rendimiento de un producto que no lo declara.                                                                                                     | **Definido** | **Alta**  |
| RF-ASE-02-08 | RF   | Validación  | El sistema debe admitir como área únicamente un número mayor que cero, y como número de manos un entero mayor o igual que uno, indicando el error sin realizar el cálculo cuando no se cumpla.                                                                              | **Deducido** | **Media** |

**Criterios de aceptación**

| ID           | Criterio                                                                                                                                                                         |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-ASE-02-01 | Dado un vinilo que rinde 25 m² por galón y por mano, cuando indico 50 m² y 2 manos, entonces el sistema responde 4 galones.                                                      |
| CA-ASE-02-02 | Dado un esmalte que rinde de 15 a 20 m² por galón y por mano, cuando indico 60 m² y 2 manos, entonces el sistema responde entre 6 y 8 galones.                                   |
| CA-ASE-02-03 | Dado un vinilo que rinde 25 m² por galón, cuando indico 30 m² y 1 mano, entonces el sistema responde 2 galones y no 1,2.                                                         |
| CA-ASE-02-04 | Dado que obtengo un resultado en galones, cuando consulto el equivalente en cuarto de galón, entonces el sistema lo presenta calculado sobre el volumen de esa presentación.     |
| CA-ASE-02-05 | Dado cualquier resultado, cuando lo leo, entonces junto a él aparece la advertencia de que la cantidad es aproximada.                                                            |
| CA-ASE-02-06 | Dado que no indico el número de manos, cuando intento calcular, entonces el sistema me lo exige y no supone ninguno.                                                             |
| CA-ASE-02-07 | Dado que consulto la ficha de un rodillo, cuando la reviso, entonces la calculadora no se ofrece.                                                                                |
| CA-ASE-02-08 | Dado que introduzco un área de cero o negativa, o un número de manos que no es un entero positivo, cuando intento calcular, entonces el sistema me indica el error y no calcula. |
| CA-ASE-02-09 | Dado que uso la calculadora sin haber iniciado sesión, cuando la utilizo, entonces el sistema no me solicita autenticación.                                                      |

### HU-ASE-06 — Degradación de los servicios de inteligencia artificial

_Como visitante / quiero que el sitio me avise con claridad cuando una herramienta de asesoría no esté funcionando / para saber qué ocurre y poder seguir comprando por otro camino._

**Requisitos**

| ID           | Tipo | Categoría   | Requisito                                                                                                                                                                                                                                                                                                   | Origen       | Prior.    |
| :----------- | :--- | :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------- |
| RF-ASE-06-01 | RF   | Resiliencia | El sistema debe mostrar un mensaje comprensible para alguien sin conocimientos técnicos cuando un servicio de inteligencia artificial no esté disponible, sin exponer códigos ni trazas, y sin bloquear la interfaz mientras espera su respuesta.                                                           | **Definido** | **Alta**  |
| RF-ASE-06-02 | RF   | Resiliencia | El sistema debe mantener operativo el resto del sitio cuando un servicio de inteligencia artificial falle, incluidos catálogo, búsqueda y carrito.                                                                                                                                                          | **Definido** | **Alta**  |
| RF-ASE-06-03 | RF   | Resiliencia | El sistema debe aplicar el tiempo máximo de espera y los reintentos del anexo B de la Tanda 2 antes de declarar no disponible un servicio, y debe suspender temporalmente las solicitudes cuando se agote la cuota contratada, informándolo.                                                                | **Definido** | **Alta**  |
| RF-ASE-06-04 | RF   | Resiliencia | El sistema debe descartar toda respuesta vacía, incompleta o con formato no procesable, sin almacenarla como resultado válido, registrando el incidente y mostrando un mensaje controlado.                                                                                                                  | **Definido** | **Media** |
| RF-ASE-06-05 | RF   | Resiliencia | El sistema debe ofrecer una alternativa cuando la inteligencia artificial no esté disponible: contacto con un asesor real, el resultado de la última consulta válida, o continuar el proceso sin esa funcionalidad cuando sea posible.                                                                      | **Definido** | **Alta**  |
| RF-ASE-06-06 | RF   | Auditoría   | El sistema debe conservar durante el periodo del anexo B el registro de incidentes, con fecha y hora, tipo de error, servicio afectado y resultado del intento, sin información sensible innecesaria, y debe alertar al administrador cuando un servicio acumule los fallos consecutivos allí configurados. | **Definido** | **Media** |

**Criterios de aceptación**

| ID           | Criterio                                                                                                                                                                                             |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-ASE-06-01 | Dado que el servicio no responde, cuando intento usar la herramienta, entonces el sistema muestra un mensaje comprensible sin código de error ni traza técnica.                                      |
| CA-ASE-06-02 | Dado que el servicio está caído, cuando navego por el resto del sitio, entonces el catálogo, la búsqueda y el carrito siguen funcionando.                                                            |
| CA-ASE-06-03 | Dado que el servicio tarda más del plazo configurado, cuando se agota, entonces el sistema reintenta lo configurado y, si vuelve a fallar, lo declara no disponible sin dejar la interfaz bloqueada. |
| CA-ASE-06-04 | Dado que el servicio devuelve una respuesta vacía o no procesable, cuando el sistema la recibe, entonces la descarta, registra el incidente y muestra un mensaje controlado.                         |
| CA-ASE-06-05 | Dado que el servicio no está disponible, cuando el sistema me lo informa, entonces me ofrece contacto con un asesor real o el resultado de mi última consulta válida.                                |
| CA-ASE-06-06 | Dado que se agotó la cuota contratada, cuando intento usar una función que depende de la IA, entonces el sistema informa que no está disponible temporalmente y el resto del sitio sigue operativo.  |
| CA-ASE-06-07 | Dado que un servicio acumula los fallos consecutivos configurados, cuando se produce el último, entonces el sistema alerta al administrador.                                                         |

# 3\. Historias sin requisitos derivados

La versión anterior omitía estas historias sin decir nada, de modo que no había forma de distinguir lo bloqueado de lo olvidado. Ninguna tiene requisitos y ninguna debe desarrollarse.

| Historia                                                  | Por qué no tiene requisitos                                                                                                                                                                                                                                                                                             |
| :-------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HU-ASE-03 Simulador virtual de color                      | Bloqueada por la elección del servicio de inteligencia artificial. El simulador ya no recibe imágenes del usuario: trae sus propios ambientes de muestra, de modo que la postura sobre imágenes cargadas dejó de condicionarlo.                                                                                         |
| HU-ASE-04 Correspondencia entre color simulado y catálogo | Bloqueada únicamente por HU-ASE-03: sin simulador no hay color que comparar. El dato contra el que comparar ya existe —el hexadecimal de cada color de la carta—, pero medir parecido en hexadecimal no coincide con lo que ve el ojo, de modo que la comparación deberá convertir antes a un espacio perceptual.       |
| HU-ASE-05 Chatbot asistente                               | Bloqueada por la elección del servicio de inteligencia artificial y por el diseño de sus reglas de comportamiento.                                                                                                                                                                                                      |
| HU-ASE-07 Tratamiento de imágenes cargadas por el usuario | Retirada: ya no aplica. El cliente no sube fotos al simulador de color —el sistema ya trae los ambientes de muestra— y el chat box tampoco acepta fotos; de hecho, el chatbot aún no existe. No queda ninguna función en Pintu Clic donde el usuario cargue una imagen (confirmado por Pintuco, 12 de octubre de 2026). |
