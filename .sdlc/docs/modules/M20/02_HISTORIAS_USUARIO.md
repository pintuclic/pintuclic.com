# 📋 02_HISTORIAS_USUARIO — M20. Seguridad, Auditoría y Protección de Datos

> **Módulo:** `M20` · **Scope:** `m20-seguridad`
> **Responsable:** Product Manager Lead — Subrol 03 (Functional Requirements, ATDD & BDD)
> **Estándar:** INVEST + BDD (Dado–Cuando–Entonces)
> **Trazabilidad:** cada escenario cita el `CA-SEG-XX-NN` de origen en
> [`M20_SEGURIDAD_Y_AUDITORIA.md`](../../../../docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md)

---

## 0. Cobertura de esta entrega

| HU | Título | En alcance | Escenarios BDD |
| :--- | :--- | :---: | :---: |
| **HU-SEG-01** | Almacenamiento seguro de credenciales | ✅ | 7 |
| **HU-SEG-02** | Gestión de sesión | ✅ | 8 |
| **HU-SEG-03** | Autorización verificada en el servidor | ✅ | 7 |
| **HU-SEG-04** | Registro de auditoría | 🛑 **Aplazada por el PO** | — |
| **HU-SEG-05** | Protección de datos personales | ⚠️ Parcial | 7 |
| **HU-SEG-06** | No exposición de datos sensibles | ✅ | 7 |
| | **TOTAL** | **5 de 6** | **36** |

---

## 1. Requisitos Funcionales en alcance (RF)

Se adoptan íntegros los RF de la especificación de origen, salvo las exclusiones de la Matriz de
Alcance (§5 de `01_SPEC_FUNCIONAL.md`):

- **HU-SEG-01:** `RF-SEG-01-01` … `RF-SEG-01-06` (con `RF-SEG-01-05` **invertido** por RN-SEG-02).
- **HU-SEG-02:** `RF-SEG-02-01` … `RF-SEG-02-06`, `RF-SEG-02-08`. *(Excluido `RF-SEG-02-07` → M17.)*
- **HU-SEG-03:** `RF-SEG-03-01` … `RF-SEG-03-06`. *(`RF-SEG-03-07` cubierto por diseño, RN-SEG-15.)*
- **HU-SEG-05:** `RF-SEG-05-01` … `RF-SEG-05-07`. *(Excluidos `RF-SEG-05-08` y `RF-SEG-05-09`.)*
- **HU-SEG-06:** `RF-SEG-06-01` … `RF-SEG-06-07`.

## 2. Requisitos No Funcionales (RNF)

- **RNF-SEG-01-01 (Seguridad):** la verificación de contraseña se realiza en **tiempo constante**,
  para no revelar información por diferencias de tiempo de respuesta.
- **RNF-SEG-01-02 (Mantenibilidad):** el parámetro de coste de derivación debe poder ajustarse **sin
  migrar** las contraseñas ya almacenadas.
- **RNF-SEG-02-01 (Seguridad):** el identificador de sesión viaja solo por canal cifrado y **no es
  accesible desde el código de la página**.
- **RNF-SEG-03-01 (Seguridad):** la autorización se aplica de forma **central**; una operación nueva
  queda protegida por omisión.
- **RNF-ADM-03-02 (Rendimiento):** la comprobación de permisos no introduce demora perceptible.
- **RNF-SEG-06-01 (Seguridad):** toda comunicación navegador↔servidor por canal cifrado.

---

## 3. Catálogo de Historias de Usuario

### HU-SEG-01 — Almacenamiento seguro de credenciales

- **Como:** cliente
- **Quiero:** que mi contraseña se guarde de forma que nadie pueda leerla
- **Para:** que un incidente en la empresa no comprometa mis otras cuentas

#### Criterios de Aceptación (Gherkin)

