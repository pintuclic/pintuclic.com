# 📋 02_HISTORIAS_USUARIO — M04. Cuentas, Autenticación y Perfil

> **Módulo:** `M04` · **Scope:** `m04-cuentas`
> **Responsable:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estándar:** INVEST + BDD (Dado–Cuando–Entonces)
> **Trazabilidad:** cada escenario cita el `CA-CUE-XX-NN` de
> [`M04_CUENTAS_AUTH_PERFIL.md`](../../../../docs/02_MODULOS_FUNCIONALES/M04_CUENTAS_AUTH_PERFIL.md) o la `RN-CUE`/`DP` de
> [`01_SPEC_FUNCIONAL.md`](01_SPEC_FUNCIONAL.md) que lo origina. Los escenarios sin `CA` provienen de una regla, una
> decisión de producto o un diagrama contractual: son el contrato ejecutable de esa regla.

---

## 0. Resumen de Cobertura de la Entrega

| Código HU | Título | Estado | Escenarios BDD |
| :--- | :--- | :---: | :---: |
| **`HU-CUE-01`** | Registro mediante correo con verificación | ✅ En alcance | 9 |
| **`HU-CUE-02`** | Registro y acceso mediante Google | ✅ En alcance | 10 |
| **`HU-CUE-03`** | Registro de cliente empresa sujeto a aprobación | ✅ En alcance | 7 |
| **`HU-CUE-04`** | Inicio y cierre de sesión | ✅ En alcance | 11 |
| **`HU-CUE-05`** | Recuperación de contraseña | ✅ En alcance | 9 |
| **`HU-CUE-06`** | Gestión del perfil | ✅ En alcance | 12 |
| **`HU-CUE-07`** | Gestión de direcciones del cliente | ✅ En alcance | 10 |
| **`HU-CUE-08`** | Identidad y unicidad de la cuenta | ✅ En alcance | 5 |
| **`HU-CUE-09`** | Verificación y aprobación de cuentas empresa | ✅ En alcance | 14 |
| **`HU-CUE-10`** | Renovación de NIT del cliente empresa | ✅ En alcance | 7 |
| | **TOTAL CONSOLIDADO** | **10 de 10** | **94** |

### Evaluación INVEST

| HU | I | N | V | E | S | T | Observación |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :--- |
| `HU-CUE-01` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Depende de `HU-CUE-08` solo por la unicidad, ya cubierta. |
| `HU-CUE-02` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | El flujo real de Google no es certificable sin credenciales (ATDD §4). |
| `HU-CUE-03` | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | Su decisión vive en `HU-CUE-09`; se entrega junta. |
| `HU-CUE-04` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `HU-CUE-05` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | El envío real del enlace depende de M18. |
| `HU-CUE-06` | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | Se entrega en tres rebanadas: **06-A** datos y contraseña, **06-B** correo, **06-C** ascenso. |
| `HU-CUE-07` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | La geolocalización del dispositivo se revisa en Gate 3B. |
| `HU-CUE-08` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `HU-CUE-09` | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | Se entrega en tres rebanadas: **09-A** registro, **09-B** ascenso, **09-C** renovación de NIT. |
| `HU-CUE-10` | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | Su decisión vive en `HU-CUE-09-C`. |

> ⚠️ en **S** (Small) indica una historia que excede un ciclo corto: se **mantiene el código contractual** de la
> fuente y se declara la entrega por rebanadas verticales, para no romper la trazabilidad con la Matriz.

---

## 1. Requisitos No Funcionales (RNF)

- **`RNF-CUE-01-01` (Seguridad):** la contraseña se almacena y verifica con el mismo mecanismo de M20 (`HU-SEG-01`), sin un segundo esquema.
- **`RNF-CUE-02-01` (Fiabilidad):** un fallo o cancelación del flujo de Google no deja cuenta parcial ni sesión.
- **`RNF-CUE-03-01` (Privacidad):** una empresa pendiente no ve precios de empresa hasta su aprobación (`HU-SEG-06`).
- **`RNF-CUE-04-01` (Seguridad):** ninguna respuesta de acceso permite distinguir una cuenta existente de una inexistente.
- **`RNF-CUE-05-01` (Seguridad):** el enlace de recuperación es de un solo uso, de vigencia acotada y se almacena derivado.
- **`RNF-CUE-09-01` (Concurrencia):** dos decisiones simultáneas sobre la misma solicitud producen un único ganador.
- **`RNF-CUE-10-01` (Privacidad):** el RUT adjunto jamás viaja en un listado.

---

## 2. Catálogo de Historias de Usuario y Escenarios BDD

### HU-CUE-01 — Registro mediante correo con verificación

> **Como** visitante
> **Quiero** crear una cuenta con mi correo y confirmar que es mío mediante un código
> **Para** poder comprar y recibir las comunicaciones de mis pedidos

#### Reglas de Negocio Asociadas:
`RN-CUE-01`, `RN-CUE-02`, `RN-CUE-03`, `RN-CUE-04`, `RN-CUE-24`, `RN-CUE-25`

