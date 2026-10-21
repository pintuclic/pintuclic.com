# 📋 02_HISTORIAS_USUARIO — M17. Administración, Empleados y Permisos

> **Módulo:** `M17` · **Scope:** `m17-permisos`
> **Responsable:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estándar:** INVEST + BDD (Dado–Cuando–Entonces)
> **Trazabilidad:** Cada escenario cita el `CA-ADM-XX-NN` correspondiente en
> [`M17_PERMISOS_Y_ROLES.md`](../../../../docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md) y
> [`politica_HU-ADM-03_control_acceso_servidor.md`](../../../../docs/01_TRANSVERSALES/POLITICAS/politica_HU-ADM-03_control_acceso_servidor.md)

---

## 0. Resumen de Cobertura de la Entrega

| Código HU | Título de la Historia de Usuario | Estado | Escenarios BDD |
| :--- | :--- | :---: | :---: |
| **`HU-ADM-01`** | Gestión de cuentas de empleado | ✅ En alcance | 8 |
| **`HU-ADM-02`** | Asignación individual de permisos (sin roles fijos) | ✅ En alcance | 7 |
| **`HU-ADM-03`** | Verificación de permisos en el servidor (Política de Cierre) | ✅ En alcance | 6 |
| **`HU-ADM-04`** | Gestión de clientes desde la administración | ✅ En alcance | 8 |
| **`HU-ADM-05`** | Configuración general del sistema | ✅ En alcance | 7 |
| **`HU-ADM-06`** | Gobernanza de la cuenta de administrador | ✅ En alcance | 8 |
| **`HU-ADM-07`** | Catálogo de parámetros configurables | ✅ En alcance | 3 |
| | **TOTAL CONSOLIDADO** | **7 de 7** | **47** |

---

## 1. Requisitos No Funcionales (RNF)

- **`RNF-ADM-01-01` (Seguridad):** La credencial inicial generada para un empleado tiene vigencia limitada (24 horas) y caduca automáticamente si no se utiliza.
- **`RNF-ADM-01-02` (Usabilidad):** El listado de empleados permite paginar, filtrar por estado (`activo`/`inactivo`) y buscar por nombre/documento/correo sin carga completa de la colección.
- **`RNF-ADM-02-01` (Rendimiento):** La comprobación de facultades en servidor no ejecuta múltiples consultas redundantes por cada elemento evaluado en UI.
- **`RNF-ADM-02-02` (Mantenibilidad):** La incorporación de un permiso nuevo al catálogo maestro en base de datos no requiere alterar permisos ya concedidos a empleados existentes.
- **`RNF-ADM-03-01` (Seguridad / Fail-Safe):** La comprobación de permisos está centralizada en middleware; todo endpoint nuevo queda protegido por omisión.
- **`RNF-ADM-03-02` (Rendimiento):** La resolución de permisos en servidor añade una latencia inferior a 15 ms en cada operación.
- **`RNF-ADM-04-01` (Privacidad):** El acceso a la ficha y órdenes de un cliente se restringe estrictamente a personal con permiso `personal.ver` y queda auditado.
- **`RNF-ADM-05-01` (Seguridad):** El acceso al almacén de configuración general está blindado exclusivamente para la cuenta de administrador.
- **`RNF-ADM-06-01` (Seguridad):** La credencial inicial de instalación del administrador nunca queda almacenada en archivos de configuración ni en el repositorio tras el despliegue.

---

## 2. Catálogo de Historias de Usuario y Escenarios BDD

### HU-ADM-01 — Gestión de cuentas de empleado

> **Como** administrador  
> **Quiero** crear, editar y desactivar cuentas de empleado  
> **Para** dar y retirar acceso al sistema conforme cambia el equipo de trabajo