```gherkin
Escenario 1: La credencial nunca queda legible            # CA-SEG-01-01
  Dado que registro una cuenta con una contraseña
  Cuando el sistema la almacena
  Entonces queda guardada en forma derivada
  Y su valor original no puede recuperarse desde el almacenamiento

Escenario 2: Dos contraseñas iguales producen valores distintos   # CA-SEG-01-02
  Dado que dos usuarios distintos eligen exactamente la misma contraseña
  Cuando ambas se almacenan
  Entonces los valores guardados son distintos entre sí
  Porque cada derivación usa una sal única por usuario

Escenario 3: El error de autenticación no filtra la credencial    # CA-SEG-01-03
  Dado que se produce un error durante la autenticación
  Cuando el sistema registra el evento
  Entonces el registro no contiene la contraseña introducida
  Y tampoco su forma derivada

Escenario 4: El perfil no devuelve la credencial                  # CA-SEG-01-04
  Dado que consulto mi perfil estando autenticado
  Cuando el sistema me devuelve mis datos
  Entonces la respuesta no incluye mi contraseña en ninguna forma

Escenario 5: Cambiar la contraseña cierra todas mis sesiones      # CA-SEG-01-05
  Dado que tengo sesiones abiertas en varios dispositivos
  Cuando completo un cambio de contraseña
  Entonces todas mis sesiones quedan invalidadas con motivo "cambio_contrasena"
  Y debo autenticarme de nuevo en cada dispositivo

Escenario 6: La cuenta creada con Google exige contraseña propia  # CA-SEG-01-06 (invertido, RN-SEG-02)
  Dado que completo un registro mediante Google
  Cuando el sistema va a dar el registro por finalizado
  Entonces me exige digitar y confirmar una contraseña propia
  Y no permite finalizar el registro hasta que la establezca
  Y esa contraseña queda almacenada de forma derivada

Escenario 7: Vincular Google no retira la contraseña existente    # RF-CUE-02-04
  Dado que tengo una cuenta creada por formulario con contraseña
  Cuando vinculo el acceso de Google a esa misma cuenta
  Entonces conservo ambas vías de acceso
  Y mi contraseña sigue siendo válida
```

**Frontera (BVA):** coste de derivación por debajo del mínimo exigido ⇒ la operación se rechaza en
arranque, no en tiempo de petición.

---

### HU-SEG-02 — Gestión de sesión

- **Como:** cliente
- **Quiero:** que mi sesión se cierre sola tras un tiempo sin actividad
- **Para:** que nadie use mi cuenta si dejo el equipo abierto

#### Criterios de Aceptación (Gherkin)

```gherkin
Escenario 1: Caducidad por inactividad en panel administrativo    # CA-SEG-02-01
  Dado que dejo de operar en el panel administrativo durante más de 30 minutos
  Cuando intento realizar una acción
  Entonces el sistema me informa de que la sesión expiró
  Y me pide autenticarme de nuevo

Escenario 2: La actividad renueva la vigencia                     # CA-SEG-02-02
  Dado que estoy operando activamente
  Cuando realizo una acción antes de agotarse el plazo de inactividad
  Entonces la vigencia de mi sesión se renueva
  Y la sesión no se cierra

Escenario 3: Sesiones simultáneas en varios dispositivos          # CA-SEG-02-03
  Dado que tengo sesión abierta en el móvil
  Cuando inicio sesión también en el computador
  Entonces ambas sesiones funcionan
  Y la primera no se cierra

Escenario 4: Cuenta desactivada invalida la sesión abierta        # CA-SEG-02-04
  Dado que soy empleado con sesión abierta
  Cuando un administrador desactiva mi cuenta
  Y a continuación intento realizar cualquier operación
  Entonces el sistema rechaza la petición
  Aunque mi sesión estuviera abierta

Escenario 5: Retirar un permiso surte efecto sin re-autenticar    # CA-SEG-02-05
  Dado que tengo sesión abierta y un permiso concedido
  Cuando un administrador me retira ese permiso
  Y a continuación intento usar la función correspondiente
  Entonces el sistema la rechaza
  Y no espera a que yo vuelva a autenticarme

Escenario 6: Re-autenticar conserva el destino pretendido         # CA-SEG-02-06
  Dado que mi sesión expiró mientras intentaba abrir una página concreta
  Cuando me autentico de nuevo
  Entonces el sistema me lleva a esa página
  Y no al inicio

Escenario 7: Cierre explícito de sesión                           # RF-SEG-02-04
  Dado que tengo una sesión activa
  Cuando solicito cerrar sesión
  Entonces esa sesión queda finalizada con motivo "cierre_manual"
  Y el identificador de sesión deja de ser aceptado

Escenario 8: El identificador de sesión no es legible por la página  # RNF-SEG-02-01
  Dado que tengo una sesión activa en el navegador
  Cuando el código de la página intenta leer el identificador de sesión
  Entonces no puede accederlo
  Porque viaja en una cookie HttpOnly, Secure y SameSite
```

