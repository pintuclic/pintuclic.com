# WALKTHROUGH DE IMPLEMENTACIÓN — CAPA FRONTEND

> 🏷️ **CONVENCIÓN OFICIAL DE NOMENCLATURA:**  
> `docs/walkthroughs/M17/walkthrough_v0.3.0_M17_administracion_empleados_permisos_frontend.md`

---

## 1. METADATOS DE LA IMPLEMENTACIÓN

* **Versión Generada:** `v0.3.0`
* **Módulo de Origen:** `M17 - Administración, Empleados y Permisos`
* **Capa Técnica:** `Frontend (Next.js 15 + React 19 + Tailwind CSS 4 + Zustand + Zod 4)`
* **Fecha de Entrega:** `21/10/2026`
* **Autor / Responsable:** `@alejo` (Director Humano) con asistencia técnica del rol `04_frontend_engineer` (Frontend Lead Engineer)
* **Estado de la Implementación:** `✅ COMPLETO (7 de 7 Historias de Usuario)`

---

## 2. ADAPTACIÓN DEL DISEÑO SEGÚN DIRECTIVA DEL USUARIO

Siguiendo la directiva expresa del Director Humano:
> *"No existe un mockup específico dibujado para M17 (permisos de empleados y gestión de admin), pero sí existen los mockups del panel de administración en [`docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf`](../../../docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf). Se tomó el diseño visual tal cual (sidebar blanco, barra superior, tarjetas KPI, filtros, tablas con badges, paginación y modales con franja arcoíris corporativa), sustituyendo las funcionalidades de catálogo por las 7 funcionalidades del módulo M17."*

### Elementos Visuales Replicados con Fidelidad Milimétrica:
1. **Admin Layout Shell ([`AdminLayout.tsx`](../../../frontend/src/modules/m17-permisos/components/AdminLayout.tsx)):**
   - **Sidebar Blanco Izquierdo:** Logotipo oficial de Pintu Clic con arcoíris institucional, ítems de navegación vertical (`Dashboard`, `Colaboradores`, `Clientes`, `Configuración`, `Gobernanza`). Ítem activo con cápsula azul vibrante (`bg-action text-neutral-white`), e ítems inactivos con hover sutil.
   - **Widget Inferior Promocional:** Tarjeta con fondo azul tenue (`bg-subaction/40`), borde institucional y mensaje de valor de gobernanza.
   - **Barra Superior (Topbar):** Breadcrumbs dinámicos (`Admin > Colaboradores`), campo de búsqueda global, campana de notificaciones con badge rojo numérico (`3`), y cápsula de perfil de usuario (`CA Carlos Álvarez / Administrador`) con menú desplegable hacia gobernanza y configuración.
2. **Tarjetas de Estadísticas KPI ([`AdminStatCard.tsx`](../../../frontend/src/modules/m17-permisos/components/AdminStatCard.tsx)):**
   - 4 a 5 tarjetas por vista con fondo blanco, bordes redondeados (`rounded-card`), sombra oficial (`shadow-card`), ícono tintado superior, número grande en Poppins Bold y subtítulo de tendencia o estado.
3. **Barra de Búsqueda y Filtros:**
   - Campo de búsqueda amplio con ícono de lupa, selector dropdown estilizado por estado o tipo de cuenta, y botón "Limpiar filtros".
4. **Tablas de Datos Administrativas ([`EmpleadosTable.tsx`](../../../frontend/src/modules/m17-permisos/components/empleados/EmpleadosTable.tsx), [`ClientesTable.tsx`](../../../frontend/src/modules/m17-permisos/components/clientes/ClientesTable.tsx)):**
   - Cabecera con fondo gris muy claro (`bg-neutral-lightest`), divisores limpios, avatares con iniciales, badges de estado oficiales (verde para activos, rojo para inactivos/bloqueados), y barra de botones de acción rápida.
5. **Paginación Oficial ([`AdminPagination.tsx`](../../../frontend/src/modules/m17-permisos/components/AdminPagination.tsx)):**
   - Resumen *"Mostrando X a Y de Z elementos"*, botones interactivos `< 1 2 3 >` con página activa en `bg-action`.
6. **Modales con Franja Arcoíris ([`Modal.tsx`](../../../frontend/src/core/components/overlays/Modal.tsx)):**
   - Franja superior decorativa en degradado de marca (`bg-brand-rainbow`), íconos en contenedores redondeados, tarjetas de métricas de impacto (0ms de revocación), avisos informativos de auditoría y checkboxes de confirmación obligatoria previa a acciones críticas (desactivación).

