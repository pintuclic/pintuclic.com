# M01. Catálogo de productos
**Dominio:** Catálogo / Comercio  
**Prefijo de Historias:** CAT  

---

## 1. Propósito y Alcance
El módulo M01 constituye el núcleo de la plataforma Pintu Clic, permitiendo la estructuración y administración completa del portafolio de productos. Su alcance abarca la gestión jerárquica a dos niveles (categorías y subcategorías), marcas, líneas comerciales, presentaciones y atributos técnicos (como el rendimiento). 

A su vez, incluye un robusto modelo para productos entonables y de colores fijos, gestionando los colores bajo el estándar de valor cromático CIELAB y administrando las bases sobre las que se prepara cada pintura. Este módulo no maneja existencias en tiempo real ni reglas de descuento dinámicas; funciona como la fuente de verdad maestra para que el resto de los módulos operen.

## 2. Dependencias y Relaciones
- **Depende de:** M13 Inventario y SAMIT (para abastecer masivamente los códigos de proveedor, existencias referenciales y datos CIELAB).
- **Habilita a:** M02 Búsqueda y navegación, M05 Carrito de compras, M06 Reglas y Descuentos, M08 Orden de venta.
- **Transversales Aplicables:**
  - 🔒 **M20 Seguridad:** Protección de la inmutabilidad histórica mediante la prohibición de eliminación física (aplicación de baja lógica en cascada para preservar órdenes antiguas).
  - 🛡️ **M17 Permisos:** Requiere los permisos estrictos «Gestión del catálogo» y «Gestión de productos» verificados siempre en el servidor.
  - 📧 **M18 Notificaciones:** N/A.

---

## 3. Tabla Resumen de Historias de Usuario
| ID | Historia de Usuario | Actores | Prioridad | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-CAT-01** | Gestión de categorías y subcategorías | Administrador | Alta | Definido |
| **HU-CAT-11** | Gestión de líneas | Administrador | Alta | Definido |
| **HU-CAT-04** | Gestión de marcas | Administrador | Alta | Definido |
| **HU-CAT-12** | Gestión de bases y entonado | Admin. del catálogo | Alta | Definido (Con pdtes) |
| **HU-CAT-05** | Gestión de colores | Admin. del catálogo | Alta | Definido (Con pdtes) |
| **HU-CAT-02** | Gestión de productos | Admin. del catálogo | Alta | Definido |
| **HU-CAT-10** | Atributos técnicos del producto | Admin. del catálogo | Media | Definido (Con pdtes) |
| **HU-CAT-03** | Gestión de variantes | Admin. del catálogo | Alta | Definido |
| **HU-CAT-13** | Gestión de combos | Administrador | Alta | Definido |
| **HU-CAT-06** | Consulta pública del catálogo | Visitante | Alta | Definido |
| **HU-CAT-07** | Imágenes del producto | Visitante | Alta | Definido |
| **HU-CAT-08** | Productos complementarios | Cliente | Media | Definido |
| **HU-CAT-09** | Estado y ciclo de vida del catálogo | Administrador | Alta | Definido |

---

## 4. Especificación Detallada por Historia de Usuario

### HU-CAT-01: Gestión de categorías y subcategorías
> **Como** administrador  
> **Quiero** crear y organizar las categorías y subcategorías bajo las que se clasifican los productos  
> **Para** que el catálogo pueda reorganizarse cuando el negocio cambie, sin depender del equipo de desarrollo.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-01-01** | RF | Clasificación | El sistema debe permitir registrar, editar, consultar y ordenar categorías y subcategorías desde el panel, exigiendo el nombre en ambas y la categoría padre en la subcategoría, y limitando el nombre a 100 caracteres. | Definido | Alta |
| **RF-CAT-01-02** | RF | Clasificación | El sistema debe admitir exactamente dos niveles de clasificación por uso, categoría y subcategoría, sin anidar más, y debe impedir que una subcategoría se asocie a más de una categoría padre. | Definido | Alta |
| **RF-CAT-01-03** | RF | Integridad | El sistema debe impedir dos categorías con el mismo nombre en el nivel raíz y dos subcategorías con el mismo nombre bajo la misma categoría padre, admitiendo que dos subcategorías homónimas existan bajo padres distintos. | Definido | Alta |
| **RF-CAT-01-04** | RF | Clasificación | El sistema debe permitir desactivar una categoría o subcategoría en cualquier momento, advirtiendo antes cuántos productos dejarán de verse. Desactivar una categoría desactiva sus subcategorías, y los productos que queden sin ninguna subcategoría activa salen del catálogo público sin darse de baja. | Definido | Alta |
| **RF-CAT-01-05** | RF | Control de acceso | El sistema debe reservar al permiso «Gestión del catálogo» la administración de categorías, subcategorías, líneas, marcas, colores, bases, presentaciones y atributos técnicos, y al permiso «Gestión de productos» la de productos, variantes, imágenes, combos y productos complementarios. | Definido | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión del catálogo».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-01-01:**
  - **Dado que** tengo permiso de gestión del catálogo
  - **Cuando** registro una categoría con nombre válido y una subcategoría bajo ella
  - **Entonces** ambas quedan disponibles para asociarles productos.
