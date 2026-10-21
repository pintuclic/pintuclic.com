# 🔀 03_FLUJO_Y_ESTADOS — M04. Cuentas, Autenticación y Perfil

> **Módulo:** `M04` · **Scope:** `m04-cuentas`
> **Responsable:** Product Manager Lead (Fase 1)
> **Propósito:** transcribir a Mermaid los **5 diagramas contractuales** de
> [`docs/assets/diagrams/M04/`](../../../../docs/assets/diagrams/M04/) y declarar las máquinas de estados que las
> reglas de [`01_SPEC_FUNCIONAL.md`](01_SPEC_FUNCIONAL.md) custodian.
> **Convención:** donde el diagrama original contradice la especificación, **se transcribe la versión corregida** y
> se señala la desviación (`F-xx`, ver §7.1 de la especificación). Por resolución del Director Humano
> (2026-10-21) prevalece la especificación.

---

## 0. Mapa de Diagramas Contractuales

| Diagrama original | Secciones de este documento | HU cubiertas | Desviaciones |
| :--- | :--- | :--- | :--- |
| `registro_sistema.drawio.png` | §2, §3 | `HU-CUE-01`, `02`, `03`, `08` | `F-03`, `F-06` |
| `login_sistema.drawio.png` | §4, §6 | `HU-CUE-02`, `04`, `05` | `F-01` |
| `informacion_personal.drawio.png` | §7 | `HU-CUE-06`, `08` | `F-02`, `F-04` |
| `gestion_direcciones.drawio.png` | §8 | `HU-CUE-07` | `F-05` |
| `solicitudes_empresas.png` | §9 | `HU-CUE-03`, `09`, `10` | — |

---

## 1. Máquina de Estados de la Cuenta de Cliente

`usuario.estado` es el estado existente del modelo (`pendiente`, `activo`, `inactivo`, `bloqueado`). M04 solo
usa **`pendiente`** (correo sin verificar) y **`activo`**; **`inactivo`** lo fija M17 (`HU-ADM-04`). El estado
`bloqueado` **no lo usa M04**: la restricción por intentos es temporal y vive aparte (§5).

```mermaid
stateDiagram-v2
    [*] --> pendiente: Registro por formulario (RN-CUE-02)
    pendiente --> pendiente: Reenvío de código / reinicio de trámite (DP-07)
    pendiente --> activo: Código correcto dentro del plazo (CA-CUE-01-02)
    [*] --> activo: Alta con Google tras fijar contraseña propia (RN-CUE-05)
    activo --> inactivo: Desactivación por el administrador (M17)
    inactivo --> activo: Reactivación (M17)
    note right of pendiente
        No abre sesión.
        Solo se revela con credencial
        correcta (RN-CUE-08).
        No reserva el correo (RN-CUE-02).
    end note
```

El **tipo** de cuenta (`normal` / `empresa`) es ortogonal al estado y solo cambia por una **decisión de aprobación**
(`RN-CUE-15`):

```mermaid
stateDiagram-v2
    [*] --> normal: Cuenta creada
    normal --> empresa: Aprobación de ascenso o de registro empresa (HU-CUE-09)
    note right of empresa
        Sin acceso Google (DP-12).
        NIT inmutable desde el perfil (RN-CUE-13).
    end note
```

---

## 2. Registro por Formulario (`registro_sistema.drawio.png`)

