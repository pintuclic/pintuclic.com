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
+=================+====================================================+

# 

# 1. Análisis por historia

## M04. Cuentas, autenticación y perfil

Propósito. Permitir que una persona o una empresa constituya una
identidad dentro del sistema, acceda a ella de forma segura y administre
sus datos, diferenciando el cliente particular del cliente empresa
sujeto a aprobación.

### HU-CUE-01 --- Registro mediante correo con verificación

**Como** *visitante*

**Quiero** *crear una cuenta con mi correo y confirmar que es mío
mediante un código*

**Para** *poder comprar y recibir las comunicaciones de mis pedidos*

**Alcance:** *Comprende la creación de la cuenta mediante datos
personales y contraseña, y el envío, vigencia y verificación del código
de confirmación. No comprende el inicio de sesión posterior (HU-CUE-04),
la recuperación de contraseña (HU-CUE-05) ni la gestión de direcciones
(HU-CUE-07); la dirección no se solicita en este registro (ver
Recomendación no vinculante en Reglas de negocio y Contradicción C-20).*

**Requisitos**

  ---------------------------------------------------------------------------------------------------
  **ID**          **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  --------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-01-01    RF         Registro        **\[Definido\]** El sistema    Definido     Alta
                                             debe permitir crear una cuenta              
                                             de cliente particular mediante              
                                             nombre, correo electrónico,                 
                                             teléfono y contraseña.                      

  RF-CUE-01-02    RF         Verificación    **\[Definido\]** El sistema    Definido     Alta
                                             debe enviar al correo indicado              
                                             un código de verificación                   
                                             inmediatamente después del                  
                                             registro.                                   

  RF-CUE-01-03    RF         Verificación    **\[Deducido\]** El sistema    Deducido     Alta
                                             debe exigir la confirmación                 
                                             del código antes de habilitar               
                                             el acceso completo de la                    
                                             cuenta: sin esa condición el                
                                             correo no cumpliría la función              
                                             de confirmar que el usuario                 
                                             tiene acceso efectivo a él,                 
                                             que es el propósito declarado               
                                             de la historia.                             

  RF-CUE-01-04    RF         Verificación    **\[Deducido\]** El sistema    Deducido     Media
                                             debe permitir solicitar el                  
                                             reenvío del código cuando el                
                                             original no se haya recibido o              
                                             haya expirado.                              

  RF-CUE-01-05    RF         Contraseña      **\[Deducido\]** El sistema    Deducido     Alta
                                             debe exigir que la contraseña               
                                             cumpla un mínimo de                         
                                             complejidad antes de aceptar                
                                             el registro, según el                       
                                             parámetro configurable de                   
                                             complejidad mínima (ver 4.2).               

  RNF-CUE-01-01   RNF        Seguridad       **\[Deducido\]** El            Deducido     Alta
                                             almacenamiento y la                         
                                             verificación de la contraseña               
                                             deben seguir el mismo                       
                                             mecanismo ya definido en                    
                                             HU-SEG-01 (Tanda 2), sin                    
                                             introducir un segundo esquema.              
  ---------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-01-01   Dado que un visitante completa el registro con datos
                 válidos, cuando confirma el envío, entonces el sistema crea
                 la cuenta en condición no verificada y envía el código al
                 correo indicado.

  CA-CUE-01-02   Dado que un usuario introduce el código correcto dentro del
                 plazo vigente, cuando lo confirma, entonces la cuenta queda
                 verificada y habilitada para iniciar sesión.

  CA-CUE-01-03   Dado que un usuario introduce un código incorrecto, cuando
                 se agotan los intentos permitidos, entonces el sistema exige
                 solicitar un nuevo código antes de continuar.

  CA-CUE-01-04   Dado que un visitante intenta registrarse con un correo ya
                 asociado a una cuenta de cliente, cuando envía el
                 formulario, entonces el sistema rechaza el registro sin
                 revelar más información que la existencia de un conflicto.

  CA-CUE-01-05   Dado que el código de verificación ha expirado, cuando el
                 usuario intenta usarlo, entonces el sistema lo rechaza y
                 ofrece la opción de reenviar uno nuevo.
  ---------------------------------------------------------------------------

