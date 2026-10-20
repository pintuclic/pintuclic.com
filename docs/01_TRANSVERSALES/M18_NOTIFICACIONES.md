**PINTU CLIC**

*Plataforma de comercio electrónico de pinturas y ferretería*

**ANÁLISIS DE REQUISITOS**

+-----------------+----------------------------------------------------+
| **Versión**     | 1.0                                                |
+-----------------+----------------------------------------------------+
| **Fecha**       | 22 de agosto de 2026                               |
+-----------------+----------------------------------------------------+
| **Estado**      | Cerrado. Ninguna historia de la tanda queda        |
|                 | bloqueada. Quedan 15 preguntas abiertas, ninguna   |
|                 | impide comenzar a construir.                       |
+-----------------+----------------------------------------------------+
| **Módulos       | M04 Cuentas, autenticación y perfil                |
| analizados**    |                                                    |
|                 | M18 Notificaciones y comunicaciones                |
+-----------------+----------------------------------------------------+
| **Carril /      | Carril A --- Tanda 3A                              |
| Tanda**         |                                                    |
+-----------------+----------------------------------------------------+
| **Documentos    | Pintu Clic --- Documento de Historias de Usuario   |
| fuente**        | v4.0                                               |
|                 |                                                    |
|                 | Pintu Clic --- Análisis de Requisitos, Tanda 1,    |
|                 | v5.0                                               |
|                 |                                                    |
|                 | Pintu Clic --- Análisis de Requisitos, Tanda 2,    |
|                 | v1.0                                               |
|                 |                                                    |
|                 | Pintu Clic --- Idea de Negocio y Definición del    |
|                 | Negocio                                            |
+-----------------+----------------------------------------------------+
| **Siguiente     | Tanda 4A (Carril A) --- Módulo a definir por el    |
| tanda**         | coordinador del reparto, conforme al orden de      |
|                 | construcción general y a la disponibilidad de M08  |
|                 | (Carril C) y M21.                                  |
+-----------------+----------------------------------------------------+

# 

## 

## 

## M18. Notificaciones y comunicaciones

Propósito. Hacer llegar al cliente la información relevante de su cuenta
y de su operación, principalmente por correo electrónico, con
independencia del mecanismo que haya usado para autenticarse.

### HU-NOT-01 --- Envío de correos transaccionales

**Como** *cliente*

**Quiero** *recibir en mi correo las comunicaciones de mi cuenta y de
mis compras*

**Para** *tener constancia escrita de cada operación*