```gherkin
Escenario 1: Creación exitosa de cuenta de empleado sin permisos (CA-ADM-01-01)
  Dado que soy administrador autenticado
  Cuando creo una cuenta de empleado con nombre, documento, correo único y teléfono válidos
  Entonces el sistema crea la cuenta con estado activo
  Y la cuenta nace sin ningún permiso asignado
  Y se despacha una credencial inicial efímera al correo registrado

Escenario 2: Rechazo de alta por correo duplicado con otro empleado (CA-ADM-01-02)
  Dado que ya existe un empleado registrado con el correo "colaborador@pintuclic.co"
  Cuando intento crear una nueva cuenta de empleado con ese mismo correo
  Entonces el sistema rechaza la solicitud con un código de error de conflicto
  Y no se persiste ningún nuevo registro en la base de datos

Escenario 3: Cambio obligatorio de credencial en el primer acceso (CA-ADM-01-03)
  Dado que soy un empleado que inicia sesión por primera vez con la credencial temporal
  Cuando completo la autenticación inicial
  Entonces el sistema marca la sesión con estado de cambio de clave pendiente
  Y bloquea cualquier operación hasta que establezca una contraseña definitiva válida

Escenario 4: Cierre inmediato de sesiones activas al desactivar empleado (CA-ADM-01-04)
  Dado que un empleado tiene una sesión activa en el sistema
  Cuando el administrador desactiva su cuenta
  Entonces la cuenta pasa a estado inactivo
  Y todas sus sesiones activas quedan cerradas inmediatamente con motivo "cuenta_desactivada"
  Y cualquier intento subsecuente de realizar peticiones o iniciar sesión es denegado

Escenario 5: Conservación de atribución histórica de auditoría (CA-ADM-01-05)
  Dado que un empleado realizó operaciones pasadas en el sistema
  Cuando su cuenta es desactivada por el administrador
  Entonces los registros de auditoría anteriores siguen atribuidos a su identificador de usuario

Escenario 6: Prohibición de autodesactivación del administrador (CA-ADM-01-06)
  Dado que soy el administrador del sistema
  Cuando intento desactivar o suspender mi propia cuenta
  Entonces el sistema rechaza la acción con un mensaje de bloqueo de seguridad
  Y el estado de la cuenta administradora permanece activo

Escenario 7: Reactivación de empleado con restablecimiento de permisos (CA-ADM-01-07)
  Dado que una cuenta de empleado se encuentra en estado inactivo
  Cuando el administrador solicita su reactivación
  Entonces el sistema cambia su estado a activo
  Y restablece exactamente los permisos que tenía concedidos antes de la desactivación
  Y los presenta en la interfaz para revisión y confirmación del administrador

Escenario 8: Conflicto por correo ya registrado como cliente (CA-ADM-01-08)
  Dado que existe una cuenta de cliente (particular o empresa) con el correo "cliente@correo.com"
  Cuando el administrador intenta crear un empleado con ese mismo correo
  Entonces el sistema rechaza el alta indicando incompatibilidad de identidad
```

---

### HU-ADM-02 — Asignación individual de permisos

> **Como** administrador  
> **Quiero** otorgar y retirar permisos a cada empleado de forma individual  
> **Para** que cada persona acceda únicamente a las operaciones que su trabajo requiere

```gherkin
Escenario 1: Consulta del catálogo completo de permisos por empleado (CA-ADM-02-01)
  Dado que soy administrador y abro la ficha de permisos de un empleado
  Cuando solicito su configuración de privilegios
  Entonces el sistema devuelve el catálogo de permisos agrupado por área funcional
  Y marca con precisión booleana cuáles permisos tiene concedidos y cuáles no

Escenario 2: Concesión automática del permiso de consulta al otorgar operación (CA-ADM-02-02)
  Dado que un empleado no posee permisos en el área de catálogo
  Cuando el administrador le otorga el permiso de mutación "catalogo.editar"
  Entonces el sistema le concede de forma atómica y automática el permiso "catalogo.ver"
  Y ambas asignaciones quedan persistidas en el registro de permisos del empleado

Escenario 3: Advertencia y revocación en cascada de permisos dependientes (CA-ADM-02-03)
  Dado que un empleado tiene concedidos "catalogo.ver" y "catalogo.editar"
  Cuando el administrador intenta retirarle el permiso "catalogo.ver"
  Entonces el sistema advierte que la operación revocará también "catalogo.editar"
  Y al confirmar la acción ambos permisos son removidos de su cuenta

Escenario 4: Efecto en caliente ante revocación de permisos (CA-ADM-02-04)
  Dado que un empleado tiene una sesión activa y posee el permiso "ventas.gestionar"
  Cuando el administrador le retira dicho permiso desde su panel
  Entonces el siguiente intento del empleado de invocar una operación de gestión de ventas es denegado
  Y el rechazo ocurre de inmediato sin necesidad de que el empleado cierre o renueve sesión

Escenario 5: Acceso mínimo para empleado sin ningún permiso concedido (CA-ADM-02-05)
  Dado que un empleado tiene su cuenta activa pero con cero permisos asignados
  Cuando inicia sesión en la plataforma
  Entonces el sistema le permite ingresar únicamente a la vista de su propio perfil
  Y oculta y deniega el acceso a cualquier operación funcional del panel

Escenario 6: Denegación de acceso a gestión de permisos para empleados (CA-ADM-02-06)
  Dado que soy un empleado (incluso con otros permisos de negocio asignados)
  Cuando intento invocar la API o ruta de asignación de permisos
  Entonces el sistema deniega rotundamente el acceso con código 403 Forbidden

Escenario 7: Trazabilidad inmutable de cambios de permisos (CA-ADM-02-07)
  Dado que el administrador otorga o revoca un permiso a un empleado
  Cuando el cambio es guardado exitosamente
  Entonces el sistema emite el evento de auditoría registrando el permiso afectado, el empleado, el administrador y el timestamp
```

