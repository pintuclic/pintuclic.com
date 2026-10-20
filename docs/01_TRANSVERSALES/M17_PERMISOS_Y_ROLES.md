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
+===================+==================================================+

# 

# 

# 

## **M17. Administración, empleados y permisos**

**Propósito.** Permitir la operación del comercio con control granular
de lo que cada empleado puede hacer. El modelo confirmado es de permisos
estrictamente individuales por empleado, sin roles predefinidos. Va
inmediatamente después de M20 porque define quién puede ejecutar cada
operación del resto del sistema: construirlo más tarde obliga a reabrir
todas las operaciones ya escritas para insertarles la comprobación de
permiso.

**Contenido:** 6 historias, todas analizadas en detalle. Ninguna
bloqueada.

### **HU-ADM-01 --- Gestión de cuentas de empleado**

> Como administrador / quiero crear y desactivar cuentas de empleado /
> para dar y retirar acceso al sistema conforme cambia el equipo.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-ADM-01-01**    RF         Alta de         El sistema debe permitir al  Deducido     Alta
                                 empleado        administrador crear una                   
                                                 cuenta de empleado                        
                                                 registrando, como mínimo,                 
                                                 nombre completo, documento                
                                                 de identidad, correo                      
                                                 electrónico y teléfono de                 
                                                 contacto.                                 

  **RF-ADM-01-02**    RF         Alta de         El sistema debe exigir que   Deducido     Alta
                                 empleado        el correo electrónico de un               
                                                 empleado sea único y no                   
                                                 coincida con el de otra                   
                                                 cuenta de empleado ni con                 
                                                 ninguna cuenta de cliente                 
                                                 (particular o empresa).                   

  **RF-ADM-01-03**    RF         Alta de         El sistema debe generar una  Deducido     Alta
                                 empleado        credencial inicial de un                  
                                                 solo uso al crear la cuenta               
                                                 y exigir su cambio en el                  
                                                 primer inicio de sesión.                  

  **RF-ADM-01-04**    RF         Alta de         El sistema debe crear toda   Deducido     Alta
                                 empleado        cuenta de empleado sin                    
                                                 ningún permiso asignado, de               
                                                 modo que el acceso efectivo               
                                                 dependa de un acto posterior              
                                                 y explícito del                           
                                                 administrador.                            

  **RF-ADM-01-05**    RF         Edición         El sistema debe permitir al  Deducido     Media
                                                 administrador modificar los               
                                                 datos de contacto de un                   
                                                 empleado sin afectar sus                  
                                                 permisos ni su historial.                 

  **RF-ADM-01-06**    RF         Estado de la    El sistema debe permitir al  Definido     Alta
                                 cuenta          administrador desactivar una              
                                                 cuenta de empleado,                       
                                                 impidiendo desde ese momento              
                                                 cualquier inicio de sesión                
                                                 con ella.                                 

  **RF-ADM-01-07**    RF         Estado de la    El sistema debe cerrar todas Deducido     Alta
                                 cuenta          las sesiones activas de un                
                                                 empleado en el momento en                 
                                                 que su cuenta se desactiva,               
                                                 sin esperar a que expiren.                

  **RF-ADM-01-08**    RF         Estado de la    El sistema debe permitir     Deducido     Media
                                 cuenta          reactivar una cuenta de                   
                                                 empleado desactivada,                     
                                                 conservando sus datos y su                
                                                 historial.                                

  **RF-ADM-01-09**    RF         Estado de la    El sistema debe restablecer  Deducido     Media
                                 cuenta          los permisos de una cuenta                
                                                 reactivada a los que tenía                
                                                 en el momento de la                       
                                                 desactivación, dejándolos                 
                                                 disponibles para revisión                 
                                                 del administrador.                        

  **RF-ADM-01-10**    RF         Integridad      El sistema no debe permitir  Deducido     Alta
                                 histórica       la eliminación física de una              
                                                 cuenta de empleado; la baja               
                                                 se realiza siempre de forma               
                                                 lógica.                                   

  **RF-ADM-01-11**    RF         Integridad      El sistema debe conservar la Deducido     Alta
                                 histórica       atribución de las acciones                
                                                 ya realizadas por un                      
                                                 empleado desactivado, de                  
                                                 modo que el registro de                   
                                                 auditoría siga identificando              
                                                 quién las ejecutó.                        

  **RF-ADM-01-12**    RF         Consulta        El sistema debe permitir al  Deducido     Media
                                                 administrador listar las                  
                                                 cuentas de empleado y                     
                                                 filtrarlas por estado activo              
                                                 o inactivo.                               

  **RF-ADM-01-13**    RF         Consulta        El sistema debe mostrar,     Deducido     Baja
                                                 para cada empleado, la fecha              
                                                 de creación de la cuenta y                
                                                 la fecha de su último                     
                                                 acceso.                                   

  **RF-ADM-01-14**    RF         Protección      El sistema debe impedir que  Deducido     Alta
                                                 el administrador desactive o              
                                                 elimine su propia cuenta.                 

  **RNF-ADM-01-01**   RNF        Seguridad       La credencial inicial        Deducido     Media
                                                 generada por el sistema debe              
                                                 tener una vigencia limitada               
                                                 y caducar si no se utiliza                
                                                 dentro de ese plazo.                      

  **RNF-ADM-01-02**   RNF        Usabilidad      El listado de empleados debe Deducido     Baja
                                                 permitir localizar una                    
                                                 cuenta concreta sin recorrer              
                                                 manualmente la totalidad del              
                                                 listado.                                  
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-01-01**   Dado que soy administrador, cuando creo una cuenta de
                     empleado con los datos obligatorios completos, entonces
                     el sistema la crea sin ningún permiso asignado y envía la
                     credencial inicial al correo registrado.

  **CA-ADM-01-02**   Dado que introduzco un correo electrónico que ya
                     pertenece a otro empleado, cuando intento guardar el
                     alta, entonces el sistema la rechaza e indica que ese
                     correo ya está en uso.

  **CA-ADM-01-03**   Dado que soy un empleado que accede por primera vez con
                     la credencial inicial, cuando inicio sesión, entonces el
                     sistema me exige establecer una contraseña nueva antes de
                     permitirme cualquier otra acción.

  **CA-ADM-01-04**   Dado que un empleado tiene una sesión abierta, cuando el
                     administrador desactiva su cuenta, entonces el sistema
                     cierra esa sesión y el empleado no puede volver a iniciar
                     sesión.

  **CA-ADM-01-05**   Dado que un empleado desactivado registró operaciones en
                     el pasado, cuando consulto el registro de auditoría,
                     entonces esas operaciones siguen apareciendo atribuidas a
                     él.

  **CA-ADM-01-06**   Dado que soy administrador, cuando intento desactivar mi
                     propia cuenta, entonces el sistema lo impide e indica que
                     el sistema no puede quedar sin administrador.

  **CA-ADM-01-07**   Dado que una cuenta de empleado está desactivada, cuando
                     la reactivo, entonces el sistema restablece sus datos y
                     sus permisos anteriores y me los muestra para revisión.

  **CA-ADM-01-08**   Dado que el correo ya está asociado a una cuenta de
                     cliente, cuando el administrador intenta crear un
                     empleado con ese correo, el sistema rechaza el alta e
                     indica el conflicto.
  ----------------------------------------------------------------------------