```mermaid
flowchart TD
    A["Visitante: Registro al sistema"] --> B{"¿Formulario o Google?"}
    B -->|Formulario| C{"¿Qué tipo de usuario?"}
    B -->|Google| G["Ver §3"]
    C -->|Natural| D["Nombre · Correo · Teléfono · Contraseña"]
    C -->|Empresa| E["Nombre empresa · Representante legal ·<br/>Correo empresarial · Teléfono · NIT o RUT · Contraseña"]
    D --> F{"¿Todos los campos válidos?"}
    E --> F
    F -->|No| F1["Campo inválido (RN-CUE-04)"]
    F -->|Sí| H{"¿Correo ya existe en los 3 tipos de cuenta?"}
    H -->|"Sí, cuenta verificada o de empleado"| H1["REGISTRO_CONFLICTO 409<br/>(mismo cuerpo siempre, RN-CUE-01)"]
    H -->|"Sí, cuenta pendiente jamás verificada"| H2["Reinicia el trámite (DP-07)"]
    H -->|No| I["Crea cuenta pendiente"]
    H2 --> I
    I --> J["Emite evento: código al correo (RN-CUE-24)"]
    J --> K{"¿Código válido?"}
    K -->|No| K1["CODIGO_INVALIDO / EXPIRADO / INTENTOS_AGOTADOS<br/>→ reenviar (RN-CUE-03)"]
    K1 --> J
    K -->|Sí, persona natural| L["Cuenta activa — registro exitoso"]
    K -->|Sí, empresa| M["Cuenta activa sin condiciones de empresa<br/>+ solicitud PENDIENTE (DP-19)"]
    M --> N["Emite evento: estado de la solicitud (en revisión)"]
    N --> O["Registro exitoso — empresa en aprobación"]
```

> **`F-06`:** el diagrama original rotula el final de la rama de empresa como *"Registro exitoso como persona
> natural"*. Se transcribe como **empresa en aprobación**.

---

## 3. Registro y Acceso con Google (`registro_sistema` + `login_sistema`)

> **`F-03`:** el diagrama original no incluye el paso de contraseña propia ni la sugerencia de vinculación.
> Se transcribe la versión conforme a `RF-CUE-02-03/04` y `RN-CUE-05`.

```mermaid
flowchart TD
    A["Visitante: Continuar con Google"] --> B{"¿El proveedor autoriza?"}
    B -->|"Cancela o falla"| B1["Sin cuenta ni sesión (CA-CUE-02-03)"]
    B -->|Autoriza| C{"¿Correo de Google verificado?"}
    C -->|No| C1["IDENTIDAD_EXTERNA_INVALIDA 401"]
    C -->|Sí| D{"¿Identidad de Google ya vinculada?"}
    D -->|Sí| D1["Inicio de sesión directo"]
    D -->|No| E{"¿El correo coincide con una cuenta?"}
    E -->|"Cuenta empresa / empleado / administrador"| E1["Sin vinculación ni sesión<br/>(mensaje genérico, DP-13)"]
    E -->|"Cuenta particular por formulario"| F["Sugerencia de vincular (RF-CUE-02-03)"]
    F --> G{"¿El titular confirma?"}
    G -->|Sí| G1["Vincula ambos accesos a la MISMA cuenta<br/>(conserva su contraseña)"]
    G -->|No| G2["No vincula ni crea cuenta"]
    E -->|"Sin cuenta"| H["Autorrellena nombre y correo con datos de Google"]
    H --> I["Exige contraseña propia (RN-CUE-04)"]
    I --> J{"¿Cumple la política?"}
    J -->|No| I
    J -->|"Abandona"| B1
    J -->|Sí| K["Crea la cuenta con ambas vías de acceso<br/>(solo ahora existe, RN-CUE-05)"]
```

---

## 4. Inicio de Sesión (`login_sistema.drawio.png`)