```gherkin
Escenario 1: Registro exitoso crea una cuenta no verificada y envía el código (CA-CUE-01-01)
  Dado que soy un visitante con un correo que no existe en el sistema
  Cuando completo nombre, correo, teléfono y una contraseña válida y confirmo el envío
  Entonces el sistema crea la cuenta en estado pendiente de verificación
  Y emite el evento de envío del código de verificación al correo indicado
  Y la respuesta no contiene la contraseña, su derivado ni el código

Escenario 2: Contraseña en el límite de la política (RF-CUE-01-05, RN-CUE-04)
  Dado que el mínimo vigente de contraseña es 12 caracteres
  Cuando intento registrarme con una contraseña de 11 caracteres
  Entonces el sistema rechaza el registro con el código CONTRASENA_NO_CUMPLE_POLITICA
  Cuando lo intento con una contraseña de 12 caracteres
  Entonces el registro se acepta
  Y una contraseña de 129 caracteres vuelve a ser rechazada

Escenario 3: Código correcto dentro del plazo habilita la cuenta (CA-CUE-01-02)
  Dado que tengo una cuenta pendiente y un código vigente
  Cuando introduzco el código correcto
  Entonces la cuenta pasa a estado activo
  Y queda habilitada para iniciar sesión
  Y el código no puede volver a usarse

Escenario 4: Agotar los intentos exige un código nuevo (CA-CUE-01-03)
  Dado que el máximo de intentos del código es 3
  Cuando introduzco un código incorrecto tres veces
  Entonces el sistema responde CODIGO_INTENTOS_AGOTADOS
  Y rechaza incluso el código correcto hasta que solicite uno nuevo

Escenario 5: Código expirado con el límite exacto de vigencia (CA-CUE-01-05)
  Dado que la vigencia del código es de 15 minutos
  Cuando introduzco el código correcto a los 14 minutos y 59 segundos
  Entonces el sistema lo acepta
  Cuando introduzco el mismo código a los 15 minutos y 1 segundo
  Entonces el sistema lo rechaza con el código CODIGO_EXPIRADO
  Y ofrece reenviar uno nuevo

Escenario 6: El reenvío invalida el código anterior (RF-CUE-01-04, RN-CUE-03)
  Dado que solicité un código y no lo recibí
  Cuando solicito el reenvío
  Entonces se emite un código nuevo
  Y el código anterior deja de ser válido aunque no haya expirado

Escenario 7: Correo ya asociado a un cliente produce un conflicto sin más información (CA-CUE-01-04)
  Dado que existe una cuenta de cliente verificada con el correo "ana@correo.co"
  Cuando otro visitante intenta registrarse con ese correo
  Entonces el sistema rechaza el registro con el código REGISTRO_CONFLICTO
  Y la respuesta no revela datos de la cuenta existente
  Y no se crea ningún registro nuevo

Escenario 8: Una cuenta jamás verificada no reserva el correo (RN-CUE-02, DP-07)
  Dado que existe una cuenta pendiente de verificación con el correo "ana@correo.co"
  Cuando su dueño legítimo vuelve a registrarse con ese correo
  Entonces el trámite se reinicia con los datos y la contraseña nuevos
  Y los códigos emitidos antes quedan invalidados
  Y se emite un código nuevo

Escenario 9: Campos inválidos o faltantes se rechazan señalando el campo (diagrama de registro)
  Dado que el formulario tiene el teléfono vacío o el correo mal formado
  Cuando confirmo el envío
  Entonces el sistema rechaza el registro con el campo señalado
  Y no se crea ninguna cuenta ni se emite ningún evento de envío
```

---

### HU-CUE-02 — Registro y acceso mediante Google

> **Como** visitante
> **Quiero** entrar con mi cuenta de Google
> **Para** no tener que crear ni recordar otra contraseña

#### Reglas de Negocio Asociadas:
`RN-CUE-04`, `RN-CUE-05`, `RN-CUE-01`

```gherkin
Escenario 1: El alta con Google exige una contraseña propia antes de completarse (CA-CUE-02-01, CA-CUE-02-04)
  Dado que soy un visitante sin cuenta y autorizo el acceso con Google
  Cuando el proveedor confirma mi identidad con un correo verificado
  Entonces el sistema completa mi perfil con los datos que entregó Google
  Y me solicita digitar y confirmar una contraseña propia
  Y la cuenta se crea con ambas vías de acceso al confirmarla

Escenario 2: Sin contraseña no existe cuenta (RNF-CUE-02-01, RN-CUE-05)
  Dado que autoricé con Google y llegué al paso de la contraseña
  Cuando abandono el flujo sin confirmarla
  Entonces no existe ninguna cuenta con mi correo
  Y no hay ninguna sesión abierta

Escenario 3: La contraseña propia sigue la misma política (RN-CUE-04)
  Dado que estoy en el paso de la contraseña tras autorizar con Google
  Cuando digito una contraseña de 11 caracteres
  Entonces el sistema la rechaza con el código CONTRASENA_NO_CUMPLE_POLITICA
  Y la cuenta sigue sin crearse

Escenario 4: Un correo de Google sin verificar se rechaza (RN-CUE-05)
  Dado que Google entrega un correo marcado como no verificado
  Cuando el sistema procesa la autorización
  Entonces la rechaza con el código IDENTIDAD_EXTERNA_INVALIDA
  Y no se crea cuenta ni sesión

Escenario 5: Un correo coincidente propone vincular, nunca vincula solo (CA-CUE-02-02)
  Dado que existe una cuenta creada por formulario con el correo "ana@correo.co"
  Cuando autorizo con una cuenta de Google con ese mismo correo
  Entonces el sistema me presenta la sugerencia de vincular ambos accesos
  Y no vincula ni crea ninguna cuenta hasta que yo la confirme

Escenario 6: Confirmar la sugerencia vincula ambos accesos a la misma cuenta (CA-CUE-02-02, CA-CUE-02-05)
  Dado que recibí la sugerencia de vincular y la confirmo
  Entonces el acceso de Google queda vinculado a la cuenta existente
  Y la cuenta conserva su contraseña propia
  Y puedo iniciar sesión por cualquiera de las dos vías con el mismo resultado

Escenario 7: Rechazar la sugerencia no crea ni vincula nada (RN-CUE-05)
  Dado que recibí la sugerencia de vincular
  Cuando la rechazo
  Entonces no se vincula el acceso de Google
  Y no se crea una cuenta nueva con ese correo
  Y la cuenta existente permanece sin cambios

Escenario 8: Cancelar o fallar la autorización no deja rastro (CA-CUE-02-03)
  Dado que inicié el flujo de Google
  Cuando cancelo la autorización o el proveedor responde con un error
  Entonces regreso al sitio sin cuenta creada ni sesión abierta

Escenario 9: Una identidad ya vinculada inicia sesión directamente (diagrama de login)
  Dado que mi cuenta tiene el acceso de Google vinculado
  Cuando autorizo con Google
  Entonces el sistema abre mi sesión sin pedir contraseña ni vinculación

Escenario 10: Una cuenta empresa o de empleado no ofrece vinculación (RN-CUE-05, DP-13)
  Dado que el correo de Google coincide con una cuenta empresa, de empleado o de administrador
  Cuando autorizo con Google
  Entonces el sistema no ofrece vincular ni inicia sesión
  Y responde con el mismo mensaje genérico que ante cualquier acceso no permitido
```