---

## 3. HISTORIAS DE USUARIO CUBIERTAS EN ESTA VERSIÓN

| ID Historia | Título de la Historia de Usuario | Estado | Componentes y Rutas Desarrolladas |
| :--- | :--- | :---: | :--- |
| **HU-ADM-01** | Creación y Gestión de Cuentas de Empleado con Credencial Temporal | **100% Cumplida** | [`CrearEmpleadoModal.tsx`](../../../frontend/src/modules/m17-permisos/components/empleados/CrearEmpleadoModal.tsx)<br>[`EditarEmpleadoModal.tsx`](../../../frontend/src/modules/m17-permisos/components/empleados/EditarEmpleadoModal.tsx)<br>`POST/PATCH /api/v1/admin/empleados` |
| **HU-ADM-02** | Asignación Individual de Permisos (Matriz Atómica) | **100% Cumplida** | [`PermisosModal.tsx`](../../../frontend/src/modules/m17-permisos/components/empleados/PermisosModal.tsx)<br>`GET/PUT /api/v1/admin/empleados/:id/permisos` |
| **HU-ADM-03** | Control de Acceso y Verificación en Servidor | **100% Cumplida** | [`AdminLayout.tsx`](../../../frontend/src/modules/m17-permisos/components/AdminLayout.tsx)<br>Gestión de visibilidad e intercepción 401/403 en cliente |
| **HU-ADM-04** | Desactivación Inmediata de Empleados y Revocación de Sesión | **100% Cumplida** | [`DesactivarEmpleadoModal.tsx`](../../../frontend/src/modules/m17-permisos/components/empleados/DesactivarEmpleadoModal.tsx)<br>`POST /api/v1/admin/empleados/:id/desactivar` |
| **HU-ADM-05** | Visualización y Gestión de Clientes con Motivo Obligatorio | **100% Cumplida** | [`ClientesTable.tsx`](../../../frontend/src/modules/m17-permisos/components/clientes/ClientesTable.tsx)<br>[`FichaClienteModal.tsx`](../../../frontend/src/modules/m17-permisos/components/clientes/FichaClienteModal.tsx)<br>[`DesactivarClienteModal.tsx`](../../../frontend/src/modules/m17-permisos/components/clientes/DesactivarClienteModal.tsx)<br>`GET/POST /api/v1/admin/clientes` |
| **HU-ADM-06** | Configuración Global de Parámetros del Sistema (10 parámetros) | **100% Cumplida** | [`ConfiguracionView.tsx`](../../../frontend/src/modules/m17-permisos/components/configuracion/ConfiguracionView.tsx)<br>`GET/PUT /api/v1/admin/configuracion` |
| **HU-ADM-07** | Gobernanza y Sustitución de Correo Maestro de la Cuenta Administradora | **100% Cumplida** | [`GobernanzaView.tsx`](../../../frontend/src/modules/m17-permisos/components/gobernanza/GobernanzaView.tsx)<br>`POST /api/v1/admin/gobernanza/*` |

---

## 4. RUTAS DEL APP ROUTER DESPLEGADAS

* [`/admin`](../../../frontend/src/app/admin/page.tsx) — **Dashboard General:** Resumen global, métricas operativas, accesos rápidos y estado de cumplimiento normativo.
* [`/admin/empleados`](../../../frontend/src/app/admin/empleados/page.tsx) — **Colaboradores:** Directorio completo, altas con contraseña temporal, edición básica, revocación inmediata y asignación de permisos atómicos.
* [`/admin/clientes`](../../../frontend/src/app/admin/clientes/page.tsx) — **Clientes:** Directorio de compradores (Naturales y Empresas), ficha de pedidos/cotizaciones y suspensión administrativa motivada.
* [`/admin/configuracion`](../../../frontend/src/app/admin/configuracion/page.tsx) — **Configuración Global:** Panel tabulado de los 10 parámetros maestros clasificados en Autenticación, Comunicaciones y Comercial.
* [`/admin/gobernanza`](../../../frontend/src/app/admin/gobernanza/page.tsx) — **Gobernanza:** Flujo de sustitución de correo maestro con token criptográfico de 64 caracteres y reseteo forzoso de contraseña en primer acceso.

---

## 5. REGLAS DE NEGOCIO Y POLÍTICAS TRANSVERSALES VALIDADAS

