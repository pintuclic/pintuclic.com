**PINTU CLIC**

***HU-CUE-08 POLITICA DE UNICIDAD DE LA CUENTA PARA EL MODULO 04:
CUENTAS, AUTENTICACION Y PERFIL***

**ANÁLISIS DE REQUISITOS**

## M04. Cuentas, autenticación y perfil

Propósito. Permitir que una persona o una empresa constituya una
identidad dentro del sistema, acceda a ella de forma segura y administre
sus datos, diferenciando el cliente particular del cliente empresa
sujeto a aprobación.

### HU-CUE-08 --- Identidad y unicidad de la cuenta

**Como** *responsable del negocio*

**Quiero** *que cada cuenta esté identificada de forma inequívoca*

**Para** *evitar cuentas duplicadas y confusión sobre a quién pertenece
una compra*

**Alcance:** *Comprende qué atributo identifica de forma única a una
cuenta de cliente y qué combinaciones de cuentas son admisibles frente a
cuentas de empleado o de administrador.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-08-01   RF         Identidad       **Identificar de forma única   Deducido     Alta
                                            cada cuenta del sistema                     
                                            ---cliente, empleado o                      
                                            administrador--- por su correo              
                                            electrónico, sin distinción de              
                                            tipo de cuenta.**                           

  RF-CUE-08-02   RF         Identidad       **Un mismo correo no puede     Definido     Alta
                                            pertenecer simultáneamente a                
                                            una cuenta de cliente y a una               
                                            cuenta de empleado o de                     
                                            administrador. La verificación              
                                            de unicidad al registrar debe               
                                            consultar los tres tipos de                 
                                            cuenta antes de aceptar el                  
                                            registro**                                  

  RF-CUE-08-03   RF         Identidad       **\[Pendiente\]** No está      Pendiente    Media
                                            definido si un cliente                      
                                            particular puede cambiar de                 
                                            tipo a empresa después de                   
                                            registrado, o si necesita una               
                                            cuenta nueva.                               
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-08-01   Dado que existe una cuenta de cliente activa con un correo
                 determinado, cuando alguien intenta crear otra cuenta de
                 cliente con el mismo correo, entonces el sistema rechaza la
                 operación.

  CA-CUE-08-01   Dado que un correo ya está en uso por una cuenta de
                 empleado, cuando un visitante intenta registrarse como
                 cliente con ese correo, el sistema rechaza el registro
  ---------------------------------------------------------------------------

## 

## 

## 

## 

## 

## 

## 
