# M05. Carrito de compras
**Dominio:** Comercio / Venta  
**Prefijo de Historias:** CAR  

---

## 1. Propósito y Alcance
El módulo M05 gestiona la intención de compra del usuario antes de que se confirme el pago. Permite a visitantes anónimos y clientes autenticados agregar productos al carrito, gestionar cantidades y preparar la orden. El carrito es una entidad *viva*, lo que significa que referencia dinámicamente los precios y el stock del catálogo (M01/M13) hasta el momento exacto del checkout.

Su alcance incluye la persistencia anónima del carrito, la asociación del mismo a una cuenta cuando el usuario se loguea (o se registra), y la revalidación estricta de precios y existencias justo antes de proceder al pago.

## 2. Dependencias y Relaciones
- **Depende de:** M01 Catálogo (para validar qué productos y variantes existen), M04 Cuentas (para autenticación y tipo de cliente), M06 Reglas y Descuentos (para el cálculo de precios, aunque M06 aún no está analizado), M13 Inventario (para validar disponibilidad).
- **Habilita a:** M07 Pasarela de Pagos, M08 Orden de venta.
- **Transversales Aplicables:**
  - 🔒 **M20 Seguridad:** El carrito de un visitante no autenticado se debe identificar mediante un token opaco en el dispositivo, garantizando que no se exijan ni guarden datos personales prematuramente.
  - 🛡️ **M17 Permisos:** N/A (uso libre por clientes).
  - 📧 **M18 Notificaciones:** N/A.

---

## 3. Tabla Resumen de Historias de Usuario
| ID | Historia de Usuario | Actores | Prioridad | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-CAR-01** | Carrito de visitante | Visitante | Alta | Definido |
| **HU-CAR-02** | Gestión de líneas del carrito | Visitante / Cliente | Alta | Definido |
| **HU-CAR-04** | Carrito de cliente | Cliente | Alta | Definido |
| **HU-CAR-05** | Revalidación previa a la compra | Cliente | Alta | Definido |

---

## 4. Especificación Detallada por Historia de Usuario

### HU-CAR-01: Carrito de visitante
> **Como** visitante  
> **Quiero** ir agregando productos a mi carrito mientras navego  
> **Para** no perder los artículos que me interesan antes de decidirme a crear una cuenta.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAR-01-01** | RF | Agregación | El sistema debe permitir al visitante agregar variantes al carrito sin exigirle autenticación previa. | Formalizado | Alta |
| **RF-CAR-01-02** | RF | Autenticac. | El sistema debe diferir la autenticación estrictamente hasta el momento de iniciar la compra. | Formalizado | Alta |
| **RF-CAR-01-03** | RF | Persistencia | El sistema debe conservar el carrito del visitante identificando su dispositivo mediante un token o mecanismo equivalente. | Formalizado | Alta |
| **RNF-CAR-01-01**| RNF| Privacidad | El mecanismo de identificación del carrito de visitante no debe requerir ni almacenar datos personales identificables. | Formalizado | Alta |
| **ADR-01** | ADR | Arquitectura | Se usa un token opaco en cookie o local storage. Si el usuario usa dos dispositivos distintos sin loguearse, los carritos son independientes (pendiente RF-CAR-01-06). | Decisión Técn. | Media |

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M05/HU-CAR-01.png)

---

### HU-CAR-02: Gestión de líneas del carrito
> **Como** visitante o cliente  
> **Quiero** cambiar las cantidades o eliminar productos de mi carrito  
> **Para** ajustar mi compra antes de pagar.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HU-CAR-02** | RF | Gestión | El sistema debe permitir sumar cantidades, restar cantidades o eliminar completamente una línea del carrito. | Formalizado | Alta |
| **RF-CAR-02-0X**| RF | Integridad | Si el usuario agrega una variante que ya existe en el carrito, el sistema debe sumar la cantidad a la línea existente en vez de crear una línea nueva. | Formalizado | Alta |
| **RF-CAR-02-07**| RF | Validación | *PENDIENTE:* Definir la cantidad mínima y máxima admitida por línea del carrito. | Pendiente | Media |

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M05/HU-CAR-02.png)

---

### HU-CAR-04: Carrito de cliente
> **Como** cliente autenticado  
> **Quiero** que el carrito quede asociado a mi cuenta  
> **Para** no perderlo si cierro la sesión y para que se apliquen mis precios preferenciales si soy empresa.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAR-04-01** | RF | Asociación | Al momento de autenticarse, el sistema debe asociar el carrito de visitante a la cuenta del cliente recién logueado. | Formalizado | Alta |
| **RF-CAR-04-02** | RF | Precios | Si la cuenta asociada es de tipo "empresa", el sistema debe recalcular los precios de las líneas aplicando las condiciones empresariales. | Formalizado | Alta |
| **RF-CAR-04-03** | RF | Conflicto | *PENDIENTE:* Definir qué ocurre si la cuenta ya tenía un carrito propio guardado antes de autenticarse (fusión, reemplazar, preguntar). | Pendiente | Alta |

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M05/HU-CAR-04.png)

---

### HU-CAR-05: Revalidación previa a la compra
> **Como** cliente  
> **Quiero** que el sistema me confirme si algo cambió en mi carrito antes de pagar  
> **Para** no llevarme sorpresas con productos agotados o precios modificados.  

#### Requisitos Funcionales y No Funcionales
| ID | Tipo | Categoría | Requisito | Origen | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-CAR-05-01** | RF | Revalidación | El sistema debe revalidar el precio vigente consultando al Catálogo (M01) inmediatamente antes de iniciar el pago. | Formalizado | Alta |
| **RF-CAR-05-02** | RF | Revalidación | El sistema debe revalidar la disponibilidad de existencias (M13) inmediatamente antes del pago. | Formalizado | Alta |
| **RF-CAR-05-04** | RF | Revalidación | El carrito es una referencia viva: lee el precio dinámicamente, no conserva un valor histórico mientras está en estado de carrito. | Formalizado | Alta |
| **RF-CAR-05-05** | RF | Notificación | Si hubo cambios en precio o disponibilidad durante la revalidación, el sistema debe avisar al cliente antes de permitirle continuar hacia la pasarela (M07). | Formalizado | Alta |
| **RF-CAR-05-06** | RF | Excepciones | Las líneas provenientes de una cotización (M21) aceptada quedan excluidas de esta revalidación de precios. | Formalizado | Media |

#### Políticas Transversales Vinculadas (M20 / M17 / M18)
- **Seguridad (M20):** La concurrencia al momento de editar y revalidar el carrito debe controlarse para evitar que múltiples pestañas desincronicen el cálculo final (política recomendada: "última escritura gana").

#### Diagramas de Referencia
![Flujo del Proceso](../assets/diagrams/M05/HU-CAR-05.png)