### A. Reglas de Negocio del Módulo M17
- **Principio de Privilegio Mínimo (HU-ADM-02):** Ausencia total de roles estáticos. Los colaboradores cuentan con permisos individuales atómicos seleccionables checkbox por checkbox.
- **Cascadas de Permisos (ADR-008):** Conceder un permiso operativo (`catalogo.crear`) habilita automáticamente el permiso de consulta base (`catalogo.ver`); revocar el permiso base revoca automáticamente los permisos dependientes.
- **Motivo de Desactivación Obligatorio (HU-ADM-05 / RN-ADM-08):** La suspensión de clientes exige ingresar un motivo justificado de al menos 5 caracteres y confirmación explícita mediante checkbox.
- **Soberanía de Datos de Cliente (RN-ADM-07):** La ficha de cliente es estrictamente de solo lectura; los datos personales solo pueden ser modificados por el titular.
- **Validación de Rangos de Parámetros (HU-ADM-06):** El formulario de configuración verifica en cliente los límites numéricos (`rangoMinimo` y `rangoMaximo`) antes del despacho.
- **Indesactivabilidad del Administrador Maestro (ADR-007):** La cuenta administradora no cuenta con botón ni opción de desactivación en ninguna interfaz.

### B. Políticas Transversales Validadas
- 🔒 **M20 - Credenciales y Hashing (`HU-SEG-01`):** Validación Zod de contraseñas con longitud mínima de 12 caracteres y coincidencia en confirmación.
- 🛡️ **M17 - Control en Servidor (`HU-ADM-03`):** El frontend consume contratos tipados sin confiar en su propia visualización; el backend valida permisos en cada llamada.
- 👁️ **M20 - No Exposición de Datos (`HU-SEG-06`):** La credencial temporal generada se muestra una sola vez en el modal de creación con botón de copiado y nunca se reexpone.
- 🎨 **Directiva #8 - Paleta de Colores Pintuclic:** Cero colores `#hex` inline en clases. 100% de los componentes utilizan tokens semánticos oficiales (`bg-corporate`, `bg-action`, `bg-conversion`, `bg-subaction`, `bg-danger`, `bg-highlight`, `neutral-*`).
- 🧱 **Directiva #13 - Uso Obligatorio del Core Kit:** Toda vista fue construida empleando los componentes base canónicos (`Button`, `Input`, `Checkbox`, `Modal`, `Badge`, `Skeleton`).
- 📐 **Directiva #12 - Arquitectura de DTOs:** Cero esquemas Zod inline en componentes `.tsx`. Todos los esquemas residen en `dtos/` y se integran mediante `react-hook-form` con `zodResolver`.

---

## 6. MÉTRICAS DE CALIDAD Y PRUEBAS AUTOMATIZADAS

| Verificación | Herramienta | Resultado | Observaciones |
| :--- | :--- | :---: | :--- |
| **Tolerancia Cero a `any`** | `check-no-any-frontend.mjs` | ✅ **PASS** | **70 archivos auditados, 0 usos de `any`** |
| **Compilación de Tipos** | `tsc --noEmit` | ✅ **PASS** | **0 errores TypeScript (strict: true)** |
| **Auditoría de Linter** | `next lint --max-warnings=0` | ✅ **PASS** | **0 errores, 0 warnings ESLint** |
| **Pruebas Unitarias Frontend** | `vitest run` | ✅ **PASS** | **7 suites, 38/38 tests pasando (100%)** |
| **Pruebas de Regresión Backend** | `vitest run` (backend) | ✅ **PASS** | **12 suites, 68/68 tests pasando (100%)** |
| **Compilación de Producción** | `next build` | ✅ **PASS** | **Todas las rutas compiladas y prerenderizadas estáticamente** |

---

## 7. REGISTRO DE ARCHIVOS CREADOS Y MODIFICADOS

