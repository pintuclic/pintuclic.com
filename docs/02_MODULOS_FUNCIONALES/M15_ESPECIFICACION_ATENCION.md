# M15. Atención al cliente
**Dominio:** Atención / Soporte comercial  
**Prefijo de Historias:** ATC  
**Fuente de los requisitos:** Tanda 4A — Atención al cliente (versión 3.0, 25 de septiembre de 2026). 5 historias · 19 requisitos funcionales · 0 no funcionales · 21 criterios de aceptación.

---

> ### ⚠️ Corrección del 2026-10-25: las preguntas frecuentes son de M16
>
> **HU-ATC-01 no la construye M15: la cumple M16 Contenido**, que llegó antes a `main`
> con la tabla `faq_entrada`, su administración, la página pública `/centro-de-ayuda`
> y el `ContenidoFaqPort` que su contrato expone precisamente para que M15 las consuma
> (ver `contracts/m16-contenido.contract.ts`, HU-CON-02 y HU-CON-04).
>
> Esta spec decía lo contrario en **RF-ATC-01-06** («pertenece a este módulo y no a M16»).
> Esa línea quedó obsoleta y está corregida más abajo: el equipo resolvió a favor de M16
> para no duplicar la gestión de las FAQ en dos sitios.
>
> **Lo que sí entrega M15:** el formulario de contacto (HU-ATC-02), el canal directo por
> WhatsApp (HU-ATC-03), el horario de atención humana (HU-ATC-04) y la base del
> escalamiento (HU-ATC-05). En `/centro-de-ayuda`, M15 agrega sus secciones debajo de
> las preguntas frecuentes de M16.
>
> El resto del documento se conserva como quedó en el análisis, para no perder la
> trazabilidad de los requisitos.

---

## 1. Propósito y Alcance
El módulo M15 centraliza los canales de contacto y la atención humana de Pintu Clic. Permite recibir solicitudes autenticadas a través del formulario de contacto (consultas, intención de cotización que remite al carrito o reclamos), ofrecer el botón de contacto directo por WhatsApp («Megaconstrucción») con referencia contextual del producto o carrito, configurar y publicar el horario de atención humana, y gestionar el escalamiento de consultas automatizadas hacia asesores autorizados. El listado público de preguntas frecuentes **lo administra y lo publica M16**; M15 lo consume y le suma el contacto con el equipo.

**Qué cambió en la versión 3.0:**
- **HU-ATC-03 deja de estar bloqueada:** el botón «Megaconstrucción» es un enlace al WhatsApp de la empresa para quien va a cotizar una obra entera, y eso se puede especificar hoy. Lo que sigue sin definirse es la integración de WhatsApp para notificaciones y automatización, que es otra cosa.
- Se cierran además los pendientes del tipo cotización del formulario y de la protección frente a envíos automatizados, y se funden los dos que preguntaban lo mismo sobre el escalamiento.

## 2. Dependencias y Relaciones
- **Depende de:**
  - **M04 Cuentas, Autenticación y Perfil:** el formulario de contacto exige sesión iniciada y toma los datos de contacto directamente de la cuenta autenticada (RF-ATC-02-01, RF-ATC-02-04).
  - **M01 Catálogo de Productos** y **M05 Carrito de Compras:** puntos desde donde se invoca el botón de contacto directo por WhatsApp incluyendo la referencia del producto o del carrito (RF-ATC-03-01, RF-ATC-03-03), y destino al que se remite cuando el usuario elige tipo cotización en el formulario (RF-ATC-02-07).
  - **M03 Asesoría e IA (puerto):** origen de las consultas automatizadas que escalan a un asesor humano (HU-ATC-05; RF-ATC-05-04 pendiente de M03).
- **Transversales Aplicables:**
  - 🔒 **M20 Seguridad:** protección frente a envíos automatizados en el formulario de contacto (RF-ATC-02-08) y validación de sesión en servidor.
  - 🛡️ **M17 Permisos:** exige el par `atencion.ver` / `atencion.editar` para las solicitudes de contacto, el horario y el canal de WhatsApp, y «Atender clientes» (`atencion.atender_clientes`, RF-ATC-05-01) para las consultas escaladas. El permiso de las preguntas frecuentes no es de M15: lo define M16 junto con el resto de su contenido.