### HU-CUE-02 --- Registro y acceso mediante Google

**Como** *visitante*

**Quiero** *entrar con mi cuenta de Google*

**Para** *no tener que crear ni recordar otra contraseña*

**Alcance:** *Comprende la creación de cuenta y el inicio de sesión
mediante Google Identity, la obtención de datos del proveedor para
completar el perfil, y el tratamiento de la coincidencia con una cuenta
ya creada por correo. No comprende la gestión de perfil posterior
(HU-CUE-06).*

**Requisitos**

  ---------------------------------------------------------------------------------------------------
  **ID**          **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  --------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-02-01    RF         Registro        **\[Definido\]** El sistema    Definido     Alta
                                             debe permitir crear una cuenta              
                                             o iniciar sesión mediante una               
                                             cuenta de Google.                           

  RF-CUE-02-02    RF         Registro        **\[Definido\]** El sistema    Definido     Media
                                             debe completar el perfil con                
                                             los datos que efectivamente                 
                                             entregue Google, sin exigir al              
                                             usuario que los repita.                     

  RF-CUE-02-03    RF         Identidad       **\[Deducido\]** Si el correo  Deducido     Alta
                                             que entrega Google coincide                 
                                             con el de una cuenta de                     
                                             cliente particular ya creada                
                                             por correo y contraseña, el                 
                                             sistema debe sugerir al                     
                                             usuario vincular el acceso de               
                                             Google a esa cuenta existente,              
                                             en lugar de crearla o                       
                                             vincularla automáticamente.                 
                                             Solo si el usuario confirma la              
                                             sugerencia, el sistema vincula              
                                             ambos accesos a la misma                    
                                             cuenta, por aplicación de la                
                                             unicidad de correo de                       
                                             RF-CUE-08-02.                               

  RF-CUE-02-04    RF         Credenciales    **\[Deducido\]** El sistema    Deducido     Alta
                                             debe exigir que el cliente                  
                                             registre una contraseña propia              
                                             inmediatamente después de                   
                                             completar el registro exitoso               
                                             mediante Google, de modo que                
                                             la cuenta cuente con ambas                  
                                             vías de acceso desde su                     
                                             creación. Vincular Google a                 
                                             una cuenta que ya tenía                     
                                             contraseña no se la retira:                 
                                             esa cuenta conserva las dos                 
                                             vías de acceso.                             

  RF-CUE-02-05    RF                         **El sistema debe permitir que              
                                             una cuenta vinculada entre                  
                                             Google y formulario propio                  
                                             inicie sesión indistintamente               
                                             por cualquiera de las dos                   
                                             vías, una vez completada la                 
                                             vinculación.**                              

  RNF-CUE-02-01   RNF        Fiabilidad      **\[Deducido\]** Un fallo o    Deducido     Media
                                             cancelación del flujo de                    
                                             autorización de Google no debe              
                                             dejar creada una cuenta                     
                                             parcial ni una sesión                       
                                             iniciada.                                   
  ---------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-02-01   Dado que un visitante sin cuenta autoriza el acceso con
                 Google, cuando el proveedor confirma la autorización,
                 entonces el sistema crea una cuenta de cliente con los datos
                 entregados.

  CA-CUE-02-02   Dado que el correo entregado por Google coincide con una
                 cuenta ya creada por correo y contraseña, cuando el usuario
                 autoriza el acceso, entonces el sistema le presenta la
                 sugerencia de vincular ambas cuentas; si el usuario
                 confirma, el inicio de sesión queda vinculado a la cuenta
                 existente en lugar de crear una nueva.

  CA-CUE-02-03   Dado que el usuario cancela el flujo de autorización de
                 Google, cuando regresa al sitio, entonces no queda ninguna
                 cuenta ni sesión creada.

  CA-CUE-02-04   Dado que una cuenta de cliente particular fue creada
                 mediante Google, cuando el sistema construye el perfil,
                 entonces le solicita digitar y confirmar una contraseña
                 antes de dar el registro por completado.

  CA-CUE-02-05   Dado que una cuenta quedó vinculada entre Google y
                 formulario propio, cuando el cliente intenta iniciar sesión
                 por cualquiera de las dos vías, entonces el sistema le
                 concede acceso a la misma cuenta.
  ---------------------------------------------------------------------------