### **HU-ADM-02 --- Asignación individual de permisos**

> Como administrador / quiero otorgar y retirar permisos a cada empleado
> de forma individual / para que cada persona acceda únicamente a lo que
> su trabajo requiere.

**Requisitos**

  ------------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**    **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- ---------------- ---------------------------- ------------ ------------
  **RF-ADM-02-01**    RF         Modelo de        El sistema debe asignar      Definido     Alta
                                 permisos         permisos a cada empleado de               
                                                  forma individual, sin roles               
                                                  predefinidos que agrupen                  
                                                  permisos de manera fija.                  

  **RF-ADM-02-02**    RF         Modelo de        El sistema debe presentar al Deducido     Alta
                                 permisos         administrador el catálogo                 
                                                  completo de permisos                      
                                                  disponibles, agrupados por                
                                                  área funcional, indicando                 
                                                  para cada uno si el empleado              
                                                  lo tiene concedido.                       

  **RF-ADM-02-03**    RF         Otorgamiento     El sistema debe permitir al  Definido     Alta
                                                  administrador conceder y                  
                                                  retirar cada permiso de                   
                                                  forma independiente, sin que              
                                                  ello afecte a los demás                   
                                                  permisos del empleado.                    

  **RF-ADM-02-04**    RF         Otorgamiento     El sistema debe conceder     Deducido     Alta
                                                  automáticamente el permiso                
                                                  de consulta correspondiente               
                                                  cuando se concede un permiso              
                                                  de operación sobre la misma               
                                                  área.                                     

  **RF-ADM-02-05**    RF         Otorgamiento     El sistema debe advertir al  Deducido     Media
                                                  administrador, al retirar un              
                                                  permiso de consulta, de que               
                                                  ello implica retirar también              
                                                  los permisos de operación                 
                                                  que dependen de él.                       

  **RF-ADM-02-06**    RF         Efecto           El sistema debe aplicar todo Deducido     Alta
                                                  cambio de permisos de forma               
                                                  inmediata sobre las sesiones              
                                                  activas del empleado                      
                                                  afectado, sin requerir que                
                                                  cierre e inicie sesión de                 
                                                  nuevo.                                    

  **RF-ADM-02-07**    RF         Efecto           El sistema debe retirar de   Deducido     Alta
                                                  la interfaz del empleado, en              
                                                  su siguiente interacción,                 
                                                  las opciones                              
                                                  correspondientes a un                     
                                                  permiso que acaba de serle                
                                                  revocado.                                 

  **RF-ADM-02-08**    RF         Efecto           El sistema debe permitir el  Deducido     Media
                                                  acceso al panel a un                      
                                                  empleado sin ningún permiso               
                                                  concedido, limitando su                   
                                                  vista a su propio perfil y                
                                                  sin exponerle ninguna                     
                                                  operación.                                

  **RF-ADM-02-09**    RF         Restricciones    El sistema debe impedir que  Deducido     Alta
                                                  un empleado modifique sus                 
                                                  propios permisos o los de                 
                                                  otro empleado.                            

  **RF-ADM-02-10**    RF         Restricciones    El sistema debe tratar los   Deducido     Alta
                                                  permisos del administrador                
                                                  como implícitos y completos,              
                                                  sin exponerlos como                       
                                                  asignables ni modificables.               

  **RF-ADM-02-11**    RF         Trazabilidad     El sistema debe registrar    Definido     Alta
                                                  cada concesión y cada retiro              
                                                  de permiso, indicando el                  
                                                  permiso, el empleado                      
                                                  afectado, quién lo modificó               
                                                  y cuándo.                                 

  **RF-ADM-02-12**    RF         Consulta         El sistema debe permitir al  Deducido     Media
                                                  administrador consultar,                  
                                                  para un permiso concreto,                 
                                                  qué empleados lo tienen                   
                                                  concedido.                                

  **RF-ADM-02-13**    RF         Conveniencia     RECOMENDACIÓN: conviene      Recomend.    Baja
                                                  permitir copiar el conjunto               
                                                  de permisos de un empleado                
                                                  existente al crear otro con               
                                                  la misma función, dejándolo               
                                                  editable antes de confirmar.              
                                                  Reduce el error de omisión                
                                                  sin introducir roles fijos.               

  **RNF-ADM-02-01**   RNF        Rendimiento      La comprobación del permiso  Deducido     Media
                                                  de un empleado no debe                    
                                                  requerir una consulta a la                
                                                  base de datos por cada                    
                                                  elemento de interfaz                      
                                                  evaluado.                                 

  **RNF-ADM-02-02**   RNF        Mantenibilidad   La incorporación de un       Deducido     Media
                                                  permiso nuevo al catálogo no              
                                                  debe requerir modificar los               
                                                  permisos ya concedidos a los              
                                                  empleados existentes.                     
  ------------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-02-01**   Dado que soy administrador y abro la ficha de permisos de
                     un empleado, cuando la consulto, entonces el sistema
                     muestra el catálogo completo de permisos agrupado por
                     área, indicando cuáles tiene concedidos.

  **CA-ADM-02-02**   Dado que concedo a un empleado el permiso de editar
                     productos, cuando lo guardo, entonces el sistema le
                     concede también el permiso de ver productos.

  **CA-ADM-02-03**   Dado que un empleado tiene concedido editar productos,
                     cuando intento retirarle el permiso de ver productos,
                     entonces el sistema me advierte de que ello implica
                     retirar también el de editar.

  **CA-ADM-02-04**   Dado que un empleado tiene sesión abierta con el permiso
                     de gestionar pedidos, cuando le retiro ese permiso,
                     entonces su siguiente intento de gestionar un pedido es
                     rechazado sin necesidad de que cierre sesión.

  **CA-ADM-02-05**   Dado que un empleado no tiene ningún permiso concedido,
                     cuando inicia sesión, entonces accede a su perfil y el
                     sistema no le muestra ninguna operación administrativa.

  **CA-ADM-02-06**   Dado que soy un empleado con permisos concedidos, cuando
                     intento acceder a la asignación de permisos, entonces el
                     sistema me lo deniega.

  **CA-ADM-02-07**   Dado que modifico los permisos de un empleado, cuando el
                     cambio se guarda, entonces el registro de auditoría
                     conserva el permiso afectado, el empleado, mi identidad y
                     el momento del cambio.
  ----------------------------------------------------------------------------

