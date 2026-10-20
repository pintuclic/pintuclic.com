# Protocolo y Guía de Desarrollo para Agentes de IA - PINTU CLIC

> ## 🚦 PUNTO DE ENTRADA OBLIGATORIO — METODOLOGÍA SDLC MULTIAGENTE
>
> Este proyecto está gobernado por la metodología **SDLC Multiagente Guiado por Artefactos y Compuertas de Calidad (Stage-Gates)**.
> **Antes de escribir una sola línea de código**, todo agente IA DEBE leer en este orden:
>
> 1. **[`.sdlc/AGENTS.md`](.sdlc/AGENTS.md)** — Manual rector de la metodología: roles, Stage-Gates, 11 Reglas de Oro inviolables y protocolo de aterrizaje.
> 2. **[`.sdlc/PINTUCLIC_CONTEXT.md`](.sdlc/PINTUCLIC_CONTEXT.md)** — Stack confirmado, mapa de fuentes de verdad y estado de los 8 módulos.
> 3. **[`.sdlc/.workflow/current_state.json`](.sdlc/.workflow/current_state.json)** — Fase activa y rol en turno.
> 4. **[`.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md`](.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md)** — Semáforo de módulos.
>
> **El flujo de trabajo de este archivo (pasos 1–10) se ejecuta DENTRO de los Stage-Gates del SDLC.**
> El SDLC define CUÁNDO puedes codificar. Este archivo define CÓMO codificar.
>
> **Stack confirmado (NO proponer alternativas sin RFC aprobado):**
> - Backend: `Express 5` + `Prisma 6` + `Zod 4` + `Vitest 3` + `JWT` + `bcrypt` + `nodemailer`
> - Frontend: `Next.js 15` + `React 19` + `Tailwind CSS 4` + `Zustand 5` + `React Hook Form` + `Axios`

---

Bienvenido. Este repositorio contiene la especificación funcional, técnica, diagramas y políticas de negocio de la plataforma **Pintu Clic**.

Como agente de IA responsable de implementar código, pruebas o arquitectura para este sistema, **debes seguir estrictamente el siguiente flujo de trabajo**.