### HU-CUE-03 --- Registro de cliente empresa sujeto a aprobación

**Como** *empresa compradora*

**Quiero** *registrarme aportando mi NIT y mis datos empresariales, y
que se me informe que mi solicitud quedó en revisión*

**Para** *saber que mi cuenta está en trámite y desde cuándo podré
comprar con condiciones de empresa*

**Alcance:** *Comprende el registro con datos e identificación
empresarial, el paso de la solicitud a estado pendiente, y la
información que recibe la empresa mientras espera. No comprende la
decisión de aprobación o rechazo, que corresponde a HU-CUE-09.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-03-01   RF         Registro        **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir el registro de                
                                            un cliente tipo empresa                     
                                            aportando información                       
                                            empresarial y NIT o RUT.                    

  RF-CUE-03-02   RF         Aprobación      **\[Definido\]** El sistema    Definido     Alta
                                            debe dejar la cuenta en                     
                                            condición pendiente de                      
                                            aprobación al completar el                  
                                            registro, sin habilitar                     
                                            condiciones comerciales de                  
                                            empresa hasta la decisión del               
                                            administrador.                              

  RF-CUE-03-03   RF         Registro        **\[Definido\]** El sistema    Definido     Alta
                                            debe informar a la empresa, al              
                                            completar el registro, que su               
                                            solicitud quedó en revisión.                

  RF-CUE-03-04   RF         Aprobación      **\[Deducido\]** El sistema    Deducido     Media
                                            debe permitir a la empresa                  
                                            consultar el estado de su                   
                                            solicitud (en revisión,                     
                                            aprobada o rechazada): la                   
                                            propia historia exige que la                
                                            empresa sepa que su cuenta                  
                                            está en trámite, lo que no es               
                                            posible sin un punto de                     
                                            consulta.                                   
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-03-01   Dado que una empresa completa el registro con NIT y datos
                 empresariales válidos, cuando lo envía, entonces la
                 solicitud queda pendiente y el sistema se lo informa.

  CA-CUE-03-02   Dado que una solicitud está pendiente, cuando la empresa
                 intenta comprar con condiciones de empresa, entonces el
                 sistema no se las concede hasta la aprobación.

  CA-CUE-03-03   Dado que el NIT aportado ya está asociado a una solicitud
                 existente, cuando la empresa intenta registrarse, entonces
                 el sistema rechaza el nuevo registro.
  ---------------------------------------------------------------------------

### HU-CUE-04 --- Inicio y cierre de sesión

**Como** *usuario registrado (cliente, empleado o administrador)*

**Quiero** *iniciar y cerrar sesión cuando lo decida*

**Para** *acceder a mi información y dejarla protegida cuando termino*