### **HU-ADM-04 --- Gestión de clientes desde la administración**

> Como empleado con permiso de atención / quiero consultar la
> información y el historial de compras de un cliente / para atender su
> solicitud con contexto.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-ADM-04-01**    RF         Consulta        El sistema debe permitir al  Deducido     Alta
                                                 personal autorizado buscar                
                                                 clientes por nombre,                      
                                                 documento o NIT, correo                   
                                                 electrónico y teléfono.                   

  **RF-ADM-04-02**    RF         Consulta        El sistema debe mostrar en   Deducido     Alta
                                                 la ficha del cliente sus                  
                                                 datos de contacto, su tipo                
                                                 de cuenta ---particular o                 
                                                 empresa--- y el estado de su              
                                                 cuenta.                                   

  **RF-ADM-04-03**    RF         Consulta        El sistema debe mostrar en   Definido     Alta
                                                 la ficha del cliente el                   
                                                 historial de sus órdenes de               
                                                 venta con su estado actual.               

  **RF-ADM-04-04**    RF         Consulta        El sistema debe permitir     Deducido     Media
                                                 abrir desde la ficha del                  
                                                 cliente el detalle de                     
                                                 cualquiera de sus órdenes.                

  **RF-ADM-04-05**    RF         Consulta        El sistema debe mostrar en   Definido     Media
                                                 la ficha del cliente las                  
                                                 cotizaciones que ha                       
                                                 solicitado, con su estado.                

  **RF-ADM-04-06**    RF         Restricción     El sistema no debe permitir  Deducido     Alta
                                                 al personal administrativo                
                                                 modificar los datos                       
                                                 personales de un cliente; su              
                                                 rectificación corresponde                 
                                                 únicamente al titular desde               
                                                 su perfil.                                

  **RF-ADM-04-07**    RF         Restricción     El sistema no debe mostrar   Deducido     Alta
                                                 al personal administrativo                
                                                 los datos completos del                   
                                                 medio de pago utilizado por               
                                                 el cliente.                               

  **RF-ADM-04-08**    RF         Restricción     El sistema no debe permitir  Deducido     Alta
                                                 al personal administrativo                
                                                 acceder a la contraseña de                
                                                 un cliente ni establecerle                
                                                 una nueva.                                

  **RF-ADM-04-09**    RF         Estado de la    El sistema debe permitir al  Deducido     Media
                                 cuenta          administrador desactivar la               
                                                 cuenta de un cliente,                     
                                                 impidiendo desde ese momento              
                                                 su inicio de sesión.                      

  **RF-ADM-04-10**    RF         Estado de la    El sistema debe mantener el  Deducido     Alta
                                 cuenta          cumplimiento de las órdenes               
                                                 en curso de un cliente cuya               
                                                 cuenta se desactive, hasta                
                                                 su entrega o su devolución.               

  **RF-ADM-04-11**    RF         Estado de la    El sistema debe conservar el Deducido     Baja
                                 cuenta          contenido del carrito de un               
                                                 cliente desactivado, para                 
                                                 restituirlo si la cuenta se               
                                                 reactiva.                                 

  **RF-ADM-04-12**    RF         Estado de la    El sistema debe exigir un    Deducido     Media
                                 cuenta          motivo al desactivar la                   
                                                 cuenta de un cliente y                    
                                                 conservarlo junto al                      
                                                 registro de la acción.                    

  **RF-ADM-04-13**    RF         Estado de la    El sistema debe permitir     Deducido     Media
                                 cuenta          reactivar la cuenta de un                 
                                                 cliente desactivada,                      
                                                 restituyendo su acceso y su               
                                                 historial.                                

  **RF-ADM-04-14**    RF         Conveniencia    RECOMENDACIÓN: conviene      Recomend.    Baja
                                                 permitir al personal de                   
                                                 atención registrar notas                  
                                                 internas en la ficha del                  
                                                 cliente, visibles solo para               
                                                 el personal, para dar                     
                                                 continuidad entre distintos               
                                                 empleados que atiendan al                 
                                                 mismo cliente.                            

  **RNF-ADM-04-01**   RNF        Privacidad      El acceso a la ficha de un   Deducido     Alta
                                                 cliente debe limitarse al                 
                                                 personal con permiso de                   
                                                 atención, y quedar                        
                                                 registrado.                               

  **RNF-ADM-04-02**   RNF        Rendimiento     La búsqueda de clientes debe Deducido     Media
                                                 responder en un tiempo que                
                                                 permita usarla durante una                
                                                 conversación de atención.                 
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-04-01**   Dado que soy un empleado con permiso de atención, cuando
                     busco un cliente por su documento, entonces el sistema me
                     muestra su ficha con sus datos de contacto y el estado de
                     su cuenta.

  **CA-ADM-04-02**   Dado que consulto la ficha de un cliente, cuando reviso
                     su historial, entonces el sistema me muestra sus órdenes
                     de venta y sus cotizaciones con el estado de cada una.

  **CA-ADM-04-03**   Dado que consulto la ficha de un cliente, cuando intento
                     modificar su correo o su teléfono, entonces el sistema no
                     me lo permite.

  **CA-ADM-04-04**   Dado que consulto una orden de un cliente, cuando reviso
                     el pago, entonces el sistema no me muestra los datos
                     completos del medio de pago utilizado.

  **CA-ADM-04-05**   Dado que soy administrador y desactivo la cuenta de un
                     cliente sin indicar motivo, cuando intento guardar,
                     entonces el sistema me lo impide.

  **CA-ADM-04-06**   Dado que un cliente con una orden en preparación es
                     desactivado, cuando se consulta esa orden, entonces sigue
                     su curso hasta la entrega.

  **CA-ADM-04-07**   Dado que soy un empleado con permiso de atención, cuando
                     intento desactivar la cuenta de un cliente, entonces el
                     sistema me lo deniega.

  **CA-ADM-04-08**   Dado que accedo a la ficha de un cliente, cuando la
                     consulta se produce, entonces el registro de auditoría
                     conserva mi identidad y el momento del acceso.
  ----------------------------------------------------------------------------