> ⛔ **DIRECTIVAS CRÍTICAS DE ALCANCE Y CONCURRENCIA (PRODUCT OWNER):**
> 1. **Aislamiento Estricto de Módulo:** Está terminantemente PROHIBIDO modificar o eliminar archivos, rutas o controladores existentes que pertenezcan a otros módulos o que estén siendo desarrollados por otros equipos. Tu código debe vivir exclusivamente dentro del módulo asignado.
> 2. **Lectura Obligatoria de Estructura de Carpetas (`backend/infraestructura.md` y `frontend/infraestructura.md`) y Nomenclatura por Código de Módulo:** Antes de crear o editar cualquier archivo de código, el agente DEBE leer la documentación de infraestructura del backend y frontend en la raíz del proyecto para ubicar los archivos respetando con precisión la estructura global definida para toda la organización. Las carpetas dentro de `src/modules/` en backend y frontend deben nombrarse obligatoriamente con el estándar `m[xx]-[nombre-modulo]` en minúsculas y kebab-case (ej: `m20-seguridad`, `m17-permisos`, `m18-notificaciones`, `m04-cuentas`).
> 3. **Protocolo de Parada e Informe de Inconsistencias:** Si para completar una HU consideras necesario modificar un archivo compartido o externo a tu módulo, **DEBES DETENER LA EJECUCIÓN INMEDIATAMENTE**, no realizar ningún cambio y presentar un reporte detallado al equipo humano explicando la inconsistencia o necesidad técnica. Solo podrás continuar tras recibir aprobación explícita.
> 4. **Objetivo 100% Funcional:** No reconstruyas la arquitectura global del backend ni del frontend. Concéntrate en cumplir al 100% los Criterios de Aceptación (CA) y Requisitos Funcionales (RF) de cada Historia de Usuario usando el stack tecnológico aprobado.
> 5. **Los Diagramas son Contratos de Flujo Obligatorios:** Los diagramas han sido diseñados y consensuados por todo el equipo de ingeniería. No son meras ilustraciones: **definen la máquina de estados, ramificaciones condicionales, secuencias de llamadas y manejo de errores exactos** que tu código debe respetar.
> 6. **Walkthrough en CADA Implementación:** Tras CUALQUIER cambio o implementación de código, es MANDATORIO generar el Walkthrough de Implementación correspondiente en `docs/walkthroughs/M[XX]/` según la [guía de walkthroughs](./docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md).
> 7. **Convención de Commits y Push Controlado:** Los commits deben crearse usando el estándar Conventional Commits (`tipo(modulo): descripcion`, ej: `feat(M04): implementar registro`), verificando que TypeScript compile limpio y haciendo push únicamente a la rama asignada ([docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md](./docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md)).
> 8. **Paleta de Colores Obligatoria de Diseño (Design System Pintuclic):** Queda TERMINANTEMENTE PROHIBIDO para cualquier desarrollador o Agente de IA utilizar colores arbitrarios (ej. `bg-[#002855]`, `text-purple-600`, colores hexadecimales inline o clases estándar de Tailwind no aprobadas). Todo componente visual DEBE construirse exclusivamente con los tokens de color oficiales definidos en `frontend/src/core/theme/colors.ts` y documentados en `frontend/src/core/theme/GUIA_COLORES.md` (`corporate`, `action`, `subaction`, `conversion`, `highlight`, `neutral-*`).
> 9. **Exclusividad del Sistema de Reviews (Solo Líderes Técnicos):** Queda TERMINANTEMENTE PROHIBIDO para desarrolladores o Agentes de IA que actúen como implementadores crear, editar o alterar archivos dentro de `docs/reviews/`. La auditoría técnica, evaluación de código y emisión de dictámenes es potestad y responsabilidad EXCLUSIVA del Líder Técnico (Tech Lead). Si no estás desempeñando explícitamente el rol de Líder Técnico, **NO HAGAS REVIEWS**; tu entregable como implementador finaliza estrictamente en el Walkthrough (`docs/walkthroughs/`) y el commit/push correspondiente.
> 10. **Origen Único de Datos y Prohibición de Auto-Siembra en Código (Seed Centralizado):** Queda TERMINANTEMENTE PROHIBIDO para cualquier desarrollador o Agente de IA hardcodear arrays de datos iniciales en TypeScript o crear funciones en Express/TypeScript que inserten datos, catálogos o mocks en la base de datos al arrancar el servidor (ej: funciones tipo `sembrarPermisos()`, `initData()`, auto-inserts al importar routers, etc.). Todo dato inicial, catálogo maestro o mock para pruebas DEBE residir exclusivamente en `bd/sql/seed_pintuclic.sql` y gestionarse mediante `npm run db:seed` de acuerdo con [`bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md`](./bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md). Los repositorios y servicios deben limitarse estrictamente a consultar y operar sobre PostgreSQL sin auto-inyectar datos en runtime. Las carpetas `interfaces/` deben contener exclusivamente tipos (`interface`, `type`), con cero runtime y cero datos.
> 11. **Ejecución Obligatoria de ESLint y TypeScript en Backend (`Zero Warnings / Zero Errors`):** Todo agente de IA o desarrollador que cree, modifique o refactorice código en `backend/` DEBE ejecutar obligatoriamente `npm run lint` (ESLint) y `npx tsc --noEmit` en la raíz del backend antes de dar por finalizada la tarea o realizar cualquier commit. El código debe pasar con **0 errores y 0 advertencias** (incluyendo prohibición absoluta de `any` y variables sin uso).
> 12. **Arquitectura de DTOs en Frontend y Prohibición de Validaciones Inline:** Queda TERMINANTEMENTE PROHIBIDO para cualquier desarrollador o Agente de IA declarar esquemas Zod o DTOs inline dentro de componentes o páginas React/Next.js (`.tsx`). Todo esquema de validación debe residir en archivos dedicados dentro de carpetas `dtos/`: los DTOs globales (seguridad, contraseñas M20, campos universales) en `frontend/src/core/dtos/`, y los DTOs de formularios o casos de uso específicos en `frontend/src/modules/m[xx]-[nombre]/dtos/`. Los formularios deben usar `react-hook-form` con `zodResolver`. Las carpetas `interfaces/` se reservan exclusivamente para tipos TypeScript estáticos sin código ejecutable (cero runtime).

---

## 🧭 Flujo de Trabajo Obligatorio para Implementar Cualquier Tarea / HU