- **CA-CAT-01-02:**
  - **Dado que** registro una categoría sin nombre o una subcategoría sin padre
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide e indica el dato que falta.
- **CA-CAT-01-03:**
  - **Dado que** ya existe la categoría raíz Herramientas
  - **Cuando** intento registrar otra igual
  - **Entonces** el sistema la rechaza; y cuando registro la subcategoría Interior bajo Pinturas y otra Interior bajo Esmaltes, admite ambas.
- **CA-CAT-01-04:**
  - **Dado que** he definido un orden de presentación
  - **Cuando** se muestra la navegación
  - **Entonces** las categorías aparecen en ese orden y las inactivas no aparecen.
- **CA-CAT-01-05:**
  - **Dado que** voy a desactivar una categoría con productos
  - **Cuando** confirmo
  - **Entonces** el sistema me dice antes cuántos productos dejarán de verse y sus subcategorías quedan desactivadas.
- **CA-CAT-01-06:**
  - **Dado que** un producto pertenece a tres subcategorías y desactivo una
  - **Cuando** consulto el catálogo público
  - **Entonces** sigue apareciendo bajo las otras dos.
- **CA-CAT-01-07:**
  - **Dado que** soy empleado sin permiso de gestión del catálogo
  - **Cuando** intento crear una categoría
  - **Entonces** el sistema rechaza la operación en el servidor.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-01.png)

---

### HU-CAT-11: Gestión de líneas
> **Como** administrador  
> **Quiero** administrar las líneas comerciales de cada marca  
> **Para** poder decirle al sistema que una condición o una promoción se aplica sobre toda la línea Viniltex sin enumerar sus productos uno por uno.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-11-01** | RF | Líneas | El sistema debe permitir registrar, editar, consultar y desactivar líneas asociadas a una marca, exigiendo el nombre y admitiendo la gama comercial como dato descriptivo, y debe permitir consultar los productos de cada línea. | Definido | Alta |
| **RF-CAT-11-02** | RF | Integridad | El sistema debe impedir dos líneas con el mismo nombre dentro de la misma marca, admitirlo entre marcas distintas, y exigir que la línea de un producto pertenezca a la marca de ese producto. | Deducido | Alta |
| **RF-CAT-11-03** | RF | Integridad | El sistema debe advertir, antes de desactivar una línea, cuántos productos y cuántas reglas comerciales vigentes de M06 dependen de ella, y debe impedir su eliminación física conforme a RF-CAT-09-02. | Deducido | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión del catálogo».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-11-01:**
  - **Dado que** existe la marca Pintuco activa
  - **Cuando** registro la línea Viniltex asociada a ella
  - **Entonces** queda disponible para asociarle productos y para configurarle reglas en M06.
- **CA-CAT-11-02:**
  - **Dado que** un producto es de la marca Pintuco
  - **Cuando** intento asignarle una línea de otra marca
  - **Entonces** el sistema lo rechaza.
- **CA-CAT-11-03:**
  - **Dado que** ya existe la línea Koraza en Pintuco
  - **Cuando** intento registrar otra Koraza en Pintuco
  - **Entonces** el sistema la rechaza; cuando la registro en otra marca, la admite.
- **CA-CAT-11-04:**
  - **Dado que** voy a desactivar una línea sobre la que hay una regla de descuento vigente
  - **Cuando** confirmo
  - **Entonces** el sistema me advierte antes de cuántas reglas dependen de ella.
- **CA-CAT-11-05:**
  - **Dado que** desactivo la marca Pintuco
  - **Cuando** consulto sus líneas
  - **Entonces** han quedado desactivadas.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-11.png)

---

### HU-CAT-04: Gestión de marcas
> **Como** administrador  
> **Quiero** administrar las marcas como entidad propia y relacionarlas con productos, líneas, colores, bases y campañas  
> **Para** poder filtrar, promocionar y medir el negocio por marca.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-04-01** | RF | Marcas | El sistema debe permitir registrar, editar, consultar y cambiar el estado de una marca, exigiendo su nombre y su logotipo, y debe permitir consultar los productos, líneas, colores y bases asociados a ella. | Definido | Alta |
| **RF-CAT-04-02** | RF | Integridad | El sistema debe impedir el registro de dos marcas con el mismo nombre, y debe admitir el logotipo en los formatos y con el peso máximo del anexo B de la Tanda 2. | Definido | Alta |
| **RF-CAT-04-03** | RF | Marcas | El sistema debe desactivar y ocultar los productos, líneas, colores, bases y campañas asociados a una marca cuando esa marca se desactive. | Definido | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión del catálogo».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-04-01:**
  - **Dado que** tengo el permiso correspondiente
  - **Cuando** registro una marca con nombre y logotipo válidos
  - **Entonces** queda disponible para asociarle productos, líneas, colores y bases.