**Alcance:** *Comprende qué se envía, a qué dirección (con independencia
del método de acceso), el tratamiento del fallo de envío y el registro
de los envíos realizados. No comprende el contenido editorial de cada
plantilla (HU-NOT-03) ni la elección del proveedor de correo.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-NOT-01-01   RF         Envío           **\[Definido\]** El sistema    Definido     Alta
                                            debe enviar al correo                       
                                            registrado del cliente las                  
                                            comunicaciones asociadas a su               
                                            operación, con independencia                
                                            de si accedió mediante correo               
                                            o mediante Google (aplicación               
                                            de RT-20).                                  

  RF-NOT-01-02   RF         Catálogo        **\[Deducido\]** El sistema    Deducido     Media
                                            debe mantener un catálogo de                
                                            comunicaciones transaccionales              
                                            que envía, para que cada                    
                                            evento de negocio se asocie a               
                                            una comunicación identificable              
                                            (ver 4.2, catálogo de eventos               
                                            que notifican).                             

  RF-NOT-01-03   RF         Fiabilidad      **\[Deducido\]** Ante un fallo Deducido     Alta
                                            de envío, el sistema debe                   
                                            reintentar el envío un número               
                                            limitado de veces antes de                  
                                            darlo por fallido, según el                 
                                            parámetro configurable                      
                                            correspondiente (ver 4.2).                  

  RF-NOT-01-04   RF         Trazabilidad    **\[Deducido\]** El sistema    Deducido     Media
                                            debe registrar cada envío                   
                                            realizado (destinatario,                    
                                            plantilla utilizada y                       
                                            resultado) para diagnosticar                
                                            fallos de entrega (RT-23).                  
                                            Este registro de envíos es                  
                                            distinto del registro de                    
                                            auditoría de seguridad                      
                                            (RN-SEG-12) y no lo sustituye.              

  RF-NOT-01-05   RF         Proveedor       **\[Pendiente\]** Los límites  Pendiente    Alta
                                            de volumen y las garantías de               
                                            entregabilidad dependen del                 
                                            proveedor de correo, todavía                
                                            no elegido.                                 
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-NOT-01-01   Dado que ocurre un evento con comunicación asociada, cuando
                 el sistema lo procesa, entonces envía el correo
                 correspondiente a la dirección registrada del cliente.

  CA-NOT-01-02   Dado que el envío de un correo falla, cuando el sistema lo
                 detecta, entonces reintenta hasta el límite configurado
                 antes de registrarlo como fallido.

  CA-NOT-01-03   Dado que se agotan los reintentos de un envío, cuando el
                 sistema lo marca como fallido, entonces el registro de
                 envíos deja constancia del resultado sin exponer datos
                 sensibles.

  CA-NOT-01-04   Dado que un cliente accedió mediante Google, cuando el
                 sistema le envía una comunicación, entonces la recibe en el
                 mismo correo registrado, no en uno gestionado por el
                 proveedor.
  ---------------------------------------------------------------------------

### HU-NOT-02 --- Notificación de cambios de estado de la orden

**Como** *cliente*

**Quiero** *que me avisen cuando el estado de mi pedido cambie*

**Para** *enterarme de una demora sin tener que entrar a consultar*

**Alcance:** *Comprende el mecanismo de aviso ante un cambio de estado
de la orden y ante eventos relevantes de una cotización (respuesta,
rechazo, proximidad de caducidad). No comprende la definición de qué
estados existen en cada una, que corresponde a M08 (orden, Tanda 3C) y a
M21 (cotización, Tanda 4C), ambos fuera de este carril.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-NOT-02-01   RF         Notificación    **\[Deducido\]** El sistema    Deducido     Alta
                                            debe notificar al cliente                   
                                            cuando el estado de su orden                
                                            cambie, consumiendo el evento               
                                            que M08 emita para ese fin,                 
                                            sin necesidad de conocer de                 
                                            antemano el catálogo completo               
                                            de estados (mismo patrón de                 
                                            desacoplo ya aplicado entre                 
                                            HU-SEG-03 y HU-ADM-03 en la                 
                                            Tanda 2).                                   

  RF-NOT-02-02   RF         Notificación    **\[Definido\]** El sistema    Definido     Alta
                                            debe notificar al cliente, en               
                                            particular, cuando exista una               
                                            demora por falta de                         
                                            disponibilidad.                             

  RF-NOT-02-03   RF         Notificación    **\[Definido\]** El sistema    Definido     Media
                                            debe notificar al cliente                   
                                            cuando su cotización sea                    
                                            respondida, rechazada o esté                
                                            próxima a caducar, consumiendo              
                                            el evento que M21 emita para                
                                            ese fin.                                    

  RF-NOT-02-04   RF         Notificación    **\[Pendiente\]** No está      Pendiente    Alta
                                            definido el catálogo                        
                                            definitivo de qué estados de                
                                            la orden generan notificación;              
                                            depende de la máquina de                    
                                            estados que defina M08.                     

  RF-NOT-02-05   RF         Notificación    **\[Pendiente\]** No está      Pendiente    Media
                                            definido qué se entiende por                
                                            \"próxima a caducar\" para una              
                                            cotización (plazo de                        
                                            antelación del aviso); depende              
                                            de M21.                                     
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-NOT-02-01   Dado que la orden de un cliente cambia de estado, cuando M08
                 emite el evento correspondiente, entonces el sistema envía
                 al cliente la notificación asociada.

  CA-NOT-02-02   Dado que una orden se demora por falta de disponibilidad,
                 cuando el sistema lo detecta, entonces notifica al cliente
                 sin que este tenga que consultar el pedido.

  CA-NOT-02-03   Dado que una cotización es respondida o rechazada, cuando
                 M21 emite el evento correspondiente, entonces el sistema
                 notifica al cliente.
  ---------------------------------------------------------------------------