### **HU-ADM-05 --- Configuración general del sistema**

> Como administrador / quiero modificar desde el panel los parámetros
> operativos y comerciales / para adaptar el sistema sin pedir un
> desarrollo cada vez.

**Alcance:** *Comprende qué parámetros son configurables, cómo se
modifican, cómo se validan y cómo se registra el cambio. No comprende la
gestión del contenido institucional ---misión, visión, horarios,
logotipo---, que corresponde a M16.*

**Requisitos**

  -------------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**    **Requisito**                 **Origen**   **Prior.**
  ------------------- ---------- ---------------- ----------------------------- ------------ ------------
  **RF-ADM-05-01**    RF         Configuración    El sistema debe permitir al   Definido     Alta
                                                  administrador modificar desde              
                                                  el panel los parámetros                    
                                                  operativos y comerciales                   
                                                  configurables, sin                         
                                                  intervención del equipo de                 
                                                  desarrollo.                                

  **RF-ADM-05-02**    RF         Configuración    El sistema debe agrupar los   Deducido     Media
                                                  parámetros por área funcional              
                                                  y describir junto a cada uno               
                                                  su efecto. El catálogo                     
                                                  completo de los parámetros                 
                                                  gestionados por esta                       
                                                  historia, y de las áreas                   
                                                  funcionales en que se                      
                                                  agrupan, se define en                      
                                                  HU-ADM-07.                                 

  **RF-ADM-05-03**    RF         Configuración    El sistema debe aplicar el    Deducido     Alta
                                                  valor nuevo de un parámetro                
                                                  de forma inmediata, sin                    
                                                  requerir un reinicio ni un                 
                                                  despliegue.                                

  **RF-ADM-05-04**    RF         Configuración    El sistema debe conservar un  Deducido     Media
                                                  valor por defecto para cada                
                                                  parámetro y permitir                       
                                                  restituirlo.                               

  **RF-ADM-05-05**    RF         Configuración    El sistema debe impedir que   Deducido     Alta
                                                  un parámetro quede sin valor.              

  **RF-ADM-05-06**    RF         Validación       El sistema debe validar que   Definido     Alta
                                                  el valor introducido                       
                                                  pertenezca al rango o al                   
                                                  conjunto admisible del                     
                                                  parámetro antes de aceptarlo.              

  **RF-ADM-05-07**    RF         Validación       El sistema debe advertir al   Deducido     Media
                                                  administrador cuando el valor              
                                                  introducido, siendo                        
                                                  admisible, tenga un efecto                 
                                                  amplio sobre la operación, y               
                                                  exigir confirmación.                       

  **RF-ADM-05-08**    RF         Trazabilidad     El sistema debe registrar     Definido     Alta
                                                  cada cambio de configuración               
                                                  indicando el parámetro, el                 
                                                  valor anterior, el valor                   
                                                  nuevo, el autor y el momento.              

  **RF-ADM-05-09**    RF         Trazabilidad     El sistema debe mostrar junto Deducido     Baja
                                                  a cada parámetro la fecha de               
                                                  su última modificación.                    

  **RF-ADM-05-10**    RF         Alcance          El sistema no debe aplicar    Deducido     Alta
                                                  retroactivamente un cambio de              
                                                  configuración sobre                        
                                                  operaciones ya cerradas.                   

  **RNF-ADM-05-01**   RNF        Seguridad        El acceso a la configuración  Deducido     Alta
                                                  general debe reservarse al                 
                                                  administrador.                             

  **RNF-ADM-05-02**   RNF        Mantenibilidad   La incorporación de un        Deducido     Media
                                                  parámetro nuevo no debe                    
                                                  requerir modificar los                     
                                                  valores ya configurados.                   
  -------------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-05-01**   Dado que soy administrador, cuando accedo a la
                     configuración general, entonces el sistema muestra los
                     parámetros agrupados por área con su valor vigente y la
                     descripción de su efecto.

  **CA-ADM-05-02**   Dado que modificó el valor de un parámetro, cuando lo
                     guardo, entonces el sistema lo aplica de inmediato sin
                     requerir reinicio.

  **CA-ADM-05-03**   Dado que introduzco un valor fuera del rango admisible,
                     cuando intento guardar, entonces el sistema lo rechaza e
                     indica el rango válido.

  **CA-ADM-05-04**   Dado que borro el valor de un parámetro, cuando intento
                     guardar, entonces el sistema lo impide o restituye el
                     valor por defecto.

  **CA-ADM-05-05**   Dado que modifico el porcentaje de IVA, cuando consulto
                     una orden ya cerrada, entonces esa orden conserva el
                     porcentaje vigente en el momento de su emisión.

  **CA-ADM-05-06**   Dado que modifico un parámetro, cuando consulto el
                     registro de auditoría, entonces figuran el valor
                     anterior, el valor nuevo, mi identidad y el momento del
                     cambio.

  **CA-ADM-05-07**   Dado que soy un empleado con permisos concedidos, cuando
                     intento acceder a la configuración general, entonces el
                     sistema me lo deniega.
  ----------------------------------------------------------------------------