---

### HU-ADM-03 — Verificación de permisos en el servidor (Política de Cierre)

> **Como** administrador  
> **Quiero** que el sistema compruebe el permiso en el servidor ante cada operación  
> **Para** que la manipulación del frontend o de peticiones directas no permita accesos indebidos

```gherkin
Escenario 1: Ocultación ergonómica en interfaz de opciones no autorizadas (CA-ADM-03-01)
  Dado que un empleado autenticado no tiene concedido el permiso "ventas.gestionar"
  Cuando carga el panel de control
  Entonces la opción de gestión de órdenes no se muestra visible en el menú

Escenario 2: Denegación en backend ante solicitud directa de endpoint protegido (CA-ADM-03-02)
  Dado que un empleado no posee el permiso "ventas.gestionar"
  Cuando envía una petición HTTP directa al endpoint de actualización de órdenes
  Entonces el backend intercepta la llamada y responde con código 403 Forbidden
  Y la operación solicitada no es ejecutada

Escenario 3: Opacidad del mensaje de acceso denegado (CA-ADM-03-03)
  Dado que una petición es denegada por carecer de privilegios
  Cuando el cliente recibe la respuesta de error
  Entonces el cuerpo JSON contiene un mensaje estándar genérico de autorización denegada
  Y no revela si el recurso existía ni el identificador del permiso faltante

Escenario 4: Preservación de sesión y redirección segura tras denegación (CA-ADM-03-04)
  Dado que un empleado intenta acceder a una ruta que le es denegada
  Cuando la petición finaliza con rechazo 403
  Entonces su sesión permanece abierta y válida
  Y la interfaz lo redirige a la vista principal permitida para su cuenta

Escenario 5: Rechazo dinámico de transacción en curso tras revocación (CA-ADM-03-05)
  Dado que a un empleado se le retira un permiso mientras mantiene sesión abierta
  Cuando ejecuta cualquier mutación o consulta que requiera ese permiso
  Entonces el servidor evalúa el permiso en tiempo real y rechaza la ejecución

Escenario 6: Registro de auditoría de intentos no autorizados (CA-ADM-03-06)
  Dado que un usuario intenta ejecutar una acción administrativa no autorizada
  Cuando el middleware de backend deniega el acceso
  Entonces el sistema registra el intento fallido con la identidad, el recurso invocado y la marca temporal
```

---

### HU-ADM-04 — Gestión de clientes desde la administración

> **Como** empleado con permiso de atención (`personal.ver`)  
> **Quiero** consultar la ficha, órdenes y cotizaciones de un cliente  
> **Para** atender sus consultas comerciales con contexto completo

