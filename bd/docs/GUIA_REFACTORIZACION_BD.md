# 🛠️ Guía y Protocolo de Refactorización de Base de Datos y Generación de Walkthroughs

> **Destinatarios:** Agentes de Inteligencia Artificial (IA) y Desarrolladores de Software del equipo **PINTUCLIC**.  
> **Objetivo:** Estandarizar el procedimiento de modificación del esquema SQL, actualización de tipos en backend, documentación viva y generación obligatoria de walkthroughs evolutivos.

---

## 📌 1. Principios y Reglas de Oro Arquitectónicas

Toda modificación a la base de datos de Pintuclic DEBE cumplir estrictamente con los siguientes estándares:

1. **Idempotencia Absoluta:**  
   - Tablas creadas con `CREATE TABLE IF NOT EXISTS nombre (...)`.
   - Índices creados con `CREATE INDEX IF NOT EXISTS idx_...`.
   - Bloques `DO $$ BEGIN ... END $$;` con `IF NOT EXISTS` para tipos `ENUM` de PostgreSQL.
2. **Nomenclatura y Convenciones:**  
   - Lenguaje: **Español** en minúsculas y `snake_case` (ejemplo: `sub_rol_empresa`, `detalle_carrito`, `id_usuario`).
   - Claves Primarias: `SERIAL PRIMARY KEY` nombradas obligatoriamente como `id_[nombre_tabla_singular]` (ej: `id_usuario`, `id_producto`, `id_variante`).
   - Prohibido el uso de palabras híbridas o errores ortográficos (e.g., usar siempre `rol`, nunca `roll`).
3. **Tipado Fuerte y Precisión:**  
   - **Moneda / Precios:** `NUMERIC(12, 2)` (NUNCA usar `FLOAT` ni `DOUBLE PRECISION` para valores monetarios).
   - **Porcentajes:** `NUMERIC(5, 2)` con restricción `CHECK (porcentaje >= 0 AND porcentaje <= 100)`.
   - **Cantidades:** `INT` con restricción `CHECK (cantidad > 0)`.
   - **Contraseñas:** `VARCHAR(255)` (para almacenar hashes BCrypt).
4. **Integridad Referencial y Cascada:**  
   - Cada clave foránea debe tener definida su política de eliminación: `ON DELETE CASCADE` para entidades dependientes (hijas), `ON DELETE SET NULL` para referencias opcionales y `ON DELETE RESTRICT` para transacciones o catálogos protegidos.
5. **Índices de Rendimiento Obligatorios:**  
   - Es mandatorio crear un índice `idx_[tabla]_[columna]` para **toda columna que sea Clave Foránea (FK)** o que sea utilizada como criterio de búsqueda recurrente (`correo`, `fecha`, etc.).
6. **Orden Topológico Libre de Errores:**  
   - En el archivo SQL, ninguna tabla puede ser declarada antes de las tablas a las que hace referencia mediante `FOREIGN KEY`.

---

## 🔄 2. Flujo de Trabajo Obligatorio (Paso a Paso)

Cuando un agente de IA o desarrollador deba refactorizar o extender la base de datos:

```mermaid
graph TD
    A[Requerimiento / Nuevo Diagrama Draw.io] --> B[1. Inspeccionar y Extraer Cambios]
    B --> C[2. Modificar bd/sql/schema_pintuclic.sql]
    C --> D[3. Validar Sintaxis e Integridad de FKs]
    D --> E[4. Redactar Walkthrough en bd/docs/WALKTHROUGH_DATABASE.md]
    E --> F[5. Actualizar Changelog y Diagrama en bd/docs/DOCUMENTACION_BASE_DATOS.md]
    F --> G[6. Sincronizar Tipos Kysely en backend/src/core/db/types.ts]
    G --> H[7. Validar Compilación TypeScript (tsc --noEmit)]
    H --> I[8. Commit Semántico y Push]
```

### Paso 1: Extracción del Diagrama o Requerimiento
- Si proviene de Draw.io, identificar la página o versión activa (ejemplo: `FINAL`).
- Desglosar la lista de tablas nuevas, tablas eliminadas, columnas añadidas/modificadas y nuevas relaciones.

### Paso 2: Actualización del Script SQL (`bd/sql/schema_pintuclic.sql`)
- Aplicar los cambios directamente en `bd/sql/schema_pintuclic.sql`.
- Asegurar comentarios descriptivos con `COMMENT ON TABLE` y `COMMENT ON COLUMN`.

### Paso 3: Validación Automática de Integridad
- Verificar que no existan tablas referenciadas antes de ser creadas.
- Comprobar que los tipos `ENUM` cubran todos los estados de las nuevas columnas.