**Frontera (BVA):** operación ejecutada exactamente en el instante de expiración ⇒ se trata como
expirada (el límite es excluyente).

---

### HU-SEG-03 — Autorización verificada en el servidor

- **Como:** cliente
- **Quiero:** que ningún otro usuario pueda ver mis pedidos ni mis datos
- **Para:** confiar en que mi información está protegida

#### Criterios de Aceptación (Gherkin)

```gherkin
Escenario 1: Un cliente no accede a la orden de otro               # CA-SEG-03-01
  Dado que estoy autenticado como cliente
  Cuando solicito el detalle de una orden que pertenece a otro cliente
  Entonces el sistema rechaza la operación
  Y la respuesta no revela si esa orden existe

Escenario 2: Petición directa sin permiso, fuera de la interfaz    # CA-SEG-03-02
  Dado que soy empleado sin permiso de gestión de productos
  Cuando envío directamente la petición de crear un producto sin pasar por la interfaz
  Entonces el sistema la rechaza

Escenario 3: Acceso directo por dirección a una opción oculta      # CA-SEG-03-03
  Dado que la interfaz me oculta una opción por falta de permiso
  Cuando accedo directamente a la dirección de esa función
  Entonces el sistema rechaza la operación
  Porque la ocultación es usabilidad y no control de acceso

Escenario 4: Permiso retirado en caliente                          # CA-SEG-03-04
  Dado que un administrador me retira un permiso mientras tengo la sesión abierta
  Cuando intento ejecutar esa función
  Entonces el sistema la rechaza
  Porque los permisos se resuelven en cada petición

Escenario 5: Recurso inexistente y recurso ajeno son indistinguibles  # CA-SEG-03-06
  Dado que solicito un recurso que no existe
  Y solicito otro que existe pero no me pertenece
  Cuando el sistema responde a ambas peticiones
  Entonces ambas respuestas son indistinguibles entre sí
  Y ninguna indica qué permiso concreto haría falta

Escenario 6: La sesión sobrevive al acceso denegado                # RF-ADM-03-07
  Dado que el sistema me deniega el acceso a una función
  Cuando la operación termina
  Entonces mi sesión sigue abierta
  Y el sistema me devuelve a una pantalla permitida

Escenario 7: El acceso denegado se emite al puerto de auditoría    # RN-SEG-15
  Dado que se produce un acceso denegado por falta de permiso
  Cuando el sistema lo rechaza
  Entonces emite el evento al puerto de auditoría con actor, operación intentada y fecha
  Y el adaptador vigente lo escribe en el registro técnico interno
```

> 🛑 **`CA-SEG-03-05` —** *"queda registrado el usuario, la operación intentada y la fecha"* —
> **no se declara cumplido en esta entrega.** Depende de la persistencia de HU-SEG-04, aplazada por
> el Product Owner. El Escenario 7 cubre la **emisión**; la **persistencia** llegará con el adaptador
> real, sin tocar puntos de llamada.

---

### HU-SEG-05 — Protección de datos personales *(parcial)*

- **Como:** usuario
- **Quiero:** saber qué datos míos se recogen y con quién se comparten
- **Para:** dar mi consentimiento con conocimiento de causa

#### Criterios de Aceptación (Gherkin)

```gherkin
Escenario 1: Sin consentimiento no hay registro                    # CA-SEG-05-01
  Dado que estoy completando el registro
  Cuando no marco el consentimiento sobre el tratamiento de mis datos
  Entonces el sistema no permite finalizar el registro

Escenario 2: Se conserva fecha y versión del aviso aceptado        # CA-SEG-05-02
  Dado que acepto el aviso de privacidad vigente
  Cuando el registro se completa
  Entonces el sistema conserva la fecha en que lo acepté
  Y la versión exacta del aviso que acepté

Escenario 3: Consulta y rectificación desde el perfil              # CA-SEG-05-03
  Dado que soy usuario registrado
  Cuando accedo a mi perfil
  Entonces puedo consultar mis datos personales
  Y puedo rectificarlos

Escenario 4: La solicitud de supresión se registra y se confirma   # CA-SEG-05-04
  Dado que solicito la supresión de mis datos
  Cuando el sistema recibe la solicitud
  Entonces la registra en estado pendiente
  Y me confirma su recepción

Escenario 5: Supresión con órdenes asociadas conserva lo exigido   # CA-SEG-05-05
  Dado que tengo órdenes de venta asociadas a mi cuenta
  Cuando solicito la supresión de mi cuenta y se resuelve
  Entonces el sistema conserva la información comercial exigida por la ley
  Y la desvincula de mi identidad

Escenario 6: El aviso vigente es accesible siempre                 # RF-SEG-05-03
  Dado que soy un visitante no autenticado
  Cuando consulto el aviso de privacidad
  Entonces el sistema me entrega la versión vigente
  Sin exigirme autenticación

Escenario 7: Cambio de versión del aviso                           # CA-SEG-05-06
  Dado que el aviso de privacidad cambia de versión
  Cuando accedo al sitio estando autenticado
  Entonces el sistema me informa del cambio
```