---

### HU-CUE-03 — Registro de cliente empresa sujeto a aprobación

> **Como** empresa compradora
> **Quiero** registrarme aportando mi NIT y mis datos empresariales, y saber que mi solicitud quedó en revisión
> **Para** saber que mi cuenta está en trámite y desde cuándo podré comprar con condiciones de empresa

#### Reglas de Negocio Asociadas:
`RN-CUE-01`, `RN-CUE-02`, `RN-CUE-14`, `RN-CUE-15`, `RN-CUE-24`

```gherkin
Escenario 1: Registro exitoso deja la solicitud en revisión y se informa (CA-CUE-03-01)
  Dado que soy una empresa con un NIT que no está asociado a ninguna solicitud
  Cuando completo nombre de empresa, representante, correo, teléfono, NIT y contraseña y verifico mi correo
  Entonces la cuenta queda activa sin condiciones de empresa
  Y se crea una solicitud en estado pendiente
  Y el sistema me informa que mi solicitud quedó en revisión

Escenario 2: El administrador no ve solicitudes con correo sin verificar (DP-19)
  Dado que una empresa envió el formulario pero no ha verificado su correo
  Cuando un administrador consulta las solicitudes pendientes
  Entonces esa solicitud no aparece en el listado

Escenario 3: Un NIT ya asociado a una solicitud pendiente o a una cuenta empresa se rechaza (CA-CUE-03-03)
  Dado que el NIT "900555666-1" pertenece a una cuenta empresa o a una solicitud pendiente
  Cuando otra empresa intenta registrarse con ese NIT
  Entonces el sistema rechaza el registro con el código NIT_YA_REGISTRADO
  Y no se crea ningún registro nuevo

Escenario 4: El NIT de una solicitud rechazada puede volver a presentarse (RN-CUE-14, DP-10)
  Dado que la solicitud con el NIT "900555666-1" fue rechazada
  Cuando esa empresa presenta una nueva solicitud con el mismo NIT
  Entonces el sistema la acepta como una solicitud nueva y pendiente
  Y la solicitud rechazada original permanece sin modificar

Escenario 5: Una empresa pendiente no obtiene condiciones de empresa (CA-CUE-03-02)
  Dado que mi solicitud de empresa está pendiente
  Cuando intento comprar con condiciones de empresa
  Entonces el tipo de mi cuenta sigue siendo el de cliente particular
  Y el sistema no me concede condiciones de empresa hasta la aprobación

Escenario 6: La empresa consulta el estado de su solicitud (RF-CUE-03-04)
  Dado que presenté una solicitud de empresa
  Cuando consulto su estado
  Entonces veo "en revisión", "aprobada" o "rechazada" según corresponda
  Y si fue rechazada veo el motivo registrado

Escenario 7: Datos empresariales inválidos se rechazan señalando el campo (diagrama de registro)
  Dado que el NIT está vacío o el nombre del representante supera la longitud permitida
  Cuando confirmo el envío
  Entonces el sistema rechaza el registro señalando el campo inválido
  Y no se crea cuenta, solicitud ni evento de envío
```

---

### HU-CUE-04 — Inicio y cierre de sesión

> **Como** usuario registrado (cliente, empleado o administrador)
> **Quiero** iniciar y cerrar sesión cuando lo decida
> **Para** acceder a mi información y dejarla protegida cuando termino

#### Reglas de Negocio Asociadas:
`RN-CUE-06`, `RN-CUE-07`, `RN-CUE-08`, `RN-CUE-25`, `RN-CUE-26`