### HU-NOT-03 --- Plantillas de comunicación administrables

**Como** *administrador*

**Quiero** *editar el contenido de los correos que envía el sistema*

**Para** *ajustar el mensaje sin pedir un cambio al equipo de
desarrollo*

**Alcance:** *Comprende la edición del contenido de una plantilla, los
campos variables disponibles y la vista previa antes de guardar. No
comprende la creación de nuevos tipos de comunicación ni la elección del
proveedor de correo.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-NOT-03-01   RF         Plantillas      **\[Definido\]** El sistema    Definido     Media
                                            debe permitir editar desde el               
                                            panel el contenido de las                   
                                            comunicaciones que envía, sin               
                                            intervención del equipo de                  
                                            desarrollo.                                 

  RF-NOT-03-02   RF         Plantillas      **\[Deducido\]** El sistema    Deducido     Media
                                            debe exponer, para cada                     
                                            plantilla, los campos                       
                                            variables disponibles (por                  
                                            ejemplo, nombre del cliente o               
                                            número de orden) que pueden                 
                                            insertarse en el contenido.                 

  RF-NOT-03-03   RF         Plantillas      **\[Deducido\]** El sistema    Deducido     Media
                                            debe ofrecer una vista previa               
                                            de la plantilla con datos de                
                                            ejemplo antes de guardar los                
                                            cambios.                                    

  RF-NOT-03-04   RF         Plantillas      **\[Deducido\]** El sistema    Deducido     Alta
                                            debe impedir eliminar un campo              
                                            variable obligatorio de una                 
                                            plantilla (por ejemplo, el                  
                                            enlace de verificación en el                
                                            correo de registro), porque su              
                                            ausencia dejaría la                         
                                            comunicación sin cumplir su                 
                                            propósito funcional.                        
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-NOT-03-01   Dado que el administrador edita el contenido de una
                 plantilla, cuando guarda los cambios, entonces las
                 siguientes comunicaciones de ese tipo usan el nuevo
                 contenido.

  CA-NOT-03-02   Dado que el administrador edita una plantilla, cuando
                 solicita la vista previa, entonces el sistema la muestra con
                 datos de ejemplo antes de guardar.

  CA-NOT-03-03   Dado que el administrador intenta eliminar un campo variable
                 obligatorio de una plantilla, cuando intenta guardar,
                 entonces el sistema rechaza el cambio.
  ---------------------------------------------------------------------------

### HU-NOT-04 --- Entregabilidad del correo

**Como** *cliente*

**Quiero** *que los correos de Pintu Clic lleguen a mi bandeja y no a la
carpeta de no deseados*

**Para** *no perder el código de verificación ni la factura*

**Alcance:** *Comprende la configuración de autenticación del dominio
remitente, la dirección remitente y de respuesta, y el registro de
rebotes. No comprende la elección del proveedor de correo.*

