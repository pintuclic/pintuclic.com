# 🗄️ Módulo de Base de Datos - PINTUCLIC

Bienvenido al directorio de base de datos de la plataforma **PINTUCLIC**.
Este módulo centraliza los scripts de definición de datos (DDL), documentación técnica, walkthroughs evolutivos y diagramas de arquitectura.

---

## 📂 Estructura de Carpetas

```text
bd/
├── README.md                      # Este archivo (guía general y mapa del módulo)
│
├── sql/                           # Scripts DDL ejecutables en PostgreSQL
│   ├── schema_pintuclic.sql       # Script DDL oficial vigente (PostgreSQL 15+ / 18, 49 tablas)
│   ├── seed_pintuclic.sql         # Script de carga inicial de mocks idempotentes
│   └── demo/                      # Scripts opcionales de demostración (no se corren en initdb)
│       ├── datos_demo_catalogo.sql# Datos de DEMOSTRACIÓN del catálogo (aditivo e idempotente; lo genera script/datos-demo)
│       └── retirar_datos_demo.sql # Deshace datos_demo_catalogo.sql
│
├── docs/                          # Documentación viva, manuales y walkthroughs
│   ├── DOCUMENTACION_BASE_DATOS.md# Especificación activa, ER Mermaid, diccionarios y changelog
│   ├── WALKTHROUGH_DATABASE.md    # Registro cronológico detallado de cada migración y cambio
│   ├── GUIA_REFACTORIZACION_BD.md # Guía, protocolo y plantilla oficial para IAs y desarrolladores
│   └── GUIA_DATOS_DEMO.md         # Cómo cargar (y retirar) los datos de demostración en un servidor
│
└── assets/                        # Recursos visuales y diagramas fuente
    ├── ER Pintuclic-Final 1.2.drawio.png # Imagen de referencia del diagrama Entidad-Relación
    └── ER Pintuclic.drawio.xml           # Archivo fuente XML/Draw.io editable
```

---

## 🚀 Acceso Rápido a Recursos Clave

- 📄 **Script SQL Oficial:** [`sql/schema_pintuclic.sql`](./sql/schema_pintuclic.sql)*DDL idempotente para PostgreSQL con 53 tablas y 21 tipos `ENUM` nativos.*
- 📘 **Documentación General y ER:** [`docs/DOCUMENTACION_BASE_DATOS.md`](./docs/DOCUMENTACION_BASE_DATOS.md)*Diagrama interactivo Mermaid y diccionario de tablas y columnas. El backend se sincroniza con `backend/prisma/schema.prisma`.*
- 🚀 **Walkthroughs de Versiones:** [`docs/WALKTHROUGH_DATABASE.md`](./docs/WALKTHROUGH_DATABASE.md)*Desglose detallado de migraciones (v1.0 $\rightarrow$ v2.0 $\rightarrow$ v2.4 $\rightarrow$ v2.5 / v3.29.0 $\rightarrow$ v2.6 / v0.3.34.0 $\rightarrow$ v2.7 / v0.3.37.0 $\rightarrow$ v2.8 $\rightarrow$ v2.9 $\rightarrow$ v3.0 $\rightarrow$ v3.1).*
- 🛠️ **Guía para Refactorizar:** [`docs/GUIA_REFACTORIZACION_BD.md`](./docs/GUIA_REFACTORIZACION_BD.md)
  *Instrucciones paso a paso, checklist y plantilla obligatoria para agentes de IA y desarrolladores.*

---

## 📌 Estado Actual

- **Versión Activa:** `v3.1` (esquema 4.2)
- **Total de Tablas:** 53 tablas normalizadas.
- **Tipos Enumerados (ENUM):** 21 enums nativos para integridad de estados.
- **Patrón E-Commerce Inmutable:** `orden` y `linea_orden` con snapshots históricos de compra.
- **Carrito Vivo Desacoplado:** `carrito` con `token_visitante` y `linea_carrito` con variantes y `ref_viva`.
- **Motor:** PostgreSQL 13+ (Completamente testeado y compatible con PostgreSQL 18).
