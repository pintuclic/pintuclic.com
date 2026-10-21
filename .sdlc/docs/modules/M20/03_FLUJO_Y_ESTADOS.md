# 🔄 03_FLUJO_Y_ESTADOS — M20. Seguridad, Auditoría y Protección de Datos

> **Módulo:** `M20` · **Scope:** `m20-seguridad`
> **Responsable:** Product Manager Lead (traducción) · Software Architect (ratificación en Gate 2)
>
> ⚠️ **Los diagramas son contrato, no ilustración** (Directiva #5 de `AGENTS.md`). Lo que sigue es la
> transcripción fiel a Mermaid de los **6 diagramas `.png` de
> [`docs/assets/diagrams/M20/`](../../../../docs/assets/diagrams/M20/)**, que fueron inspeccionados
> visualmente uno a uno. Donde la transcripción se aparta del original se indica con 📌 y su motivo.

---

## 1. HU-SEG-01 — Almacenamiento seguro de credenciales

```mermaid
flowchart TD
    U([Usuario crea o accede a su cuenta]) --> G{¿Cuenta creada<br/>con Google?}

    G -->|Sí| GP[Google: proveedor de autenticación]
    GP --> GA[Autenticación externa realizada]
    GA --> GC["📌 Exigir contraseña propia<br/>antes de finalizar el registro<br/>(RN-SEG-02 · RF-CUE-02-04)"]
    GC --> D

    G -->|No| EST[Establecer contraseña]
    EST --> D["Derivar con sal única por usuario<br/>(RF-SEG-01-01)"]

    D --> ALM["Almacenar solo la derivación<br/>(nunca texto claro)"]
    ALM --> REG["Registro de credenciales:<br/>solo el hash"]
    REG --> AUD["Registro de auditoría / error<br/>SIN datos sensibles<br/>(RF-SEG-01-03)"]

    ALM --> VER["Verificar: derivar y comparar<br/>en tiempo constante<br/>(RF-SEG-01-02 · RNF-SEG-01-01)"]
    VER --> C{¿Coincide?}

    C -->|No| FAIL[Autenticación fallida]
    FAIL --> RT{¿Reintentar?}
    RT -->|Sí| VER
    RT -->|No| FIN([Fin])

    C -->|Sí| OK[Autenticación exitosa · iniciar sesión]
    OK --> INV["Invalidar las demás sesiones activas<br/>cuando cambie la contraseña<br/>(RF-SEG-01-06)"]
    INV --> NODEV["No devolver la contraseña,<br/>ni en claro ni derivada<br/>(RF-SEG-01-04)"]
    NODEV --> SES([Sesión activa para el usuario])
```

> 📌 **Única desviación respecto del `.png`:** la rama **Sí** del original termina en *"No se almacena
> contraseña en el sistema"*. Queda **derogada** por la refactorización de historias de M04: toda
> cuenta tiene contraseña propia obligatoria (RN-SEG-02, `RF-SEG-01-05` corregido). El diagrama
> `.png` sigue mostrando el flujo antiguo y **debe reeditarse**; ver §6.

---

## 2. HU-SEG-02 — Gestión de sesión (máquina de 8 estados del diagrama)

```mermaid
flowchart TD
    A["1 · Autenticar usuario"] --> B["2 · Crear sesión y registrar<br/>fecha/hora de último acceso"]
    B --> C["3 · El usuario realiza una operación"]

    C --> D{"¿Selecciona<br/>Cerrar sesión?"}

    D -->|Sí| E["4.A · Cerrar sesión manualmente<br/>(RF-SEG-02-04)"]
    E --> F["Finalizar sesión<br/>motivo: cierre_manual"]
    F --> L["8 · Límites de sesión configurados<br/>admin 30 min · cliente 30 días<br/>(RF-SEG-02-02)"]

    D -->|No| G{"¿Superó el tiempo<br/>de inactividad?<br/>(RF-SEG-02-02)"}

    G -->|Sí| H["4.B · Sesión expirada:<br/>informar al usuario<br/>(RF-SEG-02-08)"]
    H --> I["4.C · Solicitar autenticación de nuevo<br/>volviendo al destino pretendido<br/>(CA-SEG-02-06)"]

    G -->|No| J{"¿El administrador<br/>invalida la sesión?<br/>(RF-SEG-02-06)"}

    J -->|Sí| K["6.A · Invalidar TODAS las sesiones<br/>cambio_contrasena · cuenta_desactivada ·<br/>permisos_retirados"]
    K --> K2["6.B · Acceso rechazado:<br/>debe autenticarse de nuevo"]

    J -->|No| M["5 · Renovar vigencia:<br/>actualizar último acceso y<br/>reiniciar la inactividad<br/>(RF-SEG-02-03)"]
    M --> C

    N["7 · Sesiones simultáneas en distintos<br/>dispositivos, siempre permitidas<br/>(RF-SEG-02-05)"]
```

### 2.1 Máquina de estados de la Sesión

```mermaid
stateDiagram-v2
    [*] --> activa: Autenticación exitosa
    activa --> activa: Operación del usuario<br/>(renueva la ventana deslizante)
    activa --> expirada: Supera la inactividad<br/>(30 min admin · 30 días cliente)
    activa --> cerrada: Cierre manual del titular
    activa --> revocada: Invalidación en masa
    expirada --> [*]
    cerrada --> [*]
    revocada --> [*]
```

- **`activa`** — única que admite operaciones. Cada petición válida empuja `fecha_ultimo_acceso` y,
  con ella, `fecha_expiracion`.
- **`expirada`** — caducó por inactividad. `motivo_cierre = inactividad`.
- **`cerrada`** — el titular cerró sesión. `motivo_cierre = cierre_manual`.
- **`revocada`** — invalidada por el sistema. `motivo_cierre ∈ {cambio_contrasena,
  cuenta_desactivada, permisos_retirados}`.
- **Transiciones prohibidas:** los tres estados terminales **no vuelven** a `activa`. Reanudar exige
  una sesión nueva (RN-SEG-04, Regla de Oro #3 del SDLC: inmutabilidad de estados terminales).

---

## 3. HU-SEG-03 — Autorización verificada en el servidor

```mermaid
flowchart TD
    INI([Inicio]) --> AUT["Usuario autenticado<br/>Cliente · Empleado · Admin"]
    AUT --> PET["Realiza una petición (operación)"]
    PET --> Q{"¿Viene por<br/>interfaz?"}

    Q -->|Sí| IU["La interfaz oculta las opciones<br/>no permitidas<br/>(USABILIDAD, nunca control)"]
    Q -->|No| API["Petición directa<br/>API / URL manipulada"]

    IU --> VC
    API --> VC["⭐ VALIDADOR CENTRAL<br/>(RNF-SEG-03-01)"]

    VC --> VS["Verificación en servidor:<br/>¿tiene permiso o titularidad?<br/>(RF-SEG-03-01)"]
    VS --> AZ{"¿Autorizado?"}

    AZ -->|Sí| EXE["Operación permitida:<br/>ejecutar lógica"]
    EXE --> FIN([Fin])

    AZ -->|No| REJ["Operación rechazada<br/>(RF-SEG-03-02/03/04)"]
    REJ --> UNI["Respuesta uniforme:<br/>no revela si el recurso existe<br/>(RF-SEG-03-05)"]
    UNI --> LOG["Registro de acceso denegado:<br/>actor, operación, fecha<br/>(RF-SEG-03-07)"]
    LOG --> FIN

    style VC fill:#002855,stroke:#0877E8,color:#ffffff
    style LOG stroke-dasharray: 5 5
```

> 🔌 **El nodo `LOG` está cableado pero su adaptador es no-op en esta entrega** (RN-SEG-15, trazo
> discontinuo). Ambas ramas —interfaz y petición directa— **convergen obligatoriamente en el
> VALIDADOR CENTRAL**: ese es el contrato que hace que una operación nueva quede protegida por
> omisión.

### 3.1 Secuencia técnica de una petición protegida

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant F as Frontend (Next.js 15)
    participant M as Middleware M20 (Auth · Zod · Autorización)
    participant S as Service del módulo
    participant DB as PostgreSQL (Prisma 6)
    participant AP as AuditoriaPort

    U->>F: Ejecuta una acción
    F->>M: Petición HTTP con cookie de sesión (HttpOnly)
    M->>DB: Resuelve sesión por sid y comprueba vigencia
    alt Sesión inexistente, expirada o revocada
        M-->>F: 401 · genérico
        F-->>U: Informa expiración y conserva el destino pretendido
    else Sesión vigente
        M->>DB: Renueva fecha_ultimo_acceso (ventana deslizante)
        M->>DB: Resuelve permisos del actor EN ESTA PETICIÓN
        alt Sin permiso o sin titularidad
            M->>AP: registrarAccesoDenegado(actor, operación, fecha)
            M-->>F: 404 · respuesta uniforme e indistinguible
            F-->>U: Acceso denegado, sesión intacta, vuelve a pantalla permitida
        else Autorizado
            M->>S: Delega al servicio
            S->>DB: Consulta tipada
            S-->>F: 200 · solo los datos necesarios
            F-->>U: Actualiza la vista
        end
    end
```

---

## 4. HU-SEG-05 — Protección de datos personales

```mermaid
flowchart TD
    INI([Usuario accede al sistema]) --> Q{"¿Qué acción<br/>realiza?"}

    Q -->|Registro| R1["Informar qué datos se recogen"]
    R1 --> R2["Informar la finalidad de los datos"]
    R2 --> R3["Mostrar el aviso de privacidad vigente"]
    R3 --> R4["Solicitar consentimiento"]
    R4 --> R5{"¿Consentimiento<br/>aceptado?"}
    R5 -->|No| RNO["❌ No permitir el registro<br/>(CA-SEG-05-01)"]
    R5 -->|Sí| R6["Completar el registro"]
    R6 --> R7["Confirmar la fecha de consentimiento"]
    R7 --> R8["Registrar la VERSIÓN del aviso aceptado<br/>(CA-SEG-05-02)"]
    R8 --> FIN([Fin])

    Q -->|Perfil| P1["Consultar datos personales"]
    P1 --> P2{"¿Qué desea hacer<br/>con sus datos?"}
    P2 -->|Rectificar| P3["Modificar datos"] --> P4["Guardar"] --> FIN
    P2 -->|Suprimir| S1["Registrar la solicitud"]
    S1 --> S2["Confirmar recepción al titular<br/>(CA-SEG-05-04)"]
    S2 --> S3{"¿Tiene órdenes de<br/>venta asociadas?"}
    S3 -->|No| S4["Eliminar datos personales"] --> OPC
    S3 -->|Sí| S5["Identificar la información comercial<br/>que debe guardarse"]
    S5 --> S6["Conservar lo exigido por la ley"]
    S6 --> S7["Desvincular de la identidad<br/>cuando sea posible<br/>(CA-SEG-05-05)"]
    S7 --> OPC["Operación de privacidad completada"]
    OPC --> FIN

    Q -->|Transferencia de datos| T1{"¿Se transfieren a un<br/>proveedor externo?"}
    T1 -->|Sí| T2["Informar al usuario"] --> T3["Mostrar aviso de privacidad"] --> FIN
    T1 -->|No| FIN

    style T1 stroke-dasharray: 5 5
    style T2 stroke-dasharray: 5 5
    style T3 stroke-dasharray: 5 5
```

> 🔌 **La rama de transferencia (trazo discontinuo) queda fuera de alcance** (`RF-SEG-05-08`):
> depende de decisiones legales y de historias bloqueadas de M03. Se transcribe para que el contrato
> quede completo cuando se desbloquee.
>
> La **rama de Registro la ejecuta M04**; M20 entrega los servicios de aviso vigente y consentimiento
> versionado que ese flujo invoca.

---

## 5. HU-SEG-04 — Auditoría *(transcrito y en reserva)*

> 🛑 Historia **aplazada por el Product Owner**. Se deja el contrato transcrito para retomarlo sin
> volver a inspeccionar los `.png`.

### 5.1 Captura (`HU-SEG-04-captura_auditoria.drawio.png`)

```mermaid
flowchart TD
    A([Ocurre una acción auditable]) --> B["Capturar: actor · fecha y hora ·<br/>acción · entidad + su id · resultado<br/>(RF-SEG-04-02)"]
    B --> C{"¿La acción modificó<br/>un dato existente?"}
    C -->|Sí| D["Capturar valor anterior y nuevo<br/>(RF-SEG-04-03)"] --> E
    C -->|No| E["⭐ Excluir datos sensibles:<br/>contraseñas, instrumentos de pago, etc.<br/>(RF-SEG-04-07)"]
    E --> F([Asiento escrito en modo solo adición])
```

> ⭐ **El saneador de datos sensibles está en AMBAS ramas**: se aplica siempre, no solo cuando hay
> valor anterior y nuevo.

### 5.2 Consulta (`HU-SEG-04_consulta_auditoria.drawio.png`)

```mermaid
flowchart TD
    A([Admin / empleado]) --> B["Consultar el registro de auditoría"]
    B --> C{"¿Tiene permiso de<br/>administración?"}
    C -->|No| D["❌ Rechazar acceso<br/>(CA-SEG-04-07)"]
    C -->|Sí| FORK{{" "}}
    FORK --> G1["A · Auditoría general"]
    FORK --> G2["B · Desde la ficha de una entidad"]
    G1 --> F1["Filtrar por actor, entidad,<br/>tipo de acción y rango de fechas<br/>(RF-SEG-04-05)"]
    G2 --> F2["Mostrar el historial de la<br/>entidad seleccionada<br/>(RF-SEG-04-06)"]
    F1 --> EXP["Exportar el registro del<br/>periodo consultado<br/>(RF-SEG-04-09)"]
    F2 --> EXP
```

### 5.3 Inmutabilidad

```mermaid
stateDiagram-v2
    [*] --> escrito: Acción auditable
    escrito --> escrito: Consulta / exportación
    note right of escrito
        RF-SEG-04-04 · RNF-SEG-04-01
        Solo adición. No existe transición
        de modificación ni de borrado,
        ni siquiera para el administrador.
    end note
```

---

## 6. Deuda documental detectada

Los diagramas `.png` son contrato y **dos de ellos contradicen la especificación vigente** tras la
refactorización de historias de M04. No se pueden corregir desde aquí (son imágenes y requieren
reedición en drawio). Se elevan al Director Humano:

| Diagrama | Qué muestra hoy | Qué debería mostrar |
| :--- | :--- | :--- |
| `HU-SEG-01_almacenamiento_seguro_credenciales.png` | La rama Google termina en *"No se almacena contraseña en el sistema"* | Debe exigir contraseña propia antes de finalizar el registro (RN-SEG-02) |
| `M04/registro_sistema.drawio.png` y `M04/login_sistema.drawio.png` | Flujo de registro/login previo a la vinculación con Google | Vinculación sugerida y contraseña obligatoria (`RF-CUE-02-03/04/05`) |

---

## 7. Casos de Uso Extremo a Extremo

### CU-SEG-01 — Registro con Google y doble vía de acceso
1. **Precondición:** aviso de privacidad vigente publicado; Google Identity configurado.
2. El visitante autoriza el acceso con Google; el proveedor confirma.
3. El sistema informa qué datos recoge y su finalidad, muestra el aviso y pide consentimiento.
4. Sin consentimiento, el registro **no** se completa (CA-SEG-05-01).
5. Con consentimiento, el sistema **exige digitar y confirmar una contraseña propia** (CA-SEG-01-06).
6. Se almacena la derivación con sal única; se registran fecha y versión del aviso.
7. **Resultado:** cuenta con dos vías de acceso, consentimiento versionado y sesión activa.

### CU-SEG-02 — Permiso retirado en caliente
1. **Precondición:** empleado con sesión activa en el panel y un permiso concedido.
2. El administrador le retira el permiso.
3. El empleado, sin re-autenticarse, invoca la función.
4. El validador central resuelve los permisos **en esa petición** y no encuentra el permiso.
5. Se emite el evento al `AuditoriaPort` y se responde de forma uniforme.
6. **Resultado:** operación rechazada, **sesión intacta**, el empleado vuelve a una pantalla
   permitida (CA-SEG-03-04, RF-ADM-03-07).

### CU-SEG-03 — Supresión de datos con historial comercial
1. **Precondición:** cliente con órdenes de venta asociadas.
2. El titular solicita la supresión desde su perfil.
3. El sistema registra la solicitud en estado `pendiente` y confirma recepción.
4. Al resolverse, identifica la información comercial de conservación obligatoria.
5. La conserva y **la desvincula de la identidad** del titular.
6. **Resultado:** datos personales suprimidos, obligación legal satisfecha, trazabilidad comercial
   intacta pero anonimizada (CA-SEG-05-05).