```gherkin
Escenario 1: Credenciales correctas abren la sesión según el tipo de cuenta (CA-CUE-04-01)
  Dado que soy un cliente verificado y activo
  Cuando envío mi correo y mi contraseña correctos
  Entonces el sistema abre una sesión de tipo cliente
  Y me redirige a mi cuenta
  Y la respuesta no contiene la contraseña ni su derivado
  Y el tipo de sesión lo decide el servidor, no un dato enviado por el cliente

Escenario 2: Una contraseña incorrecta recibe un mensaje genérico (CA-CUE-04-02)
  Dado que mi cuenta existe
  Cuando envío mi correo con una contraseña incorrecta
  Entonces el sistema responde 401 con el código CREDENCIALES_INVALIDAS
  Y el mensaje no indica si el correo existe

Escenario 3: Un correo inexistente es indistinguible de una contraseña incorrecta (RN-CUE-06)
  Dado que el correo "nadie@correo.co" no está registrado
  Cuando intento iniciar sesión con él
  Entonces la respuesta tiene el mismo estado, el mismo código y el mismo cuerpo que ante una contraseña incorrecta

Escenario 4: Una cuenta no verificada con credencial correcta se remite a la verificación (RF-CUE-04-03)
  Dado que mi cuenta está pendiente de verificación
  Cuando envío mi correo y mi contraseña correctos
  Entonces el sistema no abre sesión
  Y responde 403 con el código CUENTA_NO_VERIFICADA remitiéndome al proceso de verificación

Escenario 5: Una cuenta desactivada con credencial correcta se rechaza (CA-CUE-04-03)
  Dado que el administrador desactivó mi cuenta
  Cuando envío mi correo y mi contraseña correctos
  Entonces el sistema rechaza el acceso con el código CUENTA_DESACTIVADA
  Y no abre ninguna sesión

Escenario 6: Una credencial incorrecta nunca revela el estado de la cuenta (RN-CUE-08)
  Dado que mi cuenta está desactivada o pendiente de verificación
  Cuando envío mi correo con una contraseña incorrecta
  Entonces recibo exactamente la respuesta CREDENCIALES_INVALIDAS
  Y no se menciona que la cuenta esté desactivada ni sin verificar

Escenario 7: El quinto fallo consecutivo activa la restricción y el cuarto no (CA-CUE-04-05)
  Dado que el máximo de intentos fallidos es 5 y la restricción dura 15 minutos
  Cuando fallo 4 veces consecutivas
  Entonces aún puedo intentar de nuevo con normalidad
  Cuando fallo por quinta vez
  Entonces el sistema responde 429 con el código ACCESO_TEMPORALMENTE_RESTRINGIDO
  Y rechaza incluso la contraseña correcta durante la restricción

Escenario 8: La restricción aplica por correo, exista o no, y expira (RN-CUE-07)
  Dado que fallé 5 veces con un correo que no está registrado
  Cuando intento de nuevo con ese correo
  Entonces recibo la misma restricción que recibiría una cuenta existente
  Cuando transcurren 15 minutos
  Entonces puedo volver a intentar el acceso

Escenario 9: Un acceso exitoso reinicia el contador de fallos (RN-CUE-07)
  Dado que fallé 4 veces consecutivas
  Cuando envío mis credenciales correctas
  Entonces se abre mi sesión
  Y el contador de fallos vuelve a cero

Escenario 10: Cerrar sesión la invalida de inmediato (CA-CUE-04-04)
  Dado que tengo una sesión abierta
  Cuando cierro sesión explícitamente
  Entonces la sesión queda invalidada
  Y cualquier petición posterior con esa misma sesión recibe 401

Escenario 11: Un empleado con credencial temporal queda limitado a cambiar su clave (CA-ADM-01-03 de M17)
  Dado que soy un empleado que inicia sesión por primera vez con la credencial temporal
  Cuando mis credenciales son correctas
  Entonces el sistema abre una sesión marcada con cambio de clave pendiente
  Y bloquea toda operación distinta de establecer una contraseña definitiva
```

---

### HU-CUE-05 — Recuperación de contraseña

> **Como** cliente que olvidó su contraseña
> **Quiero** recuperar el acceso a mi cuenta desde mi correo
> **Para** no perder mi historial de compras ni tener que crear otra cuenta

#### Reglas de Negocio Asociadas:
`RN-CUE-03`, `RN-CUE-04`, `RN-CUE-06`, `RN-CUE-09`, `RN-CUE-24`