```text
frontend/src/
├── app/admin/
│   ├── layout.tsx                                      [NUEVO] Layout con AdminLayout
│   ├── page.tsx                                        [NUEVO] Dashboard Overview M17
│   ├── empleados/page.tsx                              [NUEVO] Vista de gestión de colaboradores
│   ├── clientes/page.tsx                               [NUEVO] Vista de directorio de clientes
│   ├── configuracion/page.tsx                          [NUEVO] Vista de configuración de parámetros
│   └── gobernanza/page.tsx                             [NUEVO] Vista de gobernanza de cuenta maestra
└── modules/m17-permisos/
    ├── dtos/
    │   ├── empleados.dto.ts                            [NUEVO] Validaciones Zod 4 para colaboradores
    │   ├── permisos.dto.ts                             [NUEVO] Validaciones Zod 4 para permisos atómicos
    │   ├── clientes-admin.dto.ts                       [NUEVO] Validaciones Zod 4 con motivo obligatorio
    │   ├── configuracion.dto.ts                        [NUEVO] Validaciones Zod 4 para 10 parámetros
    │   ├── gobernanza.dto.ts                           [NUEVO] Validaciones Zod 4 para sustitución de correo
    │   └── index.ts                                    [NUEVO] Barrel export de DTOs
    ├── interfaces/
    │   ├── empleados.interface.ts                      [NUEVO] Tipos TypeScript (cero runtime)
    │   ├── permisos.interface.ts                       [NUEVO] Tipos TypeScript (cero runtime)
    │   ├── clientes-admin.interface.ts                 [NUEVO] Tipos TypeScript (cero runtime)
    │   ├── configuracion.interface.ts                  [NUEVO] Tipos TypeScript (cero runtime)
    │   ├── gobernanza.interface.ts                     [NUEVO] Tipos TypeScript (cero runtime)
    │   └── index.ts                                    [NUEVO] Barrel export de interfaces
    ├── services/
    │   ├── empleados.service.ts                        [NUEVO] Consumo API REST con apiClient
    │   ├── permisos.service.ts                         [NUEVO] Consumo API REST con apiClient
    │   ├── clientes-admin.service.ts                   [NUEVO] Consumo API REST con apiClient
    │   ├── configuracion.service.ts                    [NUEVO] Consumo API REST con apiClient
    │   ├── gobernanza.service.ts                       [NUEVO] Consumo API REST con apiClient
    │   └── index.ts                                    [NUEVO] Barrel export de servicios
    ├── store/
    │   ├── empleadosStore.ts                           [NUEVO] Zustand store reactivo de empleados
    │   ├── clientesStore.ts                            [NUEVO] Zustand store reactivo de clientes
    │   └── configuracionStore.ts                       [NUEVO] Zustand store reactivo de configuración
    ├── components/
    │   ├── AdminLayout.tsx                             [NUEVO] Shell visual oficial con Sidebar y Topbar
    │   ├── AdminStatCard.tsx                           [NUEVO] Componente canónico de KPI
    │   ├── AdminPagination.tsx                         [NUEVO] Componente canónico de paginación
    │   ├── index.ts                                    [NUEVO] Barrel export de componentes
    │   ├── empleados/
    │   │   ├── EmpleadosTable.tsx                      [NUEVO] Tabla completa de colaboradores
    │   │   ├── CrearEmpleadoModal.tsx                  [NUEVO] Modal con credencial temporal generada
    │   │   ├── EditarEmpleadoModal.tsx                 [NUEVO] Modal de edición de datos básicos
    │   │   ├── DesactivarEmpleadoModal.tsx             [NUEVO] Modal de impacto y revocación de sesión
    │   │   └── PermisosModal.tsx                       [NUEVO] Matriz atómica con 20 permisos y cascadas
    │   ├── clientes/
    │   │   ├── ClientesTable.tsx                       [NUEVO] Tabla de clientes
    │   │   ├── FichaClienteModal.tsx                   [NUEVO] Ficha detallada de órdenes y cotizaciones
    │   │   └── DesactivarClienteModal.tsx              [NUEVO] Modal con motivo obligatorio
    │   ├── configuracion/
    │   │   └── ConfiguracionView.tsx                   [NUEVO] Panel tabulado de los 10 parámetros
    │   └── gobernanza/
    │       └── GobernanzaView.tsx                      [NUEVO] Tarjeta de gobernanza y token OTP
    └── tests/
        ├── dtos.test.ts                                [NUEVO] Pruebas unitarias de esquemas Zod (13 tests)
        └── stores.test.ts                              [NUEVO] Pruebas unitarias de stores Zustand (6 tests)
```

---

## 8. DICTAMEN FINAL

* **Pruebas de Calidad Superadas (QA Gate):** `✅ SÍ (38 tests unitarios frontend + 68 backend)`
* **Apego al Diseño Visual del Mockup:** `✅ 100% Coincidente con docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf`
* **Cumplimiento de Directivas de Arquitectura:** `✅ Zero Any, Zero Warnings, Core Kit Only, Zod 4 DTOs`