```mermaid
graph TD
    A[Requerimiento / HU Solicitada] --> B[1. Consultar docs/00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md]
    B --> C[2. Leer Especificación en docs/02_MODULOS_FUNCIONALES]
    C --> D[3. Inspección OBLIGATORIA de Diagramas en docs/assets/diagrams/]
    D --> E[4. Leer Políticas Transversales en docs/01_TRANSVERSALES]
    E --> F[5. Leer backend/infraestructura.md y frontend/infraestructura.md]
    F --> G{¿Requiere tocar archivos de otros equipos?}
    G -- Sí --> H[🛑 PARAR Y REPORTAR AL EQUIPO]
    G -- No --> I[6. Diseñar e Implementar Código en el Módulo Asignado]
    I --> J[7. Validar Criterios de Aceptación y Diagrama]
    J --> K[8. Checklist de Políticas Globales docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md]
    K --> L[9. Generar Walkthrough Oficial]
    L --> M[10. Commit Semántico y Push a la Rama Asignada]
```

### Paso 1: Localización y Mapeo de Dependencias
- Identifica el código de la Historia de Usuario (ejemplo: `HU-CUE-01`, `HU-ADM-02`, etc.).
- Abre [docs/00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md](./docs/00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md) para determinar qué módulos transversales (`M20 Seguridad`, `M17 Permisos`, `M18 Notificaciones`) y qué **diagramas** aplican a esa historia.

### Paso 2: Lectura de la Especificación Funcional
- Abre el archivo correspondiente en `docs/02_MODULOS_FUNCIONALES/` (por ejemplo, [docs/02_MODULOS_FUNCIONALES/M04_CUENTAS_AUTH_PERFIL.md](./docs/02_MODULOS_FUNCIONALES/M04_CUENTAS_AUTH_PERFIL.md)).
- Lee los **Requisitos Funcionales (RF)**, **Requisitos No Funcionales (RNF)** y los **Criterios de Aceptación (CA)**.

### Paso 3: Inspección OBLIGATORIA de Diagramas (Contrato de Flujo del Equipo)
Antes de escribir una sola línea de código, **debes abrir y analizar visualmente el diagrama asociado** en `docs/assets/diagrams/M[XX]/`:
- **Árboles de Decisión y Bifurcaciones:** Revisa qué condiciones de validación (`if / else`) están diagramadas. Cada rama del diagrama debe tener su correspondiente lógica en el código.
- **Transición de Estados:** Si el diagrama define estados (ej: `Pendiente -> Aprobado -> Rechazado`), el código debe implementar exactamente esos nombres y transiciones.
- **Rutas de Error y Cancelación:** Presta especial atención a los caminos alternativos (qué pasa si el código de verificación expiró, qué pasa si el NIT ya existe, etc.).
- **Secuencia de Llamadas:** Respeta el orden de ejecución (ej: primero validar con Zod -> luego verificar existencia en BD -> luego generar hash BCrypt -> luego emitir evento SMTP).

### Paso 4: Cumplimiento de Políticas Transversales (¡Crítico!)
- **M20 - Seguridad y Auditoría ([docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md](./docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md)):**
  - **Credenciales (`HU-SEG-01`):** Nunca guardar ni comparar contraseñas en texto claro. Usar funciones de hash seguras con salt (BCrypt con costo 12).
  - **Sesiones y Tokens (`HU-SEG-02`):** Validar tiempos de expiración y manejo de tokens/cookies seguras (`HttpOnly`, `SameSite`, `Secure`).
  - **Autorización en Servidor (`HU-SEG-03`):** NUNCA confiar únicamente en la validación del frontend. Cada endpoint debe validar identidad y autorización en backend.
  - **Auditoría (`HU-SEG-04`):** Registrar eventos críticos (cambios de permisos, accesos administrativos, aprobaciones de empresas) con timestamp, actor y acción.
  - **Datos Sensibles (`HU-SEG-06`):** No retornar contraseñas, hashes ni datos sensibles en las respuestas JSON.
- **M17 - Permisos y Administración ([docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md](./docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md)):**
  - El sistema utiliza **permisos individuales por empleado** (sin roles predefinidos fijos). Comprobar el permiso específico en tiempo real ante cada operación (`HU-ADM-03`).
- **M18 - Notificaciones ([docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md](./docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md)):**
  - Para flujos que involucren códigos de verificación o confirmaciones, consumir la capa de eventos/notificaciones desacoplada por SMTP.