**Frontera (BVA):** supresión solicitada por quien **no** es el titular ⇒ se rechaza por titularidad
(RN-SEG-07), con respuesta uniforme (RN-SEG-08).

> ⚠️ **Fuera de alcance en esta historia:** `RF-SEG-05-08` (informar de transferencias a terceros) y
> `RF-SEG-05-09` (retención de imágenes del simulador y conversaciones de chatbot/WhatsApp, marcado
> *PENDIENTE DE DEFINICIÓN* en la fuente). El **texto legal** del aviso lo redacta el área legal.

---

### HU-SEG-06 — No exposición de datos sensibles

- **Como:** cliente
- **Quiero:** que mis datos sensibles no viajen al navegador sin necesidad
- **Para:** reducir el riesgo de que se filtren

#### Criterios de Aceptación (Gherkin)

```gherkin
Escenario 1: El precio empresarial no se expone                    # CA-SEG-06-01
  Dado que consulto el detalle de un producto sin ser cliente empresa aprobado
  Cuando el sistema me responde
  Entonces la respuesta no incluye el precio empresarial

Escenario 2: El error no revela detalles internos                  # CA-SEG-06-02
  Dado que se produce un error interno
  Cuando el sistema me lo comunica
  Entonces el mensaje no contiene rutas, consultas ni versiones de componentes

Escenario 3: La recuperación no revela si el correo existe         # CA-SEG-06-03
  Dado que solicito recuperar mi contraseña con un correo no registrado
  Cuando el sistema responde
  Entonces la respuesta es idéntica a la que daría con un correo registrado

Escenario 4: No se almacenan instrumentos de pago                  # CA-SEG-06-04
  Dado que completo un pago
  Cuando la operación termina
  Entonces el sistema no ha almacenado ningún dato del instrumento de pago utilizado

Escenario 5: Los listados no filtran datos de terceros             # CA-SEG-06-05
  Dado que consulto un listado
  Cuando el sistema me responde
  Entonces la respuesta no contiene datos de otros clientes
  Aunque la interfaz no los muestre

Escenario 6: El registro técnico sirve para diagnosticar           # CA-SEG-06-06
  Dado que se produce un error interno
  Cuando reviso el registro técnico
  Entonces contiene el detalle necesario para diagnosticar
  Y no incluye datos sensibles del usuario

Escenario 7: La respuesta entrega solo lo necesario                # RF-SEG-06-01
  Dado que solicito una operación concreta
  Cuando el sistema me responde
  Entonces la respuesta contiene únicamente los datos necesarios para esa operación
```

**Frontera (BVA):** cliente empresa con cuenta **pendiente de aprobación** ⇒ se trata como no
aprobado y el precio empresarial permanece oculto.

---

## 4. HU-SEG-04 — Registro de auditoría *(aplazada)*

> 🛑 **Excluida de esta entrega por decisión del Product Owner:** la tabla de auditoría aún no se
> establece. Sus 8 RF y 7 CA quedan íntegros en la fuente de verdad y se formalizarán cuando el PO
> la desbloquee. Los dos diagramas asociados —`HU-SEG-04-captura_auditoria.drawio.png` y
> `HU-SEG-04_consulta_auditoria.drawio.png`— ya fueron inspeccionados y su contrato de flujo está
> recogido en [`03_FLUJO_Y_ESTADOS.md`](03_FLUJO_Y_ESTADOS.md) §5, listo para retomar.
>
> El puerto `AuditoriaPort` (RN-SEG-15) mantiene cableados los puntos de llamada para que el
> desbloqueo no obligue a reabrir código ya escrito.