### **HU-ADM-06 --- Gobernanza de la cuenta de administrador**

> Como responsable del negocio / quiero que esté definido cómo se crea y
> se sustituye la cuenta de administrador / para que el sistema nunca
> quede sin nadie que pueda administrarlo.

**Alcance:** *Comprende la naturaleza de la cuenta de administrador, su
creación inicial, su sustitución y las protecciones que impiden que el
sistema quede sin administración. No comprende la gestión de empleados
ni de permisos, que corresponden a HU-ADM-01 y HU-ADM-02.*

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-ADM-06-01**    RF         Naturaleza      El sistema debe tratar la    Definido     Alta
                                                 cuenta de administrador como              
                                                 una entidad distinta de las               
                                                 cuentas de empleado, y no                 
                                                 como una cuenta de empleado               
                                                 con todos los permisos                    
                                                 concedidos.                               

  **RF-ADM-06-02**    RF         Naturaleza      El sistema debe admitir una  Definido     Alta
                                                 única cuenta de                           
                                                 administrador.                            

  **RF-ADM-06-03**    RF         Naturaleza      El sistema no debe exponer   Deducido     Alta
                                                 la creación de cuentas de                 
                                                 administrador como una                    
                                                 operación del panel.                      

  **RF-ADM-06-04**    RF         Creación        El sistema debe disponer de  Deducido     Alta
                                 inicial         la cuenta de administrador                
                                                 desde el momento de su                    
                                                 instalación, creada mediante              
                                                 un procedimiento de                       
                                                 despliegue y no mediante una              
                                                 operación de la aplicación.               

  **RF-ADM-06-05**    RF         Creación        El sistema debe exigir el    Deducido     Alta
                                 inicial         cambio de la credencial                   
                                                 inicial del administrador en              
                                                 su primer acceso.                         

  **RF-ADM-06-06**    RF         Protección      El sistema debe impedir que  Deducido     Alta
                                                 la cuenta de administrador                
                                                 sea desactivada, eliminada o              
                                                 despojada de sus facultades               
                                                 por cualquier vía, incluida               
                                                 la del propio administrador.              

  **RF-ADM-06-07**    RF         Protección      El sistema debe tratar las   Deducido     Alta
                                                 facultades del administrador              
                                                 como implícitas y no                      
                                                 editables, de modo que no                 
                                                 exista una operación capaz                
                                                 de reducirlas.                            

  **RF-ADM-06-08**    RF         Sustitución     El sistema debe permitir al  Deducido     Alta
                                                 administrador modificar el                
                                                 correo electrónico asociado               
                                                 a su cuenta, siendo este el               
                                                 mecanismo por el que se                   
                                                 sustituye a la persona                    
                                                 responsable sin crear una                 
                                                 cuenta nueva.                             

  **RF-ADM-06-09**    RF         Sustitución     El sistema debe confirmar el Deducido     Alta
                                                 cambio de correo del                      
                                                 administrador mediante una                
                                                 verificación enviada a la                 
                                                 dirección nueva, y no                     
                                                 aplicarlo hasta que esa                   
                                                 verificación se complete.                 

  **RF-ADM-06-11**    RF         Sustitución     El sistema debe invalidar    Deducido     Alta
                                                 todas las sesiones activas                
                                                 del administrador cuando su               
                                                 correo o su contraseña                    
                                                 cambien.                                  

  **RF-ADM-06-12**    RF         Recuperación    El sistema debe permitir al  Deducido     Alta
                                                 administrador recuperar el                
                                                 acceso mediante el mismo                  
                                                 mecanismo de recuperación de              
                                                 contraseña disponible para                
                                                 las demás cuentas, actuando               
                                                 su correo verificado como                 
                                                 único punto de recuperación.              

  **RF-ADM-06-13**    RF         Trazabilidad    El sistema debe registrar el Deducido     Alta
                                                 cambio de correo del                      
                                                 administrador, el cambio de               
                                                 su contraseña y cada uno de               
                                                 sus accesos.                              

  **RNF-ADM-06-01**   RNF        Seguridad       La credencial inicial del    Deducido     Alta
                                                 administrador no debe quedar              
                                                 almacenada en ningún archivo              
                                                 de configuración ni en el                 
                                                 código fuente tras la                     
                                                 instalación.                              

  **RNF-ADM-06-02**   RNF        Continuidad     El procedimiento de          Deducido     Alta
                                                 restitución de la cuenta de               
                                                 administrador ante la                     
                                                 pérdida total del acceso                  
                                                 debe estar documentado y ser              
                                                 ejecutable por el equipo                  
                                                 responsable del despliegue.               
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-06-01**   Dado que el sistema acaba de instalarse, cuando accedo
                     por primera vez con la credencial inicial del
                     administrador, entonces el sistema me exige establecer
                     una contraseña nueva antes de permitirme cualquier otra
                     acción.

  **CA-ADM-06-02**   Dado que soy administrador, cuando busco en el panel una
                     opción para crear otra cuenta de administrador, entonces
                     el sistema no ofrece ninguna.

  **CA-ADM-06-03**   Dado que soy administrador, cuando intento desactivar o
                     eliminar mi propia cuenta, entonces el sistema lo impide
                     e indica que el sistema no puede quedar sin
                     administrador.

  **CA-ADM-06-04**   Dado que soy administrador, cuando reviso la pantalla de
                     permisos, entonces mis facultades no aparecen como
                     asignables ni modificables.

  **CA-ADM-06-05**   Dado que cambia la persona responsable del negocio,
                     cuando modifico el correo de la cuenta de administrador,
                     entonces el sistema envía una verificación a la dirección
                     nueva y no aplica el cambio hasta completarla.

  **CA-ADM-06-06**   Dado que el cambio de correo se completa, cuando reviso
                     la dirección anterior, entonces ha recibido la
                     notificación del cambio.

  **CA-ADM-06-07**   Dado que cambio el correo o la contraseña de la cuenta de
                     administrador, cuando el cambio se aplica, entonces todas
                     las sesiones activas de esa cuenta quedan cerradas.

  **CA-ADM-06-08**   Dado que he perdido la contraseña de administrador,
                     cuando uso la recuperación de contraseña, entonces el
                     sistema envía el enlace de restablecimiento al correo
                     verificado de la cuenta.
  ----------------------------------------------------------------------------