- **CA-CAT-04-02:**
  - **Dado que** registro una marca sin nombre o sin logotipo
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide e indica el dato que falta.
- **CA-CAT-04-03:**
  - **Dado que** una marca tiene productos o colores asociados
  - **Cuando** intento eliminarla
  - **Entonces** el sistema lo impide e informa de las asociaciones existentes.
- **CA-CAT-04-04:**
  - **Dado que** desactivo una marca
  - **Cuando** consulto sus líneas, bases, colores y productos
  - **Entonces** todos han quedado desactivados.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-04.png)

---

### HU-CAT-12: Gestión de bases y entonado
> **Como** administrador del catálogo  
> **Quiero** administrar las bases sobre las que se prepara cada color  
> **Para** que el sistema sepa qué lata hay que abrir cuando un cliente pide un verde menta.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-12-01** | RF | Bases | El sistema debe permitir registrar, editar, consultar y desactivar bases asociadas a una marca, exigiendo su nombre o código y su tipo de resina, e impidiendo dos bases con el mismo nombre dentro de la misma marca. | Definido | Alta |
| **RF-CAT-12-02** | RF | Bases | El sistema debe permitir declarar, por cada producto entonable, qué bases de su marca ofrece, sin fijar en el código cuántas son. El negocio maneja habitualmente cuatro por producto. | Definido | Alta |
| **RF-CAT-12-03** | RF | Integridad | El sistema debe impedir asignar a un producto una base de otra marca o de un tipo de resina distinto del suyo. | Deducido | Alta |
| **RF-CAT-12-04** | RF | Entonado | El sistema debe asociar cada color de la carta a la base o bases sobre las que puede prepararse, y no debe admitir una combinación no declarada. | Definido | Alta |
| **RF-CAT-12-05** | RF | Entonado | El sistema debe determinar, cuando el cliente elige un color sobre un producto entonable, la variante de base que se consume, y debe registrar esa variante y el color solicitado en la línea de la compra. | Definido | Alta |
| **RF-CAT-12-06** | RF | Entonado | El sistema debe impedir ofrecer un color cuya base no esté disponible como variante activa de ese producto, y debe retirar de la carta los colores que solo puedan prepararse sobre una base desactivada. | Deducido | Alta |
| **RF-CAT-12-07** | RF | Entonado | El sistema no debe presentar las bases al cliente como opción de compra. El cliente elige un color; la base es una consecuencia. | Definido | Alta |
| **RF-CAT-12-11** | RF | Bases | *PENDIENTE:* cuántas bases tiene cada marca y cómo se llaman. Falta el listado del fabricante para poblarlas. | Pendiente | Alta |
| **RF-CAT-12-12** | RF | Entonado | *PENDIENTE:* qué determina la base que exige un color, si viene declarada en la carta del fabricante o la decide quien prepara la mezcla. | Pendiente | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión del catálogo».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-12-01:**
  - **Dado que** existe la marca Pintuco
  - **Cuando** registro una base indicando su nombre y que es de agua
  - **Entonces** queda disponible para asociarla a productos entonables de esa marca.
- **CA-CAT-12-02:**
  - **Dado que** registro una base sin indicar su tipo de resina
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide.
- **CA-CAT-12-03:**
  - **Dado que** un producto es un vinilo de base agua
  - **Cuando** intento asociarle una base de aceite
  - **Entonces** el sistema lo rechaza.
- **CA-CAT-12-04:**
  - **Dado que** un color solo se prepara sobre la base más oscura
  - **Cuando** el cliente lo elige
  - **Entonces** el sistema determina esa base como la que se consume y registra ambos datos en la línea.
- **CA-CAT-12-05:**
  - **Dado que** la variante de la base que exige un color está desactivada
  - **Cuando** el cliente abre la carta de ese producto
  - **Entonces** ese color no se le ofrece.
- **CA-CAT-12-06:**
  - **Dado que** desactivo una base sobre la que se preparaban treinta colores
  - **Cuando** consulto la carta
  - **Entonces** esos colores ya no aparecen y el resto del producto sigue a la venta.
- **CA-CAT-12-07:**
  - **Dado que** soy cliente y consulto un producto entonable
  - **Cuando** reviso las opciones de compra
  - **Entonces** elijo color y presentación, y en ningún momento se me pide elegir una base.
- **CA-CAT-12-08:**
  - **Dado que** un cliente compró un color entonado
  - **Cuando** el empleado abre la orden
  - **Entonces** ve qué base consumir y qué color preparar.
- **CA-CAT-12-09:**
  - **Dado que** una base está referenciada por una orden pasada
  - **Cuando** intento eliminarla
  - **Entonces** el sistema lo impide y ofrece desactivarla.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-12.png)

---

