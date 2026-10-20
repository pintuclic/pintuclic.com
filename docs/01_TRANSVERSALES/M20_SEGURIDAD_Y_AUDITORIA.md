**PINTU CLIC**

Plataforma de comercio electrónico

**ANÁLISIS DE REQUISITOS**

**TANDA 2 --- Ola 1: Seguridad y control de acceso**

*Requisitos, reglas de negocio, validaciones y criterios de aceptación
derivados de las historias de usuario*

+-------------------+--------------------------------------------------+
| **Versión**       | 1.1                                              |
+-------------------+--------------------------------------------------+
| **Fecha**         | 22 de agosto de 2026                             |
+-------------------+--------------------------------------------------+
| **Estado**        | Cerrado. Ninguna historia de la ola queda        |
|                   | bloqueada. Quedan 9 preguntas abiertas, todas de |
|                   | detalle o de decisión legal.                     |
+-------------------+--------------------------------------------------+
| **Módulos         | M20 Seguridad, auditoría y protección de datos   |
| analizados**      |                                                  |
|                   | M17 Administración, empleados y permisos         |
+-------------------+--------------------------------------------------+
| **Por qué esta    | Ambos módulos condicionan a todos los demás.     |
| ola va primero**  | Construirlos después obliga a reabrir cada       |
|                   | operación ya escrita para insertarle la          |
|                   | comprobación de permiso y el registro de         |
|                   | auditoría.                                       |
+-------------------+--------------------------------------------------+
| **Documentos      | Pintu Clic --- Documento de Historias de Usuario |
| fuente**          | v4.0                                             |
|                   |                                                  |
|                   | Pintu Clic --- Análisis de Requisitos, Tanda 1,  |
|                   | v5.0                                             |
|                   |                                                  |
|                   | Pintu Clic --- Idea de Negocio y Definición del  |
|                   | Negocio                                          |
+-------------------+--------------------------------------------------+

# 

# 

# 

# 

# **1. Análisis por historia**

## **M20. Seguridad, auditoría y protección de datos**

**Propósito.** Proteger la información de los usuarios y de la
operación, y dejar rastro de las acciones relevantes. Es el módulo más
transversal del sistema: sus requisitos condicionan a todos los demás, y
añadirlos después obliga a revisar cada operación ya construida.

**Contenido:** 6 historias, todas analizadas en detalle. Ninguna
bloqueada.

### **HU-SEG-01 --- Almacenamiento seguro de credenciales**