### Paso 5: Lectura Obligatoria de Estructura de Carpetas (`backend/` y `frontend/`) y Nomenclatura por Código
Antes de crear o modificar cualquier archivo de código:
- **Backend:** Lee el archivo [`backend/ARQUITECTURA.md`](./backend/ARQUITECTURA.md) para entender la estructura modular, capas (controllers / services / repositories / dtos / interfaces / __tests__) y convenciones del backend. Stack: Express 5 + Prisma 6 + Zod 4 + Vitest 3.
- **Frontend:** Lee el archivo [`frontend/ARQUITECTURA.md`](./frontend/ARQUITECTURA.md) para entender la estructura del proyecto Next.js 15. Los DTOs transversales compartidos van en `src/core/dtos/`. Prohibido declarar esquemas Zod inline en componentes `.tsx`. Usar `react-hook-form` + `zodResolver` para formularios.
- **Paleta de Colores de Diseño:** En componentes frontend, usar estrictamente los tokens de color del Design System Pintuclic (`corporate`, `action`, `subaction`, `conversion`, `highlight`, `neutral-*`) declarados en `frontend/src/core/theme/colors.ts`. Prohibido inventar colores arbitrarios o clases `bg-[#...]`.
- **Nomenclatura Obligatoria de Carpetas de Módulo:** Toda carpeta creada dentro de `src/modules/` (tanto en `backend/` como en `frontend/`) DEBE seguir estrictamente la convención de código de módulo en minúsculas y nombre en kebab-case: `m[xx]-[nombre-modulo]` (ejemplos: `m20-seguridad`, `m17-permisos`, `m18-notificaciones`, `m04-cuentas`, `m02-productos`, `m07-carrito`, `m08-ordenes`).
- **Límites de Módulo:** Asegúrate de que todos los archivos nuevos se ubiquen dentro de la carpeta asignada a tu módulo, sin tocar archivos de otros equipos ni carpetas ajenas.

### Paso 6: Stack Backend Obligatorio y Reglas de Arquitectura
Todo código del backend generado para cualquier módulo DEBE ceñirse estrictamente al stack definido en [docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_BACKEND.md](./docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_BACKEND.md):
- **Lenguaje:** TypeScript estricto (`strict: true`, sin tipos `any`).
- **Framework HTTP:** Express.js estructurado en controladores y servicios dentro del módulo asignado.
- **Acceso y Tipado de Base de Datos:** **Prisma 6** con tipado fuerte. El schema canónico vive en `backend/prisma/schema.prisma` y es la única fuente de la verdad del modelo de datos. Todo repositorio debe usar `PrismaClient` y los tipos generados por Prisma (`Prisma.XxxGetPayload`, `Prisma.XxxCreateInput`, etc.) para retornos y parámetros. Prohibido terminantemente el uso de `any` o queries SQL en texto plano sin tipar. Toda consulta compleja usa `prisma.$queryRaw` con `Prisma.sql` (tagged template, nunca concatenación). Ver schema en `backend/prisma/schema.prisma` y DDL de referencia en `bd/sql/schema_pintuclic.sql`.
- **Validación de Entradas (DTOs):** **Zod** para validar `req.body`, `req.query`, `req.params`.
- **Autenticación y Sesiones:** **JWT** con tiempos de vida cortos y rotación segura.
- **Hashing de Contraseñas:** **BCrypt** con costo de sal mínimo de 12 (`HU-SEG-01`).
- **Comunicaciones:** **SMTP** estructurado en el módulo `M18` para notificaciones y códigos transaccionales.
- **Seguridad HTTP:** **CORS** restrictivo y cabeceras seguras.
- **Origen Centralizado de Datos y Prohibición de Auto-Siembra:** Todo dato inicial, mock o catálogo maestro del sistema reside exclusivamente en `bd/sql/seed_pintuclic.sql` y se gestiona mediante `npm run db:seed` ([`bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md`](./bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md)). Prohibido terminantemente hardcodear arrays de catálogo o crear funciones de auto-siembra en Express (`sembrarPermisos`, etc.). Las carpetas `interfaces/` deben contener única y exclusivamente contratos de compilación (`interface`, `type`), con cero runtime y cero datos.

### Paso 7: Validación de Criterios de Aceptación y Casos Borde
- Valida que cada HU cumpla tanto sus Criterios de Aceptación escritos (Gherkin) como los caminos de error trazados en el diagrama.