**Requisitos**

  ---------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**    **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- ---------------- ------------------------------ ------------ ------------
  RF-NOT-04-01   RF         Entregabilidad   **\[Definido\]** El sistema    Definido     Alta
                                             debe configurarse de modo que               
                                             los correos enviados no sean                
                                             clasificados como no deseados.              

  RF-NOT-04-02   RF         Entregabilidad   **\[Deducido\]** El sistema    Deducido     Alta
                                             debe emplear mecanismos de                  
                                             autenticación del dominio                   
                                             remitente (los estándares                   
                                             habituales de autenticación de              
                                             correo) para reducir la                     
                                             clasificación como spam, sin                
                                             fijar el proveedor concreto                 
                                             que los implemente.                         

  RF-NOT-04-03   RF         Entregabilidad   **\[Deducido\]** El sistema    Deducido     Media
                                             debe definir una dirección                  
                                             remitente y, si corresponde,                
                                             una dirección de respuesta                  
                                             distinta, consistentes para                 
                                             todas las comunicaciones.                   

  RF-NOT-04-04   RF         Entregabilidad   **\[Deducido\]** El sistema    Deducido     Media
                                             debe registrar los rebotes de               
                                             entrega para permitir su                    
                                             diagnóstico.                                
  ---------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-NOT-04-01   Dado que el sistema envía un correo, cuando llega al
                 proveedor destino, entonces pasa las validaciones de
                 autenticación del dominio remitente configuradas.

  CA-NOT-04-02   Dado que un correo rebota, cuando el sistema lo detecta,
                 entonces queda registrado para su diagnóstico.
  ---------------------------------------------------------------------------

# 6. Preguntas pendientes

Todas las preguntas que quedan abiertas en esta tanda, agrupadas por
historia. Ninguna impide comenzar a construir: cada una admite avanzar
con el mecanismo especificado y decidir el valor o la política después.

  --------------------------------------------------------------------------
  **Historia**   **Pregunta**
  -------------- -----------------------------------------------------------
  HU-CUE-01      ¿El nombre y el teléfono son datos obligatorios en el
                 registro, o son opcionales? Solo el correo y la contraseña
                 lo son por necesidad estructural.

  HU-CUE-01 /    ¿La dirección se captura durante el registro o solo
  HU-CUE-07 /    después, en la gestión de direcciones, una vez que M10
  C-20           defina el modelo de entrega?

  HU-CUE-02      ¿Un cliente vinculado a Google puede además establecer una
                 contraseña propia para acceder sin depender del proveedor?

  HU-CUE-03 /    ¿Qué puede hacer una empresa mientras su solicitud está en
  HU-CUE-09      revisión: navegar, comprar con condiciones de cliente
                 particular, o no acceder en absoluto?

  HU-CUE-06 /    Cuando se resuelva C-15, ¿el personal administrativo queda
  C-15 (Tanda 2) habilitado para corregir un dato personal de un cliente a
                 petición de este, o la gestión sigue siendo solo de
                 consulta?

  HU-CUE-07      ¿Existe un límite máximo de direcciones por cuenta, y qué
                 datos mínimos debe tener una dirección?

  HU-CUE-08 /    ¿Puede una misma persona tener una cuenta de cliente y una
  C-21           de empleado con el mismo correo electrónico? Si es así,
                 ¿cómo distingue el sistema con cuál se autentica en cada
                 inicio de sesión?

  HU-CUE-08      ¿Un cliente particular puede convertirse en cliente empresa
                 sin crear una cuenta nueva, o la conversión exige una
                 solicitud independiente?

  HU-CUE-09      ¿La aprobación de una cuenta empresa es facultad exclusiva
                 del administrador, o un empleado con permiso específico
                 también puede decidir?

  HU-CUE-09      ¿El rechazo de una solicitud de cuenta empresa admite
                 corrección y reenvío de la misma solicitud, o exige una
                 solicitud completamente nueva?

  HU-NOT-01 /    ¿Qué proveedor de correo se usará: un servicio
  HU-NOT-04      transaccional especializado o el correo del propio dominio?
                 De esta decisión dependen los límites de volumen y la
                 configuración de entregabilidad.

  HU-NOT-02      ¿Cuál es el catálogo definitivo de estados de la orden que
                 generan notificación al cliente? Depende de la máquina de
                 estados que defina M08.
  --------------------------------------------------------------------------
