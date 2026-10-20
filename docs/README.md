# Documentación Técnica y Funcional - Pintu Clic (v2)

> ⚠️ **Repositorio de nueva generación.** Esta documentación migra desde el proyecto anterior con arquitectura, estándares y especificaciones funcionales preservadas. El código parte desde cero; la documentación es la fuente de la verdad.

Bienvenido al repositorio de documentación centralizada del equipo de desarrollo de **Pintu Clic**.

Esta documentación está organizada bajo una arquitectura modular y transversal, diseñada tanto para lectura del equipo humano como para el consumo directo por **Agentes de Inteligencia Artificial (IA)** durante la fase de codificación.

---

## 📂 Organización de la Documentación

```text
docs/
├── README.md                         <-- Este archivo (índice general)
├── CHANGELOG.md                      <-- Registro histórico de cambios del proyecto
│
├── 00_SISTEMA/                       <-- Gobernanza, arquitectura y plantillas del sistema
│   ├── 01_ARQUITECTURA/              <-- Diseño estructural y dependencias
│   │   ├── RUTA_DEL_PROYECTO.md      <-- 🗺️ RUTA MAESTRA: 21 módulos, 6 olas y grafo de dependencias
│   │   ├── ARQUITECTURA_GENERAL.md   <-- Visión general, actores, mapa de dominios y principios
│   │   ├── ARQUITECTURA_BACKEND.md   <-- Stack oficial: TS, Express 5, Prisma 6, Zod, JWT, BCrypt, SMTP, CORS
│   │   └── MATRIZ_TRAZABILIDAD.md    <-- Mapeo HU <-> Requisitos de Seguridad <-> Diagramas
│   │
│   ├── 02_GUIAS_Y_ESTANDARES/        <-- Normativas de trabajo y contribución
│   │   ├── GUIA_GIT_COMMITS_Y_PUSH.md        <-- Convención de Conventional Commits y flujo de push
│   │   ├── GUIA_VERSIONADO_Y_WALKTHROUGHS.md <-- Protocolo de versionado semántico y walkthroughs
│   │   └── ESTANDAR_Y_GUIA_INCORPORACION.md  <-- Guía para agregar o refactorizar módulos
│   │
│   └── 03_PLANTILLAS_Y_CHECKLISTS/   <-- Formatos de entrega y control de calidad
│       ├── CHECKLIST_CIERRE_MODULOS.md       <-- Checklist de validación de Definition of Done
│       ├── PLANTILLA_WALKTHROUGH_IMPLEMENTACION.md / .docx <-- Plantilla de entrega post-implementación
│       └── PLANTILLA_REPORTE_QA_MODULO.md / .docx          <-- Plantilla estándar de pruebas QA
│
├── 01_TRANSVERSALES/                 <-- Capa de políticas globales (aplican a todo el sistema)
│   ├── M20_SEGURIDAD_Y_AUDITORIA.md  <-- Cifrado, sesiones, autorización y protección de datos
│   ├── M17_PERMISOS_Y_ROLES.md       <-- Modelo de permisos granulares por empleado
│   ├── M18_NOTIFICACIONES.md         <-- Sistema de eventos y correos transaccionales
│   └── POLITICAS/                    <-- Políticas transversales (Unicidad, Control Servidor, Datos Sensibles)
│
├── 02_MODULOS_FUNCIONALES/           <-- Especificación funcional detallada por módulo
│   ├── M04_CUENTAS_AUTH_PERFIL.md    <-- Registro, login B2C/B2B, perfil, direcciones y aprobación
│   └── ...                           <-- Futuros módulos funcionales (M07, M08, M12...)
│
├── walkthroughs/                     <-- Entregables y walkthroughs de implementación por módulo
│   └── M20/
│
├── reviews/                          <-- Auditorías técnicas y revisiones de código del Tech Lead
│   ├── README.md                     <-- Normativa, criterios de evaluación y dictámenes
│   ├── backend/                      <-- Revisiones de arquitectura en módulos Backend
│   └── frontend/                     <-- Revisiones de componentes en Frontend
│
└── assets/                           <-- Recursos visuales y diagramas
    ├── diagrams/                     <-- Diagramas en formato imagen (PNG/SVG) organizados por módulo
    │   ├── M04/
    │   ├── M17/
    │   ├── M18/
    │   └── M20/
    └── raw_drawio/                   <-- Archivos originales editables de Diagrams.net (.drawio)
```

---

## 🚀 Guías de Inicio Rápido

- **Si eres nuevo en el proyecto:** Empieza por la [Ruta del Proyecto](./00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md) para entender los 21 módulos, las 6 olas de construcción y cómo encaja tu trabajo en el grafo de dependencias.
- **Si eres un desarrollador del equipo:** Tras la ruta, consulta la [Matriz de Trazabilidad](./00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md) para ver el alcance de tu módulo y las políticas de seguridad asociadas.
- **Si eres un Agente de IA (Copilot / Assistant):** Consulta obligatoriamente [AGENTS.md](../AGENTS.md) en la raíz del proyecto antes de proponer cambios de código o generar nuevos módulos. La lectura íntegra de la [Ruta del Proyecto](./00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md) es obligatoria y previa a cualquier implementación.