```gherkin
Escenario 1: Un correo registrado recibe un enlace de un solo uso (CA-CUE-05-01)
  Dado que soy un cliente con cuenta registrada
  Cuando solicito la recuperación con mi correo
  Entonces el sistema emite el evento de envío de un enlace de un solo uso a ese correo
  Y responde 202 con el código SOLICITUD_RECIBIDA

Escenario 2: Un correo no registrado recibe exactamente la misma respuesta (CA-CUE-05-02)
  Dado que el correo "nadie@correo.co" no está registrado
  Cuando solicito la recuperación con ese correo
  Entonces el estado, el código y el cuerpo de la respuesta son idénticos a los del escenario 1
  Y no se emite ningún evento de envío

Escenario 3: Un correo de empleado o administrador recibe la misma respuesta sin envío (DP-14)
  Dado que el correo pertenece a una cuenta de empleado o de administrador
  Cuando solicito la recuperación con ese correo
  Entonces la respuesta es idéntica a la del escenario 1
  Y no se emite ningún evento de envío

Escenario 4: El enlace vence en el límite exacto de su vigencia (CA-CUE-05-03)
  Dado que la vigencia del enlace es de 30 minutos
  Cuando uso el enlace a los 29 minutos y 59 segundos
  Entonces el sistema lo acepta
  Cuando uso otro enlace a los 30 minutos y 1 segundo
  Entonces el sistema lo rechaza con el código CODIGO_EXPIRADO

Escenario 5: El enlace sirve una sola vez (RF-CUE-05-02)
  Dado que ya usé un enlace para cambiar mi contraseña
  Cuando intento usarlo de nuevo
  Entonces el sistema lo rechaza
  Y mi contraseña no vuelve a cambiar

Escenario 6: Completar el cambio invalida todas las sesiones y no abre una nueva (CA-CUE-05-04)
  Dado que tengo sesiones activas en otros dispositivos
  Cuando completo el cambio de contraseña mediante el enlace
  Entonces todas mis sesiones quedan invalidadas con motivo cambio_contrasena
  Y el sistema no abre una sesión automáticamente

Escenario 7: Una cuenta vinculada a Google también recupera su contraseña (CA-CUE-05-05)
  Dado que mi cuenta tiene el acceso de Google vinculado
  Cuando solicito la recuperación y cambio mi contraseña
  Entonces el sistema lo tramita con normalidad
  Y el acceso mediante Google sigue disponible

Escenario 8: Una contraseña nueva que incumple la política no consume el enlace (RN-CUE-04)
  Dado que abrí un enlace de recuperación vigente
  Cuando envío una contraseña nueva de 11 caracteres
  Entonces el sistema la rechaza con el código CONTRASENA_NO_CUMPLE_POLITICA
  Y el enlace sigue siendo utilizable dentro de su vigencia

Escenario 9: Una nueva solicitud invalida el enlace anterior (RN-CUE-03)
  Dado que solicité un enlace de recuperación
  Cuando solicito otro
  Entonces el enlace anterior deja de ser válido aunque no haya expirado
```

---

### HU-CUE-06 — Gestión del perfil

> **Como** cliente
> **Quiero** consultar y actualizar mis datos personales
> **Para** que mis pedidos y comunicaciones lleguen con la información correcta

#### Reglas de Negocio Asociadas:
`RN-CUE-09`, `RN-CUE-10`, `RN-CUE-11`, `RN-CUE-12`, `RN-CUE-13`, `RN-CUE-14`, `RN-CUE-25`

##### Rebanada 06-A — Datos y contraseña

```gherkin
Escenario 1: El cliente consulta su propio perfil sin datos sensibles (CA-CUE-06-01)
  Dado que soy un cliente autenticado
  Cuando consulto mi perfil
  Entonces veo mis datos personales vigentes
  Y la respuesta no contiene contraseña, derivados, códigos ni identificadores internos innecesarios

Escenario 2: El perfil de otro cliente es inalcanzable (RN-CUE-10)
  Dado que soy un cliente autenticado
  Cuando intento consultar o modificar el perfil de otro usuario manipulando su identificador
  Entonces el sistema responde 404 con el código RECURSO_NO_ENCONTRADO
  Y la respuesta es idéntica a la de un recurso inexistente

Escenario 3: Edición válida de nombre y teléfono (RF-CUE-06-02)
  Dado que soy un cliente autenticado
  Cuando actualizo mi nombre y mi teléfono con valores válidos
  Entonces el sistema guarda los cambios
  Y mi perfil muestra los datos nuevos

Escenario 4: Cambiar la contraseña exige la actual (CA-CUE-06-03)
  Dado que quiero cambiar mi contraseña desde el perfil
  Cuando no introduzco correctamente la contraseña actual
  Entonces el sistema rechaza el cambio con el código CONTRASENA_ACTUAL_INCORRECTA
  Y mi contraseña no cambia

Escenario 5: Un cambio correcto invalida todas las sesiones, incluida la actual (CA-CUE-06-04, DP-16)
  Dado que tengo sesiones abiertas en varios dispositivos
  Cuando cambio mi contraseña desde el perfil con la actual correcta
  Entonces todas mis sesiones quedan invalidadas con motivo cambio_contrasena
  Y debo volver a iniciar sesión
```

##### Rebanada 06-B — Correo

```gherkin
Escenario 6: Cambiar el correo verifica el nuevo y notifica al anterior (CA-CUE-06-02)
  Dado que solicito cambiar mi correo a "nuevo@correo.co"
  Cuando el sistema emite un código al correo nuevo y lo introduzco correctamente
  Entonces el correo de mi cuenta pasa a "nuevo@correo.co"
  Y se emite el evento de aviso del cambio hacia el correo anterior

Escenario 7: El correo vigente no cambia hasta verificar el nuevo (RN-CUE-11)
  Dado que solicité el cambio de correo y aún no introduje el código
  Cuando consulto mi perfil o intento iniciar sesión
  Entonces mi correo sigue siendo el anterior
  Y si el código expira o se agotan los intentos el cambio no se aplica

Escenario 8: Un correo nuevo ya en uso se rechaza sin revelar el tipo de cuenta (RN-CUE-01)
  Dado que el correo "ocupado@correo.co" pertenece a otra cuenta de cliente, de empleado o de administrador
  Cuando solicito cambiar mi correo a ese
  Entonces el sistema rechaza con el código REGISTRO_CONFLICTO
  Y el cuerpo es el mismo cualquiera que sea el tipo de la otra cuenta
```

##### Rebanada 06-C — Cuenta empresa