**Alcance:** *Comprende la autenticación mediante credenciales válidas y
el cierre explícito de sesión. La vigencia, renovación e invalidación de
la sesión ya están definidas en HU-SEG-02 (Tanda 2) y se aplican aquí
sin redefinirse.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-04-01   RF         Autenticación   **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir a un usuario                  
                                            registrado autenticarse con su              
                                            correo y contraseña, o                      
                                            mediante Google si la cuenta                
                                            está vinculada.                             

  RF-CUE-04-02   RF         Sesión          **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir al usuario                    
                                            cerrar su sesión de forma                   
                                            explícita en cualquier                      
                                            momento.                                    

  RF-CUE-04-03   RF         Restricción     **\[Deducido\]** El sistema    Deducido     Alta
                                            debe rechazar el inicio de                  
                                            sesión de una cuenta no                     
                                            verificada, remitiendo al                   
                                            proceso de verificación de                  
                                            HU-CUE-01.                                  

  RF-CUE-04-04   RF         Restricción     **\[Deducido\]** El sistema    Deducido     Alta
                                            debe rechazar el inicio de                  
                                            sesión de una cuenta                        
                                            desactivada.                                

  RF-CUE-04-05   RF         Seguridad       **\[Deducido\]** El sistema    Deducido     Alta
                                            debe limitar el número de                   
                                            intentos fallidos consecutivos              
                                            de inicio de sesión antes de                
                                            aplicar una restricción                     
                                            temporal, según el parámetro                
                                            configurable correspondiente                
                                            (ver 4.2): es la única forma                
                                            estructural de mitigar un                   
                                            ataque de fuerza bruta, aunque              
                                            el valor exacto no lo fija el               
                                            negocio.                                    
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-04-01   Dado que un usuario introduce credenciales correctas, cuando
                 las envía, entonces el sistema abre su sesión y lo redirige
                 a su cuenta.

  CA-CUE-04-02   Dado que un usuario introduce una contraseña incorrecta,
                 cuando lo intenta, entonces el sistema rechaza el acceso sin
                 indicar si el correo existe.

  CA-CUE-04-03   Dado que una cuenta está desactivada, cuando su titular
                 intenta iniciar sesión, entonces el sistema rechaza el
                 acceso.

  CA-CUE-04-04   Dado que un usuario cierra sesión explícitamente, cuando
                 confirma la acción, entonces su sesión queda invalidada de
                 inmediato.

  CA-CUE-04-05   Dado que se supera el número de intentos fallidos
                 permitidos, cuando el usuario intenta de nuevo, entonces el
                 sistema aplica la restricción temporal configurada.
  ---------------------------------------------------------------------------

### HU-CUE-05 --- Recuperación de contraseña

**Como** *cliente que olvidó su contraseña*

**Quiero** *recuperar el acceso a mi cuenta desde mi correo*

**Para** *no perder mi historial de compras ni tener que crear otra
cuenta*

**Alcance:** *Comprende la solicitud de recuperación, el envío y
vigencia del enlace o código, y su efecto sobre las sesiones activas. No
aplica a cuentas creadas exclusivamente mediante Google.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-05-01   RF         Recuperación    **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir solicitar la                  
                                            recuperación de contraseña                  
                                            indicando el correo                         
                                            registrado.                                 

  RF-CUE-05-02   RF         Recuperación    **\[Definido\]** El sistema    Definido     Alta
                                            debe enviar al correo un                    
                                            enlace o código de                          
                                            recuperación de un solo uso.                

  RF-CUE-05-03   RF         Restricción     **\[Deducido\]** El sistema    Deducido     Alta
                                            debe rechazar la solicitud de               
                                            recuperación sobre una cuenta               
                                            creada exclusivamente mediante              
                                            Google, informando que su                   
                                            acceso lo gestiona el                       
                                            proveedor: tal cuenta no tiene              
                                            contraseña que recuperar                    
                                            (RN-CUE-03).                                

  RF-CUE-05-04   RF         Privacidad      **\[Definido\]** El sistema no Definido     Alta
                                            debe revelar si el correo                   
                                            indicado corresponde o no a                 
                                            una cuenta registrada                       
                                            (aplicación de RT-13 y RT-22).              

  RF-CUE-05-05   RF         Sesión          **\[Definido\]** El cambio de  Definido     Alta
                                            contraseña mediante este                    
                                            mecanismo debe invalidar todas              
                                            las sesiones activas de la                  
                                            cuenta (aplicación de RT-15,                
                                            ya cerrado en Tanda 2).                     
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-05-01   Dado que un cliente solicita recuperación con un correo
                 registrado, cuando lo envía, entonces el sistema despacha un
                 enlace o código de un solo uso a ese correo.

  CA-CUE-05-02   Dado que un cliente solicita recuperación con un correo no
                 registrado, cuando lo envía, entonces el sistema responde de
                 la misma forma que si el correo existiera, sin revelar la
                 diferencia.

  CA-CUE-05-03   Dado que el enlace de recuperación ha expirado, cuando el
                 usuario intenta usarlo, entonces el sistema lo rechaza.

  CA-CUE-05-04   Dado que el cliente completa el cambio de contraseña
                 mediante recuperación, cuando se confirma, entonces todas
                 sus sesiones activas quedan invalidadas.

  CA-CUE-05-05   Dado que una cuenta está vinculada exclusivamente a Google,
                 cuando su titular solicita recuperación de contraseña,
                 entonces el sistema rechaza la solicitud e indica que el
                 acceso lo gestiona el proveedor.
  ---------------------------------------------------------------------------