> Como cliente / quiero que mi contraseña se guarde de forma que nadie
> pueda leerla / para que un incidente en la empresa no comprometa mis
> otras cuentas.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-SEG-01-01**    RF         Credenciales    El sistema debe almacenar    Definido     Alta
                                                 las contraseñas aplicando                 
                                                 una función de derivación de              
                                                 clave con sal única por                   
                                                 usuario, de modo que no sean              
                                                 recuperables en texto claro.              

  **RF-SEG-01-02**    RF         Credenciales    El sistema debe verificar la Deducido     Alta
                                                 contraseña comparando el                  
                                                 resultado de la derivación,               
                                                 sin descifrar ni reconstruir              
                                                 la original.                              

  **RF-SEG-01-03**    RF         Credenciales    El sistema no debe incluir   Definido     Alta
                                                 contraseñas, ni en claro ni               
                                                 derivadas, en ningún                      
                                                 registro de aplicación, de                
                                                 auditoría o de error.                     

  **RF-SEG-01-04**    RF         Credenciales    El sistema no debe devolver  Definido     Alta
                                                 la contraseña, ni en claro                
                                                 ni derivada, en ninguna                   
                                                 respuesta al navegador.                   

  **RF-SEG-01-05**    RF         Credenciales    El sistema no debe almacenar Definido     Alta
                                                 contraseña alguna para las                
                                                 cuentas creadas mediante                  
                                                 Google, cuya autenticación                
                                                 gestiona el proveedor.                    

  **RF-SEG-01-06**    RF         Credenciales    El sistema debe invalidar    Definido     Alta
                                                 todas las sesiones activas                
                                                 del usuario cuando su                     
                                                 contraseña cambie.                        

  **RNF-SEG-01-01**   RNF        Seguridad       La verificación de la        Deducido     Media
                                                 contraseña debe realizarse                
                                                 en tiempo constante, para no              
                                                 revelar información por                   
                                                 diferencias de tiempo de                  
                                                 respuesta.                                

  **RNF-SEG-01-02**   RNF        Seguridad       El parámetro de coste de la  Deducido     Media
                                                 función de derivación debe                
                                                 poder ajustarse sin migrar                
                                                 las contraseñas ya                        
                                                 almacenadas.                              
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-SEG-01-01**   Dado que registro una cuenta con contraseña, cuando esta
                     se almacena, entonces no queda guardada en texto claro y
                     no puede recuperarse su valor original.

  **CA-SEG-01-02**   Dado que dos usuarios eligen exactamente la misma
                     contraseña, cuando ambas se almacenan, entonces los
                     valores guardados son distintos entre sí.

  **CA-SEG-01-03**   Dado que se produce un error durante la autenticación,
                     cuando el sistema lo registra, entonces el registro no
                     contiene la contraseña introducida.

  **CA-SEG-01-04**   Dado que consulto mi perfil, cuando el sistema me
                     devuelve mis datos, entonces la respuesta no incluye mi
                     contraseña en ninguna forma.

  **CA-SEG-01-05**   Dado que cambio mi contraseña, cuando el cambio se
                     completa, entonces todas mis sesiones abiertas quedan
                     cerradas y debo autenticarme de nuevo.

  **CA-SEG-01-06**   Dado que mi cuenta se creó mediante Google, cuando
                     intento establecer una contraseña en el sistema, entonces
                     la operación no se permite.
  ----------------------------------------------------------------------------

### **HU-SEG-02 --- Gestión de sesión**

> Como cliente / quiero que mi sesión se cierre sola tras un tiempo sin
> actividad / para que nadie use mi cuenta si dejo el equipo abierto.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-SEG-02-01**    RF         Sesión          El sistema debe cerrar       Definido     Alta
                                                 automáticamente la sesión                 
                                                 tras un periodo de                        
                                                 inactividad.                              

  **RF-SEG-02-02**    RF         Sesión          El sistema debe aplicar 30   Deducido     Alta
                                                 minutos de inactividad para               
                                                 las sesiones del panel                    
                                                 administrativo y 30 días                  
                                                 para las sesiones de                      
                                                 cliente.                                  

  **RF-SEG-02-03**    RF         Sesión          El sistema debe renovar la   Deducido     Alta
                                                 vigencia de la sesión ante                
                                                 cada operación del usuario.               

  **RF-SEG-02-04**    RF         Sesión          El sistema debe permitir al  Definido     Alta
                                                 usuario cerrar su sesión de               
                                                 forma explícita.                          

  **RF-SEG-02-05**    RF         Sesión          El sistema debe admitir      Deducido     Alta
                                                 sesiones simultáneas del                  
                                                 mismo cliente en varios                   
                                                 dispositivos.                             

  **RF-SEG-02-06**    RF         Sesión          El sistema debe invalidar    Deducido     Alta
                                                 todas las sesiones de un                  
                                                 usuario cuando su contraseña              
                                                 cambie, cuando su cuenta se               
                                                 desactive o cuando se le                  
                                                 retiren permisos.                         

  **RF-SEG-02-07**    RF         Sesión          El sistema debe permitir al  Deducido     Media
                                                 administrador configurar                  
                                                 desde el panel los tiempos                
                                                 de vigencia de sesión.                    

  **RF-SEG-02-08**    RF         Sesión          El sistema debe informar al  Deducido     Media
                                                 usuario cuando su sesión                  
                                                 haya expirado, y conducirlo               
                                                 a la autenticación                        
                                                 conservando el destino que                
                                                 pretendía alcanzar.                       

  **RNF-SEG-02-01**   RNF        Seguridad       El identificador de sesión   Deducido     Alta
                                                 debe transmitirse únicamente              
                                                 por canal cifrado y no debe               
                                                 ser accesible desde el                    
                                                 código de la página.                      
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-SEG-02-01**   Dado que dejo de operar en el panel administrativo
                     durante más de 30 minutos, cuando intento realizar una
                     acción, entonces el sistema me informa de que la sesión
                     expiró y me pide autenticarme de nuevo.

  **CA-SEG-02-02**   Dado que estoy operando activamente, cuando realizo una
                     acción antes de agotarse el plazo, entonces la vigencia
                     de mi sesión se renueva y no se me cierra.

  **CA-SEG-02-03**   Dado que tengo sesión abierta en el móvil, cuando inicio
                     sesión también en el computador, entonces ambas sesiones
                     funcionan sin que la primera se cierre.

  **CA-SEG-02-04**   Dado que un administrador desactiva mi cuenta de
                     empleado, cuando intento realizar cualquier operación,
                     entonces el sistema rechaza la petición aunque mi sesión
                     estuviera abierta.

  **CA-SEG-02-05**   Dado que un administrador me retira un permiso, cuando
                     intento usar la función correspondiente, entonces el
                     sistema la rechaza sin esperar a que yo vuelva a
                     autenticarme.

  **CA-SEG-02-06**   Dado que mi sesión expiró mientras intentaba abrir una
                     página concreta, cuando me autentico de nuevo, entonces
                     el sistema me lleva a esa página y no al inicio.
  ----------------------------------------------------------------------------