```gherkin
Escenario 9: Un cliente empresa no puede modificar su NIT desde el perfil (CA-CUE-06-05)
  Dado que soy un cliente empresa con NIT aprobado
  Cuando envío el formulario del perfil incluyendo un NIT distinto
  Entonces el sistema responde con el código CAMPO_NO_EDITABLE
  Y el campo NIT se muestra de solo lectura
  Y mi NIT no cambia aunque la petición se manipule

Escenario 10: Un particular solicita el ascenso digitando su NIT (CA-CUE-06-06)
  Dado que soy un cliente particular con cuenta activa
  Cuando accedo a la sección de cambio a cuenta empresa, digito un NIT válido y confirmo
  Entonces el sistema registra la solicitud como pendiente
  Y la pone a disposición del administrador en la vista de decisión

Escenario 11: No se admite un ascenso duplicado ni con un NIT ocupado (RN-CUE-14)
  Dado que ya tengo una solicitud de ascenso pendiente o el NIT pertenece a otra empresa
  Cuando solicito el ascenso
  Entonces el sistema rechaza con el código NIT_YA_REGISTRADO o SOLICITUD_PENDIENTE_EXISTENTE
  Y no se crea una segunda solicitud

Escenario 12: Una cuenta con Google vinculado es advertida antes de solicitar (DP-12)
  Dado que mi cuenta tiene el acceso de Google vinculado
  Cuando accedo a solicitar el ascenso a cuenta empresa
  Entonces el sistema me advierte que, al aprobarse, el acceso por Google se desactivará
  Y debo confirmar la advertencia para enviar la solicitud
```

---

### HU-CUE-07 — Gestión de direcciones del cliente

> **Como** cliente
> **Quiero** guardar varias direcciones en mi cuenta
> **Para** no escribirlas de nuevo cada vez que compro

#### Reglas de Negocio Asociadas:
`RN-CUE-10`, `RN-CUE-21`, `RN-CUE-22`

```gherkin
Escenario 1: Alta manual con los datos mínimos; la primera queda predeterminada (CA-CUE-07-01, DP-06)
  Dado que soy un cliente sin direcciones guardadas
  Cuando registro una dirección con dirección, barrio, nombre y apellido y teléfono
  Entonces la dirección queda disponible en mi cuenta
  Y queda marcada como predeterminada

Escenario 2: Datos mínimos incompletos se rechazan (RN-CUE-21)
  Dado que dejo el barrio vacío
  Cuando intento guardar la dirección
  Entonces el sistema rechaza con el código DIRECCION_INVALIDA señalando el campo
  Y no se guarda ninguna dirección

Escenario 3: Alta prellenada con la ubicación del dispositivo, editable antes de guardar (CA-CUE-07-04)
  Dado que autorizo el acceso a la ubicación de mi dispositivo
  Cuando confirmo el registro por ubicación
  Entonces el sistema completa los campos de dirección con los datos obtenidos
  Y me permite editarlos antes de guardar
  Y las coordenadas solo se guardan si confirmo la dirección

Escenario 4: Negar el permiso de ubicación no bloquea ni almacena nada (RN-CUE-22)
  Dado que el dispositivo o yo negamos el permiso de ubicación
  Cuando intento registrar la dirección por ubicación
  Entonces puedo continuar con el registro manual sin error bloqueante
  Y no se almacena ninguna coordenada

Escenario 5: Marcar una predeterminada retira la condición de la anterior (CA-CUE-07-02)
  Dado que tengo dos direcciones y la primera es la predeterminada
  Cuando marco la segunda como predeterminada
  Entonces la segunda queda como predeterminada
  Y la primera deja de serlo
  Y nunca existen dos predeterminadas, ni siquiera con dos peticiones simultáneas

Escenario 6: Solo puedo editar mis propias direcciones (RN-CUE-10)
  Dado que la dirección pertenece a otro cliente
  Cuando intento editarla o eliminarla manipulando su identificador
  Entonces el sistema responde 404 con el código RECURSO_NO_ENCONTRADO
  Y mi listado solo muestra mis direcciones

Escenario 7: Eliminar una dirección con confirmación (CA-CUE-07-03)
  Dado que tengo una dirección guardada
  Cuando elijo eliminarla y confirmo la acción
  Entonces deja de estar disponible para futuras compras

Escenario 8: Eliminar la predeterminada promueve a la más reciente (DP-06)
  Dado que la dirección predeterminada y otras dos más están guardadas
  Cuando elimino la predeterminada
  Entonces la más reciente de las restantes pasa a ser la predeterminada

Escenario 9: Una dirección duplicada se rechaza (RN-CUE-21, diagrama de direcciones)
  Dado que ya tengo guardada "Carrera 7 # 45-23" en el barrio "Chapinero"
  Cuando intento guardar la misma dirección ignorando mayúsculas y espacios sobrantes
  Entonces el sistema rechaza con el código DIRECCION_DUPLICADA

Escenario 10: El límite de 10 direcciones (RN-CUE-21, DP-05)
  Dado que tengo 9 direcciones guardadas
  Cuando guardo una décima
  Entonces el sistema la acepta
  Cuando intento guardar una undécima
  Entonces el sistema rechaza con el código LIMITE_DIRECCIONES
```

---

### HU-CUE-08 — Identidad y unicidad de la cuenta

> **Como** responsable del negocio
> **Quiero** que cada cuenta esté identificada de forma inequívoca
> **Para** evitar cuentas duplicadas y confusión sobre a quién pertenece una compra