- **Relación con M16 Contenido:** M16 es el dueño de las preguntas frecuentes y de la página `/centro-de-ayuda`. M15 consume su catálogo publicado por puerto y añade a esa página el formulario de contacto, el horario y el botón de WhatsApp.

---

## 3. Lo que falta definir

### 3.1 El requisito pendiente
La versión anterior traía siete. Tres se cierran: la entrevista aclaró qué es el botón de contacto directo, y la decisión de que cualquier cliente puede solicitar una cotización resuelve qué hace el formulario con una solicitud de ese tipo.

| ID | Qué falta definir | Historia |
| :--- | :--- | :--- |
| **RF-ATC-05-04** | Qué señales o reglas determinan que una consulta debe escalar de la atención automatizada a un humano, y cómo se asigna a un empleado concreto. Depende de M03, bloqueado. | HU-ATC-05 |

---

## 4. Tabla Resumen de Historias de Usuario
| ID | Historia de Usuario | Actores | Prioridad | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-ATC-01** | Preguntas frecuentes administrables | Administrador / Visitante | Alta | **La cumple M16** (HU-CON-02 / HU-CON-04) |
| **HU-ATC-02** | Formulario de contacto | Cliente autenticado / Administrador | Alta | Definido |
| **HU-ATC-03** | Canal de contacto directo por WhatsApp («Megaconstrucción») | Cliente / Administrador | Alta | Definido |
| **HU-ATC-04** | Horario de atención configurable | Visitante / Administrador | Alta | Definido |
| **HU-ATC-05** | Escalamiento a asesor humano | Cliente / Empleado | Alta | Parcial (RF-ATC-05-04 pendiente de M03) |

---

## 5. Especificación Detallada por Historia de Usuario

### HU-ATC-01 — Preguntas frecuentes administrables

> ⚠️ **Esta historia la implementa M16 Contenido, no M15** (decisión del 2026-10-25).
> Se conserva aquí por trazabilidad del análisis. Los requisitos siguen siendo válidos
> como necesidad del negocio; lo que cambió es quién los construye:
> `contracts/m16-contenido.contract.ts` (HU-CON-02 administración, HU-CON-04 consulta
> pública) y la tabla `faq_entrada`. M15 consume ese catálogo por `ContenidoFaqPort`.

> **Como** administrador  
> **Quiero** mantener las preguntas frecuentes desde el panel  
> **Para** resolver dudas repetidas sin ocupar tiempo del equipo de atención.

#### Requisitos
| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-ATC-01-01** | RF | Contenido | El sistema debe permitir crear, editar, eliminar, activar y desactivar preguntas frecuentes desde el panel, agruparlas por tema y definir su orden de presentación. | **Definido** | **Alta** |
| **RF-ATC-01-05** | RF | Consulta pública | El sistema debe presentar públicamente el listado de preguntas frecuentes activas, agrupadas y ordenadas conforme a lo configurado. | **Definido** | **Alta** |
| **RF-ATC-01-06** | RF | Control de acceso | ~~El sistema debe reservar la administración de preguntas frecuentes al permiso «Gestión de preguntas frecuentes», que pertenece a este módulo y no a M16.~~ **CORREGIDO (2026-10-25):** la administración de preguntas frecuentes pertenece a **M16**, igual que el resto de su contenido, y se reserva al permiso que M16 define. M15 no la gobierna. | **Corregido** | **Alta** |

#### Criterios de aceptación
| ID | Criterio |
| :--- | :--- |
| **CA-ATC-01-01** | Dado que soy administrador, cuando creo una pregunta frecuente, entonces queda disponible para activarla, agruparla y ordenarla. |
| **CA-ATC-01-02** | Dado que tengo una pregunta activa, cuando la desactivo, entonces deja de mostrarse al público sin que se elimine. |
| **CA-ATC-01-03** | Dado que existen varias preguntas activas, cuando un visitante consulta el listado público, entonces las ve agrupadas por tema y en el orden configurado. |
| **CA-ATC-01-04** | Dado que soy un empleado sin el permiso correspondiente, cuando intento editar una pregunta, entonces el sistema rechaza la operación. |

---

### HU-ATC-02 — Formulario de contacto

> **Como** visitante  
> **Quiero** enviar una consulta, cotización o reclamo desde el sitio  
> **Para** comunicarme con la empresa sin tener que llamar.