### HU-CAT-05: Gestión de colores
> **Como** administrador del catálogo  
> **Quiero** administrar los colores asociándolos a la marca que efectivamente los ofrece  
> **Para** no ofrecer al cliente un color que esa marca no fabrica.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-05-01** | RF | Colores | El sistema debe permitir registrar, editar, consultar, buscar y cambiar el estado de colores asociados a una marca, exigiendo el nombre comercial y admitiendo el código cuando exista. | Definido | Alta |
| **RF-CAT-05-02** | RF | Colores | El sistema debe almacenar de cada color su valor cromático en espacio CIELAB como dato obligatorio, y generar su representación visual a partir de él sin requerir imagen. | Definido | Alta |
| **RF-CAT-05-03** | RF | Colores | El sistema debe agrupar los colores en familias cromáticas administrables, derivándolas del valor cromático cuando no se declaren, y debe permitir la carga masiva de colores. | Deducido | Alta |
| **RF-CAT-05-04** | RF | Modelo color | El sistema debe distinguir el uso que un producto hace de un color: en un producto entonable pertenece a la carta; en un producto de colores fijos identifica una variante concreta. | Definido | Alta |
| **RF-CAT-05-05** | RF | Modelo color | El sistema debe desactivar las variantes asociadas a un color que se desactive cuando ese color identifique variantes de colores fijos. Si es entonable, se retira de la carta sin afectar variantes de la base. | Definido | Alta |
| **RF-CAT-05-06** | RF | Modelo color | El sistema debe ofrecer la tonalidad de un producto entonable como un conjunto finito de colores administrados (la carta) y no debe admitir la selección de un color arbitrario. | Definido | Alta |
| **RF-CAT-05-20** | RF | Colores | *PENDIENTE:* de dónde se obtiene el valor cromático de la carta, si de la carta del fabricante, del archivo de SAMIT o de una medición. | Pendiente | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión del catálogo».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-05-01:**
  - **Dado que** existe una marca activa
  - **Cuando** registro un color con nombre comercial y esa marca
  - **Entonces** queda disponible para la carta de esa marca.
- **CA-CAT-05-02:**
  - **Dado que** registro un color sin marca
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide; y cuando lo registro sin código, entonces lo permite.
- **CA-CAT-05-03:**
  - **Dado que** un color pertenece a una marca
  - **Cuando** intento ofrecerlo en un producto de otra marca
  - **Entonces** el sistema rechaza la operación.
- **CA-CAT-05-04:**
  - **Dado que** registro un color sin cargar imagen
  - **Cuando** lo guardo
  - **Entonces** el sistema lo registra y genera su muestra a partir del valor CIELAB.
- **CA-CAT-05-05:**
  - **Dado que** el catálogo contiene miles de colores
  - **Cuando** filtro por una familia cromática
  - **Entonces** el sistema muestra únicamente los de esa familia.
- **CA-CAT-05-06:**
  - **Dado que** cargo un archivo con dos mil colores
  - **Cuando** la carga termina
  - **Entonces** todos quedan registrados con su valor cromático y su familia.
- **CA-CAT-05-07:**
  - **Dado que** un color solo pertenece a la carta de productos entonables
  - **Cuando** lo desactivo
  - **Entonces** la base y sus variantes siguen activas y el color deja de ofrecerse.
- **CA-CAT-05-08:**
  - **Dado que** desactivo un color que identifica variantes de un anticorrosivo de colores fijos
  - **Cuando** consulto esas variantes
  - **Entonces** todas quedan desactivadas.
- **CA-CAT-05-09:**
  - **Dado que** un color está asignado a variantes
  - **Cuando** intento eliminarlo
  - **Entonces** el sistema lo impide y ofrece desactivarlo.
- **CA-CAT-05-10:**
  - **Dado que** consulto un producto entonable
  - **Cuando** elijo su tonalidad
  - **Entonces** solo puedo escoger colores de la carta y no señalar uno arbitrario.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-05.png)

---

### HU-CAT-02: Gestión de productos
> **Como** administrador del catálogo  
> **Quiero** registrar y mantener la información común de cada producto  
> **Para** que el cliente encuentre una ficha completa y coherente con independencia de la presentación que elija.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-02-01** | RF | Productos | El sistema debe permitir registrar, editar, consultar, buscar y cambiar estado de productos desde el panel, conservando información de forma independiente a variantes. | Definido | Alta |
| **RF-CAT-02-02** | RF | Integridad | El sistema debe exigir marca y al menos una subcategoría; debe exigir línea y resina a pinturas, y admitir que un producto sin color (ej. brocha) no los declare. | Definido | Alta |
| **RF-CAT-02-03** | RF | Modelo color | El sistema debe exigir que todo producto declare su clase (entonable, colores fijos o sin color), impidiendo cambiarla cuando ya tenga variantes. | Definido | Alta |
| **RF-CAT-02-04** | RF | Productos | El sistema debe administrar el tipo de resina como catálogo administrable y no como lista en el código. | Definido | Alta |
| **RF-CAT-02-05** | RF | Integridad | El sistema debe impedir publicar un producto que no tenga al menos una variante activa y al menos una imagen. | Definido | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión de productos».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-02-01:**
  - **Dado que** tengo permiso de gestión de productos
  - **Cuando** registro un producto con nombre, marca, línea y subcategoría válidos
  - **Entonces** el sistema lo registra.