#### Reglas de Negocio Asociadas:
`RN-CUE-01`, `RN-CUE-14`

```gherkin
Escenario 1: Un cliente duplicado se rechaza (CA-CUE-08-01a)
  Dado que existe una cuenta de cliente activa con un correo determinado
  Cuando alguien intenta crear otra cuenta de cliente con el mismo correo
  Entonces el sistema rechaza la operación con el código REGISTRO_CONFLICTO

Escenario 2: El correo de un empleado o administrador no puede registrarse como cliente (CA-CUE-08-01b)
  Dado que un correo está en uso por una cuenta de empleado o de administrador
  Cuando un visitante intenta registrarse como cliente con ese correo
  Entonces el sistema rechaza el registro con el código REGISTRO_CONFLICTO

Escenario 3: La comparación ignora mayúsculas y espacios en los extremos (RN-CUE-01)
  Dado que existe la cuenta "ana@correo.co"
  Cuando intento registrar "  Ana@Correo.CO "
  Entonces el sistema lo trata como el mismo correo y rechaza el registro

Escenario 4: El rechazo es indistinguible entre tipos de cuenta (RN-CUE-01, HU-SEG-06)
  Dado que un correo pertenece a un cliente y otro a un empleado
  Cuando intento registrarme con cada uno
  Entonces ambas respuestas tienen el mismo estado, el mismo código y el mismo cuerpo
  Y ninguna indica de qué tipo de cuenta se trata

Escenario 5: El ascenso a empresa conserva la misma cuenta (RF-CUE-08-03)
  Dado que soy un cliente particular cuya solicitud de ascenso fue aprobada
  Cuando consulto mi cuenta
  Entonces mi identificador de cuenta, mi correo y mi historial siguen siendo los mismos
  Y no existe ninguna cuenta nueva creada por el ascenso
```

---

### HU-CUE-09 — Verificación y aprobación de cuentas empresa

> **Como** administrador
> **Quiero** revisar los datos y el NIT que aporta una empresa y aprobar o rechazar su solicitud
> **Para** conceder condiciones comerciales de empresa únicamente a quienes acrediten serlo

#### Reglas de Negocio Asociadas:
`RN-CUE-15`, `RN-CUE-16`, `RN-CUE-17`, `RN-CUE-18`, `RN-CUE-20`, `RN-CUE-23`, `RN-CUE-24`

##### Transversal a las tres rebanadas

```gherkin
Escenario 1: El listado de pendientes muestra la información aportada (CA-CUE-09-01)
  Dado que existen solicitudes pendientes de registro, de ascenso y de renovación de NIT
  Cuando un administrador accede al listado correspondiente
  Entonces ve cada solicitud pendiente con la información que aportó el cliente

Escenario 2: Sin el permiso la respuesta es opaca (RN-CUE-18, HU-ADM-03)
  Dado que soy un empleado sin el permiso empresas.validar
  Cuando intento listar, consultar o decidir una solicitud
  Entonces el sistema responde 403 con el código ACCESO_DENEGADO
  Y el cuerpo no nombra el permiso requerido ni si la solicitud existe

Escenario 3: El detalle de una solicitud (RF-CUE-09-02)
  Dado que existe una solicitud pendiente
  Cuando un administrador consulta su detalle
  Entonces ve nombre de empresa, representante, correo, teléfono y NIT aportados
```

##### Rebanada 09-A — Registro de empresa

```gherkin
Escenario 4: Aprobar habilita las condiciones de empresa y registra quién y cuándo (CA-CUE-09-02)
  Dado que existe una solicitud de registro pendiente
  Cuando el administrador confirma la aprobación
  Entonces la cuenta queda habilitada con condiciones de empresa de inmediato
  Y se registra quién decidió y cuándo
  Y se emite el evento de notificación de la aprobación

Escenario 5: Rechazar un registro exige motivo y lo notifica (CA-CUE-09-03, RN-CUE-17)
  Dado que existe una solicitud de registro pendiente
  Cuando el administrador intenta rechazarla sin motivo
  Entonces el sistema responde 422 con el código MOTIVO_REQUERIDO
  Cuando la rechaza con un motivo
  Entonces la empresa recibe la notificación con ese motivo
  Y la cuenta no recibe condiciones de empresa

Escenario 6: Una solicitud ya decidida no se decide de nuevo (CA-CUE-09-04)
  Dado que una solicitud fue aprobada o rechazada
  Cuando se intenta decidir de nuevo
  Entonces el sistema responde 409 con el código SOLICITUD_YA_DECIDIDA
  Y la decisión original permanece intacta

Escenario 7: Dos decisiones simultáneas producen un único ganador (RNF-CUE-09-01, RN-CUE-16)
  Dado que dos administradores deciden la misma solicitud pendiente al mismo tiempo
  Cuando ambas peticiones llegan al servidor
  Entonces exactamente una prospera
  Y la otra recibe SOLICITUD_YA_DECIDIDA
  Y existe una única notificación y un único registro de auditoría
```

##### Rebanada 09-B — Ascenso de particular a empresa