### **HU-ADM-07 --- Catalogo de parámetros configurables**

**Como** administrador,

**quiero** que el sistema tenga definido explícitamente cuáles son todos
los parámetros operativos y comerciales configurables, agrupados por
área funcional,

**para** saber con certeza qué puedo ajustar desde la configuración
general, sin depender de que el equipo de desarrollo me lo confirme caso
por caso.

  -----------------------------------------------------------------------------------------------------
  **ID**             **Tipo**   **Categoría**    **Requisito**                **Origen**   **Prior.**
  ------------------ ---------- ---------------- ---------------------------- ------------ ------------
                                                                                           

  **RF-ADM-07-01**   RF         Catálogo         El sistema debe mantener un  Definido     Alta
                                                 catálogo con todos los                    
                                                 parámetros configurables                  
                                                 existentes, agrupados en las              
                                                 siguientes áreas                          
                                                 funcionales: Autenticación y              
                                                 verificación,                             
                                                 Comunicaciones, y Comercial.              

  **RF-ADM-07-02**   RF         Catálogo         El área de Autenticación y   Definido     Alta
                                                 verificación debe incluir,                
                                                 como mínimo, los siguientes               
                                                 parámetros: vigencia del                  
                                                 código de verificación de                 
                                                 registro; intentos                        
                                                 permitidos para introducir                
                                                 el código; complejidad                    
                                                 mínima de la contraseña;                  
                                                 vigencia del enlace o código              
                                                 de recuperación de                        
                                                 contraseña; intentos                      
                                                 fallidos de inicio de sesión              
                                                 antes de aplicar                          
                                                 restricción; y duración de                
                                                 la restricción por intentos               
                                                 fallidos.                                 

  **RF-ADM-07-03**   RF         Catálogo         El área de Comunicaciones    Definido     Alta
                                                 debe incluir, como mínimo,                
                                                 el parámetro de número de                 
                                                 reintentos de envío de una                
                                                 comunicación transaccional                
                                                 ante fallo.                               

  **RF-ADM-07-04**   RF         Catálogo         El área Comercial debe       Pendiente    Alta
                                                 incluir los parámetros                    
                                                 comerciales configurables                 
                                                 del sistema. **Pendiente**:               
                                                 definir con Isabella el                   
                                                 listado completo (por                     
                                                 ejemplo, porcentaje de IVA,               
                                                 costo de envío, umbral de                 
                                                 envío gratis), dado que el                
                                                 único parámetro comercial                 
                                                 mencionado en el análisis                 
                                                 (IVA) aparece como ejemplo                
                                                 suelto y no está aún                      
                                                 catalogado formalmente.                   

  **RF-ADM-07-05**   RF         Mantenibilidad   El catálogo de esta historia Deducido     Media
                                                 debe mantenerse sincronizado              
                                                 con el Anexo A.3, de modo                 
                                                 que ningún parámetro exista               
                                                 en uno sin existir en el                  
                                                 otro                                      
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-07-01**   Dado que soy administrador y accedo a la configuración
                     general, cuando reviso el área de Autenticación y
                     verificación, entonces encuentro exactamente los seis
                     parámetros definidos en RF-ADM-07-02.

  **CA-ADM-07-02**   Dado que soy administrador y accedo a la configuración
                     general, cuando reviso el área de Comunicaciones,
                     entonces encuentro el parámetro de reintentos de envío
                     definido en RF-ADM-07-03.

  **CA-ADM-07-03**   Dado que se incorpora un parámetro nuevo al sistema,
                     cuando se agrega al Anexo A.3, entonces también se agrega
                     al catálogo de esta historia, y viceversa.
  ----------------------------------------------------------------------------