### **HU-SEG-03 --- Autorización verificada en el servidor**

> Como cliente / quiero que ningún otro usuario pueda ver mis pedidos ni
> mis datos / para confiar en que mi información está protegida.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-SEG-03-01**    RF         Autorización    El sistema debe verificar en Definido     Alta
                                                 el servidor, ante cada                    
                                                 operación, que el usuario                 
                                                 tiene el permiso o la                     
                                                 titularidad que la operación              
                                                 exige.                                    

  **RF-SEG-03-02**    RF         Autorización    El sistema debe rechazar     Definido     Alta
                                                 toda operación sobre datos                
                                                 de un cliente solicitada por              
                                                 otro usuario que no sea su                
                                                 titular ni personal                       
                                                 autorizado.                               

  **RF-SEG-03-03**    RF         Autorización    El sistema debe rechazar     Definido     Alta
                                                 toda operación                            
                                                 administrativa solicitada                 
                                                 por un empleado que no tenga              
                                                 el permiso correspondiente.               

  **RF-SEG-03-04**    RF         Autorización    El sistema debe verificar la Definido     Alta
                                                 autorización aunque la                    
                                                 petición llegue manipulada o              
                                                 directamente, sin pasar por               
                                                 la interfaz.                              

  **RF-SEG-03-05**    RF         Autorización    El sistema debe responder de Deducido     Alta
                                                 forma uniforme ante un                    
                                                 acceso no autorizado, sin                 
                                                 revelar si el recurso                     
                                                 solicitado existe.                        

  **RF-SEG-03-06**    RF         Autorización    El sistema debe ocultar en   Definido     Alta
                                                 la interfaz las opciones que              
                                                 el usuario no puede                       
                                                 ejecutar, como medida de                  
                                                 usabilidad y nunca como                   
                                                 control de acceso.                        

  **RF-SEG-03-07**    RF         Autorización    El sistema debe registrar    Deducido     Media
                                                 todo acceso denegado por                  
                                                 falta de permiso.                         

  **RNF-SEG-03-01**   RNF        Seguridad       La verificación de           Deducido     Alta
                                                 autorización debe aplicarse               
                                                 de forma central y no                     
                                                 depender de que cada                      
                                                 operación la implemente por               
                                                 su cuenta.                                
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-SEG-03-01**   Dado que estoy autenticado como cliente, cuando solicito
                     el detalle de una orden que pertenece a otro cliente,
                     entonces el sistema rechaza la operación y no revela si
                     esa orden existe.

  **CA-SEG-03-02**   Dado que soy empleado sin permiso de gestión de
                     productos, cuando envío directamente la petición de crear
                     un producto sin pasar por la interfaz, entonces el
                     sistema la rechaza.

  **CA-SEG-03-03**   Dado que la interfaz me oculta una opción por falta de
                     permiso, cuando accedo directamente a la dirección de esa
                     función, entonces el sistema rechaza la operación.

  **CA-SEG-03-04**   Dado que un administrador me retira un permiso mientras
                     tengo la sesión abierta, cuando intento ejecutar esa
                     función, entonces el sistema la rechaza.

  **CA-SEG-03-05**   Dado que se produce un acceso denegado, cuando el sistema
                     lo rechaza, entonces queda registrado el usuario, la
                     operación intentada y la fecha.

  **CA-SEG-03-06**   Dado que solicito un recurso que no existe y otro que
                     existe pero no me pertenece, cuando el sistema responde,
                     entonces ambas respuestas son indistinguibles entre sí.
  ----------------------------------------------------------------------------