```gherkin
Escenario 8: Aprobar un ascenso convierte la cuenta y notifica (CA-CUE-09-07)
  Dado que existe una solicitud de ascenso pendiente
  Cuando el administrador la aprueba
  Entonces el sistema convierte la cuenta a tipo empresa
  Y conserva el identificador de la cuenta
  Y notifica al cliente

Escenario 9: Rechazar un ascenso con motivo opcional (CA-CUE-09-08, RN-CUE-17)
  Dado que existe una solicitud de ascenso pendiente
  Cuando el administrador la rechaza sin motivo
  Entonces el rechazo se registra correctamente
  Y se notifica al cliente sin motivo
  Y cuando la rechaza con motivo, la notificación lo incluye

Escenario 10: Aprobar el ascenso desactiva el acceso de Google vinculado (DP-12)
  Dado que la cuenta del solicitante tiene Google vinculado
  Cuando el administrador aprueba el ascenso
  Entonces el acceso por Google de esa cuenta queda desactivado
  Y el cliente puede seguir entrando con su correo y contraseña
```

##### Rebanada 09-C — Renovación de NIT

```gherkin
Escenario 11: Aprobar una renovación actualiza el NIT y notifica (CA-CUE-09-05)
  Dado que existe una solicitud de renovación pendiente con su RUT adjunto
  Cuando el administrador la aprueba
  Entonces el sistema actualiza el NIT de la cuenta empresa
  Y notifica la aprobación al cliente

Escenario 12: Rechazar una renovación deja el NIT vigente intacto (CA-CUE-09-06)
  Dado que existe una solicitud de renovación pendiente
  Cuando el administrador la rechaza, con o sin motivo
  Entonces el NIT vigente de la cuenta no cambia
  Y se notifica al cliente incluyendo el motivo si fue registrado
```

##### Transversal: auditoría y custodia

```gherkin
Escenario 13: Toda decisión sobre NIT y ascenso queda auditada (CA-CUE-09-09, RN-CUE-23)
  Dado que el administrador aprueba o rechaza una solicitud de ascenso o de renovación de NIT
  Cuando se confirma la decisión
  Entonces se registra en auditoría quién decidió, cuándo y el motivo si aplica
  Y esa decisión genera la notificación correspondiente al cliente

Escenario 14: El RUT adjunto solo se entrega a personal autorizado (RN-CUE-20, HU-SEG-06)
  Dado que existe una solicitud de renovación con un RUT adjunto
  Cuando un empleado sin el permiso empresas.validar solicita el documento
  Entonces el sistema responde 403 con el código ACCESO_DENEGADO
  Y el listado de solicitudes no incluye nunca el contenido del documento
```


---

### HU-CUE-10 — Renovación de NIT del cliente empresa

> **Como** cliente tipo empresa
> **Quiero** solicitar la actualización del NIT de mi cuenta adjuntando el documento de renovación del RUT
> **Para** mantener actualizada mi información fiscal sin perder mi cuenta ni mi historial

#### Reglas de Negocio Asociadas:
`RN-CUE-13`, `RN-CUE-14`, `RN-CUE-19`, `RN-CUE-20`, `RN-CUE-24`

```gherkin
Escenario 1: Sin el RUT adjunto la solicitud no avanza (CA-CUE-10-01)
  Dado que soy un cliente empresa que inicia una solicitud de actualización de NIT
  Cuando intento enviarla sin adjuntar el documento de renovación del RUT
  Entonces el sistema responde 422 con el código DOCUMENTO_RUT_REQUERIDO
  Y no se crea ninguna solicitud

Escenario 2: Con el RUT y el NIT nuevo la solicitud queda pendiente (CA-CUE-10-02)
  Dado que adjunto un RUT válido junto con el NIT nuevo
  Cuando envío la solicitud
  Entonces el sistema la registra como pendiente para revisión del administrador

Escenario 3: El NIT vigente no cambia mientras está pendiente y el estado es visible (CA-CUE-10-03)
  Dado que mi solicitud de renovación está pendiente
  Cuando consulto el estado de mi cuenta
  Entonces veo que la solicitud está en revisión
  Y mi NIT vigente sigue siendo el anterior

Escenario 4: Se notifica la recepción de la solicitud (CA-CUE-10-04)
  Dado que envié correctamente mi solicitud
  Cuando el sistema la registra
  Entonces emite el evento de notificación de recepción hacia mi correo

Escenario 5: Tipo y tamaño del RUT en el límite exacto (RN-CUE-20, DP-18)
  Dado que el límite del documento es de 5 MB y los tipos son PDF, JPG y PNG
  Cuando adjunto un PDF de exactamente 5 MB
  Entonces el sistema lo acepta
  Cuando adjunto un PDF de 5 MB más 1 byte
  Entonces el sistema lo rechaza con el código DOCUMENTO_RUT_INVALIDO
  Y también rechaza un archivo de otro tipo, por ejemplo un ejecutable

Escenario 6: Solo el titular de una cuenta empresa puede solicitarla (RN-CUE-19, HU-SEG-03)
  Dado que soy un cliente particular o un cliente empresa con solicitud pendiente de registro
  Cuando intento solicitar la renovación de un NIT
  Entonces el sistema responde 403 con el código ACCESO_DENEGADO

Escenario 7: Una sola renovación pendiente y un NIT nuevo válido (RN-CUE-19, RN-CUE-14)
  Dado que ya tengo una renovación pendiente
  Cuando envío otra
  Entonces el sistema responde 409 con el código SOLICITUD_PENDIENTE_EXISTENTE
  Y si el NIT nuevo es igual al vigente o pertenece a otra empresa lo rechaza con NIT_YA_REGISTRADO
```