### Paso 8: Validación de Políticas Globales de Cierre (Definition of Done)
Antes de declarar el módulo finalizado, **DEBES comprobar el cumplimiento de las 3 políticas de integridad** definidas en [docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md](./docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md):
1. **Unicidad de Cuentas (`HU-CUE-08`):** [docs/01_TRANSVERSALES/POLITICAS/politica_HU-CUE-08_unicidad_cuentas.md](./docs/01_TRANSVERSALES/POLITICAS/politica_HU-CUE-08_unicidad_cuentas.md).
2. **Control de Acceso en Servidor (`HU-ADM-03`):** [docs/01_TRANSVERSALES/POLITICAS/politica_HU-ADM-03_control_acceso_servidor.md](./docs/01_TRANSVERSALES/POLITICAS/politica_HU-ADM-03_control_acceso_servidor.md).
3. **No Exposición de Datos Sensibles (`HU-SEG-06`):** [docs/01_TRANSVERSALES/POLITICAS/politica_HU-SEG-06_no_exposicion_datos_sensibles.md](./docs/01_TRANSVERSALES/POLITICAS/politica_HU-SEG-06_no_exposicion_datos_sensibles.md).

### Paso 9: Walkthrough de Implementación
Al completar la implementación, **DEBES SI O SI**:
1. **Generar el Walkthrough de Implementación:** Crear el documento formal usando la estructura de [docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_WALKTHROUGH_IMPLEMENTACION.md](./docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_WALKTHROUGH_IMPLEMENTACION.md), guardándolo en `docs/walkthroughs/M[XX]/` con el **sufijo obligatorio de capa al final del nombre**: `walkthrough_v[X.Y.Z.W]_[MXX]_[descripcion]_[backend|frontend].md`, detallando:
   - Módulo de origen y HUs completadas.
   - Reglas de negocio y políticas transversales validadas.
   - Criterios de Aceptación verificados.
   - **Resumen conceptual de dependencias externas** (qué necesita este código de otros módulos para operar al 100% en producción y a quién habilita).
   - Lista de archivos creados/modificados dentro del módulo asignado.
2. **Autoría real:** el campo **Autor / Responsable** del walkthrough debe registrar a la persona real de la entrega con su `@usuario`; si un agente de IA asistió, se documenta como apoyo, nunca como autor.

### Paso 10: Actualización de Versión, Commits y Push al Repositorio

> 🔗 **Antes de hacer commit**, actualiza también:
> - `.sdlc/multiAgents/[tu_agente]/WORKLOG.md` con el resumen de lo realizado
> - `.sdlc/.workflow/current_state.json` si cambiaste de fase o completaste un Gate
> - `.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md` si el módulo avanzó de estado
>
> El protocolo de commit canónico del SDLC es: `[vX.Y.Z] tipo(scope): descripcion`
> Ver: [`.sdlc/multiAgents/protocols/GIT_COMMIT_CONVENTION.md`](.sdlc/multiAgents/protocols/GIT_COMMIT_CONVENTION.md)
> y [`.sdlc/multiAgents/protocols/SEMVER_CHANGELOG_PROTOCOL.md`](.sdlc/multiAgents/protocols/SEMVER_CHANGELOG_PROTOCOL.md)

Siguiendo el esquema de [CONTRIBUTING.md](CONTRIBUTING.md) y la [Guía de Commits y Push](./docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md):
1. **Versión Obligatoria en el Título de la PR:** declarar la versión con el formato `tipo(scope) [X.Y.Z.W]: mensaje` (ver [CONTRIBUTING.md](CONTRIBUTING.md)), dejar `.github/version.txt` con ese mismo número y agregar en [docs/CHANGELOG.md](./docs/CHANGELOG.md) la entrada `## [vX.Y.Z.W] - AAAA-MM-DD` con la línea `- **Autor:** Nombre (@usuario)` (la persona real que realiza la entrega, nunca la IA). El workflow `PR Title Lint` bloquea el merge si el formato, el siguiente paso de la tabla, el archivo, la fecha o el autor no coinciden. El tag y el Release se publican automáticamente al fusionar hacia `main` o `develop` mediante `.github/workflows/version.yml`.
2. **Verificación Previa Obligatoria:** Comprobar que TypeScript compila sin errores (`npx tsc --noEmit`), que ESLint no arroja errores ni advertencias (`npm run lint`), que las pruebas unitarias pasan al 100% y que solo se modificaron archivos del módulo asignado.
3. **Formato del Commit:** Crear commits atómicos utilizando el estándar Conventional Commits (`tipo(modulo): descripcion`, ej: `feat(M04): implementar registro con verificacion HU-CUE-01` o `fix(M04): corregir expiracion de tokens`).
4. **Push Seguro:** Ejecutar `git push origin <rama_asignada>` únicamente sobre la rama de trabajo correspondiente. Nunca hacer push forzado (`--force`) sobre ramas compartidas.