```mermaid
flowchart TD
    A["Usuario: Inicio de sesión"] --> B["Formulario: Correo + Contraseña"]
    B --> C{"¿Campos válidos?"}
    C -->|No| C1["Campo inválido<br/>(ofrece Google, RF-CUE-04-01)"]
    C -->|Sí| D{"¿Correo restringido por intentos? (RN-CUE-07)"}
    D -->|Sí| D1["ACCESO_TEMPORALMENTE_RESTRINGIDO 429<br/>(exista o no el correo)"]
    D -->|No| E{"¿Credencial correcta?"}
    E -->|No| E1["CREDENCIALES_INVALIDAS 401 (RN-CUE-06)<br/>+1 fallo; al llegar a P5 → restringe P6 min"]
    E -->|Sí| F{"¿Estado de la cuenta? (RN-CUE-08)"}
    F -->|pendiente| F1["CUENTA_NO_VERIFICADA 403 → verificación"]
    F -->|inactivo| F2["CUENTA_DESACTIVADA 403"]
    F -->|activo| G["Reinicia contador de fallos"]
    G --> H["Backend resuelve el tipo de sesión (RN-CUE-26)"]
    H --> I{"¿Empleado con credencial temporal?"}
    I -->|Sí| I1["Sesión con cambio de clave PENDIENTE<br/>solo permite fijar contraseña (M17 CA-ADM-01-03)"]
    I -->|No| J["Inicio de sesión exitoso"]
    J --> K["Cierre de sesión → invalida de inmediato (CA-CUE-04-04)"]
```

---

## 5. Control de Intentos de Acceso

La restricción se lleva **por correo**, exista o no la cuenta (`RN-CUE-07`), para que su comportamiento sea idéntico
y no filtre la existencia de la cuenta.

```mermaid
stateDiagram-v2
    [*] --> libre
    libre --> libre: Fallo (contador < P5)
    libre --> restringido: Fallo número P5 (por defecto 5)
    restringido --> restringido: Cualquier intento, incluso con la credencial correcta
    restringido --> libre: Transcurren P6 minutos (por defecto 15)
    libre --> libre: Acceso exitoso (contador a cero)
```

---

## 6. Recuperación de Contraseña (`login_sistema.drawio.png`, rama derecha)

> **`F-01`:** el diagrama original tiene la rama *"Este correo no existe"*. Se transcribe la versión conforme a
> `RF-CUE-05-04` y `RN-CUE-06`: **una sola respuesta para todos los casos**.

```mermaid
flowchart TD
    A["Usuario: Recuperación de contraseña"] --> B["Digita el correo"]
    B --> C["Respuesta UNIFORME 202 SOLICITUD_RECIBIDA<br/>(siempre, exista o no)"]
    B --> D{"¿Es cuenta de cliente existente?"}
    D -->|"No (inexistente, empleado o administrador)"| D1["No se emite nada (DP-14)"]
    D -->|Sí| E["Invalida el enlace anterior"]
    E --> F["Emite evento: enlace de un solo uso al correo"]
    F --> G{"¿Enlace usado dentro de P4 min y sin usar?"}
    G -->|No| G1["CODIGO_EXPIRADO / inválido"]
    G -->|Sí| H{"¿Contraseña nueva cumple la política?"}
    H -->|"No (el enlace NO se consume)"| H1["CONTRASENA_NO_CUMPLE_POLITICA"]
    H -->|Sí| I["Cambia la contraseña y consume el enlace"]
    I --> J["Invalida TODAS las sesiones (RN-CUE-09)<br/>No abre sesión nueva"]
    J --> K["El acceso por Google, si existe, sigue disponible"]
```

---

## 7. Información Personal y Perfil (`informacion_personal.drawio.png`)

> **`F-04`:** el campo *"Documento de Identidad"* del diagrama queda **fuera de alcance**.
> **`F-02`:** el diagrama manda el código al correo **actual**; se transcribe la versión conforme a `RN-CUE-11`.

### 7.1. Cambio de correo

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente (sesión)
    participant S as Servidor M04
    participant N as Puerto de notificación (M18)

    C->>S: Solicita cambiar el correo a "nuevo@x.co"
    S->>S: ¿"nuevo@x.co" ya existe en los 3 tipos de cuenta?
    alt Ya existe
        S-->>C: 409 REGISTRO_CONFLICTO (mismo cuerpo siempre)
    else Libre
        S->>N: Evento: código de verificación → "nuevo@x.co"
        S-->>C: 202 — el correo vigente NO cambia aún
        C->>S: Introduce el código
        alt Código válido, vigente y con intentos
            S->>S: Aplica el nuevo correo
            S->>N: Evento: aviso de cambio → correo ANTERIOR
            S-->>C: Cambio exitoso
        else Inválido / expirado / agotado
            S-->>C: 422 (el correo NO cambia)
        end
    end