```gherkin
Escenario 1: Búsqueda exitosa de cliente por criterio de identidad (CA-ADM-04-01)
  Dado que soy un colaborador con permiso "personal.ver"
  Cuando busco un cliente por su número de documento, NIT, correo o teléfono
  Entonces el sistema retorna su ficha con datos de contacto, tipo de cuenta y estado

Escenario 2: Visualización de historial de compras y cotizaciones (CA-ADM-04-02)
  Dado que consulto la ficha de un cliente registrado
  Cuando accedo a la sección de actividad
  Entonces el sistema presenta el historial cronológico de sus órdenes de venta y cotizaciones con sus estados

Escenario 3: Bloqueo de modificación de datos personales del cliente por empleados (CA-ADM-04-03)
  Dado que estoy visualizando la ficha de un cliente
  Cuando intento editar su correo electrónico, teléfono o nombre desde el panel
  Entonces el sistema no expone la operación y rechaza cualquier mutación en servidor
  Y preserva que la rectificación de datos corresponde exclusivamente al titular

Escenario 4: Mínima exposición de datos de pago del cliente (CA-ADM-04-04)
  Dado que consulto una orden de compra de un cliente
  Cuando reviso los detalles de la transacción de pago
  Entonces el sistema nunca exhibe datos sensibles completos (número de tarjeta, CVV o cuentas completas)
  Y muestra únicamente el método y los últimos dígitos de referencia permitidos

Escenario 5: Obligatoriedad de motivo al desactivar un cliente (CA-ADM-04-05)
  Dado que soy administrador y decido desactivar la cuenta de un cliente
  Cuando intento enviar la solicitud sin especificar un motivo justificado
  Entonces el sistema rechaza la acción exigiendo el ingreso del motivo obligatorio

Escenario 6: Continuidad operativa de órdenes en curso de clientes desactivados (CA-ADM-04-06)
  Dado que un cliente posee órdenes confirmadas o en preparación
  Cuando su cuenta de usuario es desactivada
  Entonces sus órdenes de compra en proceso continúan su flujo normal de despacho y entrega

Escenario 7: Restricción de desactivación de clientes exclusiva para administrador (CA-ADM-04-07)
  Dado que soy un empleado con permiso de atención pero sin rol de administrador
  Cuando intento ejecutar la desactivación de una cuenta de cliente
  Entonces el sistema me deniega la acción con código 403 Forbidden

Escenario 8: Trazabilidad de acceso a la ficha de clientes (CA-ADM-04-08)
  Dado que un colaborador autorizado consulta la ficha de un cliente
  Cuando los datos son devueltos por el servidor
  Entonces el acceso queda registrado en la bitácora con la identidad del empleado y la fecha/hora
```

---

### HU-ADM-05 — Configuración general del sistema

> **Como** administrador  
> **Quiero** modificar desde el panel los parámetros operativos y comerciales configurables  
> **Para** adaptar el comportamiento de la plataforma sin requerir despliegues de código

```gherkin
Escenario 1: Visualización estructurada de parámetros vigentes (CA-ADM-05-01)
  Dado que soy administrador autenticado
  Cuando accedo al módulo de configuración general
  Entonces el sistema presenta los parámetros agrupados por área funcional con sus valores actuales y descripción

Escenario 2: Aplicación inmediata del nuevo valor sin reinicio (CA-ADM-05-02)
  Dado que el administrador modifica un parámetro operativo (ej. vigencia de OTP)
  Cuando guarda el nuevo valor válido
  Entonces el sistema lo actualiza en el almacén de configuración
  Y el nuevo valor entra en vigencia inmediatamente para las transacciones siguientes

Escenario 3: Validación estricta de rangos admisibles (CA-ADM-05-03)
  Dado que un parámetro numérico tiene definido un rango admisible (ej. IVA entre 0 y 100)
  Cuando el administrador introduce un valor fuera de dicho intervalo (ej. 150)
  Entonces el sistema rechaza la actualización indicando los límites válidos permitidos

Escenario 4: Impedimento de vaciado o restitución por defecto (CA-ADM-05-04)
  Dado que un parámetro del sistema es requerido para la operación
  Cuando el administrador intenta borrar su valor dejándolo en blanco
  Entonces el sistema bloquea el cambio o restituye el valor por defecto configurado

Escenario 5: Irretroactividad de cambios comerciales sobre órdenes cerradas (CA-ADM-05-05)
  Dado que se modifica el porcentaje general de IVA
  Cuando se consulta una orden de venta emitida con anterioridad
  Entonces la orden cerrada conserva el desglose de IVA y totales vigentes al momento de su creación

Escenario 6: Auditoría de cambios en parámetros de configuración (CA-ADM-05-06)
  Dado que el administrador actualiza el valor de un parámetro
  Cuando la transacción finaliza
  Entonces el registro de auditoría almacena la clave del parámetro, el valor anterior, el valor nuevo y el autor

Escenario 7: Denegación de acceso a configuración para empleados no administradores (CA-ADM-05-07)
  Dado que soy un colaborador de la empresa
  Cuando intento consultar o mutar los parámetros de configuración general
  Entonces el sistema deniega el acceso con 403 Forbidden
```

