# M02. Búsqueda y navegación
**Dominio:** Catálogo / Comercio  
**Prefijo de Historias:** BUS  

---

## 1. Propósito y Alcance
El módulo M02 centraliza los mecanismos que permiten al usuario encontrar productos dentro del catálogo sin requerir navegación jerárquica estricta. Incluye un buscador de texto libre tolerante a errores, un sistema de filtrado avanzado multielección y opciones de ordenamiento de resultados. 

Este módulo está diseñado para responder con alto rendimiento (paginación y caché) y de forma anónima (sin exigir inicio de sesión). Además, implementa analíticas sobre las búsquedas fallidas, proveyendo al negocio una herramienta valiosa para identificar carencias en la oferta comercial.

## 2. Dependencias y Relaciones
- **Depende de:** M01 Catálogo de productos (fuente de datos indexable: productos, variantes, colores, marcas y líneas), M06 Reglas y Descuentos (para calcular el precio real aplicable en los filtros por rango de precio).
- **Habilita a:** M05 Carrito de compras (al facilitar que el usuario encuentre productos para agregar).
- **Transversales Aplicables:**
  - 🔒 **M20 Seguridad:** Protección y anonimización de la información. El historial de búsquedas sin resultados no debe asociarse a la identidad del usuario en ningún registro.
  - 🛡️ **M17 Permisos:** Exige el permiso «Consultar estadísticas» para que un empleado/administrador pueda revisar el registro de búsquedas fallidas.
  - 📧 **M18 Notificaciones:** N/A.

---

## 3. Tabla Resumen de Historias de Usuario
| ID | Historia de Usuario | Actores | Prioridad | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-BUS-01** | Búsqueda de productos | Visitante / Cliente | Alta | Definido |
| **HU-BUS-02** | Filtros del catálogo | Visitante / Cliente | Alta | Definido |
| **HU-BUS-03** | Ordenamiento de resultados | Visitante / Cliente | Alta | Definido |
| **HU-BUS-05** | Paginación de resultados | Visitante / Cliente | Alta | Definido |
| **HU-BUS-06** | Registro de búsquedas sin resultado | Administrador | Baja | Definido |
| **HU-BUS-04** | Prioridad de patrocinio en resultados | N/A | N/A | *Bloqueada / Descartada* |

---

## 4. Especificación Detallada por Historia de Usuario

### HU-BUS-01: Búsqueda de productos
> **Como** visitante  
> **Quiero** buscar productos escribiendo lo que necesito  
> **Para** llegar rápido al artículo sin recorrer todo el catálogo.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-BUS-01-01** | RF | Búsqueda | El sistema debe permitir buscar productos mediante texto libre y sin autenticación, sin exigir longitud mínima. Si el término está vacío, debe mostrar el catálogo completo. | Definido | Alta |
| **RF-BUS-01-02** | RF | Búsqueda | El sistema debe resolver en el servidor tanto la búsqueda como la aplicación de filtros, y no en el navegador. | Definido | Alta |
| **RF-BUS-01-03** | RF | Búsqueda | El sistema debe buscar sobre el nombre del producto, marca, línea, color y descripción, con independencia de mayúsculas y acentos, tolerando errores tipográficos y devolviendo resultados aproximados. | Definido | Alta |
| **RF-BUS-01-04** | RF | Búsqueda | El sistema debe presentar cada producto una sola vez aunque varias de sus variantes coincidan, excluir inactivos, e informar cuando no haya resultados. | Deducido | Alta |
| **RF-BUS-01-05** | RF | Búsqueda | El sistema debe permitir buscar un color de la carta por su nombre y presentar los productos que pueden entregarse en ese color (preparados o entonados). | Deducido | Alta |
| **RF-BUS-01-06** | RF | Resiliencia | El sistema debe informar con claridad y sin exponer errores técnicos cuando el servicio de búsqueda falle, y mantener accesibles el inicio y el catálogo. | Deducido | Alta |
| **RNF-BUS-01-01**| RNF| Rendimiento| El sistema debe devolver los resultados de una búsqueda en un máximo de 5 segundos. | Definido | Alta |

#### Criterios de Aceptación (Gherkin)
- **CA-BUS-01-01:**
  - **Dado que** existen productos activos cuyo nombre contiene el término
  - **Cuando** busco
  - **Entonces** el sistema los devuelve; cuando ninguno coincide, entonces informa que no hay resultados.
- **CA-BUS-01-02:**
  - **Dado que** busco con acentos o en mayúsculas
  - **Cuando** ejecuto la búsqueda
  - **Entonces** obtengo los mismos resultados que sin ellos.
- **CA-BUS-01-03:**
  - **Dado que** un producto está inactivo
  - **Cuando** busco su nombre
  - **Entonces** no aparece.
- **CA-BUS-01-04:**
  - **Dado que** no he iniciado sesión
  - **Cuando** busco
  - **Entonces** el sistema devuelve resultados sin solicitarme autenticación.