### HU-CUE-06 --- Gestión del perfil

**Como** *cliente*

**Quiero** *consultar y actualizar mis datos personales*

**Para** *que mis pedidos y comunicaciones lleguen con la información
correcta*

**Alcance:** *Comprende la consulta y modificación de los datos propios
del cliente, incluidos correo y contraseña. No comprende la gestión de
direcciones (HU-CUE-07) ni los datos empresariales de una cuenta empresa
aprobada, cuya modificación depende de cómo se resuelva C-15 (Tanda 2,
abierta) sobre el alcance de \"gestionar\" un cliente.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-06-01   RF         Perfil          **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir al cliente                    
                                            consultar sus datos                         
                                            personales.                                 

  RF-CUE-06-02   RF         Perfil          **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir al cliente                    
                                            modificar sus datos                         
                                            personales, dentro de los                   
                                            límites que el propio sistema               
                                            establezca.                                 

  RF-CUE-06-03   RF         Seguridad       **\[Deducido\]** El sistema    Deducido     Alta
                                            debe exigir la verificación de              
                                            la nueva dirección de correo                
                                            antes de aplicar un cambio de               
                                            correo electrónico, y                       
                                            notificar el cambio a la                    
                                            dirección anterior, por el                  
                                            mismo fundamento ya cerrado                 
                                            para el administrador                       
                                            (RN-ADM-36, Tanda 2): sin esas              
                                            dos condiciones, quien                      
                                            accediera una sola vez a la                 
                                            cuenta podría apropiársela de               
                                            forma irreversible.                         

  RF-CUE-06-04   RF         Seguridad       **\[Deducido\]** El sistema    Deducido     Alta
                                            debe exigir la contraseña                   
                                            actual antes de aceptar un                  
                                            cambio de contraseña desde el               
                                            perfil.                                     

  RF-CUE-06-05   RF         Perfil          **\[Pendiente\]** No está      Pendiente    Baja
                                            definido si el teléfono                     
                                            secundario es un dato                       
                                            obligatorio, opcional, o si                 
                                            admite más de un valor.                     

  RF-CUE-06-06   RF                         **El sistema debe prohibir                  
                                            explícitamente que un cliente               
                                            tipo empresa modifique el NIT               
                                            de su cuenta desde la gestión               
                                            estándar del perfil.**                      

  RF-CUE-06-07   RF                         **El sistema debe definir en                
                                            el panel del cliente tipo                   
                                            particular una sección donde                
                                            pueda solicitar el cambio de                
                                            su cuenta a cliente tipo                    
                                            empresa, digitando el NIT                   
                                            correspondiente. Esta                       
                                            solicitud debe quedar visible               
                                            para el administrador en la                 
                                            gestión descrita en                         
                                            HU-CUE-09.**                                
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-06-01   Dado que un cliente autenticado consulta su perfil, cuando
                 accede, entonces el sistema le muestra sus datos personales
                 vigentes.

  CA-CUE-06-02   Dado que un cliente solicita cambiar su correo electrónico,
                 cuando lo confirma, entonces el sistema exige verificar la
                 nueva dirección antes de aplicar el cambio y notifica a la
                 anterior.

  CA-CUE-06-03   Dado que un cliente solicita cambiar su contraseña, cuando
                 no introduce correctamente la contraseña actual, entonces el
                 sistema rechaza el cambio.

  CA-CUE-06-04   Dado que un cliente cambia su contraseña desde el perfil,
                 cuando se confirma, entonces todas sus sesiones activas
                 quedan invalidadas.

  CA-CUE-06-05   Dado que un cliente tipo empresa intenta modificar el campo
                 de NIT desde su perfil, cuando envía el formulario, entonces
                 el sistema rechaza el cambio y no permite editar ese campo.

  CA-CUE-06-06   Dado que un cliente particular accede a la sección de cambio
                 a cuenta empresa, cuando digita un NIT y confirma la
                 solicitud, entonces el sistema la registra como pendiente y
                 la pone a disposición del administrador en HU-CUE-09.
  ---------------------------------------------------------------------------