---

### HU-ADM-06 — Gobernanza de la cuenta de administrador

> **Como** responsable del negocio  
> **Quiero** que esté definida la sustitución y protección de la cuenta administradora  
> **Para** que la plataforma nunca quede sin gobierno ni expuesta a secuestro de acceso

```gherkin
Escenario 1: Cambio forzoso de credencial inicial en primer acceso de administrador (CA-ADM-06-01)
  Dado que el sistema ha sido recién instalado con la credencial de arranque del administrador
  Cuando el administrador inicia sesión por primera vez
  Entonces el sistema le exige establecer una contraseña definitiva antes de permitirle cualquier otra acción

Escenario 2: Inexistencia de opción para crear administradores adicionales (CA-ADM-06-02)
  Dado que estoy autenticado como administrador
  Cuando recorro el panel de gestión de cuentas
  Entonces el sistema no ofrece ninguna opción o endpoint para crear otra cuenta con rol administrador

Escenario 3: Bloqueo de auto-eliminación o desactivación del administrador (CA-ADM-06-03)
  Dado que soy el administrador del sistema
  Cuando intento invocar una acción de baja lógica o física sobre mi cuenta
  Entonces el sistema rechaza la operación protegiendo la existencia del rol de gobierno

Escenario 4: Facultades del administrador no sujetas a edición (CA-ADM-06-04)
  Dado que consulto el módulo de asignación de permisos
  Cuando reviso la cuenta administradora
  Entonces sus facultades no aparecen en la lista como casillas asignables ni revocables

Escenario 5: Sustitución de correo administrador mediante confirmación segura (CA-ADM-06-05)
  Dado que el responsable del negocio solicita cambiar el correo de la cuenta administradora
  Cuando ingresa una nueva dirección de correo válida
  Entonces el sistema despacha un correo con enlace de confirmación a la nueva dirección
  Y mantiene el correo actual en operación hasta que el enlace sea validado

Escenario 6: Notificación de seguridad al buzón anterior (CA-ADM-06-06)
  Dado que la sustitución de correo del administrador ha sido confirmada en la nueva dirección
  Cuando el sistema actualiza el registro principal
  Entonces se despacha de inmediato una alerta de seguridad al correo anterior notificando el cambio

Escenario 7: Revocación total de sesiones tras cambio de correo o contraseña (CA-ADM-06-07)
  Dado que el correo o la contraseña del administrador han sido modificados
  Cuando el cambio se consolida en la base de datos
  Entonces todas las sesiones activas de la cuenta administradora son invalidadas inmediatamente

Escenario 8: Recuperación de acceso segura exclusiva por correo verificado (CA-ADM-06-08)
  Dado que el administrador ha olvidado su contraseña
  Cuando utiliza el mecanismo de recuperación
  Entonces el sistema despacha el enlace de restablecimiento única y exclusivamente a su correo verificado
```

---

### HU-ADM-07 — Catálogo de parámetros configurables

> **Como** administrador  
> **Quiero** disponer de un catálogo explícito y categorizado de parámetros configurables  
> **Para** operar la plataforma con certeza de los límites de ajuste disponibles

```gherkin
Escenario 1: Parámetros del área de Autenticación y Verificación (CA-ADM-07-01)
  Dado que consulto el área de Autenticación en la configuración general
  Cuando solicito la lista de parámetros
  Entonces encuentro los 6 parámetros definidos: vigencia de código OTP, intentos permitidos de OTP, complejidad de contraseña, vigencia de enlace de recuperación, intentos fallidos antes de bloqueo y duración del bloqueo

Escenario 2: Parámetros del área de Comunicaciones (CA-ADM-07-02)
  Dado que consulto el área de Comunicaciones en la configuración general
  Cuando solicito la lista de parámetros
  Entonces encuentro el parámetro de reintentos máximos de envío transaccional SMTP

Escenario 3: Sincronización e integridad del catálogo maestro (CA-ADM-07-03)
  Dado que se incorpora un nuevo parámetro tipado al sistema
  Cuando se registra en el catálogo de configuración
  Entonces queda disponible en la API con su clave única, área funcional, valor por defecto y validación de rango
```
