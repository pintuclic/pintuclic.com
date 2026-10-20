**PINTU CLIC**

Plataforma de comercio electrónico

**HU-ADM-03 POLITICA DE CONTROL DE ACCESO PARA EL MODULO 17:
ADMINISTRACION, EMPLEADOS Y PERMISOS**

## 

### **HU-ADM-03 --- Verificación de permisos en el servidor**

> Como administrador / quiero que el sistema compruebe el permiso en el
> servidor ante cada operación / para que ocultar un botón no sea la
> única barrera frente a un acceso indebido.

**Requisitos**

  -----------------------------------------------------------------------------------------------------
  **ID**              **Tipo**   **Categoría**   **Requisito**                **Origen**   **Prior.**
  ------------------- ---------- --------------- ---------------------------- ------------ ------------
  **RF-ADM-03-01**    RF         Comprobación    El sistema debe comprobar en Definido     Alta
                                                 el servidor el permiso                    
                                                 correspondiente antes de                  
                                                 ejecutar cualquier operación              
                                                 administrativa, con                       
                                                 independencia de cómo se                  
                                                 haya originado la petición.               

  **RF-ADM-03-02**    RF         Comprobación    El sistema debe comprobar el Deducido     Alta
                                                 permiso también en las                    
                                                 operaciones de consulta que               
                                                 devuelvan información                     
                                                 restringida, no solo en las               
                                                 que modifican datos.                      

  **RF-ADM-03-03**    RF         Comprobación    El sistema debe resolver los Deducido     Alta
                                                 permisos del empleado en el               
                                                 momento de cada operación, y              
                                                 no a partir de un valor                   
                                                 fijado al iniciar la sesión.              

  **RF-ADM-03-04**    RF         Interfaz        El sistema debe ocultar en   Definido     Alta
                                                 la interfaz las opciones                  
                                                 correspondientes a permisos               
                                                 no concedidos, entendiendo                
                                                 esa ocultación como una                   
                                                 ayuda de usabilidad y nunca               
                                                 como el control de acceso.                

  **RF-ADM-03-05**    RF         Acceso directo  El sistema debe rechazar el  Definido     Alta
                                                 acceso directo por dirección              
                                                 a una función no permitida,               
                                                 aunque esa función no se                  
                                                 muestre en el menú del                    
                                                 empleado.                                 

  **RF-ADM-03-06**    RF         Respuesta       El sistema debe responder a  Deducido     Alta
                                                 un acceso no autorizado con               
                                                 un mensaje genérico de                    
                                                 acceso denegado, sin revelar              
                                                 si el recurso solicitado                  
                                                 existe ni qué permiso                     
                                                 concreto haría falta.                     

  **RF-ADM-03-07**    RF         Respuesta       El sistema debe mantener la  Deducido     Media
                                                 sesión abierta tras un                    
                                                 acceso denegado y devolver                
                                                 al empleado a una pantalla a              
                                                 la que sí tenga acceso.                   

  **RF-ADM-03-08**    RF         Trazabilidad    El sistema debe registrar    Definido     Alta
                                                 todo intento de acceso                    
                                                 denegado, indicando el                    
                                                 empleado, la operación                    
                                                 solicitada y el momento.                  

  **RNF-ADM-03-01**   RNF        Seguridad       La comprobación de permisos  Deducido     Alta
                                                 debe estar centralizada, de               
                                                 modo que una operación nueva              
                                                 quede protegida por omisión               
                                                 y no por acuerdo del                      
                                                 programador que la escriba.               

  **RNF-ADM-03-02**   RNF        Rendimiento     La comprobación de permisos  Deducido     Media
                                                 no debe introducir una                    
                                                 demora perceptible en la                  
                                                 respuesta de la operación.                
  -----------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ----------------------------------------------------------------------------
  **ID**             **Criterio**
  ------------------ ---------------------------------------------------------
  **CA-ADM-03-01**   Dado que soy un empleado sin el permiso de gestionar
                     pedidos, cuando accedo al panel, entonces el sistema no
                     me muestra la opción de gestión de pedidos.

  **CA-ADM-03-02**   Dado que soy un empleado sin el permiso de gestionar
                     pedidos, cuando solicito directamente la dirección de esa
                     función, entonces el sistema deniega el acceso aunque la
                     opción no estuviera visible.

  **CA-ADM-03-03**   Dado que el sistema me deniega el acceso a una función,
                     cuando leo el mensaje, entonces este no indica si el
                     recurso existe ni qué permiso concreto me falta.

  **CA-ADM-03-04**   Dado que el sistema me deniega el acceso, cuando la
                     operación termina, entonces mi sesión sigue abierta y el
                     sistema me devuelve a una pantalla permitida.

  **CA-ADM-03-05**   Dado que el administrador me retira un permiso mientras
                     tengo sesión abierta, cuando ejecuto una operación que lo
                     requería, entonces el sistema la rechaza.

  **CA-ADM-03-06**   Dado que intento una operación sin permiso, cuando el
                     sistema la deniega, entonces el registro de auditoría
                     conserva mi identidad, la operación solicitada y el
                     momento.
  ----------------------------------------------------------------------------

### 