### **HU-SEG-04 --- Registro de auditoría de acciones relevantes**

> Como administrador / quiero saber quién hizo cada cambio importante y
> cuándo / para poder aclarar responsabilidades cuando algo salga mal.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-SEG-04-02**    RF         Auditoría       Cada registro debe capturar  Deducido     Alta
                                                 el identificador del actor,               
                                                 la fecha y hora, la acción                
                                                 realizada, la entidad                     
                                                 afectada con su                           
                                                 identificador, y el                       
                                                 resultado de la operación.                

  **RF-SEG-04-03**    RF         Auditoría       Cada registro debe capturar  Deducido     Alta
                                                 el valor anterior y el nuevo              
                                                 cuando la acción modifique                
                                                 un dato.                                  

  **RF-SEG-04-04**    RF         Auditoría       El sistema debe impedir la   Deducido     Alta
                                                 modificación y la                         
                                                 eliminación de los registros              
                                                 de auditoría, incluso por                 
                                                 parte del administrador.                  

  **RF-SEG-04-05**    RF         Auditoría       El sistema debe permitir al  Deducido     Alta
                                                 administrador consultar el                
                                                 registro filtrando por                    
                                                 actor, entidad, tipo de                   
                                                 acción y rango de fechas.                 

  **RF-SEG-04-06**    RF         Auditoría       El sistema debe permitir     Deducido     Media
                                                 consultar el historial                    
                                                 completo de una entidad                   
                                                 concreta desde su propia                  
                                                 ficha.                                    

  **RF-SEG-04-07**    RF         Auditoría       El sistema no debe incluir   Definido     Alta
                                                 en el registro contraseñas,               
                                                 datos de instrumentos de                  
                                                 pago ni información sensible              
                                                 innecesaria.                              

  **RF-SEG-04-08**    RF         Auditoría       El sistema debe conservar el Deducido     Alta
                                                 registro de auditoría al                  
                                                 menos mientras exista la                  
                                                 entidad a la que se refiere.              

  **RF-SEG-04-09**    RF         Auditoría       El sistema debe permitir     Deducido     Baja
                                                 exportar el registro de                   
                                                 auditoría de un periodo                   
                                                 determinado.                              

  **RNF-SEG-04-01**   RNF        Auditoría       El registro de auditoría     Deducido     Alta
                                                 debe escribirse en modo de                
                                                 solo adición, sin                         
                                                 operaciones de modificación               
                                                 ni de borrado.                            

  **RNF-SEG-04-02**   RNF        Rendimiento     La escritura del registro de Deducido     Media
                                                 auditoría no debe degradar                
                                                 el tiempo de respuesta de la              
                                                 operación auditada.                       
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-SEG-04-01**   Dado que modifico el precio de una variante, cuando
                     guardo el cambio, entonces el registro de auditoría
                     conserva mi identificador, la fecha, la variante
                     afectada, el precio anterior y el nuevo.

  **CA-SEG-04-02**   Dado que un administrador otorga un permiso a un
                     empleado, cuando el cambio se guarda, entonces queda
                     registrado quién lo otorgó, a quién y cuándo.

  **CA-SEG-04-03**   Dado que soy administrador, cuando intento modificar o
                     borrar un asiento del registro de auditoría, entonces el
                     sistema no lo permite.

  **CA-SEG-04-04**   Dado que consulto la ficha de un producto, cuando abro su
                     historial, entonces veo la secuencia de cambios que ha
                     sufrido con su autor y su fecha.

  **CA-SEG-04-05**   Dado que un empleado intenta una operación sin permiso,
                     cuando el sistema la rechaza, entonces el intento queda
                     registrado.

  **CA-SEG-04-06**   Dado que se registra cualquier acción auditable, cuando
                     reviso el asiento, entonces no contiene contraseñas ni
                     datos de instrumentos de pago.

  **CA-SEG-04-07**   Dado que soy empleado sin permiso de administración,
                     cuando intento consultar el registro de auditoría,
                     entonces el sistema rechaza el acceso.
  ----------------------------------------------------------------------------