```

### 7.2. Cambio de contraseña y ascenso a empresa

```mermaid
flowchart TD
    A["Cliente autenticado: Perfil"] --> B{"¿Qué desea?"}
    B -->|"Cambiar contraseña"| C["Actual + Nueva + Confirmación"]
    C --> D{"¿La actual es correcta?"}
    D -->|No| D1["CONTRASENA_ACTUAL_INCORRECTA 422"]
    D -->|Sí| E{"¿La nueva cumple la política?"}
    E -->|No| E1["CONTRASENA_NO_CUMPLE_POLITICA 422"]
    E -->|Sí| F["Cambia + invalida TODAS las sesiones, incluida la actual (DP-16)"]
    B -->|"Solicitar ascenso a empresa (solo particular)"| G{"¿Tiene Google vinculado?"}
    G -->|Sí| G1["Advertencia: se desactivará el acceso Google (DP-12)"]
    G -->|No| H["Digita el NIT"]
    G1 --> H
    H --> I{"¿Ya hay solicitud pendiente o el NIT está ocupado?"}
    I -->|Sí| I1["SOLICITUD_PENDIENTE_EXISTENTE / NIT_YA_REGISTRADO"]
    I -->|No| J["Solicitud PENDIENTE visible al administrador"]
    B -->|"Editar NIT (cuenta empresa)"| K["CAMPO_NO_EDITABLE 422 (RN-CUE-13)"]
```

---

## 8. Gestión de Direcciones (`gestion_direcciones.drawio.png`)

```mermaid
flowchart TD
    A["Gestión de direcciones"] --> B{"¿Acción?"}
    B -->|Agregar| C{"¿Prellenar con ubicación?"}
    C -->|"Sí, con permiso del titular (RN-CUE-22)"| C1["Completa los campos; editables antes de guardar"]
    C -->|"No / permiso negado"| C2["Registro manual"]
    C1 --> D["Dirección · Barrio · Apto/Casa (opcional) · Nombre y apellido · Teléfono"]
    C2 --> D
    D --> E{"¿Campos válidos?"}
    E -->|No| E1["DIRECCION_INVALIDA"]
    E -->|Sí| F{"¿Ya existe? (F-05)"}
    F -->|Sí| F1["DIRECCION_DUPLICADA 409"]
    F -->|No| G{"¿Ya hay 10?"}
    G -->|Sí| G1["LIMITE_DIRECCIONES 422"]
    G -->|No| H["Guarda; si es la primera, queda predeterminada (DP-06)"]
    B -->|Modificar| I["Dirección propia elegida → ¿campos válidos? → modificación exitosa"]
    B -->|Visualizar| J["Lista solo MIS direcciones (RN-CUE-10)"]
    B -->|Eliminar| K{"¿Desea eliminarla?"}
    K -->|Sí| L["Elimina; si era la predeterminada,<br/>la más reciente pasa a serlo (DP-06)"]
```

La **predeterminada es única**. Cambiar de predeterminada ocurre en una sola transacción: primero se retira la
condición a la anterior y después se concede a la nueva.

---

## 9. Solicitudes de Empresa (`solicitudes_empresas.png`)

### 9.1. Máquina de estados de una solicitud

Aplica por igual a la **solicitud de empresa** (registro y ascenso) y a la **solicitud de renovación de NIT**.
`aprobada` y `rechazada` son **estados terminales** (`RN-CUE-16`).

```mermaid
stateDiagram-v2
    [*] --> pendiente: El cliente envía la solicitud
    pendiente --> aprobada: Decisión de personal autorizado (quién + cuándo)
    pendiente --> rechazada: Decisión con motivo (obligatorio solo en registro)
    aprobada --> [*]
    rechazada --> [*]
    note right of pendiente
        Sin condiciones de empresa (RN-CUE-15).
        Una sola pendiente por cuenta.
    end note
    note right of rechazada
        No se reabre: el cliente presenta
        una solicitud NUEVA (DP-10).
        El NIT queda libre (RN-CUE-14).
    end note