- **CA-BUS-01-05:**
  - **Dado que** busco el nombre de una línea o de un color de la carta
  - **Cuando** ejecuto la búsqueda
  - **Entonces** obtengo los productos correspondientes.
- **CA-BUS-01-06:**
  - **Dado que** tres variantes de un producto coinciden con el término
  - **Cuando** reviso los resultados
  - **Entonces** el producto aparece una sola vez.
- **CA-BUS-01-07:**
  - **Dado que** el servicio de búsqueda no está disponible
  - **Cuando** intento buscar
  - **Entonces** el sistema me lleva al inicio e informa sin exponer ningún error técnico.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M02/HU-BUS-01.png)

---

### HU-BUS-02: Filtros del catálogo
> **Como** visitante  
> **Quiero** refinar los resultados combinando varios filtros a la vez  
> **Para** reducir una lista larga a las pocas opciones que realmente me sirven.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-BUS-02-01** | RF | Filtros | El sistema debe permitir filtrar productos por categoría, subcategoría, marca, línea, tipo de resina, color, familia cromática, presentación y rango de precio, aplicables de forma simultánea y admitiendo varios valores. | Definido | Alta |
| **RF-BUS-02-02** | RF | Filtros | El sistema debe ofrecer en cada filtro únicamente los valores que producen resultados, permitir eliminar uno o todos a la vez, e informar cuando no produzca resultados. | Deducido | Alta |
| **RF-BUS-02-03** | RF | Filtros | El sistema debe devolver productos (no variantes) al aplicar filtros de color/presentación/precio, e incluir en color tanto los preparados como los entonables. | Definido | Alta |
| **RF-BUS-02-04** | RF | Filtros | El sistema debe aplicar el filtro de precio sobre el precio final tras descuentos, IVA incluido. Debe rechazar rangos donde el mínimo supere al máximo. | Definido | Alta |
| **RF-BUS-02-05** | RF | Filtros | El sistema debe mantener disponibles los filtros aunque existan productos patrocinados y permitir compartir/recuperar filtros mediante la URL. | Definido | Media |

#### Criterios de Aceptación (Gherkin)
- **CA-BUS-02-01:**
  - **Dado que** aplico simultáneamente un filtro de categoría y uno de color
  - **Cuando** se cargan los resultados
  - **Entonces** solo se muestran productos que cumplen ambas condiciones.
- **CA-BUS-02-02:**
  - **Dado que** filtro por tipo de resina base agua
  - **Cuando** se cargan los resultados
  - **Entonces** aparecen los vinilos y no los esmaltes.
- **CA-BUS-02-03:**
  - **Dado que** selecciono dos marcas a la vez
  - **Cuando** se cargan los resultados
  - **Entonces** aparecen productos de ambas.
- **CA-BUS-02-04:**
  - **Dado que** la combinación de filtros no tiene coincidencias
  - **Cuando** se cargan los resultados
  - **Entonces** el sistema lo informa.
- **CA-BUS-02-05:**
  - **Dado que** he aplicado varios filtros
  - **Cuando** elimino uno
  - **Entonces** los resultados se recalculan manteniendo los restantes; cuando avanzo de página, siguen aplicados.
- **CA-BUS-02-06:**
  - **Dado que** indico un rango con el mínimo superior al máximo
  - **Cuando** intento aplicarlo
  - **Entonces** el sistema lo impide e informa del error.
- **CA-BUS-02-07:**
  - **Dado que** soy cliente empresa con condiciones vigentes
  - **Cuando** filtro por rango de precio
  - **Entonces** el filtro opera sobre los precios que a mí se me aplican.
- **CA-BUS-02-08:**
  - **Dado que** filtro por un color de carta
  - **Cuando** se cargan los resultados
  - **Entonces** aparecen tanto los productos que lo traen preparado como los que pueden entonarlo.
- **CA-BUS-02-09:**
  - **Dado que** los resultados contienen productos patrocinados
  - **Cuando** aplico un filtro
  - **Entonces** se aplica también a ellos.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M02/HU-BUS-02.png)

---

### HU-BUS-03: Ordenamiento de resultados
> **Como** visitante  
> **Quiero** poder cambiar el orden en que se presentan los resultados  
> **Para** priorizar según lo que me importa en ese momento, como el precio.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-BUS-03-01** | RF | Orden | El sistema debe permitir cambiar el orden entre relevancia, precio ascendente, precio descendente y novedad, aplicando por defecto el criterio configurable. | Definido | Alta |
| **RF-BUS-03-02** | RF | Orden | El sistema debe calcular relevancia ponderando (de mayor a menor): nombre, marca, línea, color y descripción. Debe priorizar coincidencia exacta sobre aproximada. | Deducido | Alta |
| **RF-BUS-03-03** | RF | Orden | El sistema debe aplicar un desempate estable por nombre del producto entre resultados de igual relevancia para no variar el orden en consultas idénticas. | Deducido | Media |