- **CA-CAT-02-02:**
  - **Dado que** registro un vinilo sin marca, sin subcategoría o sin línea
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide e indica el dato que falta.
- **CA-CAT-02-03:**
  - **Dado que** registro una brocha
  - **Cuando** dejo vacíos la línea y el tipo de resina
  - **Entonces** el sistema permite guardarla.
- **CA-CAT-02-04:**
  - **Dado que** registro un producto sin declarar su clase de color
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide.
- **CA-CAT-02-05:**
  - **Dado que** un producto entonable ya tiene variantes
  - **Cuando** intento declararlo de colores fijos
  - **Entonces** el sistema lo impide e indica que debe retirar antes sus variantes.
- **CA-CAT-02-06:**
  - **Dado que** un producto no tiene ninguna variante activa o ninguna imagen
  - **Cuando** intento publicarlo
  - **Entonces** el sistema lo impide e indica el motivo.
- **CA-CAT-02-07:**
  - **Dado que** modifico la descripción de un producto
  - **Cuando** se guarda
  - **Entonces** el cambio se refleja en el catálogo público y no altera ninguna orden ya creada.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-02.png)

---

### HU-CAT-10: Atributos técnicos del producto
> **Como** administrador del catálogo  
> **Quiero** registrar los datos técnicos de cada producto, y en particular cuánto rinde  
> **Para** que el cliente sepa qué esperar del producto y la calculadora pueda decirle cuánto comprar.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-10-01** | RF | Atributos | El sistema debe administrar los atributos técnicos como un catálogo propio e independiente del producto, permitiendo asociar a cada producto únicamente los que le apliquen. | Definido | Alta |
| **RF-CAT-10-02** | RF | Rendimiento | El sistema debe admitir el rendimiento como atributo técnico, expresado en m² por galón y por mano, con un valor mínimo y uno máximo. | Definido | Alta |
| **RF-CAT-10-03** | RF | Rendimiento | El sistema debe derivar el rendimiento de cada presentación a partir del registrado por galón y del volumen de la presentación, sin capturarlo una por una. | Definido | Alta |
| **RF-CAT-10-04** | RF | Catál. público | El sistema debe presentar los atributos en la ficha; al mostrar el rendimiento, referirlo a la presentación seleccionada y advertir que es aproximado. | Definido | Media |
| **RF-CAT-10-05** | RF | Integridad | El sistema debe exigir que el rendimiento sea mayor a cero y el valor mínimo no supere al máximo. | Deducido | Alta |
| **RF-CAT-10-06** | RF | Trazabilidad | El sistema debe conservar en la línea de la compra el rendimiento con que se calculó una recomendación (para inmutabilidad de la orden). | Deducido | Media |
| **RF-CAT-10-07** | RF | Atributos | *PENDIENTE:* qué otros atributos técnicos se registran además del rendimiento. | Pendiente | Media |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Exige validación en servidor del permiso «Gestión del catálogo».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-10-01:**
  - **Dado que** registro un vinilo con rendimiento de 25 m² por galón
  - **Cuando** lo guardo
  - **Entonces** el sistema lo acepta con mínimo y máximo iguales.
- **CA-CAT-10-02:**
  - **Dado que** registro un esmalte con rendimiento de 15 a 20 m² por galón
  - **Cuando** lo guardo
  - **Entonces** el sistema conserva los dos extremos.
- **CA-CAT-10-03:**
  - **Dado que** registro un rendimiento cuyo mínimo es mayor que su máximo
  - **Cuando** intento guardar
  - **Entonces** el sistema lo impide e indica el motivo.
- **CA-CAT-10-04:**
  - **Dado que** registro un rodillo sin ningún atributo técnico
  - **Cuando** lo guardo
  - **Entonces** el sistema lo acepta y su ficha no muestra ningún campo técnico vacío.
- **CA-CAT-10-05:**
  - **Dado que** un vinilo rinde 25 m² por galón
  - **Cuando** consulto su presentación de un cuarto de galón
  - **Entonces** la ficha indica 6,25 m² por mano.
- **CA-CAT-10-06:**
  - **Dado que** consulto la ficha de un producto con rendimiento
  - **Cuando** la reviso
  - **Entonces** el dato aparece referido a la presentación seleccionada y advertido como aproximado.
- **CA-CAT-10-07:**
  - **Dado que** soy un empleado sin el permiso de gestión del catálogo
  - **Cuando** intento administrar los atributos técnicos
  - **Entonces** el sistema me lo deniega.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-10.png)

---