### HU-CUE-07 --- Gestión de direcciones del cliente

**Como** *cliente*

**Quiero** *guardar varias direcciones en mi cuenta*

**Para** *no escribirlas de nuevo cada vez que compro*

**Alcance:** *Comprende el alta, edición y eliminación de direcciones
asociadas a la cuenta, y la designación de una dirección predeterminada.
No comprende su validación frente a una zona de cobertura ni su uso en
el checkout, que dependen del modelo de entrega (M10, bloqueado).*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-07-01   RF         Direcciones     **\[Definido\]** El sistema    Definido     Media
                                            debe permitir al cliente                    
                                            registrar una o varias                      
                                            direcciones asociadas a su                  
                                            cuenta.                                     

  RF-CUE-07-02   RF         Direcciones     **\[Deducido\]** El sistema    Deducido     Media
                                            debe permitir editar y                      
                                            eliminar una dirección ya                   
                                            registrada.                                 

  RF-CUE-07-03   RF         Direcciones     **\[Deducido\]** El sistema    Deducido     Baja
                                            debe permitir designar una                  
                                            dirección como predeterminada               
                                            cuando exista más de una.                   

  RF-CUE-07-04   RF         Direcciones     **\[Pendiente\]** No está      Pendiente    Baja
                                            definido si existe un límite                
                                            máximo de direcciones por                   
                                            cuenta.                                     

  RF-CUE-07-05   RF         Direcciones     **\[Pendiente\]** No está      Pendiente    Media
                                            definido si la dirección                    
                                            registrada ---manual o por                  
                                            geolocalización--- se valida                
                                            contra alguna zona de                       
                                            cobertura, ni si es                         
                                            obligatoria para completar el               
                                            registro o el perfil; depende               
                                            del modelo de entrega de M10.               

  RF-CUE-07-06   RF                         **El sistema debe permitir                  
                                            registrar una dirección                     
                                            automáticamente a partir de la              
                                            ubicación del dispositivo del               
                                            cliente, sin exigir que digite              
                                            manualmente cada campo.**                   
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-07-01   Dado que un cliente registra una nueva dirección con los
                 datos mínimos exigidos, cuando la guarda, entonces queda
                 disponible en su cuenta para su uso posterior.

  CA-CUE-07-02   Dado que un cliente tiene varias direcciones, cuando marca
                 una como predeterminada, entonces el sistema retira esa
                 condición de cualquier otra que la tuviera.

  CA-CUE-07-03   Dado que un cliente elimina una dirección, cuando confirma
                 la acción, entonces deja de estar disponible para futuras
                 compras.

  CA-CUE-07-04   Dado que un cliente autoriza el acceso a la ubicación de su
                 dispositivo, cuando confirma el registro de dirección,
                 entonces el sistema completa los campos de dirección con los
                 datos obtenidos de la geolocalización, permitiendo su
                 edición manual antes de guardar.
  ---------------------------------------------------------------------------

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

  RF-CUE-08-03   RF         Identidad       **\[Pendiente\]** Un cliente   Pendiente    Media
                                            particular puede solicitar el               
                                            cambio de su cuenta a tipo                  
                                            empresa sin necesidad de crear              
                                            una cuenta nueva, mediante la               
                                            sección definida en                         
                                            RF-CUE-06-07, digitando el                  
                                            NIT. Si el cliente particular               
                                            accedió originalmente mediante              
                                            Google y aún no cuenta con                  
                                            contraseña propia, el sistema               
                                            debe exigírsela como parte de               
                                            la solicitud de cambio a                    
                                            empresa, dado que la cuenta                 
                                            empresa no dispone de acceso                
                                            mediante Google                             
                                            (RF-CUE-02-01).                             
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