#### Requisitos
| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-ATC-02-01** | RF | Formulario | El sistema debe ofrecer el formulario de contacto únicamente al usuario autenticado —llevando al visitante al inicio de sesión cuando intente abrirlo—, debe permitir identificar el tipo de solicitud —consulta, cotización o reclamo— y debe confirmarle el envío. | **Definido** | **Alta** |
| **RF-ATC-02-07** | RF | Formulario | El sistema debe tratar una solicitud de tipo cotización como un mensaje de intención y no debe generar con ella una cotización formal. El camino formal es el del carrito, abierto a cualquier cliente autenticado por HU-COT-01, y el formulario debe remitir a él. | **Definido** | **Alta** |
| **RF-ATC-02-08** | RF | Protección | El sistema debe aplicar alguna medida de contención frente a envíos automatizados, sin que el mecanismo concreto forme parte del requisito. | **Deducido** | **Media** |
| **RF-ATC-02-04** | RF | Formulario | El sistema debe pedir en el formulario únicamente el tipo de solicitud y su descripción, y debe tomar de la cuenta autenticada los datos de contacto sin volver a pedirlos. | **Definido** | **Alta** |
| **RF-ATC-02-05** | RF | Enrutamiento | El sistema debe dirigir al administrador toda solicitud enviada desde el formulario. | **Definido** | **Alta** |

#### Criterios de aceptación
| ID | Criterio |
| :--- | :--- |
| **CA-ATC-02-01** | Dado que estoy autenticado, cuando envío el formulario indicando el tipo de solicitud y su descripción, entonces el sistema confirma la recepción. |
| **CA-ATC-02-02** | Dado que intento enviar sin indicar el tipo de solicitud, cuando lo envío, entonces el sistema lo rechaza. |
| **CA-ATC-02-03** | Dado que elijo el tipo cotización, cuando envío el formulario, entonces el sistema me remite al carrito como camino formal y no crea ninguna cotización. |
| **CA-ATC-02-04** | Dado que soy un visitante sin sesión, cuando intento abrir el formulario de contacto, entonces el sistema me lleva al inicio de sesión. |
| **CA-ATC-02-05** | Dado que envío el formulario, cuando el administrador lo abre, entonces ve mis datos de contacto tomados de mi cuenta sin que yo los haya escrito. |

---

### HU-ATC-03 — Canal de contacto directo por WhatsApp

> **Como** cliente que va a pintar una casa entera  
> **Quiero** escribirle directamente a un asesor de la empresa  
> **Para** que me orienten antes de armar un pedido de ese tamaño.

*Alcance: el botón de contacto directo que el negocio llama «Megaconstrucción»: su presencia, su destino y su configuración. La integración de WhatsApp para enviar notificaciones o automatizar consultas es otra cosa y sigue sin definirse; aquí solo hay un enlace.*

#### Requisitos
| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-ATC-03-01** | RF | Canal directo | El sistema debe ofrecer un botón de contacto directo que lleve al cliente a una conversación de WhatsApp con la empresa, visible desde el catálogo, la ficha de producto y el carrito, que son los puntos donde surge la duda que lo motiva. | **Definido** | **Alta** |
| **RF-ATC-03-02** | RF | Canal directo | El sistema debe permitir al administrador configurar desde el panel el número de destino y el texto con que se abre la conversación, sin intervención del equipo de desarrollo. | **Deducido** | **Alta** |
| **RF-ATC-03-03** | RF | Canal directo | El sistema debe incluir en el texto inicial la referencia del producto o del carrito desde el que el cliente abrió la conversación, para que el asesor sepa de qué le están hablando. | **Deducido** | **Media** |
| **RF-ATC-03-04** | RF | Canal directo | El sistema debe tratar este botón como un enlace saliente y no como un canal de mensajería propio: no recibe, no almacena y no responde conversaciones. La integración de WhatsApp para notificaciones y automatización queda fuera de esta historia y sigue sin definirse. | **Definido** | **Alta** |
| **RF-ATC-03-05** | RF | Horario | El sistema debe advertir al cliente, cuando abra el canal fuera del horario de atención humana configurado, que la respuesta puede demorarse, conforme a lo que resuelva RF-ATC-04-05. | **Deducido** | **Media** |

