**PINTU CLIC**

Plataforma de comercio electrónico

**ANÁLISIS DE REQUISITOS**

**HU-SEG-06 POLITICA DE DATOS SENSIBLES PARA EL MODULO 20: SEGURIDAD,
AUDITORIA Y PROTECCION DE DATOS**

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