### HU-CUE-09 --- Verificación y aprobación de cuentas empresa

**Como** *administrador*

**Quiero** *revisar los datos y el NIT que aporta una empresa y aprobar
o rechazar la creación de su cuenta*

**Para** *conceder condiciones comerciales de empresa únicamente a
quienes acrediten serlo*

**Alcance:** *Comprende la presentación de solicitudes pendientes, la
consulta de la información aportada, y el registro de la decisión y de
quién y cuándo la tomó. No comprende la comprobación de la veracidad del
NIT, que se realiza fuera del sistema.*

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-09-01   RF         Aprobación      **\[Definido\]** El sistema    Definido     Alta
                                            debe presentar al                           
                                            administrador las solicitudes               
                                            de cuenta empresa pendientes.               

  RF-CUE-09-02   RF         Aprobación      **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir consultar el                  
                                            detalle de la información                   
                                            aportada por la empresa.                    

  RF-CUE-09-03   RF         Aprobación      **\[Definido\]** El sistema    Definido     Alta
                                            debe permitir registrar la                  
                                            aprobación o el rechazo de la               
                                            solicitud, dejando constancia               
                                            de quién decidió y cuándo.                  

  RF-CUE-09-04   RF         Aprobación      **\[Deducido\]** Al aprobar la Deducido     Alta
                                            solicitud, el sistema debe                  
                                            habilitar de inmediato las                  
                                            condiciones comerciales de                  
                                            empresa en la cuenta.                       

  RF-CUE-09-05   RF         Aprobación      **\[Deducido\]** Al rechazar   Deducido     Alta
                                            la solicitud, el sistema debe               
                                            registrar el motivo del                     
                                            rechazo, porque la                          
                                            notificación de rechazo debe                
                                            explicar la razón al cliente                
                                            (orientación explícita del                  
                                            documento de historias).                    

  RF-CUE-09-06   RF         Aprobación      **\[Pendiente\]** No está      Pendiente    Media
                                            definido si el rechazo admite               
                                            corrección y reenvío de la                  
                                            misma solicitud, o si obliga a              
                                            una solicitud completamente                 
                                            nueva.                                      

  RF-CUE-09-07   RF                         **El sistema debe presentar al              
                                            administrador las solicitudes               
                                            de actualización de NIT de                  
                                            clientes empresa, junto con el              
                                            documento de renovación de RUT              
                                            adjunto, permitiéndole aprobar              
                                            o rechazar la solicitud con un              
                                            campo opcional para el motivo               
                                            del rechazo.**                              

  RF-CUE-09-08   RF                         **El sistema debe definir una               
                                            vista independiente donde el                
                                            administrador pueda aprobar o               
                                            rechazar las solicitudes de                 
                                            cambio de cliente tipo                      
                                            particular a cliente tipo                   
                                            empresa, con un campo opcional              
                                            para el motivo del rechazo.**               
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-09-01   Dado que existen solicitudes de cuenta empresa pendientes,
                 cuando el administrador accede al listado, entonces las ve
                 junto con su información aportada.

  CA-CUE-09-02   Dado que el administrador aprueba una solicitud, cuando
                 confirma la decisión, entonces la cuenta queda habilitada
                 con condiciones de empresa y se registra quién y cuándo la
                 aprobó.

  CA-CUE-09-03   Dado que el administrador rechaza una solicitud, cuando
                 confirma la decisión con un motivo, entonces la empresa
                 recibe la notificación con ese motivo.

  CA-CUE-09-04   Dado que una solicitud ya fue decidida, cuando se intenta
                 decidir de nuevo, entonces el sistema rechaza la operación.

  CA-CUE-09-05   Dado que existe una solicitud de actualización de NIT
                 pendiente, cuando el administrador la aprueba, entonces el
                 sistema actualiza el NIT de la cuenta empresa y notifica la
                 aprobación al cliente.

  CA-CUE-09-06   Dado que el administrador rechaza una solicitud de
                 actualización de NIT, cuando confirma el rechazo, entonces
                 el sistema notifica al cliente empresa, incluyendo el motivo
                 si fue registrado.

  CA-CUE-09-07   Dado que existe una solicitud de cambio de cliente
                 particular a empresa, cuando el administrador la aprueba,
                 entonces el sistema convierte la cuenta a tipo empresa y
                 notifica al cliente.

  CA-CUE-09-08   Dado que el administrador rechaza una solicitud de cambio de
                 cliente particular a empresa, cuando confirma el rechazo,
                 entonces el sistema notifica al cliente, incluyendo el
                 motivo si fue registrado.

  CA-CUE-09-09   El sistema debe registrar en auditoría toda decisión de
                 aprobación o rechazo sobre solicitudes de actualización de
                 NIT y de cambio a cliente empresa, dejando constancia de
                 quién decidió, cuándo, y el motivo si aplica; esta auditoría
                 debe generar la notificación correspondiente al cliente
                 empresa.
  ---------------------------------------------------------------------------