```

### 9.2. Panel de decisión (dos vistas independientes, `RF-CUE-09-08`)

```mermaid
flowchart TD
    A["Administrador o empleado con empresas.validar (RN-CUE-18)"] --> B{"¿Vista?"}
    B -->|"Solicitudes de empresas (registro y ascenso)"| C["Visualiza pendientes"]
    B -->|"Solicitudes de renovación de NIT"| D["Visualiza pendientes + RUT adjunto (RN-CUE-20)"]
    C --> E["Consulta el detalle aportado"]
    D --> E
    E --> F{"¿Registrar aprobación?"}
    F -->|Sí| G["Aprueba: habilita condiciones de empresa<br/>o actualiza el NIT, de inmediato"]
    F -->|No| H{"¿Registrar rechazo?"}
    H -->|Sí| I["Digita el motivo<br/>(obligatorio en registro; opcional en ascenso y NIT)"]
    H -->|No| C
    G --> J["Registra quién y cuándo + AUDITORÍA (RN-CUE-23)"]
    I --> J
    J --> K["Emite evento de notificación al cliente (RN-CUE-24)"]
```

### 9.3. Secuencia de una decisión (con concurrencia)

```mermaid
sequenceDiagram
    autonumber
    actor A1 as Admin 1
    actor A2 as Admin 2
    participant S as Servidor M04
    participant DB as Base de datos
    participant AU as AuditoriaPort
    participant N as Puerto de notificación (M18)

    A1->>S: Aprobar solicitud X
    A2->>S: Rechazar solicitud X (simultáneo)
    S->>S: Verifica permiso empresas.validar (cada petición)
    S->>DB: UPDATE … SET estado=… WHERE id=X AND estado='pendiente'
    DB-->>S: 1 fila (Admin 1 gana)
    S->>DB: UPDATE … WHERE id=X AND estado='pendiente' (Admin 2)
    DB-->>S: 0 filas
    S-->>A2: 409 SOLICITUD_YA_DECIDIDA
    S->>AU: Registra decisión: quién, cuándo, motivo
    S->>N: Emite UNA notificación al cliente
    S-->>A1: 200 — decisión registrada
```

---

## 10. Eventos que M04 Emite hacia M18

Catálogo de eventos que M04 publica por el puerto de notificación (`RN-CUE-24`). El contenido editorial de cada
plantilla corresponde a `HU-NOT-03` de M18.

| Evento | Disparador | Destinatario |
| :--- | :--- | :--- |
| `codigo_registro` | Registro por formulario o reenvío | Correo indicado |
| `solicitud_empresa_en_revision` | Verificación de correo de una empresa | Correo de la empresa |
| `enlace_recuperacion` | Solicitud de recuperación de una cuenta de cliente existente | Correo de la cuenta |
| `codigo_cambio_correo` | Solicitud de cambio de correo | Correo **nuevo** |
| `aviso_cambio_correo` | Cambio de correo aplicado | Correo **anterior** |
| `decision_empresa` | Aprobación o rechazo de registro de empresa | Correo de la empresa |
| `decision_ascenso` | Aprobación o rechazo de ascenso | Correo del cliente |
| `renovacion_nit_recibida` | Envío de solicitud de renovación | Correo de la empresa |
| `decision_renovacion_nit` | Aprobación o rechazo de renovación | Correo de la empresa |