### **HU-SEG-05 --- Protección de datos personales**

> Como usuario / quiero saber qué datos míos se recogen y con quién se
> comparten / para dar mi consentimiento con conocimiento de causa.

**Historia parcial.** *El mecanismo es especificable: consentimiento en
el registro, aviso de privacidad accesible y atención de los derechos
del titular. Lo que no puede cerrarse es el contenido de la postura
sobre datos que se transfieren a terceros, porque depende de decisiones
que están en historias bloqueadas del módulo de asesoría.*

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-SEG-05-01**    RF         Privacidad      El sistema debe requerir el  Deducido     Alta
                                                 consentimiento expreso del                
                                                 usuario sobre el tratamiento              
                                                 de sus datos personales en                
                                                 el momento del registro.                  

  **RF-SEG-05-02**    RF         Privacidad      El sistema debe registrar la Deducido     Alta
                                                 fecha y la versión del aviso              
                                                 de privacidad aceptado por                
                                                 cada usuario.                             

  **RF-SEG-05-03**    RF         Privacidad      El sistema debe mantener     Deducido     Alta
                                                 accesible en todo momento el              
                                                 aviso de privacidad vigente.              

  **RF-SEG-05-04**    RF         Privacidad      El sistema debe informar al  Deducido     Alta
                                                 usuario de qué datos se                   
                                                 recogen y con qué finalidad               
                                                 antes de solicitar su                     
                                                 consentimiento.                           

  **RF-SEG-05-05**    RF         Privacidad      El sistema debe permitir al  Definido     Alta
                                                 usuario consultar y                       
                                                 rectificar sus datos                      
                                                 personales desde su perfil.               

  **RF-SEG-05-06**    RF         Privacidad      El sistema debe permitir al  Deducido     Alta
                                                 usuario solicitar la                      
                                                 supresión de sus datos                    
                                                 personales y registrar esa                
                                                 solicitud.                                

  **RF-SEG-05-07**    RF         Privacidad      El sistema debe conservar la Deducido     Alta
                                                 información comercial que la              
                                                 ley obligue a conservar, aun              
                                                 cuando el usuario solicite                
                                                 la supresión de su cuenta,                
                                                 desvinculándola de su                     
                                                 identidad cuando sea                      
                                                 posible.                                  

  **RF-SEG-05-08**    RF         Privacidad      El sistema debe informar al  Deducido     Alta
                                                 usuario cuando sus datos                  
                                                 vayan a transferirse a un                 
                                                 proveedor externo.                        

  **RNF-SEG-05-01**   RNF        Privacidad      El sistema debe cumplir la   Definido     Alta
                                                 normativa colombiana de                   
                                                 protección de datos                       
                                                 personales aplicable.                     

  **RF-SEG-05-09**    RF         Privacidad      PENDIENTE DE DEFINICIÓN:     Pendiente    Alta
                                                 postura sobre el                          
                                                 almacenamiento y la                       
                                                 retención de las imágenes                 
                                                 cargadas en el simulador y                
                                                 de las conversaciones de                  
                                                 chatbot y WhatsApp.                       
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-SEG-05-01**   Dado que estoy completando el registro, cuando no marco
                     el consentimiento sobre el tratamiento de mis datos,
                     entonces el sistema no permite finalizar el registro.

  **CA-SEG-05-02**   Dado que acepto el aviso de privacidad, cuando el
                     registro se completa, entonces el sistema conserva la
                     fecha y la versión del aviso que acepté.

  **CA-SEG-05-03**   Dado que soy usuario registrado, cuando accedo a mi
                     perfil, entonces puedo consultar y rectificar mis datos
                     personales.

  **CA-SEG-05-04**   Dado que solicito la supresión de mis datos, cuando el
                     sistema recibe la solicitud, entonces la registra y me
                     confirma su recepción.

  **CA-SEG-05-05**   Dado que tengo órdenes de venta asociadas, cuando
                     solicito la supresión de mi cuenta, entonces el sistema
                     conserva la información comercial exigida por la ley y la
                     desvincula de mi identidad.

  **CA-SEG-05-06**   Dado que el aviso de privacidad cambia de versión, cuando
                     accedo al sitio, entonces el sistema me informa del
                     cambio.
  ----------------------------------------------------------------------------