## 

### HU-CUE-10 --- Renovación de NIT del cliente empresa

**Como** cliente tipo empresa,

**quiero** solicitar la actualización del NIT de mi cuenta adjuntando el
documento de renovación del RUT,

**para** mantener actualizada mi información fiscal en el sistema sin
perder mi cuenta ni mi historial.

**Requisitos**

  --------------------------------------------------------------------------------------------------
  **ID**         **Tipo**   **Categoría**   **Requisito**                  **Origen**   **Prior.**
  -------------- ---------- --------------- ------------------------------ ------------ ------------
  RF-CUE-10-01   RF         Actualización   **El sistema debe permitir a   Definido     Alta
                            de datos        un cliente tipo empresa                     
                                            solicitar la actualización de               
                                            su NIT únicamente cuando                    
                                            adjunte el documento de                     
                                            renovación del RUT                          
                                            correspondiente**                           

  RF-CUE-10-02   RF         Validación      El sistema debe rechazar       Definido     Alta
                                            cualquier solicitud de                      
                                            actualización de NIT que no                 
                                            incluya el documento de                     
                                            renovación del RUT adjunto.                 

  RF-CUE-10-03   RF         Estado          El sistema debe dejar la       Deducido     Alta
                                            solicitud de actualización de               
                                            NIT en condición pendiente de               
                                            revisión hasta que el                       
                                            administrador la apruebe o la               
                                            rechace, sin modificar el NIT               
                                            vigente mientras tanto.                     

  RF-CUE-10-04   RF         Notificación    El sistema debe notificar al   Deducido     Media
                                            cliente empresa la recepción                
                                            de su solicitud de                          
                                            actualización de NIT.                       
  --------------------------------------------------------------------------------------------------

**Criterios de aceptación**

  ---------------------------------------------------------------------------
  **ID**         **Criterio**
  -------------- ------------------------------------------------------------
  CA-CUE-10-01   Dado que un cliente empresa inicia una solicitud de
                 actualización de NIT sin adjuntar el documento de renovación
                 del RUT, cuando intenta enviarla, entonces el sistema no
                 permite continuar.

  CA-CUE-10-02   Dado que un cliente empresa adjunta el documento de
                 renovación del RUT junto con el nuevo NIT, cuando envía la
                 solicitud, entonces el sistema la registra como pendiente
                 para revisión del administrador

  CA-CUE-10-03   Dado que existe una solicitud de actualización de NIT
                 pendiente, cuando el cliente empresa consulta el estado de
                 su cuenta, entonces el sistema le muestra que la solicitud
                 está en revisión y que el NIT vigente no ha cambiado.

  CA-CUE-10-04   Dado que un cliente empresa envía correctamente su
                 solicitud, cuando el sistema la registra, entonces le
                 notifica la recepción de la solicitud.
  ---------------------------------------------------------------------------

## 

## 

## 

## 

## 

## 

## 

## 