#### Criterios de Aceptación (Gherkin)
- **CA-BUS-03-01:**
  - **Dado que** existen resultados
  - **Cuando** selecciono un criterio de ordenamiento
  - **Entonces** se reordenan conforme a él; cuando avanzo de página, el criterio sigue aplicado.
- **CA-BUS-03-02:**
  - **Dado que** no he elegido criterio
  - **Cuando** se cargan los resultados
  - **Entonces** se aplica el orden por defecto configurado.
- **CA-BUS-03-03:**
  - **Dado que** dos resultados tienen la misma relevancia
  - **Cuando** se presentan
  - **Entonces** el orden no varía entre consultas idénticas.
- **CA-BUS-03-04:**
  - **Dado que** un producto no contiene el término buscado
  - **Cuando** su marca está patrocinada
  - **Entonces** no aparece entre los resultados (relevancia 0 no se eleva por patrocinio).
- **CA-BUS-03-05:**
  - **Dado que** soy cliente empresa y ordeno por precio ascendente
  - **Cuando** se cargan los resultados
  - **Entonces** el orden corresponde a los precios que a mí se me aplican.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M02/HU-BUS-03.png)

---

### HU-BUS-05: Paginación de resultados
> **Como** visitante  
> **Quiero** que los resultados se carguen por partes y con rapidez  
> **Para** poder navegar el catálogo con comodidad aunque crezca mucho.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-BUS-05-01** | RF | Paginación | El sistema debe entregar resultados por páginas del tamaño configurado, sin cargar el conjunto completo. Debe indicar total de resultados, página actual y conservar filtros/orden. | Definido | Alta |
| **RF-BUS-05-02** | RF | Paginación | El sistema debe ofrecer páginas numeradas, responder sin error ante solicitudes que exceden el total, y no reordenar dinámicamente mientras el usuario navega. | Definido | Media |
| **RNF-BUS-05-01**| RNF| Compatib. | La paginación debe poder operarse en móvil, tableta y escritorio sin perder funcionalidad ni exigir desplazamiento horizontal. | Deducido | Alta |
| **RNF-BUS-05-02**| RNF| Rendimiento| El sistema debe sostener la navegación paginada sobre un catálogo de decenas de miles de variantes. | Deducido | Alta |

#### Criterios de Aceptación (Gherkin)
- **CA-BUS-05-01:**
  - **Dado que** una consulta produce más resultados de los que caben en una página
  - **Cuando** se carga la primera
  - **Entonces** el navegador recibe únicamente esos resultados.
- **CA-BUS-05-02:**
  - **Dado que** estoy en la primera página
  - **Cuando** avanzo
  - **Entonces** veo los siguientes resultados conservando filtros y ordenamiento.
- **CA-BUS-05-03:**
  - **Dado que** consulto desde un móvil
  - **Cuando** navego entre páginas
  - **Entonces** dispongo de las mismas funciones que en escritorio y sin desplazamiento horizontal.
- **CA-BUS-05-04:**
  - **Dado que** solicito una página que excede el total
  - **Cuando** se procesa
  - **Entonces** el sistema responde sin error.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M02/HU-BUS-05.png)

---

### HU-BUS-06: Registro de búsquedas sin resultado
> **Como** administrador  
> **Quiero** conocer qué buscan los usuarios sin encontrar resultado  
> **Para** detectar qué productos me están faltando en el catálogo.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-BUS-06-01** | RF | Analítica | El sistema debe registrar los términos de búsqueda que no producen resultados con su fecha y repeticiones, sin asociarlos a identidad de quien buscó, conservándolos por el periodo configurado. | Definido | Baja |
| **RF-BUS-06-02** | RF | Analítica | El sistema debe permitir consultar esos términos ordenados por frecuencia y acotados a un periodo (diario, semanal, mensual, anual). | Deducido | Baja |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Seguridad (M20):** La identidad del usuario (incluso si está logueado) debe ser omitida estrictamente del registro.
- **Permisos (M17):** Exige validación en servidor del permiso «Consultar estadísticas».

#### Criterios de Aceptación (Gherkin)
- **CA-BUS-06-01:**
  - **Dado que** varios usuarios buscan el mismo término sin resultado
  - **Cuando** consulto el listado
  - **Entonces** aparece una sola vez con su número de repeticiones.
- **CA-BUS-06-02:**
  - **Dado que** consulto el listado
  - **Cuando** lo reviso
  - **Entonces** no aparece la identidad de ningún usuario.
- **CA-BUS-06-03:**
  - **Dado que** soy un empleado sin el permiso de consultar estadísticas
  - **Cuando** intento abrirlo
  - **Entonces** el sistema me lo deniega.

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M02/HU-BUS-06.png)
