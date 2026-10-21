# 🔄 03_FLUJO_Y_ESTADOS — M17. Administración, Empleados y Permisos

> **Módulo:** `M17` · **Scope:** `m17-permisos`
> **Responsable:** Product Manager Lead (traducción formal) · Software Architect (ratificación en Gate 2)
> 
> ⚠️ **Los diagramas son contratos de flujo obligatorios** (Directiva #5 de `AGENTS.md`).  
> Este documento contiene la transcripción canónica a sintaxis Mermaid de los **5 diagramas `.drawio.png`**
> ubicados en [`docs/assets/diagrams/M17/`](../../../../docs/assets/diagrams/M17/), junto con las máquinas
> de estados que rigen la persistencia del módulo.

---

## 1. HU-ADM-01 — Gestión de cuentas de empleado

Transcripción contractual del flujo de creación, primer acceso, desactivación y reactivación de colaboradores:

```mermaid
flowchart TD
    START([Inicio: Administrador gestiona colaboradores]) --> ACCION{¿Qué acción desea realizar?}

    %% ALTA DE EMPLEADO
    ACCION -->|Crear nuevo empleado| D1[Ingresar datos: Nombre, Documento, Correo, Teléfono]
    D1 --> VAL_DUP{¿Correo ya registrado en Empleados o Clientes?}
    VAL_DUP -->|Sí| ERR_DUP[Rechazar alta: Error de conflicto por unicidad de correo]
    ERR_DUP --> D1
    VAL_DUP -->|No| GEN_CRED[Generar credencial temporal de un solo uso]
    GEN_CRED --> REG_EMP["Crear registro en BD:<br/>Estado: 'activo' (con bandera 'primer_acceso_pendiente')<br/>Permisos asignados: NINGUNO (Default Deny)"]
    REG_EMP --> NOTIF_EMAIL[Despachar credencial inicial efímera por correo al empleado]
    NOTIF_EMAIL --> FIN_ALTA([Fin Alta])

    %% PRIMER ACCESO
    LOGIN_EMP([Empleado ingresa con credencial temporal]) --> CHECK_FIRST{¿Es primer acceso?}
    CHECK_FIRST -->|Sí| FORCE_PWD[Forzar formulario de cambio de contraseña obligatoria]
    FORCE_PWD --> VAL_PWD{¿Contraseña cumple política de complejidad?}
    VAL_PWD -->|No| FORCE_PWD
    VAL_PWD -->|Sí| SAVE_PWD["Derivar con BCrypt (costo ≥ 12)<br/>Actualizar hash y remover bandera de primer acceso"]
    SAVE_PWD --> ACCESO_OK([Sesión administrativa activa: Acceso a su Perfil])

    %% DESACTIVACIÓN DE EMPLEADO
    ACCION -->|Desactivar empleado| SEL_EMP[Seleccionar cuenta de empleado]
    SEL_EMP --> IS_ADMIN{¿Es la cuenta del Administrador?}
    IS_ADMIN -->|Sí| BLK_ADMIN[🛑 BLOQUEO DE SEGURIDAD:<br/>El administrador no puede desactivarse a sí mismo]
    BLK_ADMIN --> SEL_EMP
    IS_ADMIN -->|No| SET_INACT[Marcar estado = 'inactivo' en tabla usuario]
    SET_INACT --> KILL_SESS["Revocar inmediatamente todas las sesiones activas en tabla sesion<br/>(motivo_cierre = 'cuenta_desactivada')"]
    KILL_SESS --> AUD_DESACT[Registrar evento en bitácora de auditoría]
    AUD_DESACT --> FIN_DESACT([Fin Desactivación: Acceso cortado])

    %% REACTIVACIÓN DE EMPLEADO
    ACCION -->|Reactivar empleado| SEL_INACT[Seleccionar empleado inactivo]
    SEL_INACT --> RESTORE_EMP[Marcar estado = 'activo']
    RESTORE_EMP --> RESTORE_PERM[Restablecer permisos que tenía concedidos antes de la baja]
    RESTORE_PERM --> REVIEW_ADMIN[Presentar permisos restablecidos en pantalla para revisión del admin]
    REVIEW_ADMIN --> FIN_REACT([Fin Reactivación])
```

---

## 2. HU-ADM-02 — Asignación individual de permisos

Transcripción contractual del flujo de otorgamiento, dependencias implícitas y revocación en caliente:

```mermaid
flowchart TD
    INICIO([Administrador abre ficha de permisos de un empleado]) --> LOAD_CAT[Cargar catálogo completo de permisos agrupado por área funcional]
    LOAD_CAT --> VIEW_PERMS[Mostrar estado de cada permiso: Concedido / No concedido]
    VIEW_PERMS --> OPERACION{¿Qué modificación realiza?}

    %% CONCESIÓN DE PERMISO
    OPERACION -->|Conceder permiso| CHECK_TIPO{¿Es permiso de operación/edición?}
    CHECK_TIPO -->|Sí| AUTO_VIEW["Conceder automáticamente permiso de consulta del área<br/>(ej. catalogo.editar concede también catalogo.ver)"]
    AUTO_VIEW --> SAVE_ADD[Persistir asignaciones en tabla asignacion_permiso]
    CHECK_TIPO -->|No (solo consulta)| SAVE_ADD
    SAVE_ADD --> AUD_ADD[Registrar en auditoría: Empleado, Permisos otorgados, Admin, Timestamp]
    AUD_ADD --> FIN_MOD([Permisos actualizados en caliente])

    %% REVOCACIÓN DE PERMISO
    OPERACION -->|Retirar permiso| CHECK_DEP{¿Es un permiso de consulta del que dependen otros?}
    CHECK_DEP -->|Sí (tiene operaciones asociadas)| WARN_CASCADE[Mostrar advertencia:<br/>'Retirar este permiso revocará también los permisos de operación del área']
    WARN_CASCADE --> CONFIRM_CASC{¿Administrador confirma?}
    CONFIRM_CASC -->|No| VIEW_PERMS
    CONFIRM_CASC -->|Sí| DEL_CASC[Eliminar permiso de consulta y permisos dependientes asociados]
    DEL_CASC --> SAVE_DEL
    CHECK_DEP -->|No| DEL_SINGLE[Eliminar permiso atómico específico]
    DEL_SINGLE --> SAVE_DEL[Persistir revocaciones en tabla asignacion_permiso]
    SAVE_DEL --> AUD_DEL[Registrar en auditoría: Empleado, Permisos retirados, Admin, Timestamp]
    AUD_DEL --> LIVE_CHECK["Efecto en caliente:<br/>La siguiente petición del empleado es evaluada contra BD<br/>y rechazada de inmediato si requiere el permiso revocado"]
    LIVE_CHECK --> FIN_MOD
```

---

## 3. HU-ADM-03 — Verificación de permisos en servidor (Contrato de Intercepción)

```mermaid
sequenceDiagram
    autonumber
    actor Empleado as Empleado (Cliente HTTP)
    participant Gateway as Servidor Express (Middleware Auth)
    participant SesionRepo as SesionService (M20)
    participant PermisoRepo as PermisosRepository (M17)
    participant Controller as Controlador de Negocio Protegido

    Empleado->>Gateway: Petición HTTP con Cookie de Sesión (sid)
    Gateway->>SesionRepo: Validar vigencia de sesión y titularidad
    alt Sesión inválida, expirada o cerrada
        SesionRepo-->>Gateway: Sesión no válida
        Gateway-->>Empleado: 401 Unauthorized (Sesión inválida)
    else Sesión activa válida
        SesionRepo-->>Gateway: id_usuario, tipo_sesion
        Gateway->>PermisoRepo: Resolver permisos vigentes en caliente (id_usuario)
        PermisoRepo-->>Gateway: Array de permisos concedidos ['catalogo.ver', ...]
        
        alt Usuario es Administrador Raíz
            Gateway->>Controller: Autorización bypass total implícita
            Controller-->>Empleado: 200 OK con datos solicitados
        else Empleado posee el permiso requerido
            Gateway->>Controller: Pasa validación -> Ejecutar operación
            Controller-->>Empleado: 200/201 OK con payload limpio (sin datos sensibles)
        else Empleado NO posee el permiso requerido
            Gateway->>Gateway: Registrar intento no autorizado en auditoría
            Gateway-->>Empleado: 403 Forbidden (Mensaje genérico opaco)
            Note over Empleado: La sesión permanece abierta y redirige a pantalla permitida
        end
    end
```

---

## 4. HU-ADM-04 — Gestión de clientes desde administración

Transcripción contractual de la consulta restringida y desactivación de cuentas cliente:

```mermaid
flowchart TD
    INI_CLI([Colaborador autorizado accede a Clientes]) --> SEARCH[Buscar por Documento, NIT, Correo o Teléfono]
    SEARCH --> RETRIEVE[Recuperar registro del cliente]
    RETRIEVE --> AUD_READ[Registrar acceso a ficha en bitácora de auditoría]
    AUD_READ --> SHOW_CLI[Mostrar Ficha del Cliente]

    SHOW_CLI --> SEC_RESTRICTIONS{Evaluación de restricciones de seguridad}
    SEC_RESTRICTIONS --> R1[Datos personales: Solo lectura. Rectificación reservada al titular]
    SEC_RESTRICTIONS --> R2[Contraseña: Oculta e inaccesible para empleados]
    SEC_RESTRICTIONS --> R3[Instrumentos de pago: Solo últimos 4 dígitos y tipo de medio]

    SHOW_CLI --> VIEW_ORDERS[Consultar historial de Órdenes y Cotizaciones con sus estados]

    SHOW_CLI --> ACCION_CLI{¿Desea desactivar la cuenta del cliente?}
    ACCION_CLI -->|No| FIN_CLI([Fin de consulta])
    ACCION_CLI -->|Sí| CHECK_ROLE{¿El usuario es el Administrador?}
    CHECK_ROLE -->|No| DENY_DESACT[🛑 Acceso denegado: Solo el Administrador puede desactivar clientes]
    CHECK_ROLE -->|Sí| REQ_MOTIVO[Exigir motivo justificado obligatorio]
    REQ_MOTIVO --> HAS_MOTIVO{¿Ingresó motivo válido?}
    HAS_MOTIVO -->|No| REQ_MOTIVO
    HAS_MOTIVO -->|Sí| EXEC_DESACT["Marcar usuario.estado = 'inactivo'<br/>Registrar motivo y autor en auditoría"]
    EXEC_DESACT --> KEEP_ORDERS["Garantía operativa:<br/>Órdenes en curso (confirmadas/en preparación) continúan su despacho normal"]
    KEEP_ORDERS --> FIN_DESACT_CLI([Cliente desactivado])
```

---

## 5. HU-ADM-05 y HU-ADM-06 — Configuración general y Gobernanza del Administrador

### 5.1. Configuración General (`HU-ADM-05`)
```mermaid
flowchart TD
    INI_CONF([Administrador accede a Configuración]) --> LOAD_PAR[Cargar catálogo de parámetros por área]
    LOAD_PAR --> EDIT_PAR[Seleccionar parámetro y editar valor]
    EDIT_PAR --> VAL_RANGO{¿Valor dentro de rango permitido y no nulo?}
    VAL_RANGO -->|No| ERR_RANGO[Rechazar cambio e indicar intervalo válido]
    ERR_RANGO --> EDIT_PAR
    VAL_RANGO -->|Sí| IMPACT{¿Impacto operativo amplio?}
    IMPACT -->|Sí| WARN_CONFIRM[Solicitar confirmación explícita del administrador]
    IMPACT -->|No| SAVE_PAR
    WARN_CONFIRM --> SAVE_PAR["Persistir nuevo valor en BD<br/>Aplicación en caliente sin reinicio de servidor"]
    SAVE_PAR --> AUD_PAR[Auditar: Parámetro, Valor anterior, Valor nuevo, Admin, Timestamp]
    AUD_PAR --> NON_RETRO["Principio de Irretroactividad:<br/>Órdenes cerradas conservan valores fiscales vigentes a su emisión"]
```

### 5.2. Sustitución de la Cuenta de Administrador (`HU-ADM-06`)
```mermaid
flowchart TD
    INI_ADMIN([Administrador solicita sustitución de responsable]) --> INPUT_MAIL[Ingresar nueva dirección de correo electrónico]
    INPUT_MAIL --> VAL_CORREO{¿Correo válido y no duplicado?}
    VAL_CORREO -->|No| INPUT_MAIL
    VAL_CORREO -->|Sí| SEND_LINK[Despachar enlace con token efímero de confirmación al NUEVO correo]
    SEND_LINK --> WAIT_CONFIRM[Estado: En espera de confirmación. El correo antiguo sigue operando]
    
    WAIT_CONFIRM --> CLICK_NEW([Nuevo responsable pulsa enlace de confirmación])
    CLICK_NEW --> VAL_TOKEN{¿Token válido y no expirado?}
    VAL_TOKEN -->|No| LINK_EXP([Enlace caducado: Operación cancelada])
    VAL_TOKEN -->|Sí| APPLY_MAIL["Actualizar correo en tabla usuario<br/>Cerrar todas las sesiones activas del administrador<br/>Despachar alerta de seguridad al correo ANTIGUO"]
    APPLY_MAIL --> FIN_SUBST([Sustitución completada con éxito])
```

---

## 6. Máquinas de Estados Formales de M17

### 6.1. Ciclo de Vida de la Cuenta de Empleado
```mermaid
stateDiagram-v2
    [*] --> PendientePrimerAcceso: Alta por Administrador (Credencial temporal)
    PendientePrimerAcceso --> Activo: Primer inicio de sesión con cambio forzoso de clave
    Activo --> Inactivo: Desactivación por Administrador (Cierre forzoso de sesiones)
    Inactivo --> Activo: Reactivación por Administrador (Restauración de permisos previos)
    Activo --> [*]: Baja lógica permanente (Nunca DELETE físico)
    Inactivo --> [*]: Preservación en auditoría
```

### 6.2. Ciclo de Vida de la Sustitución del Administrador
```mermaid
stateDiagram-v2
    [*] --> AdministradorVigente: Operación normal
    AdministradorVigente --> SolicitudCambioCorreo: Solicitud de nuevo correo desde panel
    SolicitudCambioCorreo --> AdministradorVigente: Cancelación o expiración de token de enlace
    SolicitudCambioCorreo --> CorreoActualizado: Confirmación exitosa en buzón nuevo
    CorreoActualizado --> AdministradorVigente: Invalidación total de sesiones y re-autenticación
```