### 

# **6. Preguntas pendientes**

## **6.1 Listado por historia**

  --------------------------------------------------------------------------
  **Historia**    **Pregunta**
  --------------- ----------------------------------------------------------
  **HU-SEG-01**   ¿Debe impedirse reutilizar una contraseña empleada
                  anteriormente por el mismo usuario? Exige conservar un
                  historial de derivaciones.

  **HU-SEG-02**   ¿Debe el usuario poder ver y cerrar sus sesiones abiertas
                  en otros dispositivos? Los tiempos de vigencia se
                  dedujeron y son configurables; conviene confirmarlos o
                  ajustarlos.

  **HU-SEG-04**   ¿Cuál es el periodo definitivo de conservación del
                  registro de auditoría? Debe alinearse con la obligación
                  legal de conservación de información comercial, que no
                  corresponde decidir al equipo técnico.

  **HU-SEG-05**   ¿En qué plazo debe atenderse una solicitud de supresión de
                  datos y quién la resuelve dentro de la organización?

  **HU-SEG-05**   ¿Quién responde en la organización por el tratamiento de
                  datos personales?

  **HU-SEG-05**   La postura sobre las imágenes del simulador y sobre la
                  conservación de conversaciones de chatbot y WhatsApp sigue
                  pendiente, pero pertenece a historias bloqueadas del
                  módulo de asesoría.

  **HU-ADM-01**   Cuando se desactiva la cuenta de un empleado que tenía
                  trabajo asignado y sin terminar ---por ejemplo,
                  cotizaciones en elaboración u órdenes en preparación---,
                  ¿ese trabajo debe reasignarse automáticamente a la bandeja
                  general para que lo tome otra persona, o debe quedar
                  retenido a la espera de que el administrador lo reasigne
                  uno a uno?

  **HU-ADM-02**   El modelo actual reserva al administrador la gestión de
                  empleados, la asignación de permisos y la configuración
                  general, por ser la raíz del control de acceso. ¿Debe
                  mantenerse así, o el negocio necesita poder delegar alguna
                  de esas tres facultades en un empleado de confianza ---por
                  ejemplo, para que el comercio siga operando cuando el
                  administrador no esté disponible?

  **HU-ADM-04**   El documento de negocio atribuye al administrador la
                  gestión de los clientes particulares y de empresa,
                  mientras que el análisis concluye que los datos personales
                  solo los rectifica su titular. ¿Qué comprende exactamente
                  esa gestión: consultar, activar y desactivar, o también
                  corregir un dato del cliente cuando este lo solicita por
                  teléfono? Si comprende la corrección, hay que registrar
                  quién la hizo y a petición de quién.
  --------------------------------------------------------------------------