### HU-CAT-03: Gestión de variantes
> **Como** administrador del catálogo  
> **Quiero** registrar las presentaciones comerciales de un producto  
> **Para** que cada una tenga su propio precio y su propia existencia, y el cliente pueda elegir exactamente la que necesita.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-03-01** | RF | Variantes | El sistema debe permitir registrar, editar y desactivar variantes asociadas a un producto existente, sin eliminarlas físicamente. | Definido | Alta |
| **RF-CAT-03-02** | RF | Mod. variante | El sistema debe determinar la forma de la variante según clase: (producto+base+presentación) si entonable; (producto+color+presentación) si fijo; (producto+presentación) si sin color. | Definido | Alta |
| **RF-CAT-03-03** | RF | Integridad | El sistema debe impedir dos variantes idénticas del mismo producto, impedir asignar color/base de otra marca, e impedir existencia referencial negativa. | Definido | Alta |
| **RF-CAT-03-04** | RF | Mod. variante | El sistema debe llevar la existencia referencial y el precio sobre la variante física (nunca sobre el color aislado). | Definido | Alta |
| **RF-CAT-03-05** | RF | Presentaciones | El sistema debe administrar la presentación como entidad propia (con nombre y volumen numérico) para permitir la comparación de precios. | Definido | Alta |
| **RF-CAT-03-06** | RF | Identificación | El sistema debe generar su propio ID interno e impedir que dos variantes compartan el mismo código de proveedor (SAMIT). | Definido | Alta |
| **RF-CAT-03-07** | RF | Catál. público | El sistema debe actualizar el precio e información mostrada al cambiar de presentación o color en la ficha del producto. | Definido | Alta |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Permisos (M17):** Requiere permiso «Gestión de productos».

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-03-01:**
  - **Dado que** existe un producto entonable activo
  - **Cuando** registro una variante con base y presentación válidas
  - **Entonces** queda asociada al producto.
- **CA-CAT-03-02:**
  - **Dado que** un producto entonable ya tiene una variante sobre una base en un galón
  - **Cuando** intento registrar otra igual
  - **Entonces** el sistema la rechaza.
- **CA-CAT-03-03:**
  - **Dado que** registro una variante de un producto entonable
  - **Cuando** intento asignarle un color en lugar de una base
  - **Entonces** el sistema lo impide.
- **CA-CAT-03-04:**
  - **Dado que** registro una variante de una brocha
  - **Cuando** dejo vacíos la base y el color
  - **Entonces** el sistema permite guardarla.
- **CA-CAT-03-05:**
  - **Dado que** un anticorrosivo viene en rojo y en gris
  - **Cuando** registro una variante para cada color en un galón
  - **Entonces** el sistema admite ambas.
- **CA-CAT-03-06:**
  - **Dado que** la base seleccionada no pertenece a la marca del producto
  - **Cuando** intento guardar
  - **Entonces** el sistema rechaza el registro.
- **CA-CAT-03-11:**
  - **Dado que** introduzco una existencia referencial negativa
  - **Cuando** intento guardar la variante
  - **Entonces** el sistema lo impide.
- **CA-CAT-03-07:**
  - **Dado que** registro una variante nueva
  - **Cuando** el sistema la guarda
  - **Entonces** le asigna un identificador propio sin que yo lo haya introducido.
- **CA-CAT-03-08:**
  - **Dado que** ya existe una variante con un código de proveedor
  - **Cuando** intento registrar otra con ese mismo código
  - **Entonces** el sistema la rechaza.
- **CA-CAT-03-09:**
  - **Dado que** un producto tiene varias presentaciones activas
  - **Cuando** el cliente selecciona otra en la ficha
  - **Entonces** el sistema actualiza el precio y la información mostrada.
- **CA-CAT-03-10:**
  - **Dado que** una presentación está asociada a variantes
  - **Cuando** intento eliminarla
  - **Entonces** el sistema lo impide y ofrece únicamente desactivarla.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-03.png)

---

### HU-CAT-13: Gestión de combos
> **Como** administrador  
> **Quiero** armar combos y venderlos como un producto más  
> **Para** ofrecer un paquete a precio propio sin que el sistema tenga que saber de qué está hecho.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-13-01** | RF | Combos | El sistema debe permitir registrar un combo como producto propio, sin exigir que declare de qué productos se compone, y marcarlo excluido de descuentos si es necesario. | Definido | Alta |
| **RF-CAT-13-02** | RF | Combos | El sistema debe impedir vender más unidades de un combo de las que su existencia declare (excepción a la regla de venta sin stock). | Definido | Alta |
| **RF-CAT-13-03** | RF | Combos | El sistema debe descontar la existencia del combo al generarse la orden e impedir que quede por debajo de cero. | Deducido | Alta |
| **RF-CAT-13-04** | RF | Combos | El sistema debe presentar el combo como agotado cuando su existencia llegue a cero, y excluirlo de los complementarios. | Deducido | Alta |
| **RF-CAT-13-05** | RF | Combos | El sistema debe permitir ajustar la existencia de un combo desde el panel y excluirla de toda importación desde SAMIT. | Definido | Alta |
| **RF-CAT-13-09** | RF | Combos | *PENDIENTE:* si un combo puede contener productos de más de una marca y qué marca se le atribuye. | Pendiente | Media |

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-13-01:**
  - **Dado que** soy administrador
  - **Cuando** registro un combo de tres brochas con nombre, foto, precio y existencia
  - **Entonces** queda a la venta como un producto más.