### Paso 4: Redacción Obligatoria del Walkthrough
- Abrir [`bd/docs/WALKTHROUGH_DATABASE.md`](./WALKTHROUGH_DATABASE.md).
- Añadir la nueva versión al tope del historial utilizando la **Plantilla Oficial** de la sección 3 de esta guía.
- Incrementar la versión semántica de la base de datos:
  - **MAJOR (vX.0):** Cambios estructurales, tablas deprecadas, reestructuración de dominios.
  - **MINOR (vX.Y):** Nuevas tablas o columnas sin romper compatibilidad.
  - **PATCH (vX.Y.Z):** Corrección de tipos, restricciones o nuevos índices.

### Paso 5: Actualización de la Documentación Viva (`bd/docs/DOCUMENTACION_BASE_DATOS.md`)
- Actualizar el bloque de **Historial Resumido (Changelog)** en el encabezado.
- Actualizar el diagrama Mermaid `erDiagram` para reflejar las nuevas relaciones.
- Actualizar las tablas del Diccionario de Datos.

### Paso 6: Sincronización con Backend Kysely (`backend/src/core/db/types.ts`)
- Reflejar las nuevas tablas como interfaces `...Table` con `Generated<number>`, `ColumnType` y tipos literales de TypeScript para los `ENUMs`.
- Actualizar la interfaz raíz `Database`.

### Paso 7: Verificación de Compilación
- Ejecutar en backend:
  ```powershell
  npx tsc --noEmit
  ```
- No debe existir ningún error de tipado TypeScript (`strict: true`).

---

## 📋 3. Plantilla Oficial para Nuevos Walkthroughs de BD

Copia y pega este bloque en [`bd/docs/WALKTHROUGH_DATABASE.md`](./WALKTHROUGH_DATABASE.md) al registrar una nueva versión:

```markdown
## 📦 Versión X.Y (YYYY-MM-DD)

### 🎯 Resumen Ejecutivo
Breve descripción de 2 a 3 líneas del motivo del cambio y el objetivo funcional alcanzado en la base de datos.
- **Total Tablas:** Pasa de [N anterior] a [N actual] tablas.
- **Foco de la versión:** [Catálogo / Ventas / Roles / etc.]

---

### 🛑 1. Tablas Deprecadas / Eliminadas
| Tabla Eliminada | Motivo de Deprecación | Reemplazo / Acción |
| :--- | :--- | :--- |
| `nombre_tabla` | Motivo técnico o funcional. | `nueva_tabla` o Ninguno. |

*(Si no hubo tablas eliminadas, indicar: "Ninguna en esta versión".)*

---

### ✨ 2. Tablas Nuevas Creadas
| Nueva Tabla | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| `nombre_tabla` | `id_... SERIAL` | `id_fk -> tabla_ref` | Explicación del propósito del negocio. |

*(Si no hubo tablas nuevas, indicar: "Ninguna en esta versión".)*

---

### 🔄 3. Tablas Modificadas y Nuevas Relaciones
- **`tabla_modificada`**: Explicación de columnas añadidas, eliminadas o cambios de tipos.
- **Nuevas Relaciones:** `origen.id_fk -> destino.id_pk` con política `ON DELETE ...`.

---

### 🔒 4. Restricciones (CONSTRAINTS) y Tipos ENUM Agregados
- **Nuevos ENUMs:** `enum_nombre ('valor1', 'valor2')`.
- **Nuevos CHECK / UNIQUE:** `CONSTRAINT uq_... UNIQUE (...)`, `CONSTRAINT chk_... CHECK (...)`.

---

### ⚡ 5. Nuevos Índices de Rendimiento
- `CREATE INDEX IF NOT EXISTS idx_tabla_columna ON tabla(columna);`

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend
#### Backend (Kysely / Express):
- Interfaces que deben añadirse/modificarse en `src/core/db/types.ts`.
- Módulos afectados (`M02`, `M04`, `M07`, etc.).

#### Frontend (Vistas / UI):
- Nuevos campos requeridos en formularios o pantallas de visualización.
```

---

## 🛡️ 4. Checklist de Cierre para el Agente / Desarrollador

Antes de dar por concluida la tarea de base de datos, marca mentalmente este checklist:

- [ ] ¿El script `bd/sql/schema_pintuclic.sql` compila sin errores en PostgreSQL?
- [ ] ¿El orden de creación de tablas respeta la jerarquía de claves foráneas?
- [ ] ¿Toda nueva FK tiene su índice `CREATE INDEX IF NOT EXISTS idx_...`?
- [ ] ¿Se redactó la entrada correspondiente en `bd/docs/WALKTHROUGH_DATABASE.md` con la plantilla?
- [ ] ¿Se actualizó el resumen en `bd/docs/DOCUMENTACION_BASE_DATOS.md`?
- [ ] ¿Se actualizaron las interfaces en `backend/src/core/db/types.ts`?
- [ ] ¿TypeScript compila limpio con `tsc --noEmit`?
