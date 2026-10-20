# Matriz de Trazabilidad y Dependencias Transversales - PINTU CLIC

Esta matriz relaciona cada **Historia de Usuario (HU)** funcional con los requisitos de **Seguridad (M20)**, **Permisos (M17)**, **Notificaciones (M18)** y sus correspondientes **Diagramas de Flujo**.

---

## 📌 M04. Cuentas, Autenticación y Perfil (Prefijo: CUE)

| ID Historia | Título / Alcance Resumido | Dependencias Transversales Obligatorias | Diagramas Asociados |
| :--- | :--- | :--- | :--- |
| **HU-CUE-01** | **Registro mediante correo con verificación** (Particular) | • **M20:** [HU-SEG-01](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-01--almacenamiento-seguro-de-credenciales) (Hash con Salt)<br>• **M20:** [HU-SEG-06](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-06--no-exposición-de-datos-sensibles) (No enumeración de correos)<br>• **M18:** [HU-NOT-01](../../01_TRANSVERSALES/M18_NOTIFICACIONES.md) (Envío de código de activación) | `../../assets/diagrams/M04/registro_sistema.png` |
| **HU-CUE-02** | **Registro y acceso mediante Google Identity** | • **M20:** [HU-SEG-02](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-02--gestión-de-sesión) (Generación de sesión/token seguro)<br>• **M20:** [HU-SEG-06](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md) (Tratamiento de claims OAuth) | `../../assets/diagrams/M04/login_sistema.png` |
| **HU-CUE-03** | **Registro de cliente empresa sujeto a aprobación** | • **M20:** [HU-SEG-06](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md) (Precios empresa ocultos hasta aprobación)<br>• **M18:** [HU-NOT-01](../../01_TRANSVERSALES/M18_NOTIFICACIONES.md) (Confirmación de solicitud en revisión) | `../../assets/diagrams/M04/solicitudes_empresa.png` |
| **HU-CUE-04** | **Inicio y cierre de sesión** | • **M20:** [HU-SEG-01](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-01--almacenamiento-seguro-de-credenciales) (Comparación segura de hash)<br>• **M20:** [HU-SEG-02](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-02--gestión-de-sesión) (Control de tiempo de vida y revocación) | `../../assets/diagrams/M04/login_sistema.png` |
| **HU-CUE-05** | **Recuperación de contraseña** | • **M20:** [HU-SEG-06](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md) (Respuesta idéntica exista o no el correo)<br>• **M18:** [HU-NOT-01](../../01_TRANSVERSALES/M18_NOTIFICACIONES.md) (Envío de enlace con token efímero) | `../../assets/diagrams/M04/login_sistema.png` |
| **HU-CUE-06** | **Gestión del perfil** | • **M20:** [HU-SEG-03](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-03--autorización-verificada-en-el-servidor) (El usuario solo puede consultar/editar su propio perfil)<br>• **M20:** [HU-SEG-05](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md) (Protección de datos personales) | `../../assets/diagrams/M04/informacion_perfil.png` |
| **HU-CUE-07** | **Gestión de direcciones del cliente** | • **M20:** [HU-SEG-03](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md) (Validación de pertenencia de dirección en backend) | `../../assets/diagrams/M04/gestion_direcciones.png` |
| **HU-CUE-08** | **Identidad y unicidad de la cuenta** | • **M20:** [HU-SEG-06](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md)<br>• **Política:** [politica_HU-CUE-08_unicidad_cuentas.md](../../01_TRANSVERSALES/POLITICAS/politica_HU-CUE-08_unicidad_cuentas.md) | `../../assets/diagrams/M04/` |
| **HU-CUE-09** | **Verificación y aprobación de cuentas empresa** | • **M17:** [HU-ADM-02 / HU-ADM-03](../../01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md) (Requiere permiso específico de validación)<br>• **M20:** [HU-SEG-04](../../01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md#hu-seg-04--registro-de-auditoría-de-acciones-relevantes) (Auditar quién aprobó/rechazó y cuándo)<br>• **M18:** [HU-NOT-01](../../01_TRANSVERSALES/M18_NOTIFICACIONES.md) (Notificar decisión a la empresa) | `../../assets/diagrams/M04/solicitudes_empresa.png` |

---

## 🛡️ M17. Administración, Empleados y Permisos (Prefijo: ADM)

| ID Historia | Título / Alcance | Relación con M20 (Seguridad y Auditoría) | Diagramas Asociados |
| :--- | :--- | :--- | :--- |
| **HU-ADM-01** | Gestión de cuentas de empleado | Auditado por `HU-SEG-04`. Credenciales protegidas por `HU-SEG-01`. | - |
| **HU-ADM-02** | Asignación individual de permisos (sin roles fijos) | Auditado por `HU-SEG-04` en cada modificación. | `../../assets/diagrams/M17/Diagrama Funcional HU-ADM-02 Asignacion Individual de Permisos.drawio.png` |
| **HU-ADM-03** | Verificación de permisos en el servidor | Complementa directamente a `HU-SEG-03` (Fail-safe defaults en backend).<br>• **Política:** [politica_HU-ADM-03_control_acceso_servidor.md](../../01_TRANSVERSALES/POLITICAS/politica_HU-ADM-03_control_acceso_servidor.md) | - |
| **HU-ADM-04** | Gestión de clientes desde administración | Verificación de permisos de empleado + no exposición innecesaria (`HU-SEG-06`). | - |
| **HU-ADM-05** | Configuración general del sistema | Registro en bitácora de auditoría (`HU-SEG-04`). | - |
| **HU-ADM-06** | Gobernanza de cuenta administradora | Políticas estrictas de recuperación y protección contra bloqueo total. | - |

---

## 📧 M18. Notificaciones y Comunicaciones (Prefijo: NOT)

| ID Historia | Título / Alcance | Consumo de Eventos desde otros módulos | Diagramas Asociados |
| :--- | :--- | :--- | :--- |
| **HU-NOT-01** | Envío de correos transaccionales | Invocado por `M04` (códigos de registro, recuperación) y `M08` (órdenes). | `../../assets/diagrams/M18/HU-NOT-01_Envios de Correos Transaccionales.png` |
| **HU-NOT-02** | Notificación de cambios de estado de orden | Suscrito a eventos de cambio de estado de pedidos (`M08`). | `../../assets/diagrams/M18/HU-NOT-02_cambio_estado_pedido.png` |
| **HU-NOT-03** | Plantillas de comunicación administrables | Protegido por permiso administrativo `M17` y auditado por `M20`. | `../../assets/diagrams/M18/HU-NOT-03_plantillas_comunicacin.png` |
| **HU-NOT-04** | Entregabilidad del correo (DKIM / SPF) | Configuración de infraestructura y seguridad de transporte. | - |

---

## 🔐 M20. Seguridad, Auditoría y Protección de Datos (Prefijo: SEG)

*Este módulo es el núcleo transversal del sistema. Todo código nuevo debe cumplir sus 6 directivas:*

1. **HU-SEG-01:** Almacenamiento seguro de credenciales (Argon2 / BCrypt + Salt).
2. **HU-SEG-02:** Gestión de sesión segura (JWT / Cookies con expiración y revocación).
3. **HU-SEG-03:** Autorización comprobada estrictamente en el servidor en cada endpoint.
4. **HU-SEG-04:** Trazabilidad y logs de auditoría inmutables para acciones sensibles.
5. **HU-SEG-05:** Protección y consentimiento en tratamiento de datos personales.
6. **HU-SEG-06:** Principio de mínima exposición de datos sensibles en respuestas HTTP ([politica_HU-SEG-06_no_exposicion_datos_sensibles.md](../../01_TRANSVERSALES/POLITICAS/politica_HU-SEG-06_no_exposicion_datos_sensibles.md)).