---

## 📂 Índice del Repositorio y Documentación

- [docs/CHANGELOG.md](./docs/CHANGELOG.md): Registro central de versiones del proyecto.
- [docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_GENERAL.md](./docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_GENERAL.md): Resumen de dominios, actores, módulos y dependencias globales.
- [docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_BACKEND.md](./docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_BACKEND.md): Stack oficial, directivas de aislamiento y protocolo de parada.
- [docs/00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md](./docs/00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md): Mapeo directo entre Historias de Usuario, Transversales y Diagramas.
- [docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md](./docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md): Convención de Conventional Commits y protocolo de push.
- [docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md](./docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md): Protocolo de Walkthroughs de implementación.
- [docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/ESTANDAR_Y_GUIA_INCORPORACION.md](./docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/ESTANDAR_Y_GUIA_INCORPORACION.md): Normativa para incorporar o refactorizar módulos futuros.
- [docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md](./docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md): Validación obligatoria de políticas globales antes de cerrar un módulo.
- [docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_WALKTHROUGH_IMPLEMENTACION.md](./docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_WALKTHROUGH_IMPLEMENTACION.md): Plantilla oficial de entrega post-implementación (.md y .docx).
- [docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_REPORTE_QA_MODULO.md](./docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_REPORTE_QA_MODULO.md): Plantilla estándar de informe de pruebas de calidad QA (.md y .docx).
- [docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md](./docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md): Especificación detallada de seguridad, sesiones y datos sensibles.
- [docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md](./docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md): Modelo de permisos granulares por empleado.
- [docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md](./docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md): Servicios de correo y notificaciones transaccionales.
- [docs/01_TRANSVERSALES/POLITICAS/](./docs/01_TRANSVERSALES/POLITICAS/): Políticas transversales de unicidad, control de servidor y datos sensibles.
- [docs/02_MODULOS_FUNCIONALES/M04_CUENTAS_AUTH_PERFIL.md](./docs/02_MODULOS_FUNCIONALES/M04_CUENTAS_AUTH_PERFIL.md): Cuentas particulares y empresas, login, registro, perfiles y direcciones.
- [bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md](./bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md): Protocolo de mocks y datos de prueba centralizados (31 tablas) para testing local y desarrollo de módulos.
- `docs/assets/diagrams/`: Diagramas de arquitectura, flujo funcional y secuencia por módulo.


### Version
- El esquema oficial de versiones es el de [CONTRIBUTING.md](CONTRIBUTING.md), de cuatro segmentos (`Mayor`, `Minior estable`, `Minior-feat`, `Patch`).
- En CADA entrega, el agente de IA DEBE declarar la versión en el título de la PR (`tipo(scope) [X.Y.Z.W]: mensaje`), dejar `.github/version.txt` con ese mismo número y agregar en [docs/CHANGELOG.md](./docs/CHANGELOG.md) la entrada `## [vX.Y.Z.W] - AAAA-MM-DD` con la línea `- **Autor:** Nombre (@usuario)`.
- El **autor registrado es la persona real** que realiza/publica la entrega (el humano responsable), con su `@usuario` de GitHub. Queda **prohibido** registrarse como `Agente de IA` o mencionar a la IA en el CHANGELOG.
- El workflow `PR Title Lint` bloquea la PR si el formato, el siguiente paso de la tabla, `.github/version.txt`, la fecha o el autor no coinciden.
- El tag y el Release se publican automáticamente cuando la PR se fusiona hacia `main` o `develop` mediante `.github/workflows/version.yml`; está prohibido crearlos a mano.
- La versión del proyecto vive únicamente en `.github/version.txt`; no se duplica en otros archivos de código.