## **6.2 Quién puede responder cada una**

  -----------------------------------------------------------------------
  **Tipo de pregunta**   **Cuáles son y qué hacer mientras tanto**
  ---------------------- ------------------------------------------------
  **Decisión legal**     El plazo de conservación del registro de
                         auditoría y el plazo para atender una solicitud
                         de supresión de datos. Los fija la normativa
                         colombiana de protección de datos y la
                         obligación de conservación de información
                         comercial, no el equipo. Mientras tanto, el
                         sistema conserva el registro al menos mientras
                         exista la entidad a la que se refiere, que es el
                         mínimo defendible.

  **Decisión             Quién responde en la organización por el
  organizativa**         tratamiento de datos personales y quién resuelve
                         las solicitudes de supresión. No afecta al
                         desarrollo: la funcionalidad se construye igual
                         y solo cambia a quién se notifica.

  **Decisión de          Si la gestión de empleados, los permisos o la
  alcance**              configuración deben poder delegarse, y qué
                         comprende la gestión administrativa de un
                         cliente. Ambas están especificadas con la
                         interpretación más restrictiva, que es la
                         reversible: ampliar después es sencillo,
                         restringir después ya no.

  **Confirmación de      Los tiempos de vigencia de sesión y si el
  valores**              usuario debe poder cerrar sus sesiones abiertas
                         en otros dispositivos. Los tiempos están
                         deducidos y son configurables desde el panel. La
                         gestión de sesiones ajenas es una función
                         acotada que puede añadirse después sin rehacer
                         nada.

  **Detalle de           Si debe impedirse reutilizar una contraseña ya
  seguridad**            empleada por el mismo usuario. Exige conservar
                         un historial de derivaciones, que tiene coste y
                         también implicación de privacidad. Sin
                         respuesta, no se implementa.
  -----------------------------------------------------------------------

# 