### **HU-SEG-06 --- No exposición de datos sensibles**

> Como cliente / quiero que mis datos sensibles no viajen al navegador
> sin necesidad / para reducir el riesgo de que se filtren.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-SEG-06-01**    RF         Exposición de   El sistema debe entregar al  Definido     Alta
                                 datos           navegador únicamente los                  
                                                 datos necesarios para la                  
                                                 operación solicitada.                     

  **RF-SEG-06-02**    RF         Exposición de   El sistema no debe almacenar Definido     Alta
                                 datos           en ningún momento datos de                
                                                 instrumentos de pago, cuya                
                                                 custodia corresponde a la                 
                                                 pasarela.                                 

  **RF-SEG-06-03**    RF         Exposición de   El sistema no debe incluir   Definido     Alta
                                 datos           en ninguna respuesta                      
                                                 información perteneciente a               
                                                 otros clientes.                           

  **RF-SEG-06-04**    RF         Exposición de   El sistema debe presentar    Definido     Alta
                                 datos           mensajes de error que no                  
                                                 revelen detalles internos,                
                                                 rutas, consultas ni                       
                                                 versiones de componentes.                 

  **RF-SEG-06-05**    RF         Exposición de   El sistema no debe exponer   Definido     Alta
                                 datos           el precio empresarial a                   
                                                 usuarios que no sean                      
                                                 clientes empresa con cuenta               
                                                 aprobada.                                 

  **RF-SEG-06-06**    RF         Exposición de   El sistema no debe revelar   Definido     Alta
                                 datos           en el proceso de                          
                                                 recuperación de contraseña                
                                                 si un correo está                         
                                                 registrado.                               

  **RF-SEG-06-07**    RF         Exposición de   El sistema debe registrar    Deducido     Media
                                 datos           internamente el detalle                   
                                                 técnico del error, aunque no              
                                                 lo muestre al usuario.                    

  **RNF-SEG-06-01**   RNF        Seguridad       Toda comunicación entre el   Deducido     Alta
                                                 navegador y el servidor debe              
                                                 realizarse por canal                      
                                                 cifrado.                                  
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-SEG-06-01**   Dado que consulto el detalle de un producto, cuando el
                     sistema me responde, entonces la respuesta no incluye el
                     precio empresarial si no soy cliente empresa aprobado.

  **CA-SEG-06-02**   Dado que se produce un error interno, cuando el sistema
                     me lo comunica, entonces el mensaje no contiene rutas,
                     consultas ni versiones de componentes.

  **CA-SEG-06-03**   Dado que solicito recuperar mi contraseña con un correo
                     no registrado, cuando el sistema responde, entonces la
                     respuesta es idéntica a la que daría con un correo
                     registrado.

  **CA-SEG-06-04**   Dado que completo un pago, cuando la operación termina,
                     entonces el sistema no ha almacenado ningún dato del
                     instrumento de pago utilizado.

  **CA-SEG-06-05**   Dado que consulto un listado, cuando el sistema me
                     responde, entonces la respuesta no contiene datos de
                     otros clientes aunque la interfaz no los muestre.

  **CA-SEG-06-06**   Dado que se produce un error interno, cuando reviso el
                     registro técnico, entonces contiene el detalle necesario
                     para diagnosticar sin incluir datos sensibles del
                     usuario.
  ----------------------------------------------------------------------------