- **CA-CAT-13-02:**
  - **Dado que** registro un combo
  - **Cuando** no declaro qué productos lo componen
  - **Entonces** el sistema permite guardarlo.
- **CA-CAT-13-03:**
  - **Dado que** un combo tiene dos unidades y un cliente intenta comprar tres
  - **Cuando** lo intenta
  - **Entonces** el sistema lo impide, a diferencia de cualquier otro producto.
- **CA-CAT-13-04:**
  - **Dado que** veinte clientes tienen el combo en el carrito
  - **Cuando** consulto su existencia
  - **Entonces** no ha bajado.
- **CA-CAT-13-05:**
  - **Dado que** quedan dos unidades y dos clientes pagan a la vez pidiendo dos cada uno
  - **Cuando** ambas órdenes se procesan
  - **Entonces** solo una se completa y la existencia no queda negativa.
- **CA-CAT-13-06:**
  - **Dado que** la existencia llega a cero
  - **Cuando** un visitante consulta el combo
  - **Entonces** lo ve agotado y no puede comprarlo.
- **CA-CAT-13-07:**
  - **Dado que** se cancela una orden con un combo
  - **Cuando** consulto su existencia
  - **Entonces** la unidad ha vuelto.
- **CA-CAT-13-08:**
  - **Dado que** ejecuto una importación con el ámbito de existencias seleccionado
  - **Cuando** termina
  - **Entonces** la existencia de los combos no ha cambiado.
- **CA-CAT-13-09:**
  - **Dado que** un combo está excluido de descuentos
  - **Cuando** un cliente empresa lo compra
  - **Entonces** se le cobra su precio sin rebaja.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-13.png)

---

### HU-CAT-06: Consulta pública del catálogo
> **Como** visitante  
> **Quiero** explorar el catálogo completo sin tener que registrarme  
> **Para** conocer la oferta antes de decidir si creo una cuenta.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-06-01** | RF | Catál. público | El sistema debe permitir consultar el catálogo sin autenticación, abriendo fichas de detalle. | Definido | Alta |
| **RF-CAT-06-02** | RF | Catál. público | El sistema debe ocultar categorías sin ningún producto activo, e informar no disponibilidad si se accede directamente a una ficha inactiva. | Definido | Media |
| **RF-CAT-06-03** | RF | Catál. público | El sistema debe presentar la carta de un producto entonable de forma navegable por familia cromática y buscable por código o nombre, sin cargarla completa en una vez. | Deducido | Alta |
| **RF-CAT-06-04** | RF | Catál. público | El sistema debe presentar solo los colores de la marca que pueden prepararse sobre una base activa de ese producto. | Deducido | Alta |
| **RNF-CAT-06-01** | RNF| Rendimiento | El sistema no debe cargar la totalidad del catálogo en el navegador; la consulta debe resolverse por páginas y bajo demanda. | Definido | Alta |

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-06-01:**
  - **Dado que** no he iniciado sesión
  - **Cuando** accedo al catálogo
  - **Entonces** consulto categorías, productos, presentaciones y colores sin que se me solicite autenticación.
- **CA-CAT-06-02:**
  - **Dado que** consulto la ficha de un producto entonable
  - **Cuando** selecciono color y presentación
  - **Entonces** el sistema muestra la información y el precio correspondientes.
- **CA-CAT-06-03:**
  - **Dado que** un producto está inactivo
  - **Cuando** intento acceder a su ficha
  - **Entonces** el sistema informa que no está disponible.
- **CA-CAT-06-04:**
  - **Dado que** una categoría no tiene productos activos
  - **Cuando** reviso la navegación
  - **Entonces** no aparece.
- **CA-CAT-06-05:**
  - **Dado que** consulto un listado extenso
  - **Cuando** la página carga
  - **Entonces** el sistema no descarga el catálogo completo sino la página solicitada.
- **CA-CAT-06-06:**
  - **Dado que** abro la carta de un producto con miles de colores
  - **Cuando** la página carga
  - **Entonces** el navegador recibe la familia que consulto y no la carta completa.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-06.png)

---

### HU-CAT-07: Imágenes del producto
> **Como** visitante  
> **Quiero** ver imágenes del producto y del color que estoy considerando  
> **Para** hacerme una idea del acabado antes de comprar.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-07-01** | RF | Conten. visual | El sistema debe permitir cargar, reemplazar, eliminar y ordenar las imágenes de un producto. | Definido | Alta |
| **RF-CAT-07-02** | RF | Conten. visual | El sistema debe permitir asociar una imagen específica a una variante o a un color. | Definido | Alta |
| **RF-CAT-07-03** | RF | Conten. visual | El sistema debe almacenar las imágenes en su propia infraestructura. | Definido | Alta |
| **RNF-CAT-07-01**| RNF| Rendimiento | El sistema debe generar y servir miniaturas e imágenes optimizadas en todos los listados, aplicando caché. | Deducido | Alta |

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-07-01:**
  - **Dado que** tengo permiso de gestión de productos
  - **Cuando** cargo una imagen válida
  - **Entonces** el sistema la asocia al producto y la muestra en su ficha.