#### Criterios de aceptación
| ID | Criterio |
| :--- | :--- |
| **CA-ATC-03-01** | Dado que consulto la ficha de un producto, cuando pulso el botón de contacto directo, entonces se abre una conversación de WhatsApp con la empresa. |
| **CA-ATC-03-02** | Dado que soy administrador y cambio el número de destino, cuando un cliente usa el botón, entonces la conversación se abre con el número nuevo. |
| **CA-ATC-03-03** | Dado que abro el canal desde la ficha de un producto, cuando se inicia la conversación, entonces el texto inicial incluye la referencia de ese producto. |
| **CA-ATC-03-04** | Dado que escribo por ese canal, cuando reviso el sitio, entonces la conversación no aparece dentro de Pintu Clic: el sistema no la almacena ni la responde. |
| **CA-ATC-03-05** | Dado que abro el canal fuera del horario de atención humana, cuando se inicia la conversación, entonces el sistema me advierte de que la respuesta puede demorarse. |

---

### HU-ATC-04 — Horario de atención configurable

> **Como** visitante  
> **Quiero** conocer el horario en que hay atención humana  
> **Para** saber cuándo puedo esperar respuesta de una persona.

#### Requisitos
| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-ATC-04-01** | RF | Configuración | El sistema debe permitir al administrador configurar el horario de atención humana y debe mostrarlo vigente a los usuarios. | **Definido** | **Alta** |
| **RF-ATC-04-04** | RF | Alcance | El sistema debe aplicar el horario únicamente a los canales atendidos por personas. Los canales automatizados no quedan condicionados por él y pueden operar fuera de ese horario. | **Definido** | **Media** |
| **RF-ATC-04-05** | RF | Canales humanos | El sistema debe recibir igualmente la solicitud que llegue por el formulario fuera del horario de atención, advirtiendo que la respuesta se dará dentro de ese horario, y debe mostrar el horario vigente e invitar a volver en él cuando el canal sea WhatsApp o el escalamiento a un asesor. | **Definido** | **Media** |

#### Criterios de aceptación
| ID | Criterio |
| :--- | :--- |
| **CA-ATC-04-01** | Dado que soy administrador, cuando configuro el horario de atención, entonces el sistema lo aplica desde ese momento y el visitante lo ve reflejado. |
| **CA-ATC-04-02** | Dado que estoy fuera del horario de atención humana, cuando interactúo con un canal automatizado, entonces este puede seguir respondiendo. |
| **CA-ATC-04-03** | Dado que envío el formulario fuera del horario de atención, cuando lo envío, entonces el sistema lo recibe y me advierte que la respuesta llegará dentro del horario. |
| **CA-ATC-04-04** | Dado que abro WhatsApp o pido un asesor fuera del horario de atención, cuando lo hago, entonces el sistema me muestra el horario vigente y me invita a volver en él. |

---

### HU-ATC-05 — Escalamiento a asesor humano

> **Como** cliente con una duda que el asistente no resuelve  
> **Quiero** que me pasen con una persona  
> **Para** no quedarme sin respuesta en un caso que requiere criterio humano.

#### Requisitos
| ID | Tipo | Categoría | Requisito | Origen | Prior. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-ATC-05-01** | RF | Escalamiento | El sistema debe permitir que una consulta pase de la atención automatizada a un empleado con el permiso «Atender clientes», y debe reservar a ese permiso la atención de una consulta escalada. | **Definido** | **Alta** |
| **RF-ATC-05-03** | RF | Horario | Una consulta escalada fuera del horario de atención humana configurado no debe dirigirse a un empleado en ese momento. | **Deducido** | **Media** |
| **RF-ATC-05-04** | RF | Criterio de escalamiento | PENDIENTE DE DEFINICIÓN: qué señales o reglas determinan que una consulta debe escalar, y cómo se asigna a un empleado concreto —si existe una cola de atención y cómo se determina la disponibilidad real—. Depende de M03, bloqueado. | **Pendiente** | **Alta** |

#### Criterios de aceptación
| ID | Criterio |
| :--- | :--- |
| **CA-ATC-05-01** | Dado que una consulta automatizada no se resuelve, cuando escala, entonces se dirige a un empleado con el permiso «Atender clientes». |
| **CA-ATC-05-02** | Dado que soy empleado sin ese permiso, cuando intento atender una consulta escalada, entonces el sistema rechaza el acceso. |
| **CA-ATC-05-03** | Dado que una consulta escala fuera del horario configurado, cuando ocurre, entonces no se dirige a un empleado en ese momento. |