- **CA-CAT-07-02:**
  - **Dado que** un producto tiene varias imágenes
  - **Cuando** defino cuál es la principal
  - **Entonces** es la que aparece en los listados.
- **CA-CAT-07-03:**
  - **Dado que** un color de la carta tiene imagen asociada
  - **Cuando** el cliente lo selecciona
  - **Entonces** se muestra esa imagen.
- **CA-CAT-07-04:**
  - **Dado que** consulto un listado
  - **Cuando** la página carga
  - **Entonces** las imágenes descargadas son miniaturas y no las de tamaño completo.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-07.png)

---

### HU-CAT-08: Productos complementarios
> **Como** cliente  
> **Quiero** ver productos complementarios cuando consulto un artículo  
> **Para** no olvidar los accesorios que necesito para completar mi trabajo.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-08-01** | RF | Complemen. | El sistema debe permitir asociar a un producto o categoría la categoría de la que se extraen sus complementarios. | Definido | Media |
| **RF-CAT-08-02** | RF | Complemen. | El sistema debe presentar hasta 4 productos, priorizando los patrocinados; si no hay configurados, mostrar solo patrocinados, si no hay ninguno, ocultar la sección. | Definido | Media |
| **RF-CAT-08-03** | RF | Complemen. | El sistema debe excluir el propio producto consultado, variantes inactivos y combos agotados. No debe sugerirlos en el carrito. | Deducido | Media |

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-08-01:**
  - **Dado que** asocio una categoría complementaria a un producto
  - **Cuando** abro su ficha
  - **Entonces** se presentan productos activos de esa categoría.
- **CA-CAT-08-02:**
  - **Dado que** la categoría complementaria contiene productos patrocinados
  - **Cuando** consulto la ficha
  - **Entonces** aparecen antes que los no patrocinados; cuando no los contiene, aparecen al azar.
- **CA-CAT-08-03:**
  - **Dado que** el producto no tiene categoría configurada y no hay patrocinados
  - **Cuando** consulto su ficha
  - **Entonces** no se muestra la sección.
- **CA-CAT-08-04:**
  - **Dado que** consulto la ficha de un producto
  - **Cuando** se presentan los complementarios
  - **Entonces** el propio producto no aparece entre ellos.
- **CA-CAT-08-05:**
  - **Dado que** estoy en el carrito
  - **Cuando** reviso su contenido
  - **Entonces** el sistema no me sugiere complementarios.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-08.png)

---

### HU-CAT-09: Estado y ciclo de vida del catálogo
> **Como** administrador  
> **Quiero** retirar del catálogo un producto o una variante sin borrar su información  
> **Para** dejar de venderlo sin perder el historial de las ventas ya realizadas.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-09-01** | RF | Baja lógica | El sistema debe impedir la eliminación física de todo elemento que esté referenciado por una orden o entidad hija, ofreciendo únicamente su desactivación. | Definido | Alta |
| **RF-CAT-09-02** | RF | Catál. público | El sistema debe excluir del catálogo público todo elemento desactivado, sin afectar las órdenes ya creadas. | Definido | Alta |
| **RF-CAT-09-03** | RF | Baja lógica | El sistema debe informar, antes de desactivar, qué otros elementos quedarán desactivados en cascada. | Deducido | Media |
| **RF-CAT-09-04** | RF | Baja lógica | El sistema debe permitir reactivar un elemento, verificando antes que sus dependencias (marca, línea, base, color, etc.) estén activas. | Deducido | Media |

#### Criterios de Aceptación (Gherkin)
- **CA-CAT-09-01:**
  - **Dado que** una variante está referenciada por una orden
  - **Cuando** intento eliminarla
  - **Entonces** el sistema lo impide y ofrece desactivarla.
- **CA-CAT-09-02:**
  - **Dado que** desactivo un producto
  - **Cuando** un visitante consulta el catálogo
  - **Entonces** no aparece; y cuando consulto una orden anterior que lo contiene, muestra sus datos intactos.
- **CA-CAT-09-03:**
  - **Dado que** voy a desactivar una línea
  - **Cuando** confirmo
  - **Entonces** el sistema me enumera antes qué productos dejarán de verse.
- **CA-CAT-09-04:**
  - **Dado que** un producto desactivado pertenece a tres subcategorías y dos fueron desactivadas
  - **Cuando** lo reactivo
  - **Entonces** el sistema lo permite porque conserva una activa.
- **CA-CAT-09-05:**
  - **Dado que** reactivo una variante entonable cuya base fue desactivada
  - **Cuando** lo intento
  - **Entonces** el sistema lo impide e indica que la base no está activa.
- **CA-CAT-09-06:**
  - **Dado que** reactivo una variante de una brocha
  - **Cuando** el sistema verifica sus dependencias
  - **Entonces** no exige comprobación de base ni de color.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M01/HU-CAT-09.png)
